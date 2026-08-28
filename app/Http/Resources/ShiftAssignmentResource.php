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
            'applied_at'   => $this->created_at->toDateTimeString(),

            // Conditionally load nested shift if eager-loaded
            'shift'        => $this->whenLoaded('shift', fn () =>
                new ShiftResource($this->shift)
            ),

            // Conditionally load volunteer if eager-loaded
            'volunteer'    => $this->whenLoaded('volunteer', fn () =>
                new VolunteerResource($this->volunteer)
            ),
        ];
    }
}
