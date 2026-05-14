import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getFirestore, getDoc, doc, setDoc as firestoreSetDoc, updateDoc, } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, getAdditionalUserInfo, } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBxDclU4JShqg-SBnDJa_lMfK_c2jQzxaw",
  authDomain: "ai-on-a-student-s-budget.firebaseapp.com",
  projectId: "ai-on-a-student-s-budget",
  storageBucket: "ai-on-a-student-s-budget.firebasestorage.app",
  messagingSenderId: "374775958691",
  appId: "1:374775958691:web:b2de426b541139b0aec316",
  measurementId: "G-SG17HRVC1F"
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
