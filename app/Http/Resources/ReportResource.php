<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    /**
     * Transform a Report model into its safe API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'org_id'           => $this->org_id,
            'generated_by'     => $this->generated_by,
            'period'           => $this->period,
            'total_volunteers' => (int) $this->total_volunteers,
            'total_hours'      => (float) $this->total_hours,
            'status'           => $this->status ?? 'completed',
            'download_url'     => $this->file_path ? url($this->file_path) : null,
            'created_at'       => $this->created_at->toDateTimeString(),
        ];
    }
}
