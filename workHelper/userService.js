import { FirestoreService } from './firestoreService.js';

const PROFILE_DOC = (uid) => `users/${uid}`;
const CONFIG_DOC = (uid) => `users/${uid}/config/appConfig`;
const SETTINGS_DOC = (uid) => `users/${uid}/settings/global`;

const DEFAULT_USER_CONFIG = {
  theme: 'system',
  preferences: {
    workDayStart: '08:00',
    workDayEnd: '18:00',
    weekend: ['saturday', 'sunday'],
  },
  scheduling: {
    preserveBlocks: true,
    conflictResolution: 'ask',
  },
  modules: {
    calendar: true,
    dashboard: true,
    homework: true,
    projects: true,
    ideas: true,
    availability: true,
  },
};

const DEFAULT_USER_SETTINGS = {
  onboardingComplete: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale: navigator?.language || 'en-US',
  lastSync: Date.now(),
};

export class UserService {
  constructor(firestoreService) {
    this.firestore = firestoreService || new FirestoreService();
  }

  async initializeUserWorkspace(user, options = {}) {
    if (!user || !user.uid) {
      throw new Error('User object must include a uid.');
    }

    const profilePayload = {
      uid: user.uid,
      displayName: user.displayName || options.displayName || '',
      email: user.email || options.email || null,
      created: options.created || Date.now(),
      lastLogin: Date.now(),
      version: options.version || '1.0.0',
    };

    const configPayload = {
      ...DEFAULT_USER_CONFIG,
      ...(options.config || {}),
    };

    const settingsPayload = {
      ...DEFAULT_USER_SETTINGS,
      ...(options.settings || {}),
    };

    await this.firestore.setDocument(PROFILE_DOC(user.uid), profilePayload, { merge: true });
    await this.firestore.setDocument(CONFIG_DOC(user.uid), configPayload, { merge: true });
    await this.firestore.setDocument(SETTINGS_DOC(user.uid), settingsPayload, { merge: true });

    return {
      profile: profilePayload,
      config: configPayload,
      settings: settingsPayload,
    };
  }

  async getUserProfile(uid) {
    return this.firestore.getDocument(PROFILE_DOC(uid));
  }

  async updateUserProfile(uid, updates) {
    return this.firestore.updateDocument(PROFILE_DOC(uid), {
      ...updates,
      lastLogin: Date.now(),
    });
  }

  async getUserConfig(uid) {
    return this.firestore.getDocument(CONFIG_DOC(uid));
  }

  async updateUserConfig(uid, updates) {
    return this.firestore.updateDocument(CONFIG_DOC(uid), updates);
  }

  async getUserSettings(uid) {
    return this.firestore.getDocument(SETTINGS_DOC(uid));
  }

  async updateUserSettings(uid, updates) {
    return this.firestore.updateDocument(SETTINGS_DOC(uid), updates);
  }
}
