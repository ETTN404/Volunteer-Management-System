<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVolunteerProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name'      => 'sometimes|string|max:100',
            'first_name'     => 'sometimes|string|max:60',
            'last_name'      => 'sometimes|string|max:60',
            'phone'          => ['sometimes', 'nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
            'date_of_birth'  => 'sometimes|nullable|date|before:today|after:1900-01-01',
            'bio'            => 'sometimes|nullable|string|max:1000',
            'skills'         => 'sometimes|array',
            'skills.*'       => 'string|max:100',
            'availability'   => 'sometimes|array',
            'availability.*' => 'string|max:100',
        ];
    }
}
