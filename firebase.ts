import type { QAItem } from './types';

// Firestore (v9 modular) implementation for QA board.
// This file expects the following env vars to be set (see `.env.local.example`):
// VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
// VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID

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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let authPromise: Promise<any> | null = null;

try {
  // Initialize app only if config appears to be present
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig as any);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Sign in anonymously to allow R/W based on rules that check request.auth
    authPromise = signInAnonymously(auth).catch(err => console.error("Firebase Auth Error:", err));
  } else {
    console.warn('Firebase config missing; Firestore will not be initialized. Falling back to no-op functions.');
  }
} catch (e) {
  console.error('Failed to initialize Firebase:', e);
}

const colRef = db ? collection(db, 'qa_items') : null;

export const subscribeToQA = (callback: (data: QAItem[]) => void) => {
  if (!db || !colRef) {
    // If Firestore is not configured, return empty list and a no-op unsubscribe
    callback([]);
    return () => {};
  }

  const q = query(colRef, orderBy('timestamp', 'desc'));
  const unsub = onSnapshot(q, (snap) => {
    const items: QAItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    callback(items as QAItem[]);
  }, (err) => {
    console.error('Firestore onSnapshot error:', err);
    callback([]);
  });

  return unsub;
};

export const addQuestion = async (nickname: string, question: string): Promise<string> => {
  if (!db || !colRef) {
    throw new Error('Firestore not initialized');
  }
  
  // Wait for auth to complete to ensure we have a userId
  if (authPromise) {
      try { await authPromise; } catch(e) { /* ignore auth error, continue as guest without ID if needed */ }
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Attach userId if authenticated
  const userId = auth?.currentUser?.uid || null;

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

export const replyToQuestion = async (id: string, reply: string) => {
  if (!db) throw new Error('Firestore not initialized');
  const d = doc(db, 'qa_items', id);
  await updateDoc(d, { reply, isReplied: true });
};

export const deleteQuestion = async (id: string) => {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const d = doc(db, 'qa_items', id);
    await deleteDoc(d);
  } catch (error: any) {
    console.error("Delete failed:", error);
    // Re-throw or handle. Since UI is optimistic, maybe we should alert?
    // We can't alert easily from here without browser API.
    if (error.code === 'permission-denied') {
        alert("删除失败：权限不足。请检查是否为您的留言或数据库规则配置。");
    }
    throw error;
  }
};
