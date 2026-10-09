<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class RequestLoggingMiddleware
{
    /**
     * Handle an incoming request and log detailed, informative telemetry
     * directly to stderr/stdout so it displays live in Wasmer/Docker logs.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        $response = $next($request);

        $durationMs = round((microtime(true) - $startTime) * 1000, 2);
        $status = $response->getStatusCode();
        $method = $request->method();
        $uri = $request->getRequestUri();
        $ip = $request->ip();

        // User info if authenticated
        $userInfo = 'Guest';
        if (Auth::check()) {
            $user = Auth::user();
            $userInfo = "User#{$user->id} ({$user->role}, Org: " . ($user->org_id ?? 'System') . ")";
        }

        // Status indicator
        $statusEmoji = $status >= 500 ? '🚨' : ($status >= 400 ? '⚠️' : '✅');
        $logLine = sprintf(
            "%s [%s] %s %s | %d %s | %sms | IP: %s | %s",
            $statusEmoji,
            date('Y-m-d H:i:s'),
            $method,
            $uri,
            $status,
            Response::$statusTexts[$status] ?? 'Unknown',
            $durationMs,
            $ip,
            $userInfo
        );

        // Always print directly to stderr so it shows immediately in Wasmer Live Tail
        file_put_contents('php://stderr', "[VOLUNTRACK LIVE] " . $logLine . PHP_EOL);

        // Also record in Laravel's logger
        if ($status >= 500) {
            Log::channel(env('LOG_CHANNEL', 'stderr'))->error($logLine);
        } elseif ($status >= 400) {
            Log::channel(env('LOG_CHANNEL', 'stderr'))->warning($logLine);
        } else {
            Log::channel(env('LOG_CHANNEL', 'stderr'))->info($logLine);
        }

        return $response;
    }
}
