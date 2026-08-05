import { getFirestoreInstance } from './firebaseApp.js';
import {
  doc,
  collection,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';

function normalizePath(path) {
  if (!path || typeof path !== 'string') {
    throw new Error('Path must be a non-empty string.');
  }

  return path
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

function buildDocRef(db, path) {
  const segments = normalizePath(path);

  if (segments.length % 2 !== 0) {
    throw new Error(`Document path must contain an even number of segments: ${path}`);
  }

  return doc(db, ...segments);
}

function buildCollectionRef(db, path) {
  const segments = normalizePath(path);

  if (segments.length % 2 === 0) {
    throw new Error(`Collection path must contain an odd number of segments: ${path}`);
  }

  return collection(db, ...segments);
}

function createQueryConstraints(options = {}) {
  const constraints = [];

  if (Array.isArray(options.filters)) {
    options.filters.forEach((filter) => {
      if (!filter || !filter.field || typeof filter.value === 'undefined') {
        return;
      }
      constraints.push(where(filter.field, filter.operator || '==', filter.value));
    });
  }

  if (options.orderBy) {
    if (Array.isArray(options.orderBy)) {
      options.orderBy.forEach((order) => {
        if (order && order.field) {
          constraints.push(orderBy(order.field, order.direction || 'asc'));
        }
      });
    } else if (options.orderBy.field) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
    }
  }

  if (typeof options.limit === 'number' && options.limit > 0) {
    constraints.push(limit(options.limit));
  }

  return constraints;
}

export class FirestoreService {
  constructor(db) {
    this.db = db || getFirestoreInstance();
  }

  async getDocument(path) {
    try {
      const documentRef = buildDocRef(this.db, path);
      const snapshot = await getDoc(documentRef);

      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    } catch (error) {
      console.error(`FirestoreService.getDocument failed for path=${path}`, error);
      throw error;
    }
  }

  async setDocument(path, data, options = { merge: false }) {
    try {
      const documentRef = buildDocRef(this.db, path);
      await setDoc(documentRef, data, { merge: options.merge });
      return true;
    } catch (error) {
      console.error(`FirestoreService.setDocument failed for path=${path}`, error);
      throw error;
    }
  }

  async updateDocument(path, data) {
    try {
      const documentRef = buildDocRef(this.db, path);
      await updateDoc(documentRef, data);
      return true;
    } catch (error) {
      console.error(`FirestoreService.updateDocument failed for path=${path}`, error);
      throw error;
    }
  }

  async deleteDocument(path) {
    try {
      const documentRef = buildDocRef(this.db, path);
      await deleteDoc(documentRef);
      return true;
    } catch (error) {
      console.error(`FirestoreService.deleteDocument failed for path=${path}`, error);
      throw error;
    }
  }

  async addDocument(collectionPath, data) {
    try {
      const collectionRef = buildCollectionRef(this.db, collectionPath);
      const documentRef = await addDoc(collectionRef, data);
      return {
        id: documentRef.id,
        path: documentRef.path,
      };
    } catch (error) {
      console.error(`FirestoreService.addDocument failed for collectionPath=${collectionPath}`, error);
      throw error;
    }
  }

  async getDocuments(collectionPath, options = {}) {
    try {
      const collectionRef = buildCollectionRef(this.db, collectionPath);
      const constraints = createQueryConstraints(options);
      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
    } catch (error) {
      console.error(`FirestoreService.getDocuments failed for collectionPath=${collectionPath}`, error);
      throw error;
    }
  }

  listenToDocument(path, callback) {
    try {
      const documentRef = buildDocRef(this.db, path);
      return onSnapshot(documentRef, (snapshot) => {
        callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      });
    } catch (error) {
      console.error(`FirestoreService.listenToDocument failed for path=${path}`, error);
      throw error;
    }
  }

  listenToCollection(collectionPath, callback, options = {}) {
    try {
      const collectionRef = buildCollectionRef(this.db, collectionPath);
      const constraints = createQueryConstraints(options);
      const q = query(collectionRef, ...constraints);

      return onSnapshot(q, (querySnapshot) => {
        const documents = querySnapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        callback(documents);
      });
    } catch (error) {
      console.error(`FirestoreService.listenToCollection failed for collectionPath=${collectionPath}`, error);
      throw error;
    }
  }

  getServerTimestamp() {
    return serverTimestamp();
  }
}
