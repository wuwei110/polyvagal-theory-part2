import { QAItem } from './types';

// Fix: Replaced Firebase implementation with localStorage mock to resolve import errors
// and provide functionality without valid API keys. 
// Uses Observer pattern for immediate updates and storage event for multi-tab sync.

const STORAGE_KEY = 'qa_board_demo_data';
const listeners: Set<(data: QAItem[]) => void> = new Set();

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

const notifyListeners = () => {
  const data = getMockData();
  listeners.forEach(callback => callback(data));
};

const saveMockData = (data: QAItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyListeners(); // Notify local listeners
  } catch (e) {
    console.warn("Failed to save to local storage", e);
  }
};

// Listen for changes from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    notifyListeners();
  }
});

export const subscribeToQA = (callback: (data: QAItem[]) => void) => {
  // Return current data immediately
  callback(getMockData());
  
  listeners.add(callback);
  
  return () => {
    listeners.delete(callback);
  };
};

export const addQuestion = async (nickname: string, question: string): Promise<string> => {
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
  const items = getMockData();
  const updatedItems = items.map(item => 
    item.id === id 
      ? { ...item, reply, isReplied: true }
      : item
  );
  saveMockData(updatedItems);
};

export const deleteQuestion = async (id: string) => {
  const items = getMockData();
  const updatedItems = items.filter(item => item.id !== id);
  saveMockData(updatedItems);
};
