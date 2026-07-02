import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { initializeFirestore, getDoc, doc, setDoc as firestoreSetDoc, updateDoc, getDocs, collection, limit, query, addDoc, deleteDoc, orderBy, persistentLocalCache, persistentMultipleTabManager } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, getAdditionalUserInfo, } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCMzrQh5ceTsxZOlntTm1xFlYTZres-DqQ",
  authDomain: "lyricbase-35384.firebaseapp.com",
  projectId: "lyricbase-35384",
  storageBucket: "lyricbase-35384.firebasestorage.app",
  messagingSenderId: "371501759260",
  appId: "1:371501759260:web:b62a04d94dcc6cb9bb18d9",
  measurementId: "G-76CKJXNM3S"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })});
const auth = getAuth(app);

export const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return {
            user: result.user,
            isNew: getAdditionalUserInfo(result).isNewUser,
        }; 
    }
    catch (error) {
        console.error(error);
        return null;
    }
};


export const setDocument = async (path, data) => {
    try {
        await firestoreSetDoc(doc(db, path), data);
    }
    catch (e) {
        console.error(`set doc failed at ${path} ` + JSON.stringify(e));
    }
};

export const addDocument = async (path, data) => {
    try {
       const docAdded =  await addDoc(collection(db, path), data);
       return docAdded;
    }
    catch (e) {
        console.error(`set doc failed at ${path} `, e);
    }
};

export const updateDocument = async (path, data) => {
    try {
        await updateDoc(doc(db, path), data);
    }
    catch (e) {
        console.error(`update doc failed at ${path}`, e);
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
            return undefined;
        }
    }
    catch (e) {
        console.error(`get doc failed`, e);
    }
};

export const getDocuments = async (path, l, docParam) => {
    try {
        let constraints = []

        if (docParam && docParam.field) {
            constraints.push(orderBy(docParam.field, docParam.direction || 'asc'));
        }

        if (typeof l === 'number' && l > 0) {
            constraints.push(limit(l))
        }

        
        const collectionRef = collection(db, path); 
        const q = query(collectionRef, ...constraints);
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return [];
        }

        const documents = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return documents;
    }
    catch (e) {
        console.log(e);
        throw e
    }
};

export const removeDocument = async function (path) {
  // 1. Create a reference to the specific document
  // Syntax: doc(db, "collectionName", "documentId")
  const docRef = doc(db, path);

  try {
    // 2. Delete the document using the reference
    await deleteDoc(docRef);
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error removing document: ", error);
  }
}

export const isSignedIn = () => {
    return new Promise((resolve, reject) => {
        try {
            const auth = getAuth();
            const unsubscribe = auth.onAuthStateChanged(
                (user) => {
                    unsubscribe(); 
                    resolve(user);
                },
                (error) => reject(error)
            );
        } catch (e) {
            console.error("isSignedIn", e);
            reject(e);
        }
    });
};

export const logout = () => {
    try {
        signOut(auth);
    }
    catch (e) {
        console.error('logout error: ' , e);
    }
};
