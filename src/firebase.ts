import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "cybee-10fac",
  appId: "1:863846938546:web:dd671ebfdb085d9ec456ab",
  apiKey: "AIzaSyCJKiPdIsEO55EhKVkQ4AhKndwhRoe-5rA",
  authDomain: "cybee-10fac.firebaseapp.com",
  storageBucket: "cybee-10fac.firebasestorage.app",
  messagingSenderId: "863846938546"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-9b3e1e55-04ad-4784-8284-dd5008a64e13");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocFromServer
};

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
