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
    private const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];

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
                'maxOutputTokens'  => 4096,
                'responseMimeType' => 'application/json',
                'responseSchema'   => $schema,
            ],
        ];

        $started = microtime(true);
        foreach ($this->models() as $model) {
            try {
                $res = Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
                    ->acceptJson()->timeout(40)->connectTimeout(8)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", $payload);
            } catch (\Throwable $e) {
                $this->fail($model, 'connection: ' . $e->getMessage());
                break; // network trouble affects every model equally
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
            // A bad key or quota hit will not be fixed by another model.
            if (in_array($res->status(), [401, 403], true) || microtime(true) - $started > 45) {
                break;
            }
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
        return is_array($data) ? $data : null;
    }

    private function fail(string $model, string $why): void
    {
        Log::warning("Gemini {$model} failed: {$why}");
        Cache::put('gemini.status', ['ok' => false, 'model' => $model, 'error' => $why, 'at' => now()->toIso8601String()], now()->addWeek());
    }
}
