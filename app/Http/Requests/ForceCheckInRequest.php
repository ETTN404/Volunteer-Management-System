<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ForceCheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // No phone / no data / no GPS: the coordinator confirms identity in person.
            'signature_data' => 'nullable|string|max:300000|required_without:id_verified',
            'id_verified'    => 'nullable|boolean',
            'note'           => 'nullable|string|max:500',
            'time'           => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'signature_data.required' => 'A hand-drawn signature is required for manual override check-in.',
        ];
    }
}
