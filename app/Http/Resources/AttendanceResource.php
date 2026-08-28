<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    /**
     * Transform an Attendance model into its API representation.
     * GPS coordinates and raw signature data are excluded from API responses for privacy.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'shift_id'        => $this->shift_id,
            'volunteer_id'    => $this->volunteer_id,
            'check_in_time'   => $this->check_in_time,
            'check_out_time'  => $this->check_out_time,
            'qr_verified'     => (bool) $this->qr_verified,
            'created_at'      => $this->created_at->toDateTimeString(),

            // Conditionally load shift if eager-loaded
            'shift'           => $this->whenLoaded('shift', fn () =>
                new ShiftResource($this->shift)
            ),
        ];
    }
}
