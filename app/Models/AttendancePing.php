<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendancePing extends Model
{
    public $timestamps = false;

    protected $fillable = ['attendance_id', 'latitude', 'longitude', 'accuracy', 'distance_m', 'inside', 'created_at'];

    protected function casts(): array
    {
        return ['inside' => 'boolean', 'created_at' => 'datetime'];
    }
}
