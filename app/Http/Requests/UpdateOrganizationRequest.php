<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'              => 'sometimes|string|max:150',
            'address'           => 'sometimes|string|max:255',
            'phone'             => 'sometimes|nullable|string|max:50',
            'website'           => 'sometimes|nullable|url|max:255',
        ];
    }
}
