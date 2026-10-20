<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
    /**
     * Transform an Organization model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'address'           => $this->address,
            'country'           => $this->country,
            'city'              => $this->city,
            'primary_color'     => $this->primary_color,
            'subdomain'         => $this->subdomain,
            'verification_status' => $this->verification_status ?? 'verified',
            'verified_at'       => $this->verified_at?->toDateTimeString(),
            'plan_expires_at'   => $this->plan_expires_at?->toDateTimeString(),
            'effective_plan'    => $this->effectivePlan(),
            'settings'          => [
                'attendance' => $this->attendancePolicy(),
            ],
            'phone'             => $this->phone,
            'website'           => $this->website,
            'status'            => $this->status,
            'subscription_plan' => $this->subscription_plan,
            'logo_url'          => app(\App\Services\FileStore::class)->url($this->logo_path),
            'created_at'        => $this->created_at->toDateTimeString(),
        ];
    }
}
