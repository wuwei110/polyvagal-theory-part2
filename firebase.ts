import type { QAItem } from './types';
import cloudbase from '@cloudbase/js-sdk';

// --- Configuration ---
const tcbConfig = {
  envId: import.meta.env.VITE_TCB_ENV_ID,
};

// Check if valid config is present
const hasValidConfig = !!tcbConfig.envId;
export const isLocalMode = !hasValidConfig;

// --- Implementations ---

let _subscribeToQA: (callback: (data: QAItem[], error?: string, isCached?: boolean) => void) => () => void;
let _addQuestion: (nickname: string, question: string) => Promise<string>;
let _replyToQuestion: (id: string, reply: string) => Promise<void>;
let _deleteQuestion: (id: string) => Promise<void>;

if (hasValidConfig) {
  // === TENCENT CLOUDBASE IMPLEMENTATION ===
  console.log("Initializing Tencent CloudBase Backend...");

  // Initialize CloudBase
  const app = cloudbase.init({
    env: tcbConfig.envId,
  });

  const db = app.database();
  const TABLE_NAME = 'QAItem';

  // Enable anonymous auth (required for database operations)
  const auth = app.auth();
  let _isAuthReady = false;

  // Anonymous login silently
  auth.signInAnonymously()
    .then(() => {
      console.log('CloudBase anonymous auth success');
      _isAuthReady = true;
    })
    .catch((err) => {
      console.error('CloudBase auth error:', err);
    });

  _subscribeToQA = (callback) => {
    const collection = db.collection(TABLE_NAME);

    // Initial fetch
    collection.orderBy('timestamp', 'desc').get()
      .then((res: any) => {
        const qaItems = res.data.map((item: any) => ({
          id: item._id,
          nickname: item.nickname,
          question: item.question,
          reply: item.reply || '',
          isReplied: item.isReplied || false,
          timestamp: item.timestamp,
          userId: item.userId,
          pending: false,
        }));
        callback(qaItems, undefined, false);
      })
      .catch((err: any) => {
        console.error('CloudBase Query Error:', err);
        const msg = '无法连接服务器';
        callback([], msg, false);
      });

    // Use CloudBase watch() for real-time updates
    let watcher: any = null;

    try {
      watcher = collection.orderBy('timestamp', 'desc').watch({
        onChange: (snapshot: any) => {
          const docs = snapshot.docs || [];
          const qaItems = docs.map((item: any) => ({
            id: item.id || item._id,
            nickname: item.data?.nickname,
            question: item.data?.question,
            reply: item.data?.reply || '',
            isReplied: item.data?.isReplied || false,
            timestamp: item.data?.timestamp,
            userId: item.data?.userId,
            pending: false,
          }));
          callback(qaItems, undefined, false);
        },
        onError: (err: any) => {
          console.error('CloudBase watch error:', err);
        },
      });
    } catch (err) {
      console.error('CloudBase watch setup error:', err);
    }

    const unsubscribe = () => {
      if (watcher) {
        watcher.close();
      }
    };

    return unsubscribe;
  };

  _addQuestion = async (nickname, question) => {
    const now = Math.floor(Date.now() / 1000);
    try {
      const res = await db.collection(TABLE_NAME).add({
        nickname,
        question,
        reply: '',
        isReplied: false,
        timestamp: now,
      });
      return res.id;
    } catch (err) {
      console.error('CloudBase Add Error:', err);
      throw new Error('提交失败，请检查网络连接');
    }
  };

  _replyToQuestion = async (id, reply) => {
    try {
      await db.collection(TABLE_NAME).doc(id).update({
        reply,
        isReplied: true,
      });
    } catch (err) {
      console.error('CloudBase Update Error:', err);
      throw new Error('回复失败，请检查网络连接');
    }
  };

  _deleteQuestion = async (id) => {
    try {
      await db.collection(TABLE_NAME).doc(id).remove();
    } catch (err) {
      console.error('CloudBase Delete Error:', err);
      throw new Error('删除失败，请检查网络连接');
    }
  };

} else {
  // === LOCAL STORAGE IMPLEMENTATION (Mock) ===
  console.warn("Tencent CloudBase config missing. Using LocalStorage (No Sync).");

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

  if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
           listeners.forEach(cb => cb(getMockData()));
        }
      });
  }

  _subscribeToQA = (callback) => {
    const data = getMockData().map(i => ({ ...i, pending: false }));
    callback(data, undefined, false);

    const listener = (newData: QAItem[]) => callback(newData.map(i => ({ ...i, pending: false })), undefined, false);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
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
