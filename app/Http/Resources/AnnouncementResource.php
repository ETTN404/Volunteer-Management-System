<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    /**
     * Transform an Announcement model into its API representation.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'org_id'          => $this->org_id,
            'posted_by'       => $this->posted_by,
            'title'           => $this->title,
            'message'         => $this->message,
            'target_audience' => $this->target_audience,
            'created_at'      => $this->created_at->toDateTimeString(),

            // Conditionally load poster user if eager-loaded
            'poster'          => $this->whenLoaded('poster', fn () => [
                'id'        => $this->poster->id,
                'full_name' => $this->poster->full_name,
            ]),
        ];
    }
}
