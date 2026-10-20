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
            // The venue pin drives GPS check-in, so it is mandatory.
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'start_date'       => 'required|date|after_or_equal:today',
            'end_date'         => 'required|date|after_or_equal:start_date',
            'geofence_radius'  => 'nullable|integer|min:30|max:5000',
            // Optional: create shifts in the same request (event wizard).
            'shifts'                     => 'nullable|array|max:100',
            'shifts.*.title'             => 'nullable|string|max:100',
            'shifts.*.notes'             => 'nullable|string|max:1000',
            'shifts.*.start_time'        => 'required_with:shifts|date_format:Y-m-d H:i:s',
            'shifts.*.end_time'          => 'required_with:shifts|date_format:Y-m-d H:i:s',
            'shifts.*.capacity'          => 'required_with:shifts|integer|min:1|max:10000',
            'shifts.*.required_skills'   => 'nullable|array',
            'shifts.*.required_skills.*' => 'string|max:100',
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
