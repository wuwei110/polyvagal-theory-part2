import type { QAItem } from './types';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// --- Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if valid config is present
const hasValidConfig = !!firebaseConfig.apiKey;
export const isLocalMode = !hasValidConfig;

// --- Implementations ---

let _subscribeToQA: (callback: (data: QAItem[]) => void) => () => void;
let _addQuestion: (nickname: string, question: string) => Promise<string>;
let _replyToQuestion: (id: string, reply: string) => Promise<void>;
let _deleteQuestion: (id: string) => Promise<void>;

if (hasValidConfig) {
  // === FIREBASE IMPLEMENTATION ===
  console.log("Initializing Firebase Backend...");
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // Anonymous Auth
  const authPromise = signInAnonymously(auth).catch(err => console.error("Firebase Auth Error:", err));
  const colRef = collection(db, 'qa_items');

  _subscribeToQA = (callback) => {
    const q = query(colRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      callback(items as QAItem[]);
    }, (err) => {
      console.error('Firestore Error:', err);
      // Fallback to empty if error
      callback([]);
    });
  };

  _addQuestion = async (nickname, question) => {
    await authPromise; // Ensure auth
    const userId = auth.currentUser?.uid || null;
    const now = Math.floor(Date.now() / 1000);
    const docRef = await addDoc(colRef, { 
        nickname, 
        question, 
        reply: '', 
        isReplied: false, 
        timestamp: now,
        userId 
    });
    return docRef.id;
  };

  _replyToQuestion = async (id, reply) => {
    const d = doc(db, 'qa_items', id);
    await updateDoc(d, { reply, isReplied: true });
  };

  _deleteQuestion = async (id) => {
    const d = doc(db, 'qa_items', id);
    await deleteDoc(d);
  };

} else {
  // === LOCAL STORAGE IMPLEMENTATION (Mock) ===
  console.warn("Firebase config missing. Using LocalStorage (No Sync).");
  
  const STORAGE_KEY = 'qa_board_demo_data';
  const listeners: Set<(data: QAItem[]) => void> = new Set();

  const getMockData = (): QAItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };

  const saveMockData = (data: QAItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    listeners.forEach(cb => cb(data));
  };

  // Sync across tabs
  if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
           listeners.forEach(cb => cb(getMockData()));
        }
      });
  }

  _subscribeToQA = (callback) => {
    callback(getMockData());
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  };

  _addQuestion = async (nickname, question) => {
    const items = getMockData();
    const id = Date.now().toString();
    const newItem: QAItem = {
      id, nickname, question, reply: '', isReplied: false,
      timestamp: Math.floor(Date.now() / 1000),
    };
    saveMockData([newItem, ...items]);
    return id;
  };

  _replyToQuestion = async (id, reply) => {
    const items = getMockData();
    saveMockData(items.map(i => i.id === id ? { ...i, reply, isReplied: true } : i));
  };

  _deleteQuestion = async (id) => {
    const items = getMockData();
    saveMockData(items.filter(i => i.id !== id));
  };
}

// --- Exports ---
export const subscribeToQA = _subscribeToQA;
export const addQuestion = _addQuestion;
export const replyToQuestion = _replyToQuestion;
export const deleteQuestion = _deleteQuestion;
