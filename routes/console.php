<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use App\Jobs\AutoTransitionEventStatusJob;
use App\Jobs\RevokeExpiredQrCodesJob;

// Task 8.1.2.2: Schedule the Redis chatbot session flusher to run hourly
Schedule::command('chatbot:flush-sessions')->hourly();

// Master Plan Phase 5 Scheduled Jobs
Schedule::job(new AutoTransitionEventStatusJob)->everyFifteenMinutes();
Schedule::job(new RevokeExpiredQrCodesJob)->everyFifteenMinutes();
