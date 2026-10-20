<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationReport extends Model
{
    public const CATEGORIES = ['fraud_or_scam', 'unsafe_conditions', 'harassment', 'misleading_event', 'payment_requested', 'other'];

    protected $fillable = ['org_id', 'event_id', 'reporter_id', 'category', 'details', 'status', 'resolution_note', 'resolved_by', 'resolved_at'];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id')->withoutGlobalScopes();
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id')->withoutGlobalScopes();
    }
}
