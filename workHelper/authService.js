import { getAuthInstance } from './firebaseApp.js';
import { FirestoreService } from './firestoreService.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';

const AUTHORIZED_USER_DOCUMENT = 'system/authorizedUser';

function buildAuthorizedRecord(user) {
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export class AuthService {
  constructor(auth, firestoreService) {
    this.auth = auth || getAuthInstance();
    this.firestore = firestoreService || new FirestoreService();
  }

  async createEmailAccount(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      await this._ensureAuthorizedUser(user, { createIfMissing: true });
      return user;
    } catch (error) {
      console.error('AuthService.createEmailAccount failed', error);
      throw error;
    }
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      await this._ensureAuthorizedUser(user);
      return user;
    } catch (error) {
      console.error('AuthService.signInWithEmail failed', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('AuthService.signOut failed', error);
      throw error;
    }
  }

  async getCurrentUser() {
    return this.auth.currentUser;
  }

  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, async (user) => {
      if (!user) {
        callback(null);
        return;
      }

      try {
        await this._ensureAuthorizedUser(user, { createIfMissing: false });
        callback(user);
      } catch (error) {
        console.error('AuthService.onAuthStateChanged rejected user', error);
        callback(null, error);
      }
    });
  }

  async getAuthorizedUserRecord() {
    try {
      return await this.firestore.getDocument(AUTHORIZED_USER_DOCUMENT);
    } catch (error) {
      console.error('AuthService.getAuthorizedUserRecord failed', error);
      throw error;
    }
  }

  async _ensureAuthorizedUser(user, options = { createIfMissing: false }) {
    try {
      const allowedUser = await this.getAuthorizedUserRecord();
      const userMatchesAllowed = allowedUser && allowedUser.uid === user.uid;

      if (allowedUser && !userMatchesAllowed) {
        await signOut(this.auth);
        const message = 'This account is not authorized to access this application.';
        console.warn(message, { allowedUser, attemptedUid: user.uid });
        throw new Error(message);
      }

      if (!allowedUser) {
        if (options.createIfMissing) {
          const authorizedRecord = buildAuthorizedRecord(user);
          await this.firestore.setDocument(AUTHORIZED_USER_DOCUMENT, authorizedRecord, { merge: false });
          return user;
        }

        const authorizedRecord = buildAuthorizedRecord(user);
        await this.firestore.setDocument(AUTHORIZED_USER_DOCUMENT, authorizedRecord, { merge: false });
        return user;
      }

      return user;
    } catch (error) {
      console.error('AuthService._ensureAuthorizedUser failed for uid=', user?.uid, error);
      throw error;
    }
  }
}
