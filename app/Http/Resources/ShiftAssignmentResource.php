<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftAssignmentResource extends JsonResource
{
    /**
     * Transform a ShiftAssignment model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'shift_id'     => $this->shift_id,
            'volunteer_id' => $this->volunteer_id,
            'status'       => $this->status,
            'decline_reason' => in_array($this->status, ['rejected', 'cancelled', 'removed'], true) ? $this->coordinator_feedback : null,
            'match_score'  => $this->match_score,
            'applied_at'   => $this->created_at->toDateTimeString(),

            // Conditionally load nested shift if eager-loaded
            'shift'        => $this->whenLoaded('shift', fn () =>
                new ShiftResource($this->shift)
            ),

            // Volunteer's own attendance on this shift (schedule view)
            'attendance'   => $this->when(isset($this->attendance_summary), fn () => $this->attendance_summary),

            // Conditionally load volunteer if eager-loaded
            'volunteer'    => $this->whenLoaded('volunteer', fn () =>
                new VolunteerResource($this->volunteer)
            ),
        ];
    }
}
