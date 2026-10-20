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
            'organization'     => $this->whenLoaded('organization', fn () => $this->organization ? [
                'id'                  => $this->organization->id,
                'name'                => $this->organization->name,
                'logo_url'            => app(\App\Services\FileStore::class)->url($this->organization->logo_path),
                'primary_color'       => $this->organization->primary_color,
                'city'                => $this->organization->city,
                'country'             => $this->organization->country,
                'verification_status' => $this->organization->verification_status,
            ] : null),
            'created_at'       => $this->created_at->toDateTimeString(),

            // Conditionally include shifts if eager-loaded
            'shifts'           => ShiftResource::collection($this->whenLoaded('shifts')),

            // Optional virtual attribute from SkillMatchingService
            'match_score'      => $this->when(isset($this->match_score), $this->match_score ?? null),
        ];
    }
}
