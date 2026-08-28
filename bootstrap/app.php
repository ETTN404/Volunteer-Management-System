<?php

use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnsureVolunteerProfile;
use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Http\Middleware\TenantMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeadersMiddleware::class);
        $middleware->append(TenantMiddleware::class);
        $middleware->alias([
            'role'              => CheckRole::class,
            'volunteer.profile' => EnsureVolunteerProfile::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Standardized 401 Unauthenticated
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Unauthenticated. Please provide a valid Sanctum bearer token.',
                ], 401);
            }
        });

        // Standardized 403 Forbidden
        $exceptions->render(function (AccessDeniedHttpException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Forbidden. You do not have permission to access this resource.',
                ], 403);
            }
        });

        // Standardized 404 Not Found
        $exceptions->render(function (NotFoundHttpException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Resource not found.',
                ], 404);
            }
        });

        $exceptions->render(function (ModelNotFoundException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Target database resource not found.',
                ], 404);
            }
        });

        // Standardized 429 Rate Limited
        $exceptions->render(function (ThrottleRequestsException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Too many requests. Please slow down and try again later.',
                ], 429);
            }
        });
    })->create();
