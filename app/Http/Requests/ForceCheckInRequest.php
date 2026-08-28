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
            'signature_data' => 'required|string', // base64-encoded drawn signature
        ];
    }

    public function messages(): array
    {
        return [
            'signature_data.required' => 'A hand-drawn signature is required for manual override check-in.',
        ];
    }
}
