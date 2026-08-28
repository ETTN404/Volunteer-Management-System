<?php

namespace App\Jobs;

use App\Models\Shift;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Task 10.1.3.2 / Master Plan Task 25: Revoke Expired QR Codes Job
 * Background job that nullifies QR signatures whose expiration timestamp has passed.
 */
class RevokeExpiredQrCodesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function handle(): void
    {
        $revokedCount = Shift::whereNotNull('qr_expires_at')
            ->where('qr_expires_at', '<=', now())
            ->whereNotNull('qr_code_signature')
            ->update([
                'qr_code_signature' => null,
            ]);

        if ($revokedCount > 0) {
            Log::info("RevokeExpiredQrCodesJob: Revoked {$revokedCount} expired shift QR code signatures.");
        }
    }
}
