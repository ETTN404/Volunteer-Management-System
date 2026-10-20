<?php

namespace App\Services;

/**
 * Base URL of the React app, for links in emails (invitations, resets, notifications).
 * FRONTEND_URL wins; otherwise the Origin of the current request (the app that called us).
 */
class FrontendUrl
{
    public function base(): ?string
    {
        if ($configured = config('vms.frontend_url')) {
            return $configured;
        }
        $origin = request()?->headers->get('Origin');
        if ($origin && preg_match('#^https?://[^/\s]+$#', $origin)) {
            return rtrim($origin, '/');
        }
        return null;
    }

    public function to(string $path): string
    {
        return ($this->base() ?? '') . '/' . ltrim($path, '/');
    }
}
