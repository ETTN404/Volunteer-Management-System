<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'           => 'sometimes|string|max:150',
            'description'     => 'sometimes|nullable|string|max:5000',
            'location'        => 'sometimes|string|max:255',
            'latitude'        => 'sometimes|nullable|numeric|between:-90,90',
            'longitude'       => 'sometimes|nullable|numeric|between:-180,180',
            'start_date'      => 'sometimes|date',
            'end_date'        => 'sometimes|date|after_or_equal:start_date',
            'status'          => 'sometimes|in:upcoming,ongoing,completed,cancelled',
            'geofence_radius' => 'sometimes|integer|min:50|max:5000',
        ];
    }
}
