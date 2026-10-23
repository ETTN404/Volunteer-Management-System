<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Alerts for volunteers without the app (see App\Services\AlertChannels).
    'telegram' => [
        'bot_token'      => env('TELEGRAM_BOT_TOKEN'),
        'bot_username'   => env('TELEGRAM_BOT_USERNAME'),
        'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
    ],

    'sms' => [
        'driver'                 => env('SMS_DRIVER', 'log'), // log | afromessage
        'afromessage_token'      => env('AFROMESSAGE_TOKEN'),
        'afromessage_identifier' => env('AFROMESSAGE_IDENTIFIER'),
        'sender'                 => env('SMS_SENDER', 'VolunTrack'),
    ],

    'gemini' => [
        'key'   => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-flash-latest'),
    ],

];

