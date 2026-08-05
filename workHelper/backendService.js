import { initializeFirebase, enableOfflinePersistence } from './firebaseApp.js';
import { FirestoreService } from './firestoreService.js';
import { AuthService } from './authService.js';
import { UserService } from './userService.js';

let firestoreService;
let authService;
let userService;

export async function initializeBackend(config) {
  initializeFirebase(config);
  await enableOfflinePersistence();

  firestoreService = new FirestoreService();
  authService = new AuthService(null, firestoreService);
  userService = new UserService(firestoreService);

  return {
    firestoreService,
    authService,
    userService,
  };
}

export function getFirestoreService() {
  if (!firestoreService) {
    throw new Error('Backend not initialized. Call initializeBackend(config) first.');
  }
  return firestoreService;
}

export function getAuthService() {
  if (!authService) {
    throw new Error('Backend not initialized. Call initializeBackend(config) first.');
  }
  return authService;
}

export function getUserService() {
  if (!userService) {
    throw new Error('Backend not initialized. Call initializeBackend(config) first.');
  }
  return userService;
}
