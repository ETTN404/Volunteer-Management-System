<?php

/*
|--------------------------------------------------------------------------
| Subscription plans & entitlements
|--------------------------------------------------------------------------
|
| Every organization starts on Free. Limits are enforced server-side by
| App\Services\PlanService — `null` means unlimited. Features listed here
| are the ones a plan unlocks; anything not listed is available to all plans.
|
*/

return [

    'default' => 'free',

    // Plan order matters: used to compute "required plan" for a locked feature.
    'order' => ['free', 'pro', 'enterprise'],

    'plans' => [
        'free' => [
            'name'          => 'Free',
            'price_monthly' => 0,
            'limits'        => [
                'coordinators'         => 2,
                'active_events'        => 3,
                'shifts_per_event'     => 10,
                'volunteers'           => 150,
                'broadcasts_per_month' => 5,
                'storage_mb'           => 100,
            ],
            'features' => [],
        ],
        'pro' => [
            'name'          => 'Pro',
            'price_monthly' => 1500,
            'limits'        => [
                'coordinators'         => 15,
                'active_events'        => 50,
                'shifts_per_event'     => 100,
                'volunteers'           => 3000,
                'broadcasts_per_month' => 100,
                'storage_mb'           => 5000,
            ],
            'features' => ['branding', 'reports_export', 'analytics', 'audit_log', 'ai_screening'],
        ],
        'enterprise' => [
            'name'          => 'Enterprise',
            'price_monthly' => 5000,
            'limits'        => [
                'coordinators'         => null,
                'active_events'        => null,
                'shifts_per_event'     => null,
                'volunteers'           => null,
                'broadcasts_per_month' => null,
                'storage_mb'           => null,
            ],
            'features' => ['branding', 'reports_export', 'analytics', 'audit_log', 'ai_screening', 'subdomain', 'priority_support'],
        ],
    ],

    'currency' => 'ETB',

    // Where organizations send money. Shown on the billing page.
    // `key` doubles as the bank code sent to the verifiers. `needs_suffix` = the
    // receipt can only be checked with the payer's account digits.
    'payment_methods' => [
        ['key' => 'telebirr', 'name' => 'telebirr',                     'account' => env('PAY_TELEBIRR_ACCOUNT', '0911000000'),    'needs_suffix' => false, 'reference_hint' => 'Transaction number, e.g. CHQ1ABC2DE'],
        ['key' => 'cbe',      'name' => 'Commercial Bank of Ethiopia',  'account' => env('PAY_CBE_ACCOUNT', '1000000000000'),      'needs_suffix' => false, 'reference_hint' => 'Receipt link or FT reference, e.g. FT26123ABCDE'],
        ['key' => 'cbebirr',  'name' => 'CBE Birr',                     'account' => env('PAY_CBEBIRR_ACCOUNT', '0911000000'),     'needs_suffix' => false, 'reference_hint' => 'Receipt number'],
        ['key' => 'boa',      'name' => 'Bank of Abyssinia',            'account' => env('PAY_BOA_ACCOUNT', ''),                   'needs_suffix' => true,  'reference_hint' => 'Transaction reference'],
        ['key' => 'dashen',   'name' => 'Dashen Bank',                  'account' => env('PAY_DASHEN_ACCOUNT', ''),                'needs_suffix' => false, 'reference_hint' => 'Transaction reference'],
        ['key' => 'awash',    'name' => 'Awash Bank',                   'account' => env('PAY_AWASH_ACCOUNT', ''),                 'needs_suffix' => false, 'reference_hint' => 'Transaction reference'],
    ],
    'account_name' => env('PAY_ACCOUNT_NAME', 'VolunTrack PLC'),

    /*
    | Automatic receipt verification (see docs/PAYMENT_VERIFICATION.md).
    | Drivers are tried in order; the first that gives a definite answer wins.
    | Anything left undecided goes to the SuperAdmin payments queue.
    |   verifyet — Verify.ET REST API (needs VERIFYET_API_KEY; 200 free/month).
    |   cheki    — cheki.et open-source API (no key; or self-hosted URL).
    |   manual   — never decides; always queues for review.
    */
    'verifier' => [
        'drivers' => array_filter(explode(',', env('PAYMENT_VERIFY_DRIVERS', 'verifyet,cheki'))),
        'timeout' => (int) env('PAYMENT_VERIFY_TIMEOUT', 20),
        'max_age_days' => 30,
        'verifyet' => [
            'url'     => env('VERIFYET_URL', 'https://verify.et/api/verify'),
            'api_key' => env('VERIFYET_API_KEY'),
        ],
        'cheki' => [
            'url' => env('CHEKI_URL', 'https://cheki.et/api/verify'),
        ],
        // Receiving account checks: the receipt must name our account, so a receipt
        // for money sent to someone else is never accepted.
        'receiver_name'           => env('PAY_ACCOUNT_NAME', 'VolunTrack PLC'),
        'receiver_account_suffix' => env('PAY_RECEIVER_ACCOUNT_SUFFIX'),
    ],
];
