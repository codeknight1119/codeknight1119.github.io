import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getFirestore, getDoc, doc, setDoc as firestoreSetDoc, updateDoc, } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, getAdditionalUserInfo, onAuthStateChanged, } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';

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

export const setDocument = async (path, data) => {
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
  return true
    }
    catch (e) {
return false
    }
};

export const getDocument = async (path) => {
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
        alert(`get doc failed at link ${path} | Error: ` +
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

export const listenForAuthChanges = (callback) => {
    // onAuthStateChanged triggers immediately once Firebase confirms the initial state,
    // and then triggers again whenever the user logs in or out.
    return onAuthStateChanged(auth, callback);
};

export const getUserOnLoad = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth,
            (user) => {
                unsubscribe();
                resolve(user);
            },
            reject
        );
    });
};
export const getRandomLoreDoc = () =>{
const randomNum = Math.random();

const test = await db.collection('/lore')
  .where('random_pos', '>=', randomNum)
  .orderBy('random_pos')
  .limit(1)
  .get();


if (snapshot.empty) {
  const wrapAround = await db.collection('/lore')
    .orderBy('randomVal')
    .limit(1)
    .get();
    return wrapAround
}else{
    return snapshot
}
}