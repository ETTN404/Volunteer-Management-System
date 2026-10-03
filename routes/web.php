<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/**
 * Web Database Setup & Seeder Endpoint
 * Designed for serverless/PaaS platforms (like Wasmer) without interactive terminal/SSH access.
 */
Route::get('/setup-database', function (Request $request) {
    try {
        file_put_contents('php://stderr', "[VOLUNTRACK SETUP] Database initialization requested via web...\n");

        // 1. If SQLite is configured, ensure database.sqlite exists and is writable
        if (config('database.default') === 'sqlite') {
            $sqlitePath = database_path('database.sqlite');
            if (!file_exists($sqlitePath)) {
                touch($sqlitePath);
                chmod($sqlitePath, 0666);
                file_put_contents('php://stderr', "[VOLUNTRACK SETUP] Created SQLite file at: {$sqlitePath}\n");
            }
        }

        // 2. Run migrations
        file_put_contents('php://stderr', "[VOLUNTRACK SETUP] Running database migrations...\n");
        Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = Artisan::output();

        // 3. Run seeders
        file_put_contents('php://stderr', "[VOLUNTRACK SETUP] Running database seeders...\n");
        Artisan::call('db:seed', ['--force' => true]);
        $seedOutput = Artisan::output();

        file_put_contents('php://stderr', "[VOLUNTRACK SETUP] Database setup completed successfully!\n");

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'status' => 'success',
                'message' => 'Database successfully migrated and seeded!',
                'migrate_output' => $migrateOutput,
                'seed_output' => $seedOutput,
                'demo_logins' => [
                    'volunteer'   => ['email' => 'volunteer@example.com', 'password' => 'password123'],
                    'coordinator' => ['email' => 'coordinator@example.com', 'password' => 'password123'],
                    'orgadmin'    => ['email' => 'orgadmin@example.com', 'password' => 'password123'],
                    'superadmin'  => ['email' => 'superadmin@example.com', 'password' => 'password123'],
                ],
            ]);
        }

        $combinedOutput = htmlspecialchars($migrateOutput . PHP_EOL . $seedOutput);

        return response(<<<HTML
<!DOCTYPE html>
<html>
<head>
    <title>VolunTrack - Database Setup Complete</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen p-6 font-sans">
    <div class="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
            ✅
        </div>
        <h1 class="text-2xl font-black text-gray-900 text-center mb-2">Database Setup Complete!</h1>
        <p class="text-sm text-gray-500 text-center mb-6">All 11 VMS relational tables and demo organizations/accounts have been migrated and seeded.</p>

        <div class="bg-gray-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-48 mb-6">
            <pre>{$combinedOutput}</pre>
        </div>

        <div class="space-y-2 mb-6">
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Demo Accounts (Pre-seeded):</p>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="p-3 bg-gray-50 rounded-lg border"><strong>Volunteer:</strong> volunteer@example.com<br><span class="text-gray-400">PW: password123</span></div>
                <div class="p-3 bg-gray-50 rounded-lg border"><strong>Coordinator:</strong> coordinator@example.com<br><span class="text-gray-400">PW: password123</span></div>
                <div class="p-3 bg-gray-50 rounded-lg border"><strong>OrgAdmin:</strong> orgadmin@example.com<br><span class="text-gray-400">PW: password123</span></div>
                <div class="p-3 bg-gray-50 rounded-lg border"><strong>SuperAdmin:</strong> superadmin@example.com<br><span class="text-gray-400">PW: password123</span></div>
            </div>
        </div>

        <a href="/" class="block w-full py-3 bg-[#FF750F] hover:bg-orange-600 text-white font-bold text-center rounded-xl transition shadow-lg shadow-orange-500/20">
            Open VolunTrack App &rarr;
        </a>
    </div>
</body>
</html>
HTML);
    } catch (\Throwable $e) {
        $errorMsg = sprintf("🚨 [SETUP FAILED] %s: %s at %s:%d", get_class($e), $e->getMessage(), $e->getFile(), $e->getLine());
        file_put_contents('php://stderr', $errorMsg . PHP_EOL);

        $errTrace = htmlspecialchars($e->getTraceAsString());
        $errMsg = htmlspecialchars($e->getMessage());

        return response(<<<HTML
<!DOCTYPE html>
<html>
<head>
    <title>VolunTrack - Database Setup Error</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen p-6 font-sans">
    <div class="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-red-200">
        <div class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
            ❌
        </div>
        <h1 class="text-2xl font-black text-gray-900 text-center mb-2">Database Setup Failed</h1>
        <p class="text-sm text-red-600 font-medium text-center mb-4">{$errMsg}</p>
        <div class="bg-gray-900 text-red-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-48 mb-6">
            <pre>{$errTrace}</pre>
        </div>
        <a href="/setup-database" class="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-center rounded-xl transition">
            Retry Setup &rarr;
        </a>
    </div>
</body>
</html>
HTML, 500);
    }
});
