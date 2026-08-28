<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'message' => 'required|string|max:1000',
            'history' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'message.required' => 'A message is required to chat with VolunBot.',
            'message.max'      => 'Message must not exceed 1000 characters.',
        ];
    }
}
