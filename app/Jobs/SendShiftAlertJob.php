<?php

namespace App\Jobs;

use App\Models\Shift;
use App\Services\BroadcastService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Urgent shift alert. Recipient selection and delivery live in BroadcastService
 * so the preview, the sync path and this queued path always agree.
 */
class SendShiftAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(
        public int $shiftId,
        public int $orgId,
        public int $postedById
    ) {}

    public function handle(BroadcastService $broadcasts): void
    {
        $shift  = Shift::with('event')->findOrFail($this->shiftId);
        $result = $broadcasts->broadcast($shift, $this->postedById);

        Log::info("SendShiftAlertJob: shift #{$this->shiftId} alert delivered to {$result['notified']} volunteers.");
    }
}
