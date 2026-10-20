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
            'full_name'    => 'required_without:first_name|nullable|string|max:100',
            'first_name'   => 'required_without:full_name|nullable|string|max:60',
            'last_name'    => 'required_with:first_name|nullable|string|max:60',
            'phone'        => ['nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
            'date_of_birth'=> 'nullable|date|before:today|after:1900-01-01',
            'email'        => 'required|string|email|max:100|unique:users,email',
            'password'     => 'required|string|min:8|max:100',
            'skills'       => 'nullable|array',
            'skills.*'     => 'string|max:100',
            'availability'   => 'nullable|array',
            'availability.*' => 'nullable',
            'bio'            => 'nullable|string|max:1000',
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
