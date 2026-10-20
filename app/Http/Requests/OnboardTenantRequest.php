<?php

namespace App\Http\Requests;

use App\Models\OrganizationDocument;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Organization onboarding — used by SuperAdmins and by the public sign-up form.
 * No password is typed by anyone: the admin receives an invitation email.
 */
class OnboardTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $public = !$this->user();

        return [
            // Organization
            'org_name'     => 'required|string|min:2|max:150',
            'org_email'    => 'required|string|email:rfc|max:100|unique:organizations,email',
            'org_country'  => 'required|string|size:2',
            'org_city'     => 'required|string|max:100',
            'org_address'  => 'nullable|string|max:255',
            'org_phone'    => ['required', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
            'org_website'  => 'nullable|url|max:255',
            'plan'         => $public ? 'prohibited' : 'nullable|in:free,pro,enterprise',

            // Admin (person)
            'admin_first_name' => 'required|string|max:60',
            'admin_last_name'  => 'required|string|max:60',
            'admin_email'      => 'required|string|email:rfc|max:100|unique:users,email',
            'admin_phone'      => ['nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],

            // Verification documents (public sign-up must include at least one)
            'documents'          => ($public ? 'required' : 'nullable') . '|array|max:5',
            'documents.*.file'   => 'required|file|mimes:pdf,png,jpg,jpeg|max:5120',
            'documents.*.type'   => 'required|in:' . implode(',', OrganizationDocument::TYPES),
            'documents.*.title'  => 'nullable|string|max:150',
            'accept_terms'       => $public ? 'accepted' : 'nullable',
        ];
    }

    public function messages(): array
    {
        return [
            'org_phone.regex'      => 'Enter a valid phone number for the selected country.',
            'admin_phone.regex'    => 'Enter a valid phone number for the selected country.',
            'org_email.unique'     => 'An organization with this email is already on VolunTrack.',
            'admin_email.unique'   => 'This email already has a VolunTrack account.',
            'documents.required'   => 'Upload at least one registration document so we can verify your organization.',
            'accept_terms.accepted'=> 'Please accept the terms to continue.',
        ];
    }
}
