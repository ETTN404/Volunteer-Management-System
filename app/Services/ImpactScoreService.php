<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Shift;
use App\Models\Volunteer;
use Carbon\Carbon;

class ImpactScoreService
{
    /**
     * Calculate the impact score increment earned for a completed shift attendance.
     *
     * Base formula: 0.1 points per hour (from config/vms.php)
     *
     * Bonus multipliers applied on top:
     *   +20% if shift required 3 or more skills
     *   +15% if volunteer checked in before or exactly at shift start (on-time)
     *   +10% if volunteer's historical attendance rate is >= 90%
     *
     * The total result is capped so that volunteer.impact_score never exceeds 100.
     *
     * @param Volunteer  $volunteer  The volunteer who just checked out
     * @param Attendance $attendance The attendance record being closed
     * @param Shift      $shift      The shift being completed
     * @return float Points to add (already respects cap)
     */
    public function calculateIncrement(Volunteer $volunteer, Attendance $attendance, Shift $shift): float
    {
        $checkIn  = Carbon::parse($attendance->check_in_time);
        $checkOut = Carbon::parse($attendance->check_out_time ?? now());

        $durationHours = round($checkIn->diffInMinutes($checkOut) / 60, 2);

        $ratePerHour = config('vms.impact_score_per_hour', 0.10);
        $base        = $durationHours * $ratePerHour;
        $multiplier  = 1.0;

        // Bonus 1: high-skill shift
        if (count($shift->required_skills ?? []) >= 3) {
            $multiplier += 0.20;
        }

        // Bonus 2: on-time check-in
        $shiftStart = Carbon::parse($shift->start_time);
        if ($checkIn->lessThanOrEqualTo($shiftStart)) {
            $multiplier += 0.15;
        }

        // Bonus 3: attendance rate >= 90%
        if ($this->getAttendanceRate($volunteer) >= 90.0) {
            $multiplier += 0.10;
        }

        $increment = round($base * $multiplier, 2);
        $cap       = config('vms.impact_score_max', 100.00);
        $remaining = max(0, $cap - $volunteer->impact_score);

        return min($increment, $remaining);
    }

    /**
     * Detect which certificate milestones a volunteer has newly crossed.
     *
     * Example: if prevHours = 9.5 and newHours = 11.0, the 10-hour milestone
     * was just crossed and this method returns [10].
     *
     * These milestones trigger GenerateCertificateJob dispatch in Phase 5.
     *
     * @param Volunteer $volunteer
     * @param float     $prevHours  Hours before this checkout
     * @param float     $newHours   Hours after  this checkout
     * @return array    Milestone values that were newly crossed (may be empty)
     */
    public function checkMilestones(Volunteer $volunteer, float $prevHours, float $newHours): array
    {
        $milestones = config('vms.certificate_milestones', [10, 25, 50, 100, 200, 500]);

        return array_values(array_filter($milestones, function (int $milestone) use ($prevHours, $newHours) {
            return $prevHours < $milestone && $newHours >= $milestone;
        }));
    }

    /**
     * Compute the volunteer's historical attendance rate as a percentage.
     *
     * Rate = (confirmed attended shifts / total confirmed assignments) * 100
     * Returns 0 if the volunteer has no confirmed assignments.
     *
     * @param Volunteer $volunteer
     * @return float Percentage 0–100
     */
    private function getAttendanceRate(Volunteer $volunteer): float
    {
        $confirmed = $volunteer->shiftAssignments()
            ->where('status', 'confirmed')
            ->count();

        if ($confirmed === 0) {
            return 0.0;
        }

        $attended = Attendance::where('volunteer_id', $volunteer->id)
            ->whereNotNull('check_out_time')
            ->count();

        return round(($attended / $confirmed) * 100, 2);
    }
}
