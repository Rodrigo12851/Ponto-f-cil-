import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { Employee, CompanyGeofence, OwnerSettings, FacialAuditLog } from '../types';
import { INITIAL_EMPLOYEES, SAMPLE_TEST_EMPLOYEES } from '../data/initialData';
import { DEFAULT_GEOFENCE } from '../utils/geolocation';
import { DEFAULT_OWNER_SETTINGS } from '../utils/ownerStorage';

export interface FirebaseConfigObject {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  [key: string]: any;
}

export function getActiveFirebaseConfig(): FirebaseConfigObject {
  try {
    const saved = localStorage.getItem('custom_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading custom firebase config from localStorage:', e);
  }
  return defaultFirebaseConfig;
}

export function saveCustomFirebaseConfig(config: FirebaseConfigObject): void {
  try {
    localStorage.setItem('custom_firebase_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving custom firebase config:', e);
  }
}

export function resetFirebaseConfigToDefault(): void {
  try {
    localStorage.removeItem('custom_firebase_config');
  } catch (e) {
    console.warn('Error resetting firebase config:', e);
  }
}

export function isUsingCustomFirebaseConfig(): boolean {
  try {
    return !!localStorage.getItem('custom_firebase_config');
  } catch {
    return false;
  }
}

const activeConfig = getActiveFirebaseConfig();

// Initialize Firebase App
const app = !getApps().length ? initializeApp(activeConfig) : getApp();

// Initialize Firestore with custom database ID from config if defined and not default
export const db =
  activeConfig.firestoreDatabaseId &&
  activeConfig.firestoreDatabaseId !== '(default)' &&
  activeConfig.firestoreDatabaseId.trim() !== ''
    ? getFirestore(app, activeConfig.firestoreDatabaseId)
    : getFirestore(app);

export const FIREBASE_PROJECT_INFO = {
  projectId: activeConfig.projectId,
  databaseId: activeConfig.firestoreDatabaseId || '(default)',
  authDomain: activeConfig.authDomain,
  isCustom: isUsingCustomFirebaseConfig(),
  connected: true,
};

// Collections
const EMPLOYEES_COLLECTION = 'employees';
const GEOFENCE_COLLECTION = 'companyGeofence';
const OWNER_SETTINGS_COLLECTION = 'ownerSettings';
const FACIAL_AUDIT_COLLECTION = 'facialAuditLogs';

// Safe error reporter to prevent infinite error spamming and uncaught exceptions
let hasReportedUnavailable = false;
let hasReportedQuotaExceeded = false;

function handleFirestoreError(context: string, err: any) {
  if (
    err?.code === 'unavailable' ||
    err?.message?.includes('unavailable') ||
    err?.message?.includes('Could not reach Cloud Firestore')
  ) {
    if (!hasReportedUnavailable) {
      hasReportedUnavailable = true;
      console.info(`[Firebase Firestore] Conexão remota em espera/offline para ${context}. Modo local-first ativo com persistência instantânea.`);
    }
  } else if (
    err?.code === 'resource-exhausted' ||
    err?.message?.includes('resource-exhausted') ||
    err?.message?.includes('Quota limit exceeded')
  ) {
    if (!hasReportedQuotaExceeded) {
      hasReportedQuotaExceeded = true;
      console.warn(`[Firebase Firestore] Quota limit para ${context}. Operando em modo local-first resiliente.`);
    }
  } else {
    console.warn(`[Firebase Firestore] ${context}:`, err?.message || err);
  }
}

// ==========================================
// EMPLOYEES SYNC
// ==========================================

export function subscribeEmployees(
  onUpdate: (employees: Employee[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, EMPLOYEES_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          onUpdate([]);
          return;
        }

        const emps: Employee[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Employee;
          emps.push({
            ...data,
            id: docSnap.id,
            days: Array.isArray(data.days) ? data.days : [],
          });
        });

        // Ensure employees are stably ordered
        emps.sort((a, b) => a.id.localeCompare(b.id));
        onUpdate(emps);
      },
      (error) => {
        handleFirestoreError('subscribeEmployees', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError('subscribeEmployees setup', err);
    return () => {};
  }
}

export async function clearAllEmployeesFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, EMPLOYEES_COLLECTION);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log('All employees successfully cleared from Firebase Firestore.');
  } catch (err: any) {
    handleFirestoreError('clearAllEmployeesFromFirestore', err);
  }
}

