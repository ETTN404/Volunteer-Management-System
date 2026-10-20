<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Shift extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'title',
        'notes',
        'start_time',
        'end_time',
        'required_skills',
        'capacity',
        'qr_code_signature',
        'qr_secret',
        'qr_expires_at',
    ];

    protected $hidden = ['qr_secret', 'qr_code_signature'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'required_skills' => 'array',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'qr_expires_at' => 'datetime',
        ];
    }

    /**
     * Get the event that owns the shift.
     */
    public function event(): BelongsTo
    {
        // Volunteers of any organization reach shifts; callers check access explicitly.
        return $this->belongsTo(Event::class, 'event_id')->withoutGlobalScope(Scopes\TenantScope::class);
    }

    /** Shifts whose event belongs to the given organization. */
    public function scopeForOrg($query, ?int $orgId)
    {
        return $query->whereIn('shifts.event_id', Event::withoutGlobalScopes()->where('org_id', $orgId)->select('id'));
    }

    /** Find a shift owned by the signed-in staff member's organization, or 404. */
    public static function findForStaffOrFail($id): self
    {
        return static::query()->forOrg(auth()->user()->org_id)->with('event')->findOrFail($id);
    }

    public function confirmedCount(): int
    {
        return $this->shiftAssignments()->where('status', 'confirmed')->count();
    }

    /**
     * Get the assignments for the shift.
     */
    public function shiftAssignments(): HasMany
    {
        return $this->hasMany(ShiftAssignment::class, 'shift_id');
    }

    /**
     * Get the attendances recorded for the shift.
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'shift_id');
    }
}
