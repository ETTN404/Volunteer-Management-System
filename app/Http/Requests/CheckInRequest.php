<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id'          => 'required|exists:shifts,id',
            'qr_code_signature' => 'required|string',
            'latitude'          => 'required|numeric|between:-90,90',
            'longitude'         => 'required|numeric|between:-180,180',
            'client_timestamp'  => 'required|date',
        ];
    }

    public function messages(): array
    {
        return [
            'latitude.between'  => 'Invalid GPS latitude. Must be between -90 and 90.',
            'longitude.between' => 'Invalid GPS longitude. Must be between -180 and 180.',
            'client_timestamp.date' => 'Invalid client timestamp format.',
        ];
    }
}
