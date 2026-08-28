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
            'phone'             => $this->phone,
            'website'           => $this->website,
            'status'            => $this->status,
            'subscription_plan' => $this->subscription_plan,
            'logo_url'          => $this->logo_path
                ? asset('storage/' . $this->logo_path)
                : null,
            'created_at'        => $this->created_at->toDateTimeString(),
        ];
    }
}
