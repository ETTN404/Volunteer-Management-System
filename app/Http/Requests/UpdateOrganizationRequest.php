<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Email, status and plan stay SuperAdmin-only. Branding (color) and subdomain
     * are additionally plan-gated in the controller.
     */
    public function rules(): array
    {
        $orgId = auth()->user()?->org_id;

        return [
            'name'          => 'sometimes|string|max:150',
            'address'       => 'sometimes|nullable|string|max:255',
            'country'       => 'sometimes|nullable|string|size:2',
            'city'          => 'sometimes|nullable|string|max:100',
            'phone'         => ['sometimes', 'nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
            'website'       => 'sometimes|nullable|url|max:255',
            'primary_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'subdomain'     => 'sometimes|nullable|alpha_dash|min:3|max:40|unique:organizations,subdomain,' . $orgId,

            'about'                             => 'sometimes|nullable|string|max:1500',
            'attendance'                        => 'sometimes|array',
            'attendance.checkin_before_minutes' => 'sometimes|integer|min:0|max:120',
            'attendance.checkin_after_minutes'  => 'sometimes|integer|min:5|max:240',
            'attendance.qr_window_seconds'      => 'sometimes|integer|in:15,30,60,120',
            'attendance.early_checkout_minutes' => 'sometimes|integer|min:0|max:240',
            'attendance.undo_checkout_minutes'  => 'sometimes|integer|min:0|max:60',
            'attendance.auto_checkout_grace'    => 'sometimes|integer|min:0|max:720',
            'attendance.max_gps_accuracy'       => 'sometimes|integer|min:20|max:1000',
            'attendance.ping_interval_minutes'  => 'sometimes|integer|min:1|max:60',
            'attendance.require_qr'             => 'sometimes|boolean',
            'attendance.auto_verify_hours'      => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Use international format, e.g. +251911234567.'];
    }
}
