import { initializeApp } from 'firebase/app';
import { getFirestore, getDoc, doc, setDoc as firestoreSetDoc, updateDoc, } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, getAdditionalUserInfo, } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD_1epFIm97G6hyzS_f4GHkhcb4tF3gMZI",
  authDomain: "ootoa-537ee.firebaseapp.com",
  projectId: "ootoa-537ee",
  storageBucket: "ootoa-537ee.firebasestorage.app",
  messagingSenderId: "60453385657",
  appId: "1:60453385657:web:de970a01ebe1f0ab167268",
  measurementId: "G-NBN13F2EY9"
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
            isNew: getAdditionalUserInfo(result).isNewUser,
        }; // Return this so the component can use the user data
    }
    catch (error) {
        console.error(error);
        return null;
    }
};

export const setDoc = async (path, data) => {
    try {
        await firestoreSetDoc(doc(db, path), data);
        // alert(JSON.stringify(result));
    }
    catch (e) {
        alert(`set doc failed at ${path} ` + JSON.stringify(e));
    }
};

export const updateDocument = async (path, data) => {
    try {
        await updateDoc(doc(db, path), data);
        // alert(JSON.stringify(result));
    }
    catch (e) {
        alert(`update doc failed at ${path}` + JSON.stringify(e));
    }
};

export const getDocument = async (path, caller) => {
    try {
        const docRef = doc(db, path);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        else {
            // docSnap.data() will be undefined if it doesn't exist
            return undefined;
        }
    }
    catch (e) {
        alert(`get doc from ${caller} failed at link ${path} | Error: ` +
            JSON.stringify(e));
    }
};

export const isSignedIn = () => {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        return user;
    }
    catch (e) {
        alert('error + ' + JSON.stringify(e));
    }
};

export const logout = () => {
    try {
        signOut(auth);
    }
    catch (e) {
        alert('logout error: ' + JSON.stringify(e));
    }
};
