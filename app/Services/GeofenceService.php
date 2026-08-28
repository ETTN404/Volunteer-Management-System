<?php

namespace App\Services;

use App\Models\Event;

class GeofenceService
{
    /**
     * Haversine formula — calculates the surface distance in meters
     * between two GPS coordinate pairs on a spherical Earth.
     *
     * @param float $lat1  Volunteer's latitude
     * @param float $lon1  Volunteer's longitude
     * @param float $lat2  Event venue latitude
     * @param float $lon2  Event venue longitude
     * @return float Distance in meters
     */
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meters

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Determine if a volunteer's GPS position is within the event's geofence.
     *
     * Uses the event's own geofence_radius if set, otherwise falls back
     * to the system default defined in config/vms.php.
     *
     * @param float $vLat  Volunteer latitude
     * @param float $vLon  Volunteer longitude
     * @param Event $event The event model instance
     * @return bool True if within geofence
     */
    public function isWithinGeofence(float $vLat, float $vLon, Event $event): bool
    {
        // Use per-event radius if set; otherwise use system config default
        $radius = $event->geofence_radius ?? config('vms.geofence_default_radius', 100);

        $distance = $this->calculateDistance($vLat, $vLon, (float) $event->latitude, (float) $event->longitude);

        return $distance <= $radius;
    }

    /**
     * Return the distance from the volunteer to the event venue in meters.
     * Useful for generating specific rejection messages in controllers.
     *
     * @param float $lat  Volunteer latitude
     * @param float $lon  Volunteer longitude
     * @param Event $event The event model instance
     * @return float Distance in meters
     */
    public function getDistanceFromVenue(float $lat, float $lon, Event $event): float
    {
        return $this->calculateDistance($lat, $lon, (float) $event->latitude, (float) $event->longitude);
    }
}
