<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform a User model into its safe, consistent API representation.
     * Password, remember_token, and deleted_at are never exposed.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'org_id'              => $this->org_id,
            'full_name'           => $this->full_name,
            'email'               => $this->email,
            'role'                => $this->role,
            'is_active'           => $this->is_active,
            'profile_photo_url'   => $this->profile_photo_path
                ? asset('storage/' . $this->profile_photo_path)
                : null,
            'last_login'          => $this->last_login?->toDateTimeString(),
            'created_at'          => $this->created_at->toDateTimeString(),

            // Conditionally load nested volunteer profile if eager-loaded
            'volunteer'           => $this->whenLoaded('volunteer', fn () =>
                new VolunteerResource($this->volunteer)
            ),

            // Conditionally load organization if eager-loaded
            'organization'        => $this->whenLoaded('organization', fn () =>
                new OrganizationResource($this->organization)
            ),
        ];
    }
}
