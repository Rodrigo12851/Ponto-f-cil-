import { OwnerSettings } from '../types';

export const DEFAULT_OWNER_SETTINGS: OwnerSettings = {
  ownerName: 'Proprietário(a)',
  ownerEmail: '',
  ownerLogin: '123',
  companyName: 'Minha Empresa',
  masterPassword: '123', // Senha Mestra inicial (1 a 3)
  managers: [],
};

const STORAGE_KEY = 'sistema_ponto_owner_settings_v2';

export function getOwnerSettings(): OwnerSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_OWNER_SETTINGS;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_OWNER_SETTINGS,
      ...parsed,
      managers: Array.isArray(parsed.managers) ? parsed.managers : [],
    };
  } catch {
    return DEFAULT_OWNER_SETTINGS;
  }
}

export function saveOwnerSettings(settings: OwnerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving owner settings:', err);
  }
}
