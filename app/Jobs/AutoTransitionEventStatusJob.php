<?php

namespace App\Jobs;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Task 10.1.3.1 / Master Plan Task 24: Auto-Transition Event Status Job
 * Scheduled background job that flips event status:
 *   - 'upcoming' -> 'ongoing' when start_date is reached
 *   - 'ongoing'  -> 'completed' when end_date has passed
 */
class AutoTransitionEventStatusJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function handle(): void
    {
        $today = now()->toDateString();

        // 1. Transition upcoming events to ongoing
        $toOngoingCount = Event::withoutGlobalScopes()
            ->where('status', 'upcoming')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->update(['status' => 'ongoing']);

        // 2. Transition ended events to completed
        $toCompletedCount = Event::withoutGlobalScopes()
            ->whereIn('status', ['upcoming', 'ongoing'])
            ->where('end_date', '<', $today)
            ->update(['status' => 'completed']);

        if ($toOngoingCount > 0 || $toCompletedCount > 0) {
            Log::info("AutoTransitionEventStatusJob: Transitioned {$toOngoingCount} events to 'ongoing' and {$toCompletedCount} events to 'completed'.");
        }
    }
}
