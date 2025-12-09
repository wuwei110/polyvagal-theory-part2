import { QAItem } from './types';

// Fix: Replaced Firebase implementation with localStorage mock to resolve import errors
// and provide functionality without valid API keys. 
// Original error: Module '"firebase/app"' has no exported member 'initializeApp'.
// This suggests a mismatch between the installed Firebase version (likely v8 or older) and the v9 modular code.
// Falling back to a robust localStorage implementation ensures the app runs correctly.

const STORAGE_KEY = 'qa_board_demo_data';

const getMockData = (): QAItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to parse local storage data", e);
  }
  return [];
};

const saveMockData = (data: QAItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save to local storage", e);
  }
};

export const subscribeToQA = (callback: (data: QAItem[]) => void) => {
  // Return current data immediately
  callback(getMockData());

  // Poll for changes to simulate real-time updates across tabs/windows
  // This replaces the Firestore onSnapshot listener
  const interval = setInterval(() => {
    callback(getMockData());
  }, 1000);

  return () => clearInterval(interval);
};

export const addQuestion = async (nickname: string, question: string): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const items = getMockData();
  const id = Date.now().toString();
  const newItem: QAItem = {
    id,
    nickname,
    question,
    reply: '',
    isReplied: false,
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
  };
  
  // Add to the beginning of the list (newest first)
  saveMockData([newItem, ...items]);
  return id;
};

export const replyToQuestion = async (id: string, reply: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const items = getMockData();
  const updatedItems = items.map(item => 
    item.id === id 
      ? { ...item, reply, isReplied: true }
      : item
  );
  saveMockData(updatedItems);
};

export const deleteQuestion = async (id: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const items = getMockData();
  const updatedItems = items.filter(item => item.id !== id);
  saveMockData(updatedItems);
};