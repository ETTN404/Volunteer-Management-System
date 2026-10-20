<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationDocument extends Model
{
    public const TYPES = ['registration_certificate', 'tax_certificate', 'operating_license', 'other'];

    protected $fillable = [
        'org_id', 'document_type', 'title', 'file_path', 'mime_type', 'file_size_bytes',
        'status', 'review_notes', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime', 'file_size_bytes' => 'integer'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }
}
