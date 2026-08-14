import { initializeApp, getApps, getApp } from 'firebase/app';
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
import firebaseConfig from '../../firebase-applet-config.json';
import { Employee, CompanyGeofence, OwnerSettings, FacialAuditLog } from '../types';
import { INITIAL_EMPLOYEES, SAMPLE_TEST_EMPLOYEES } from '../data/initialData';
import { DEFAULT_GEOFENCE } from '../utils/geolocation';
import { DEFAULT_OWNER_SETTINGS } from '../utils/ownerStorage';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID from config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const FIREBASE_PROJECT_INFO = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain,
  connected: true,
};

// Collections
const EMPLOYEES_COLLECTION = 'employees';
const GEOFENCE_COLLECTION = 'companyGeofence';
const OWNER_SETTINGS_COLLECTION = 'ownerSettings';
const FACIAL_AUDIT_COLLECTION = 'facialAuditLogs';

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
        console.error('Firebase employees snapshot error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error setting up employees subscription:', err);
    return () => {};
  }
}

// Safe error reporter to prevent infinite error spamming
let hasReportedQuotaExceeded = false;
function handleFirestoreError(context: string, err: any) {
  if (err?.code === 'resource-exhausted' || err?.message?.includes('resource-exhausted') || err?.message?.includes('Quota limit exceeded')) {
    if (!hasReportedQuotaExceeded) {
      hasReportedQuotaExceeded = true;
      console.warn(`[Firebase Firestore] Quota limit exceeded for ${context}. Operating smoothly in resilient local-first mode.`);
    }
  } else {
    console.warn(`[Firebase Firestore] ${context}:`, err?.message || err);
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

export async function seedInitialEmployees(): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const emp of SAMPLE_TEST_EMPLOYEES) {
      const docRef = doc(db, EMPLOYEES_COLLECTION, emp.id);
      batch.set(docRef, {
        ...emp,
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log('Sample test employees populated in Firebase Firestore.');
  } catch (err: any) {
    handleFirestoreError('seedInitialEmployees', err);
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
        console.error('Firebase geofence snapshot error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error setting up geofence subscription:', err);
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
            console.error('Error seeding owner settings to Firebase:', seedErr);
          }
          return;
        }
        const data = snapshot.data() as OwnerSettings;
        onUpdate(data);
      },
      (error) => {
        console.error('Firebase owner settings snapshot error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error setting up owner settings subscription:', err);
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
        console.error('Firebase facial audit logs snapshot error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error setting up audit logs subscription:', err);
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
