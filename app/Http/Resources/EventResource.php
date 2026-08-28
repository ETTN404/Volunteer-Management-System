<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    /**
     * Transform an Event model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'org_id'           => $this->org_id,
            'title'            => $this->title,
            'description'      => $this->description,
            'location'         => $this->location,
            'coordinates'      => [
                'latitude'  => $this->latitude  ? (float) $this->latitude  : null,
                'longitude' => $this->longitude ? (float) $this->longitude : null,
            ],
            'geofence_radius'  => $this->geofence_radius ?? config('vms.geofence_default_radius', 100),
            'start_date'       => $this->start_date?->toDateString(),
            'end_date'         => $this->end_date?->toDateString(),
            'status'           => $this->status,
            'created_at'       => $this->created_at->toDateTimeString(),

            // Conditionally include shifts if eager-loaded
            'shifts'           => ShiftResource::collection($this->whenLoaded('shifts')),

            // Optional virtual attribute from SkillMatchingService
            'match_score'      => $this->when(isset($this->match_score), $this->match_score ?? null),
        ];
    }
}
