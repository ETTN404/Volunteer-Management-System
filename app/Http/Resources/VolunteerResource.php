<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VolunteerResource extends JsonResource
{
    /**
     * Transform a Volunteer model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'skills'        => $this->skills ?? [],
            'availability'  => $this->availability ?? [],
            'bio'           => $this->bio,
            'total_hours'   => (float) $this->total_hours,
            'impact_score'  => (float) $this->impact_score,
            'created_at'    => $this->created_at->toDateTimeString(),

            // Conditionally load nested user profile if eager-loaded
            'user'          => $this->whenLoaded('user', fn () =>
                new UserResource($this->user)
            ),
        ];
    }
}
