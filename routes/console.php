<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Task 8.1.2.2: Schedule the Redis chatbot session flusher to run hourly
Schedule::command('chatbot:flush-sessions')->hourly();
