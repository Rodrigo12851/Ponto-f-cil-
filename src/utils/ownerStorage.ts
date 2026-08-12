import { OwnerSettings, ManagerUser } from '../types';

export const DEFAULT_OWNER_SETTINGS: OwnerSettings = {
  ownerName: 'Rodrigo Santos (Proprietário)',
  ownerEmail: 'proprietario@empresa.com',
  companyName: 'Ponto Facial - Sede Principal',
  masterPassword: '123', // Senha Mestra do Proprietário
  managers: [
    {
      id: 'mgr-1',
      name: 'Carlos Oliveira (Gestor)',
      email: 'gestor@empresa.com',
      phone: '(11) 98888-7777',
      companyName: 'Ponto Facial - Sede Principal',
      password: '123',
      roleLabel: 'Gerente de Operações & RH',
      status: 'ATIVO',
      createdAt: '10/01/2026',
    },
    {
      id: 'mgr-2',
      name: 'Mariana Santos (Supervisora)',
      email: 'mariana@empresa.com',
      phone: '(11) 97777-6666',
      companyName: 'Ponto Facial - Filial Sul',
      password: '456',
      roleLabel: 'Supervisora de Equipe',
      status: 'ATIVO',
      createdAt: '15/02/2026',
    },
  ],
};

const STORAGE_KEY = 'sistema_ponto_owner_settings_v1';

export function getOwnerSettings(): OwnerSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_OWNER_SETTINGS;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_OWNER_SETTINGS,
      ...parsed,
      managers: Array.isArray(parsed.managers) ? parsed.managers : DEFAULT_OWNER_SETTINGS.managers,
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
