import { CompanyGeofence, LocationData } from '../types';
import { validatePunchLocationWithTrustedWifi } from './wifiValidator';

export const DEFAULT_GEOFENCE: CompanyGeofence = {
  name: 'Sede da Empresa - São Paulo',
  latitude: -23.561684,
  longitude: -46.655981,
  radiusMeters: 200,
  address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
  shapeType: 'SQUARE',
  enforceGeofence: true,
  wifiEnabled: true,
  wifiSsid: 'WIFI_EMPRESA_SEDE',
  wifiPassword: '',
  trustedWifiEnabled: true,
  trustedWifiSsid: 'WIFI_EMPRESA_SEDE',
  trustedWifiSsids: ['WIFI_EMPRESA_SEDE', 'REDE_ESCRITORIO_5G', 'SUPERMERCADO_CAIXAS_WIFI'],
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

export async function fetchAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await res.json();
    if (data && data.display_name) {
      // Create a shorter, cleaner address string if possible
      const addr = data.address;
      if (addr) {
        const road = addr.road || addr.pedestrian || addr.suburb || '';
        const houseNumber = addr.house_number ? `, ${addr.house_number}` : '';
        const city = addr.city || addr.town || addr.village || addr.municipality || '';
        const state = addr.state ? ` - ${addr.state}` : '';
        if (road) return `${road}${houseNumber} (${city}${state})`;
      }
      return data.display_name;
    }
  } catch (e) {
    console.warn('Reverse geocoding error:', e);
  }
  return `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

export async function getCurrentLocation(
  geofence: CompanyGeofence = DEFAULT_GEOFENCE,
  simulateExternal: boolean = false,
  connectedSsid: string = 'WIFI_EMPRESA_SEDE'
): Promise<LocationData> {
  return new Promise((resolve) => {
    if (simulateExternal) {
      const rawExternalLoc: LocationData = {
        latitude: geofence.latitude + 0.02,
        longitude: geofence.longitude + 0.02,
        address: 'Rua das Flores, 341 (Trabalho Externo / Home Office)',
        inGeofence: false,
        distanceMeters: 480,
      };
      // If connected to a trusted Wi-Fi, validate location despite simulated GPS drift
      resolve(validatePunchLocationWithTrustedWifi(rawExternalLoc, connectedSsid, geofence));
      return;
    }

    // Attempt real browser GPS if supported
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
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
            const minLat = Math.min(southLat, northLat) - 0.0005; // ~50m tolerance
            const maxLat = Math.max(southLat, northLat) + 0.0005;
            const minLng = Math.min(westLng, eastLng) - 0.0005;
            const maxLng = Math.max(westLng, eastLng) + 0.0005;

            inFence = uLat >= minLat && uLat <= maxLat && uLng >= minLng && uLng <= maxLng;
          }

          const toleranceRadius = Math.max(geofence.radiusMeters || 200, 150);
          if (!inFence && dist <= toleranceRadius) {
            inFence = true;
          }

          let formattedAddress = geofence.address;
          if (!inFence) {
            formattedAddress = await fetchAddressFromCoords(uLat, uLng);
          }

          const rawLoc: LocationData = {
            latitude: uLat,
            longitude: uLng,
            address: formattedAddress,
            inGeofence: inFence,
            distanceMeters: dist,
          };

          resolve(validatePunchLocationWithTrustedWifi(rawLoc, connectedSsid, geofence));
        },
        () => {
          // Fallback to company headquarters center if GPS permission not granted
          const fallbackLoc: LocationData = {
            latitude: geofence.latitude,
            longitude: geofence.longitude,
            address: geofence.address,
            inGeofence: true,
            distanceMeters: 0,
          };
          resolve(validatePunchLocationWithTrustedWifi(fallbackLoc, connectedSsid, geofence));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return;
    }

    // Default to company headquarters
    const defaultLoc: LocationData = {
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      address: geofence.address,
      inGeofence: true,
      distanceMeters: 0,
    };
    resolve(validatePunchLocationWithTrustedWifi(defaultLoc, connectedSsid, geofence));
  });
}
