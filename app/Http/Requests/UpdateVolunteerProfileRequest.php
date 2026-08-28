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
            'bio'            => 'sometimes|nullable|string|max:1000',
            'skills'         => 'sometimes|array',
            'skills.*'       => 'string|max:100',
            'availability'   => 'sometimes|array',
            'availability.*' => 'string|max:100',
        ];
    }
}
