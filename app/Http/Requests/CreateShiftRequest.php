<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_time'      => 'required|date_format:Y-m-d H:i:s',
            'end_time'        => 'required|date_format:Y-m-d H:i:s|after:start_time',
            'required_skills' => 'nullable|array',
            'required_skills.*' => 'string|max:100',
            'capacity'        => 'required|integer|min:1|max:10000',
        ];
    }

    public function messages(): array
    {
        return [
            'end_time.after'       => 'Shift end time must be after the start time.',
            'capacity.min'         => 'A shift must have at least 1 volunteer capacity slot.',
            'start_time.date_format' => 'Start time must follow the format: YYYY-MM-DD HH:MM:SS',
            'end_time.date_format'   => 'End time must follow the format: YYYY-MM-DD HH:MM:SS',
        ];
    }
}
