<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportMessage extends Model
{
    protected $fillable = ['thread_id', 'user_id', 'side', 'body'];

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id')->withoutGlobalScopes();
    }
}
