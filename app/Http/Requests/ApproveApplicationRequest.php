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
            // "cancelled" is accepted from older clients and stored as "rejected".
            'status' => 'required|in:confirmed,rejected,cancelled',
            'reason' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Status must be either "confirmed" or "cancelled".',
        ];
    }
}
