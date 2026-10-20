<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Reaches volunteers outside the app.
 *
 * Telegram: free; the volunteer links their account once from Account → Notifications
 *   (deep link t.me/<bot>?start=<token>); the bot webhook stores their chat id.
 * SMS: for people with basic phones. Driver "afromessage" (AfroMessage, Ethiopian
 *   gateway) or "log" (writes to the log — default until a key is configured).
 *   Only time-critical alerts go by SMS because each message costs money.
 */
class AlertChannels
{
    /** Notification types worth an SMS. */
    public const SMS_TYPES = ['shift_broadcast', 'shift_approved', 'shift_cancelled', 'shift_changed', 'waitlist_promoted'];

    public function telegramEnabled(): bool
    {
        return (bool) config('services.telegram.bot_token');
    }

    public function smsEnabled(): bool
    {
        return config('services.sms.driver', 'log') !== 'log' || app()->environment('local', 'testing');
    }

    /** Deliver a notification payload ({type,title,body,action_url}) on every channel the user has. */
    public function deliver(User $user, array $data): void
    {
        $title = $data['title'] ?? ($data['message'] ?? 'VolunTrack update');
        $body  = $data['body'] ?? ($data['message'] ?? '');
        $link  = !empty($data['action_url']) ? app(FrontendUrl::class)->to($data['action_url']) : null;

        if ($user->telegram_chat_id && $this->telegramEnabled()) {
            $this->telegram($user->telegram_chat_id, "*{$this->md($title)}*\n{$this->md($body)}" . ($link ? "\n[Open VolunTrack]({$link})" : ''));
        }

        if ($user->sms_opt_in && $user->phone && in_array($data['type'] ?? '', self::SMS_TYPES, true)) {
            $this->sms($user->phone, Str::limit($title . '. ' . $body, 300) . ($link ? ' ' . $link : ''));
        }
    }

    public function telegram(string $chatId, string $markdown): bool
    {
        try {
            $res = Http::timeout(8)->post('https://api.telegram.org/bot' . config('services.telegram.bot_token') . '/sendMessage', [
                'chat_id'                  => $chatId,
                'text'                     => $markdown,
                'parse_mode'               => 'Markdown',
                'disable_web_page_preview' => true,
            ]);
            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('Telegram send failed: ' . $e->getMessage());
            return false;
        }
    }

    public function sms(string $phone, string $text): bool
    {
        $driver = config('services.sms.driver', 'log');
        try {
            if ($driver === 'afromessage') {
                $res = Http::timeout(10)->withToken(config('services.sms.afromessage_token'))->get('https://api.afromessage.com/api/send', [
                    'from'    => config('services.sms.afromessage_identifier'),
                    'sender'  => config('services.sms.sender', 'VolunTrack'),
                    'to'      => $phone,
                    'message' => $text,
                ]);
                return $res->successful() && $res->json('acknowledge') === 'success';
            }
            Log::info("SMS (log driver) to {$phone}: {$text}");
            return true;
        } catch (\Throwable $e) {
            Log::warning('SMS send failed: ' . $e->getMessage());
            return false;
        }
    }

    /** One-time token for the Telegram deep link. */
    public function telegramLink(User $user): ?string
    {
        $bot = config('services.telegram.bot_username');
        if (!$bot || !$this->telegramEnabled()) {
            return null;
        }
        $token = Str::random(32);
        $user->forceFill(['telegram_link_token' => $token])->save();
        return "https://t.me/{$bot}?start={$token}";
    }

    private function md(string $s): string
    {
        return str_replace(['*', '_', '[', ']', '`'], ['\*', '\_', '\[', '\]', '\`'], $s);
    }
}
