import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  setDoc as firestoreSetDoc,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  getAdditionalUserInfo,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);

export const loginGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return {
      user: result.user,
      isNew: getAdditionalUserInfo(result).isNewUser
    }; // Return this so the component can use the user data
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const setDoc = async (path, data) => {
  try {
    await firestoreSetDoc(doc(db, path), data);
    // alert(JSON.stringify(result));
  } catch (e) {
    alert('set doc failed' + JSON.stringify(e));
  }
};

export const getDocument = async (path) => {
  try {
    const docRef = doc(db, path);

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // docSnap.data() will be undefined if it doesn't exist
      return undefined;
    }
  } catch (e) {
    alert('set doc failed' + JSON.stringify(e));
  }
};

export const isSignedIn = () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    return user;
  } catch (e) {
    alert('error + ' + JSON.stringify(e));
  }
};

export const logout = () => {
  try {
    signOut(auth);
  } catch (e) {
    alert('logout error: ' + JSON.stringify(e));
  }
};
