import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getFirestore, getDoc, doc, setDoc as firestoreSetDoc, updateDoc, getDocs, collection, limit, query, addDoc, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, getAdditionalUserInfo, } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCQSv-B_1LiYwW6_XDMCesK-K-uUwx4SvE",
    authDomain: "wchs-thetavern.firebaseapp.com",
    projectId: "wchs-thetavern",
    storageBucket: "wchs-thetavern.firebasestorage.app",
    messagingSenderId: "1067002790985",
    appId: "1:1067002790985:web:5835522f0afede84deeb98",
    measurementId: "G-L2LD6HTME2"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app)

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
        const docAdded = await addDoc(collection(db, path), data);
        return docAdded;
    }
    catch (e) {
        console.error(`add doc failed at ${path} ` + JSON.stringify(e));
    }
};

export const updateDocument = async (path, data) => {
    try {
        await updateDoc(doc(db, path), data);
        // console.error(JSON.stringify(result));
    }
    catch (e) {
        console.error(`update doc failed at ${path}` + JSON.stringify(e));
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
        console.error(`get doc from ${caller} failed at link ${path} | Error: ` +
            JSON.stringify(e));
    }
};

export const getDocuments = async (path, l, docParam, arrayFilter) => {
    try {
        let constraints = []

        if (arrayFilter && arrayFilter.field && arrayFilter.value) {
            if (Array.isArray(arrayFilter.value)) {
                constraints.push(where(arrayFilter.field, 'array-contains-any', arrayFilter.value));
            } else {
                constraints.push(where(arrayFilter.field, 'array-contains', arrayFilter.value));
            }
        }

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

export const getDocumentFeildIncludes = (path, feild, text) =>{
    try{
const q = query(
  collection(db, path), 
  where(feild, ">=", text), 
  where(feild, "<=", text + "\uf8ff")
);
const doc = await getDoc(q)
const documents = doc.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
    }));
    
        return documents
    }catch(e){
        console.log(e)
        throw e
    }
}

export const isSignedIn = () => {
    return new Promise((resolve, reject) => {
        try {
            const auth = getAuth();
            const unsubscribe = auth.onAuthStateChanged(
                (user) => {
                    unsubscribe();
                    if (user) {
                        const isNew = user.metadata.creationTime === user.metadata.lastSignInTime;

                        resolve(user);
                    } else {
                        resolve(null);
                    }
                },
                (error) => reject(error)
            );
        } catch (e) {
            console.error('error + ' + JSON.stringify(e));
            reject(e);
        }
    });
};

export const logout = () => {
    try {
        signOut(auth);
    }
    catch (e) {
        console.error('logout error: ' + JSON.stringify(e));
    }
};

export const ALog = (name, data) => {
    logEvent(analytics, name, data)
}