export async function clearAllAuditLogsFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, FACIAL_AUDIT_COLLECTION);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log('All facial audit logs cleared from Firebase Firestore.');
  } catch (err: any) {
    handleFirestoreError('clearAllAuditLogsFromFirestore', err);
  }
}

export async function wipeAllDataFromFirestore(): Promise<void> {
  try {
    await clearAllEmployeesFromFirestore();
    await clearAllAuditLogsFromFirestore();
    await saveOwnerSettingsToFirestore(DEFAULT_OWNER_SETTINGS);
    console.log('Database completely wiped and reset to clean state.');
  } catch (err: any) {
    handleFirestoreError('wipeAllDataFromFirestore', err);
  }
}

export async function saveEmployeeToFirestore(employee: Employee): Promise<void> {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, employee.id);
    await setDoc(
      docRef,
      {
        ...employee,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    handleFirestoreError(`saveEmployeeToFirestore(${employee.id})`, err);
  }
}

export async function deleteEmployeeFromFirestore(employeeId: string): Promise<void> {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    await deleteDoc(docRef);
  } catch (err: any) {
    handleFirestoreError(`deleteEmployeeFromFirestore(${employeeId})`, err);
  }
}

// ==========================================
// GEOFENCE & COMPANY SYNC
// ==========================================

export function subscribeGeofence(
  onUpdate: (geofence: CompanyGeofence) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const docRef = doc(db, GEOFENCE_COLLECTION, 'main');
    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          console.log('Firebase geofence config empty, seeding default...');
          try {
            await saveGeofenceToFirestore(DEFAULT_GEOFENCE);
          } catch (seedErr) {
            console.error('Error seeding default geofence to Firebase:', seedErr);
          }
          return;
        }
        const data = snapshot.data() as CompanyGeofence;
        onUpdate(data);
      },
      (error) => {
        handleFirestoreError('subscribeGeofence', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError('subscribeGeofence setup', err);
    return () => {};
  }
}

export async function saveGeofenceToFirestore(geofence: CompanyGeofence): Promise<void> {
  try {
    const docRef = doc(db, GEOFENCE_COLLECTION, 'main');
    await setDoc(
      docRef,
      {
        ...geofence,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    handleFirestoreError('saveGeofenceToFirestore', err);
  }
}

// ==========================================
// OWNER & MANAGERS SETTINGS SYNC
// ==========================================

export function subscribeOwnerSettings(
  onUpdate: (settings: OwnerSettings) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const docRef = doc(db, OWNER_SETTINGS_COLLECTION, 'main');
    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          console.log('Firebase owner settings empty, seeding default...');
          try {
            await saveOwnerSettingsToFirestore(DEFAULT_OWNER_SETTINGS);
          } catch (seedErr) {
            handleFirestoreError('saveOwnerSettings default seed', seedErr);
          }
          return;
        }
        const data = snapshot.data() as OwnerSettings;
        onUpdate(data);
      },
      (error) => {
        handleFirestoreError('subscribeOwnerSettings', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError('subscribeOwnerSettings setup', err);
    return () => {};
  }
}

export async function saveOwnerSettingsToFirestore(settings: OwnerSettings): Promise<void> {
  try {
    const docRef = doc(db, OWNER_SETTINGS_COLLECTION, 'main');
    await setDoc(
      docRef,
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    handleFirestoreError('saveOwnerSettingsToFirestore', err);
  }
}

// ==========================================
// FACIAL AUDIT LOGS SYNC
// ==========================================

export function subscribeFacialAuditLogs(
  onUpdate: (logs: FacialAuditLog[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, FACIAL_AUDIT_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(150));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: FacialAuditLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data() as FacialAuditLog);
        });
        onUpdate(logs);
      },
      (error) => {
        handleFirestoreError('subscribeFacialAuditLogs', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError('subscribeFacialAuditLogs setup', err);
    return () => {};
  }
}

export async function addFacialAuditLogToFirestore(log: FacialAuditLog): Promise<void> {
  try {
    const docRef = doc(db, FACIAL_AUDIT_COLLECTION, log.id);
    await setDoc(docRef, {
      ...log,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    handleFirestoreError('addFacialAuditLogToFirestore', err);
  }
}
