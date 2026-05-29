import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getFirestore, getDoc, doc, setDoc as firestoreSetDoc, updateDoc, getDocs, collection, limit, query, addDoc, orderBy } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';
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
        // alert(JSON.stringify(result));
    }
    catch (e) {
        alert(`set doc failed at ${path} ` + JSON.stringify(e));
    }
};

export const addDocument = async (path, data) => {
    try {
       const docAdded =  await addDoc(collection(db, path), data);
       return docAdded;
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
        alert(`get doc from ${caller} failed at link ${path} | Error: ` +
            JSON.stringify(e));
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
            alert('error + ' + JSON.stringify(e));
            reject(e);
        }
    });
};

export const logout = () => {
    try {
        signOut(auth);
    }
    catch (e) {
        alert('logout error: ' + JSON.stringify(e));
    }
};
