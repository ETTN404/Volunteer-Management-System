<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'           => 'required|string|max:200',
            'message'         => 'required|string|max:5000',
            'target_audience' => 'required|in:all,volunteers,coordinators',
        ];
    }

    public function messages(): array
    {
        return [
            'target_audience.in' => 'Target audience must be one of: all, volunteers, coordinators.',
        ];
    }
}
