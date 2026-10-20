<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportThread extends Model
{
    protected $fillable = ['org_id', 'subject', 'status', 'started_by_side', 'created_by', 'unread_platform', 'unread_org', 'last_message_at'];

    protected function casts(): array
    {
        return ['unread_platform' => 'boolean', 'unread_org' => 'boolean', 'last_message_at' => 'datetime'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function messages()
    {
        return $this->hasMany(SupportMessage::class, 'thread_id')->orderBy('id');
    }
}
