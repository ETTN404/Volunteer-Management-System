<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Dedoc\Scramble\Support\Generator\SecurityRequirement;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Configure Scramble — auto-generates OpenAPI docs from all api.php routes.
        // Accessible at: GET /docs/api  (UI) and GET /docs/api.json (raw spec)
        Scramble::configure()
            ->withDocumentTransformers(function (OpenApi $openApi) {
                // Project metadata shown at the top of the docs page
                $openApi->info->title       = 'VolunTrack — Volunteer Management System API';
                $openApi->info->version     = '1.0.0';
                $openApi->info->description =
                    'Multi-tenant SaaS API for NGO volunteer coordination. ' .
                    'Roles: SuperAdmin, OrgAdmin, Coordinator, Volunteer. ' .
                    'Authenticate using a Bearer token obtained from POST /api/login.';

                // Register Sanctum Bearer Token as the auth method
                // This adds the "Authorize" button to the Scalar docs UI
                $openApi->components->securitySchemes['bearerAuth'] =
                    SecurityScheme::http('bearer');

                // Apply the security scheme globally using the correct SecurityRequirement object
                // (Scramble v0.13 requires an object here, not a plain array)
                $openApi->security[] = new SecurityRequirement(['bearerAuth' => []]);
            });
    }
}


