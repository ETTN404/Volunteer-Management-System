<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OnboardTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // SuperAdmin middleware enforces this at route level
    }

    public function rules(): array
    {
        return [
            // Organization
            'org_name'       => 'required|string|max:150',
            'org_email'      => 'required|string|email|max:100|unique:organizations,email',
            'org_address'    => 'required|string|max:255',
            'org_phone'      => 'nullable|string|max:50',
            'org_website'    => 'nullable|url|max:255',

            // Admin
            'admin_full_name' => 'required|string|max:100',
            'admin_email'     => 'required|string|email|max:100|unique:users,email',
            'admin_password'  => 'required|string|min:8',
        ];
    }

    public function messages(): array
    {
        return [
            'org_email.unique'   => 'An organization with this email already exists in the system.',
            'admin_email.unique' => 'An account with this admin email already exists.',
        ];
    }
}
