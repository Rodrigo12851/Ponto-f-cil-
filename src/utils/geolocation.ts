import { CompanyGeofence, LocationData } from '../types';

export const DEFAULT_GEOFENCE: CompanyGeofence = {
  name: 'Sede da Empresa - São Paulo',
  latitude: -23.561684,
  longitude: -46.655981,
  radiusMeters: 200,
  address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
  shapeType: 'SQUARE',
  enforceGeofence: true,
  squarePerimeter: {
    northLat: -23.560684,
    southLat: -23.562684,
    eastLng: -46.654981,
    westLng: -46.656981,
    widthMeters: 200,
    heightMeters: 200,
  },
};

// Calculate distance between two GPS coordinates in meters (Haversine formula)
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Ray-casting point-in-polygon check for 4-point property boundary
export function isPointInPolygon(
  latitude: number,
  longitude: number,
  polygonPoints: { lat: number; lng: number }[]
): boolean {
  if (!polygonPoints || polygonPoints.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = polygonPoints[i].lat;
    const yi = polygonPoints[i].lng;
    const xj = polygonPoints[j].lat;
    const yj = polygonPoints[j].lng;
    const intersect =
      yi > longitude !== yj > longitude &&
      latitude < ((xj - xi) * (longitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function getCurrentLocation(
  geofence: CompanyGeofence = DEFAULT_GEOFENCE,
  simulateExternal: boolean = false
): Promise<LocationData> {
  return new Promise((resolve) => {
    if (simulateExternal) {
      resolve({
        latitude: geofence.latitude + 0.02,
        longitude: geofence.longitude + 0.02,
        address: 'Rua das Flores, 341 (Trabalho Externo / Home Office)',
        inGeofence: false,
        distanceMeters: 480,
      });
      return;
    }

    // Attempt real browser GPS if supported
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;

          const dist = calculateDistanceMeters(
            uLat,
            uLng,
            geofence.latitude,
            geofence.longitude
          );

          let inFence = false;

          const customPts = geofence.customPoints || geofence.squarePerimeter?.points;
          if (customPts && customPts.length >= 3) {
            inFence = isPointInPolygon(uLat, uLng, customPts);
          }

          if (!inFence && geofence.squarePerimeter) {
            const { northLat, southLat, eastLng, westLng } = geofence.squarePerimeter;
            const minLat = Math.min(southLat, northLat);
            const maxLat = Math.max(southLat, northLat);
            const minLng = Math.min(westLng, eastLng);
            const maxLng = Math.max(westLng, eastLng);

            inFence = uLat >= minLat && uLat <= maxLat && uLng >= minLng && uLng <= maxLng;
          }

          if (!inFence && dist <= (geofence.radiusMeters || 200)) {
            inFence = true;
          }

          resolve({
            latitude: uLat,
            longitude: uLng,
            address: inFence ? geofence.address : 'Sua Localização GPS Atual',
            inGeofence: inFence,
            distanceMeters: dist,
          });
        },
        () => {
          // Fallback to company headquarters center if GPS permission not granted
          resolve({
            latitude: geofence.latitude,
            longitude: geofence.longitude,
            address: geofence.address,
            inGeofence: true,
            distanceMeters: 0,
          });
        },
        { timeout: 6000, maximumAge: 30000 }
      );
      return;
    }

    // Default to company headquarters
    resolve({
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      address: geofence.address,
      inGeofence: true,
      distanceMeters: 0,
    });
  });
}
