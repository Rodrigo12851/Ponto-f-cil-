import { CompanyGeofence, LocationData } from '../types';

/**
 * Normalizes an SSID string for safe comparison (trims whitespace, converts to lowercase)
 */
export function normalizeSsid(ssid?: string | null): string {
  if (!ssid) return '';
  return ssid.trim().toLowerCase();
}

/**
 * Returns all registered trusted Wi-Fi SSIDs from the company geofence settings
 */
export function getRegisteredTrustedSsids(geofence?: CompanyGeofence): string[] {
  if (!geofence) return ['WIFI_EMPRESA_SEDE'];
  const ssids = new Set<string>();

  if (geofence.trustedWifiSsid && geofence.trustedWifiSsid.trim()) {
    ssids.add(geofence.trustedWifiSsid.trim());
  }
  if (geofence.wifiSsid && geofence.wifiSsid.trim()) {
    ssids.add(geofence.wifiSsid.trim());
  }
  if (geofence.trustedWifiSsids && Array.isArray(geofence.trustedWifiSsids)) {
    geofence.trustedWifiSsids.forEach((s) => {
      if (s && s.trim()) ssids.add(s.trim());
    });
  }

  if (ssids.size === 0) {
    ssids.add('WIFI_EMPRESA_SEDE');
  }

  return Array.from(ssids);
}

/**
 * Checks if the given connected SSID matches any administrator-registered trusted Wi-Fi network.
 */
export function isDeviceConnectedToTrustedWifi(
  connectedSsid: string | undefined | null,
  geofence?: CompanyGeofence
): { isTrusted: boolean; matchedSsid?: string; reason: string } {
  if (!connectedSsid) {
    return {
      isTrusted: false,
      reason: 'Dispositivo sem rede Wi-Fi conectada.',
    };
  }

  const isEnabled =
    geofence?.trustedWifiEnabled ?? geofence?.wifiEnabled ?? true;

  if (!isEnabled) {
    return {
      isTrusted: false,
      reason: 'Recurso de Wi-Fi Confiável desativado nas configurações do administrador.',
    };
  }

  const registeredSsids = getRegisteredTrustedSsids(geofence);
  const normalizedConnected = normalizeSsid(connectedSsid);

  const matched = registeredSsids.find(
    (s) => normalizeSsid(s) === normalizedConnected
  );

  if (matched) {
    return {
      isTrusted: true,
      matchedSsid: matched,
      reason: `Dispositivo conectado à rede Wi-Fi homologada (${matched}). Localização validada como confiável.`,
    };
  }

  return {
    isTrusted: false,
    reason: `A rede Wi-Fi atual (${connectedSsid}) não está na lista de redes confiáveis registradas pelo administrador.`,
  };
}

/**
 * Validates location data at the time of punching.
 * If the employee's device is connected to a registered Trusted Wi-Fi network,
 * the location is marked as 'trusted' and 'inGeofence' is set to true REGARDLESS OF GPS DRIFT.
 */
export function validatePunchLocationWithTrustedWifi(
  gpsLocation: LocationData,
  connectedSsid: string | undefined | null,
  geofence?: CompanyGeofence
): LocationData {
  const checkResult = isDeviceConnectedToTrustedWifi(connectedSsid, geofence);

  if (checkResult.isTrusted) {
    // Trusted Wi-Fi overrides GPS drift
    return {
      ...gpsLocation,
      inGeofence: true, // Force valid location regardless of GPS distance/drift
      wifiConnected: true,
      connectedSsid: checkResult.matchedSsid || connectedSsid || 'WIFI_EMPRESA_SEDE',
      wifiValidated: true,
      isTrustedWifi: true,
      trustedWifiName: checkResult.matchedSsid || connectedSsid || 'WIFI_EMPRESA_SEDE',
      address: gpsLocation.inGeofence
        ? gpsLocation.address
        : `${gpsLocation.address} (Validado via Wi-Fi Confiável: ${checkResult.matchedSsid})`,
    };
  }

  return {
    ...gpsLocation,
    wifiConnected: !!connectedSsid,
    connectedSsid: connectedSsid || undefined,
    wifiValidated: false,
    isTrustedWifi: false,
  };
}
