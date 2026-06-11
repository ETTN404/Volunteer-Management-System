<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'shift_id',
        'volunteer_id',
        'check_in_time',
        'check_out_time',
        'qr_verified',
        'signature_data',
        'latitude',
        'longitude',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'check_in_time' => 'datetime',
            'check_out_time' => 'datetime',
            'qr_verified' => 'boolean',
            'latitude' => 'decimal:6',
            'longitude' => 'decimal:6',
        ];
    }

    /**
     * Get the shift the attendance is for.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }

    /**
     * Get the volunteer who checked in.
     */
    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class, 'volunteer_id');
    }
}
