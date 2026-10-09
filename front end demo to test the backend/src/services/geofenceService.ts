/**
 * Geofence Service implementing Haversine formula
 * Reference: VMS Master Plan Section 6.3 & Section 12.2
 */
export class GeofenceService {
  public static readonly DEFAULT_RADIUS_METERS = 100;
  private static readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Standard Haversine distance formula between two lat/lon coordinates in meters
   */
  public static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_METERS * c;

    return Math.round(distance * 10) / 10; // 1 decimal place
  }

  /**
   * Validates if a volunteer's coordinates are within the event geofence radius
   */
  public static isWithinGeofence(
    vLat: number,
    vLon: number,
    venueLat: number,
    venueLon: number,
    customRadiusMeters: number = this.DEFAULT_RADIUS_METERS
  ): {
    isWithin: boolean;
    distanceMeters: number;
    allowedRadiusMeters: number;
  } {
    const distanceMeters = this.calculateDistance(vLat, vLon, venueLat, venueLon);
    const allowedRadiusMeters = customRadiusMeters || this.DEFAULT_RADIUS_METERS;

    return {
      isWithin: distanceMeters <= allowedRadiusMeters,
      distanceMeters,
      allowedRadiusMeters,
    };
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
