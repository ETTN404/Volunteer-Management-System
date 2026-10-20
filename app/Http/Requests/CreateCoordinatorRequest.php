<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateCoordinatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * No password field: the coordinator receives an invitation email with a
     * temporary password and a one-time link (see InvitationService). Opening the
     * link proves they own the email address.
     */
    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:60',
            'last_name'  => 'required|string|max:60',
            'email'      => 'required|string|email:rfc|max:100|unique:users,email',
            'phone'      => ['nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (!$this->first_name && $this->full_name) {
            $parts = preg_split('/\s+/', trim((string) $this->full_name), 2);
            $this->merge(['first_name' => $parts[0] ?? null, 'last_name' => $parts[1] ?? $parts[0] ?? null]);
        }
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Someone already uses this email on VolunTrack.',
            'phone.regex'  => 'Use international format, e.g. +251911234567.',
        ];
    }
}
