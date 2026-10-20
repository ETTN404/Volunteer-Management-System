<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Volunteer extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'skills',
        'skills_verification',
        'date_of_birth',
        'parental_consent_verified',
        'availability',
        'total_hours',
        'impact_score',
        'bio',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'skills' => 'array',
            'skills_verification' => 'array',
            'date_of_birth' => 'date',
            'parental_consent_verified' => 'boolean',
            'availability' => 'array',
            'total_hours' => 'decimal:2',
            'impact_score' => 'decimal:2',
            'bio' => 'encrypted', // Task 9.2.2.1: PII Protection - encrypt sensitive volunteer bio at rest
        ];
    }

    /**
     * Get the user account for this volunteer.
     */
    public function user(): BelongsTo
    {
        // Volunteers work across organizations — never hide their account behind the viewer's tenant scope.
        return $this->belongsTo(User::class, 'user_id')->withoutGlobalScope(Scopes\TenantScope::class);
    }

    public function isMinor(): bool
    {
        return $this->date_of_birth !== null && $this->date_of_birth->age < 18;
    }

    /**
     * Organizations this volunteer is connected to: their home org plus every org
     * whose shifts they applied to or worked.
     *
     * @return array<int>
     */
    public function engagedOrgIds(): array
    {
        $fromShifts = ShiftAssignment::where('volunteer_id', $this->id)
            ->join('shifts', 'shift_assignments.shift_id', '=', 'shifts.id')
            ->join('events', 'shifts.event_id', '=', 'events.id')
            ->distinct()
            ->pluck('events.org_id')
            ->all();

        $home = $this->user?->org_id;

        return array_values(array_unique(array_filter(array_merge($fromShifts, [$home]))));
    }

    /** Volunteers an organization may see: members, or anyone who applied to its shifts. */
    public function scopeEngagedWith($query, int $orgId)
    {
        return $query->where(function ($q) use ($orgId) {
            $q->whereIn('volunteers.user_id', User::withoutGlobalScopes()->where('org_id', $orgId)->select('id'))
              ->orWhereIn('volunteers.id', ShiftAssignment::query()
                  ->join('shifts', 'shift_assignments.shift_id', '=', 'shifts.id')
                  ->join('events', 'shifts.event_id', '=', 'events.id')
                  ->where('events.org_id', $orgId)
                  ->select('shift_assignments.volunteer_id'));
        });
    }

    public function documents(): HasMany
    {
        return $this->hasMany(VolunteerDocument::class, 'volunteer_id');
    }

    /**
     * Get the shift assignments for the volunteer.
     */
    public function shiftAssignments(): HasMany
    {
        return $this->hasMany(ShiftAssignment::class, 'volunteer_id');
    }

    /**
     * Get the attendances tracked for the volunteer.
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'volunteer_id');
    }

    /**
     * Get the certificates earned by the volunteer.
     */
    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class, 'volunteer_id');
    }

    /**
     * Get the chatbot sessions logged for the volunteer.
     */
    public function chatbotSessions(): HasMany
    {
        return $this->hasMany(ChatbotSession::class, 'volunteer_id');
    }

    /**
     * Calculate and return the live reliability metrics for the volunteer.
     */
    public function getReliabilityMetrics(): array
    {
        // Fetch all confirmed scheduled shifts
        $totalConfirmed = $this->shiftAssignments()->where('status', 'confirmed')->count();

        if ($totalConfirmed === 0) {
            return [
                'attendance_rate' => 100.00, // Perfect score if no shifts assigned yet
                'on_time_rate' => 100.00,
                'total_confirmed_shifts' => 0,
            ];
        }

        // Count shifts where they actually checked in
        $attendedCount = Attendance::where('volunteer_id', $this->id)->count();

        // Punctuality check: let's assume if checked in before or equal to shift start time, they are on time
        $onTimeCount = Attendance::where('volunteer_id', $this->id)
            ->join('shifts', 'attendances.shift_id', '=', 'shifts.id')
            ->whereRaw('attendances.check_in_time <= shifts.start_time')
            ->count();

        $attendanceRate = round(($attendedCount / $totalConfirmed) * 100, 2);
        // Cap attendance rate at 100% just in case of seeding anomalies
        $attendanceRate = min(100.00, $attendanceRate);

        $onTimeRate = $attendedCount > 0 ? round(($onTimeCount / $attendedCount) * 100, 2) : 100.00;

        return [
            'attendance_rate' => $attendanceRate,
            'on_time_rate' => $onTimeRate,
            'total_confirmed_shifts' => $totalConfirmed,
            'total_attended_shifts' => $attendedCount,
        ];
    }

    /**
     * Calculate skillset dimension ratings for visual Spider/Radar Charts.
     */
    public function getSkillsAlignment(): array
    {
        $skills = array_map('strtolower', $this->skills ?? []);

        // Default dimensions
        $dimensions = [
            'Medical' => 20,
            'Logistics' => 20,
            'Crisis_Management' => 20,
            'Heavy_Lifting' => 20,
            'Leadership' => 20,
        ];

        // Dynamically boost dimension metrics based on skillset tags
        if (in_array('first_aid', $skills) || in_array('medical', $skills) || in_array('nurse', $skills)) {
            $dimensions['Medical'] += 75;
            $dimensions['Crisis_Management'] += 60;
        }

        if (in_array('disaster_response', $skills) || in_array('crisis', $skills)) {
            $dimensions['Crisis_Management'] += 70;
            $dimensions['Logistics'] += 45;
            $dimensions['Leadership'] += 35;
        }

        if (in_array('teaching', $skills) || in_array('storytelling', $skills)) {
            $dimensions['Leadership'] += 60;
        }

        if (in_array('translation', $skills)) {
            $dimensions['Logistics'] += 40;
            $dimensions['Leadership'] += 20;
        }

        // Cap all dimensions at 100
        foreach ($dimensions as $key => $val) {
            $dimensions[$key] = min(100, $val);
        }

        return $dimensions;
    }
}
