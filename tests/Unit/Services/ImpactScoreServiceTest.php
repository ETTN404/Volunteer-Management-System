<?php

namespace Tests\Unit\Services;

use App\Models\Attendance;
use App\Models\Shift;
use App\Models\Volunteer;
use App\Services\ImpactScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImpactScoreServiceTest extends TestCase
{
    use RefreshDatabase;
    private ImpactScoreService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ImpactScoreService();
    }

    public function test_check_milestones_detects_crossed_thresholds(): void
    {
        $volunteer = new Volunteer(['total_hours' => 28.00]);

        // Previous hours: 8.0h -> New hours: 28.0h
        // Crossed milestones: 10h and 25h
        $milestones = $this->service->checkMilestones($volunteer, 8.00, 28.00);

        $this->assertEquals([10, 25], $milestones);
    }

    public function test_check_milestones_returns_empty_when_no_threshold_crossed(): void
    {
        $volunteer = new Volunteer(['total_hours' => 18.00]);

        // Previous hours: 12.0h -> New hours: 18.0h (no milestone between 10 and 25)
        $milestones = $this->service->checkMilestones($volunteer, 12.00, 18.00);

        $this->assertEmpty($milestones);
    }

    public function test_calculate_increment_includes_base_rate(): void
    {
        $volunteer  = new Volunteer(['id' => 1, 'skills' => []]);
        $attendance = new Attendance(['check_in_time' => '2026-08-28 10:00:00', 'check_out_time' => '2026-08-28 15:00:00']);
        $shift      = new Shift(['start_time' => '2026-08-28 10:00:00', 'required_skills' => []]);

        // 5 hours * 0.1 base = 0.5 pts (+ 15% punctuality bonus since check in on time)
        $increment = $this->service->calculateIncrement($volunteer, $attendance, $shift);

        $this->assertGreaterThan(0.5, $increment);
    }
}
