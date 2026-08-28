<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $validMilestones = config('vms.certificate_milestones', [10, 25, 50, 100, 200, 500]);

        return [
            'volunteer_id'    => 'required|exists:volunteers,id',
            'milestone_hours' => 'required|numeric|min:1|in:' . implode(',', $validMilestones),
        ];
    }

    public function messages(): array
    {
        $milestones = implode(', ', config('vms.certificate_milestones', [10, 25, 50, 100, 200, 500]));

        return [
            'milestone_hours.in' => "Milestone must be one of the official thresholds: {$milestones} hours.",
        ];
    }
}
