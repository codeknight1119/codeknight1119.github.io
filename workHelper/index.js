import { initializeBackend } from './backendService.js';

export async function createBackend(config) {
  return initializeBackend(config);
}

export { getFirestoreService, getAuthService, getUserService } from './backendService.js';
