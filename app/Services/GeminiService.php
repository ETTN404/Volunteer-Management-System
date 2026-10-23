<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin Gemini client. Google retires model names regularly, so the configured
 * model is tried first and then a list of current aliases; the first one that
 * answers is remembered for a day.
 */
class GeminiService
{
    private const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'];

    /** Whole-request budget, so the volunteer never waits past the app's timeout. */
    private const BUDGET_SECONDS = 32;

    public function configured(): bool
    {
        $key = config('services.gemini.key');
        return !empty($key) && $key !== 'mock';
    }

    /**
     * Ask for a JSON object matching $schema.
     *
     * @param  array<int, array{role: string, text: string}>  $turns  oldest first, ending with the user's message
     * @return array|null decoded object, or null when no model could answer
     */
    public function json(string $system, array $turns, array $schema, float $temperature = 0.4): ?array
    {
        if (!$this->configured()) {
            return null;
        }

        $contents = [];
        foreach ($turns as $t) {
            $role = $t['role'] === 'user' ? 'user' : 'model';
            $text = trim((string) $t['text']);
            if ($text === '') continue;
            // Gemini expects alternating turns; merge consecutive ones.
            if ($contents && end($contents)['role'] === $role) {
                $contents[count($contents) - 1]['parts'][0]['text'] .= "\n\n" . $text;
            } else {
                $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
            }
        }
        while ($contents && $contents[0]['role'] !== 'user') {
            array_shift($contents);
        }

        $payload = [
            'systemInstruction' => ['parts' => [['text' => $system]]],
            'contents'          => $contents,
            'generationConfig'  => [
                'temperature'      => $temperature,
                'maxOutputTokens'  => 8192,
                'responseMimeType' => 'application/json',
                'responseSchema'   => $schema,
            ],
        ];

        $started = microtime(true);
        foreach ($this->models() as $model) {
            $left = self::BUDGET_SECONDS - (microtime(true) - $started);
            if ($left < 6) {
                break;
            }
            $body = $payload;
            // Long "thinking" makes replies take 20–40 s; these answers come from ready-made facts, so keep it minimal.
            if ($thinking = $this->thinking($model)) {
                $body['generationConfig']['thinkingConfig'] = $thinking;
            }
            try {
                $res = $this->post($model, $body, $left);
                if ($thinking && $res->status() === 400 && str_contains(strtolower((string) $res->body()), 'think')) {
                    unset($body['generationConfig']['thinkingConfig']);
                    $res = $this->post($model, $body, self::BUDGET_SECONDS - (microtime(true) - $started));
                }
            } catch (\Throwable $e) {
                $this->fail($model, 'connection/timeout: ' . mb_strimwidth($e->getMessage(), 0, 160));
                break; // a timeout or network problem would hit every model
            }

            if ($res->successful()) {
                $parts = $res->json('candidates.0.content.parts') ?? [];
                $text = collect($parts)->reject(fn ($p) => $p['thought'] ?? false)->pluck('text')->implode('');
                $data = $this->decode($text);
                if ($data !== null) {
                    Cache::put('gemini.model', $model, now()->addDay());
                    Cache::put('gemini.status', ['ok' => true, 'model' => $model, 'at' => now()->toIso8601String()], now()->addWeek());
                    return $data;
                }
                $this->fail($model, 'unreadable reply (' . ($res->json('candidates.0.finishReason') ?? $res->json('promptFeedback.blockReason') ?? 'empty') . ')');
                continue;
            }

            $this->fail($model, $res->status() . ' ' . mb_strimwidth((string) $res->json('error.message', $res->body()), 0, 200));
            // A bad key will not be fixed by another model.
            if (in_array($res->status(), [401, 403], true)) {
                break;
            }
        }

        return null;
    }

    private function post(string $model, array $body, float $seconds)
    {
        return Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
            ->acceptJson()->timeout(max(5, (int) floor($seconds)))->connectTimeout(6)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", $body);
    }

    private function thinking(string $model): ?array
    {
        if (str_contains($model, '2.5')) {
            return str_contains($model, 'pro') ? ['thinkingBudget' => 128] : ['thinkingBudget' => 0];
        }
        // Gemini 3+ and the moving "latest" aliases think by default (slow, and it eats the output allowance).
        if (preg_match('/gemini-[3-9]|latest/', $model)) {
            return ['thinkingLevel' => str_contains($model, 'flash') ? 'minimal' : 'low'];
        }
        return null;
    }

    private function models(): array
    {
        $preferred = array_filter([Cache::get('gemini.model'), config('services.gemini.model')]);
        return array_values(array_unique([...$preferred, ...self::FALLBACK_MODELS]));
    }

    private function decode(string $text): ?array
    {
        $text = trim($text);
        if ($text === '') return null;
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $text);
        $data = json_decode($text, true);
        if (!is_array($data) && preg_match('/\{.*\}/s', $text, $m)) {
            $data = json_decode($m[0], true);
        }
        // Cut off mid-way (output limit): keep the reply text rather than losing the whole answer.
        if (!is_array($data) && preg_match('/"reply"\s*:\s*"((?:[^"\\\\]|\\\\.)*)/s', $text, $m) && mb_strlen($m[1]) > 20) {
            $reply = json_decode('"' . $m[1] . '"') ?? stripcslashes($m[1]);
            $data = ['reply' => rtrim($reply) . (str_ends_with($text, '}') ? '' : '…'), 'shift_ids' => [], 'follow_ups' => [], 'ask_location' => false, 'place_query' => ''];
        }
        return is_array($data) ? $data : null;
    }

    private function fail(string $model, string $why): void
    {
        Log::warning("Gemini {$model} failed: {$why}");
        Cache::put('gemini.status', ['ok' => false, 'model' => $model, 'error' => $why, 'at' => now()->toIso8601String()], now()->addWeek());
    }
}
