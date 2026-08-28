<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'period' => 'required|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'period.required' => 'A reporting period label is required (e.g. "Q1 2026", "August 2026").',
        ];
    }
}
