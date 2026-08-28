<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role middleware already enforces Coordinator/OrgAdmin
    }

    public function rules(): array
    {
        return [
            'title'            => 'required|string|max:150',
            'description'      => 'nullable|string|max:5000',
            'location'         => 'required|string|max:255',
            'latitude'         => 'nullable|numeric|between:-90,90',
            'longitude'        => 'nullable|numeric|between:-180,180',
            'start_date'       => 'required|date|after_or_equal:today',
            'end_date'         => 'required|date|after_or_equal:start_date',
            'geofence_radius'  => 'nullable|integer|min:50|max:5000',
        ];
    }

    public function messages(): array
    {
        return [
            'start_date.after_or_equal' => 'Event start date cannot be in the past.',
            'end_date.after_or_equal'   => 'Event end date must be on or after the start date.',
            'geofence_radius.min'       => 'Minimum geofence radius is 50 meters.',
            'geofence_radius.max'       => 'Maximum geofence radius is 5000 meters.',
        ];
    }
}
