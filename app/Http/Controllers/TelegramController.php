<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AlertChannels;
use Illuminate\Http\Request;

/**
 * Telegram bot webhook. Set it once:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API>/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
 */
class TelegramController extends Controller
{
    public function webhook(Request $request, string $secret, AlertChannels $alerts)
    {
        if (!config('services.telegram.webhook_secret') || !hash_equals((string) config('services.telegram.webhook_secret'), $secret)) {
            return response()->json(['ok' => false], 403);
        }

        $chatId = (string) data_get($request->all(), 'message.chat.id', '');
        $text   = trim((string) data_get($request->all(), 'message.text', ''));
        if ($chatId === '') {
            return response()->json(['ok' => true]);
        }

        if (str_starts_with($text, '/start')) {
            $token = trim(substr($text, 6));
            $user  = $token !== '' ? User::withoutGlobalScopes()->where('telegram_link_token', $token)->first() : null;
            if ($user) {
                $user->forceFill(['telegram_chat_id' => $chatId, 'telegram_link_token' => null])->save();
                $alerts->telegram($chatId, "✅ ሰላም {$user->first_name}! VolunTrack ተገናኝቷል። የshift ማሳወቂያዎች እዚህ ይደርሱዎታል።\n\nHi {$user->first_name}! Your VolunTrack account is linked. Shift alerts will arrive here.");
            } else {
                $alerts->telegram($chatId, "Open VolunTrack → Account → Notifications and tap *Connect Telegram* to link your account.");
            }
        } elseif ($text === '/stop') {
            User::withoutGlobalScopes()->where('telegram_chat_id', $chatId)->update(['telegram_chat_id' => null]);
            $alerts->telegram($chatId, 'Telegram alerts are off. You can connect again from the app.');
        }

        return response()->json(['ok' => true]);
    }

    public function link(Request $request, AlertChannels $alerts)
    {
        $url = $alerts->telegramLink($request->user());
        if (!$url) {
            return response()->json(['status' => 'error', 'message' => 'Telegram alerts are not set up on this server yet.'], 422);
        }
        return response()->json(['status' => 'success', 'data' => ['url' => $url]]);
    }

    public function unlink(Request $request)
    {
        $request->user()->forceFill(['telegram_chat_id' => null, 'telegram_link_token' => null])->save();
        return response()->json(['status' => 'success', 'message' => 'Telegram disconnected.']);
    }
}
