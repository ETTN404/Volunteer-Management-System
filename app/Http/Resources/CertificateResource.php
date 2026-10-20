<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CertificateResource extends JsonResource
{
    /**
     * Transform a Certificate model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'certificate_number' => $this->certificate_number ?: 'VMS-' . str_pad((string) $this->id, 5, '0', STR_PAD_LEFT),
            'organization_name'  => $this->relationLoaded('organization') ? $this->organization?->name : null,
            'volunteer_id'    => $this->volunteer_id,
            'org_id'          => $this->org_id,
            'issued_date'     => $this->issued_date,
            'milestone_hours' => (float) $this->milestone_hours,
            'download_url'    => url($this->file_path),
            'created_at'      => $this->created_at->toDateTimeString(),
        ];
    }
}
