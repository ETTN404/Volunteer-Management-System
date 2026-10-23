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
            'latitude' => 'nullable|numeric|between:-90,90|required_with:longitude',
            'longitude' => 'nullable|numeric|between:-180,180|required_with:latitude',
            'location_label' => 'nullable|string|max:120',
            'location_source' => 'nullable|in:gps,map',
            'forget_location' => 'nullable|boolean',
            'thread_id' => 'nullable|string|max:40',
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
