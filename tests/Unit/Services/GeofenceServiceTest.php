<?php

namespace Tests\Unit\Services;

use App\Models\Event;
use App\Services\GeofenceService;
use Tests\TestCase;

class GeofenceServiceTest extends TestCase
{
    private GeofenceService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new GeofenceService();
    }

    public function test_calculate_distance_returns_accurate_haversine_meters(): void
    {
        // Addis Ababa National Theatre (9.0182, 38.7525) to nearby location (~100m away)
        $distance = $this->service->calculateDistance(9.0182, 38.7525, 9.0189, 38.7528);

        $this->assertGreaterThan(50, $distance);
        $this->assertLessThan(150, $distance);
    }

    public function test_is_within_geofence_returns_true_when_within_radius(): void
    {
        $event = new Event([
            'latitude'        => 9.0182,
            'longitude'       => 38.7525,
            'geofence_radius' => 150,
        ]);

        // Volunteer location ~80m away
        $within = $this->service->isWithinGeofence(9.0185, 38.7525, $event);
        $this->assertTrue($within);
    }

    public function test_is_within_geofence_returns_false_when_outside_radius(): void
    {
        $event = new Event([
            'latitude'        => 9.0182,
            'longitude'       => 38.7525,
            'geofence_radius' => 100,
        ]);

        // Volunteer location ~1km away
        $within = $this->service->isWithinGeofence(9.0282, 38.7525, $event);
        $this->assertFalse($within);
    }
}
