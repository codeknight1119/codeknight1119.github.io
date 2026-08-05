import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';

let firebaseApp;
let firestoreDb;
let authInstance;

function resolveFirebaseConfig(config) {
  if (config && typeof config === 'object' && Object.keys(config).length > 0) {
    return config;
  }

  if (typeof globalThis.__firebase_config !== 'undefined') {
    return globalThis.__firebase_config;
  }

  if (typeof globalThis.firebaseConfig !== 'undefined') {
    return globalThis.firebaseConfig;
  }

  return null;
}

export function initializeFirebase(config) {
  const resolvedConfig = resolveFirebaseConfig(config);

  if (!resolvedConfig) {
    const message = 'Firebase config is missing. Provide a config object or define global __firebase_config.';
    console.error(message);
    throw new Error(message);
  }

  if (firebaseApp) {
    return {
      app: firebaseApp,
      db: firestoreDb,
      auth: authInstance,
    };
  }

  if (getApps().length > 0) {
    firebaseApp = getApp();
  } else {
    firebaseApp = initializeApp(resolvedConfig);
  }

  firestoreDb = getFirestore(firebaseApp);
  authInstance = getAuth(firebaseApp);

  return {
    app: firebaseApp,
    db: firestoreDb,
    auth: authInstance,
  };
}

export function getFirebaseApp() {
  if (!firebaseApp) {
    throw new Error('Firebase app has not been initialized. Call initializeFirebase(config) first.');
  }
  return firebaseApp;
}

export function getFirestoreInstance() {
  if (!firestoreDb) {
    throw new Error('Firestore has not been initialized. Call initializeFirebase(config) first.');
  }
  return firestoreDb;
}

export function getAuthInstance() {
  if (!authInstance) {
    throw new Error('Firebase Auth has not been initialized. Call initializeFirebase(config) first.');
  }
  return authInstance;
}

export async function enableOfflinePersistence() {
  try {
    const db = getFirestoreInstance();
    await enableIndexedDbPersistence(db);
    console.log('Firestore offline persistence enabled.');
  } catch (error) {
    if (error && error.code === 'failed-precondition') {
      console.warn('Offline persistence is already enabled in another tab.', error);
    } else if (error && error.code === 'unimplemented') {
      console.warn('Browser does not support offline persistence for Firestore.', error);
    } else {
      console.error('Failed to enable Firestore offline persistence.', error);
    }
  }
}
