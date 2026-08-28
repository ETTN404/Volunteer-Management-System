<?php

namespace App\Services;

use App\Models\Shift;
use App\Models\Volunteer;
use Illuminate\Support\Collection;

class SkillMatchingService
{
    /**
     * Calculate a 0–100 match score between a volunteer's skills and
     * a shift's required skills.
     *
     * Rules:
     *  - If the shift requires NO skills → perfect score of 100.00
     *  - Otherwise → percentage of required skills the volunteer covers
     *
     * @param array $volunteerSkills Skills from volunteer profile
     * @param array $requiredSkills  Skills required by the shift
     * @return float Score between 0.00 and 100.00
     */
    public function calculateMatchScore(array $volunteerSkills, array $requiredSkills): float
    {
        if (empty($requiredSkills)) {
            return 100.00; // No requirements → everyone qualifies
        }

        $volunteerNormalized = array_map('strtolower', $volunteerSkills);
        $requiredNormalized  = array_map('strtolower', $requiredSkills);

        $matched = count(array_intersect($volunteerNormalized, $requiredNormalized));
        $total   = count($requiredNormalized);

        return round(($matched / $total) * 100, 2);
    }

    /**
     * Return a ranked collection of volunteers for a given shift,
     * ordered by match score descending.
     *
     * Each volunteer in the returned collection gains a `match_score`
     * virtual attribute.
     *
     * @param Shift $shift The shift to rank volunteers for
     * @return Collection Volunteers sorted by match score DESC
     */
    public function rankVolunteersForShift(Shift $shift): Collection
    {
        $required = array_map('strtolower', $shift->required_skills ?? []);

        return Volunteer::with('user')
            ->get()
            ->map(function (Volunteer $volunteer) use ($required) {
                $volunteer->match_score = $this->calculateMatchScore(
                    $volunteer->skills ?? [],
                    $required
                );
                return $volunteer;
            })
            ->sortByDesc('match_score')
            ->values();
    }

    /**
     * Assess whether a specific volunteer is eligible for a shift,
     * and return which skills are missing if not.
     *
     * @param Volunteer $volunteer
     * @param Shift     $shift
     * @return array{eligible: bool, match_score: float, missing_skills: array}
     */
    public function assessEligibility(Volunteer $volunteer, Shift $shift): array
    {
        $required         = array_map('strtolower', $shift->required_skills ?? []);
        $volunteerSkills  = array_map('strtolower', $volunteer->skills ?? []);
        $missingSkills    = array_values(array_diff($required, $volunteerSkills));
        $score            = $this->calculateMatchScore($volunteerSkills, $required);

        return [
            'eligible'      => empty($missingSkills),
            'match_score'   => $score,
            'missing_skills' => array_map('ucfirst', $missingSkills),
        ];
    }
}
