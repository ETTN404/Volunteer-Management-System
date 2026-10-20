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
        'hours_status',
        'verified_hours',
        'verified_by',
        'verified_at',
        'verification_note',
        'check_in_method',
        'check_out_method',
        'check_out_reason',
        'checked_in_by',
        'checked_out_by',
        'check_in_accuracy',
        'device_id',
        'flags',
    ];

    protected $hidden = ['signature_data'];

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
            'verified_at' => 'datetime',
            'verified_hours' => 'decimal:2',
            'flags' => 'array',
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

    public function pings()
    {
        return $this->hasMany(AttendancePing::class, 'attendance_id');
    }

    /** Raw hours between check-in and check-out (or now while still on shift). */
    public function rawHours(): float
    {
        if (!$this->check_in_time) {
            return 0.0;
        }
        $end = $this->check_out_time ?? now();
        return round(max(0, $this->check_in_time->diffInMinutes($end)) / 60, 2);
    }

    public function addFlag(string $flag): void
    {
        $flags = $this->flags ?? [];
        if (!in_array($flag, $flags, true)) {
            $flags[] = $flag;
            $this->flags = $flags;
        }
    }
}
