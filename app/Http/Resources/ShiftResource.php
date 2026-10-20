<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftResource extends JsonResource
{
    /**
     * Transform a Shift model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'event_id'           => $this->event_id,
            'title'              => $this->title,
            'notes'              => $this->notes,
            'start_time'         => $this->start_time,
            'end_time'           => $this->end_time,
            'required_skills'    => $this->required_skills ?? [],
            'capacity'           => $this->capacity,
            'confirmed_count'    => $this->confirmed_count ?? $this->shiftAssignments()->where('status', 'confirmed')->count(),
            'pending_count'      => $this->when(isset($this->pending_count), fn () => (int) $this->pending_count),
            'qr_expires_at'      => $this->qr_expires_at,
            'created_at'         => $this->created_at->toDateTimeString(),

            // Conditionally include nested event if eager-loaded
            'event'              => $this->whenLoaded('event', fn () =>
                new EventResource($this->event)
            ),

            // Optional virtual attribute from SkillMatchingService
            'match_score'        => $this->when(isset($this->match_score), $this->match_score ?? null),
        ];
    }
}
