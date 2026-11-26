<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Defer\DeferredCallbackCollection;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * When a request queued slow "after the response" work (emails, Telegram, SMS via
 * Notifier::afterResponse), make sure the browser receives the complete answer
 * before that work starts.
 *
 * Under Apache + mod_php (our Docker image) there is no fastcgi_finish_request(),
 * so the client only knows the response is complete from Content-Length. We set it
 * and turn off Apache's gzip for this one response (gzip would buffer until PHP ends).
 */
class FinishResponseBeforeDeferred
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $deferred = app()->bound(DeferredCallbackCollection::class) ? app(DeferredCallbackCollection::class) : null;
        if (!$deferred || $deferred->count() === 0) {
            return $response;
        }
        if ($response instanceof StreamedResponse || $response instanceof BinaryFileResponse) {
            return $response;
        }

        $content = $response->getContent();
        if ($content !== false) {
            $response->headers->set('Content-Length', (string) strlen($content));
            $response->headers->set('Connection', 'close');
        }
        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }

        return $response;
    }
}
