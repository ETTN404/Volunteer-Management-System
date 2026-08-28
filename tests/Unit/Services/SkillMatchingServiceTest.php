<?php

namespace Tests\Unit\Services;

use App\Services\SkillMatchingService;
use PHPUnit\Framework\TestCase;

class SkillMatchingServiceTest extends TestCase
{
    private SkillMatchingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SkillMatchingService();
    }

    public function test_returns_100_percent_match_when_shift_requires_no_skills(): void
    {
        $score = $this->service->calculateMatchScore(['First Aid'], []);
        $this->assertEquals(100.0, $score);
    }

    public function test_returns_100_percent_match_when_volunteer_has_all_required_skills(): void
    {
        $volunteerSkills = ['First Aid', 'Teaching', 'Logistics'];
        $requiredSkills  = ['first aid', 'logistics'];

        $score = $this->service->calculateMatchScore($volunteerSkills, $requiredSkills);
        $this->assertEquals(100.0, $score);
    }

    public function test_returns_partial_match_score_for_subset_of_required_skills(): void
    {
        $volunteerSkills = ['First Aid'];
        $requiredSkills  = ['First Aid', 'Teaching'];

        $score = $this->service->calculateMatchScore($volunteerSkills, $requiredSkills);
        $this->assertEquals(50.0, $score);
    }

    public function test_returns_zero_match_score_when_no_skills_overlap(): void
    {
        $volunteerSkills = ['Cooking'];
        $requiredSkills  = ['Medical', 'Disaster Response'];

        $score = $this->service->calculateMatchScore($volunteerSkills, $requiredSkills);
        $this->assertEquals(0.0, $score);
    }
}
