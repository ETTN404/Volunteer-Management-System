<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;
use App\Models\ChatbotSession;
use Illuminate\Support\Facades\DB;

class FlushChatbotSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'chatbot:flush-sessions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Flushes inactive Redis chatbot sessions to the MySQL database for permanent auditing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $keys = Redis::keys('laravel_database_chat_session_*'); // Account for Laravel's default redis prefix
        
        // If not using prefix, fallback check
        if (empty($keys)) {
            $keys = Redis::keys('chat_session_*');
        }

        if (empty($keys)) {
            $this->info('No active chatbot sessions found in Redis.');
            return;
        }

        $count = 0;
        foreach ($keys as $fullKey) {
            // Strip the prefix if it exists to get the actual key we set
            $key = str_replace(config('database.redis.options.prefix', 'laravel_database_'), '', $fullKey);
            
            $volunteerId = str_replace('chat_session_', '', $key);
            $historyJson = Redis::get($key);

            if ($historyJson && $volunteerId) {
                // Upsert to MySQL
                ChatbotSession::updateOrCreate(
                    ['volunteer_id' => $volunteerId],
                    [
                        'context_data' => $historyJson,
                        'last_interaction' => now(),
                    ]
                );

                // Clear from Redis to free up memory
                Redis::del($key);
                $count++;
            }
        }

        $this->info("Successfully flushed {$count} chatbot sessions to MySQL.");
    }
}
