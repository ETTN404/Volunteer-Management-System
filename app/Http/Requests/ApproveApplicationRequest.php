<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:confirmed,cancelled',
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Status must be either "confirmed" or "cancelled".',
        ];
    }
}
