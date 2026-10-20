<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VolunteerDocument extends Model
{
    public const TYPES = ['certification', 'id_proof', 'parental_consent', 'medical_clearance', 'other'];

    protected $fillable = [
        'org_id', 'volunteer_id', 'document_type', 'title', 'file_path', 'mime_type', 'file_size_bytes',
        'verification_status', 'coordinator_notes', 'verified_by', 'verified_at',
    ];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime', 'file_size_bytes' => 'integer'];
    }

    public function volunteer()
    {
        return $this->belongsTo(Volunteer::class);
    }
}
