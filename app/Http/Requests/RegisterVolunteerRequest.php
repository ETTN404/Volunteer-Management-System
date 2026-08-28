<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterVolunteerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint — no auth required
    }

    public function rules(): array
    {
        return [
            'org_id'       => 'nullable|exists:organizations,id',
            'full_name'    => 'required|string|max:100',
            'email'        => 'required|string|email|max:100|unique:users,email',
            'password'     => 'required|string|min:8',
            'skills'       => 'nullable|array',
            'skills.*'     => 'string|max:100',
            'availability' => 'nullable|array',
            'availability.*' => 'string|max:100',
            'bio'          => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'    => 'An account with this email address already exists.',
            'password.min'    => 'Password must be at least 8 characters long.',
        ];
    }
}
