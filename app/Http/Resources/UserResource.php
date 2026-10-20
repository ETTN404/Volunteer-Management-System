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
            'first_name'          => $this->first_name,
            'last_name'           => $this->last_name,
            'phone'               => $this->phone,
            'must_change_password'=> (bool) $this->must_change_password,
            'email_verified_at'   => $this->email_verified_at?->toDateTimeString(),
            'email'               => $this->email,
            'role'                => $this->role,
            'is_active'           => $this->is_active === null ? true : (bool) $this->is_active,
            'profile_photo_url'   => app(\App\Services\FileStore::class)->url($this->profile_photo_path),
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
