## Repo Overview

- Single-page interactive React e-book built with Vite. Main entry: `index.tsx` -> `App.tsx`.
- Content is data-driven: `content.ts` exports `bookPages: PageContent[]` which the UI renders into two-page "sheets" (each sheet = two consecutive pages).
- Interactive area: `components/QABoard.tsx` (a simple Q&A board). The Firebase integration has been replaced with a localStorage mock in `firebase.ts` for a zero-API-key local run.

## How to run (local dev)

- Prereqs: Node.js installed.
- Install dependencies: `npm install`.
- Start dev server: `npm run dev` (Vite). The README also suggests setting `GEMINI_API_KEY` in `.env.local` if you need the environment variable — `vite.config.ts` exposes `process.env.GEMINI_API_KEY`.
- Build for production: `npm run build` and preview with `npm run preview`.

Notes: `index.html` loads Tailwind via CDN (`<script src="https://cdn.tailwindcss.com"></script>`) and also uses an importmap for React when deployed in AI Studio. During local dev, Vite + the `package.json` dependencies are used.

## Big-picture architecture and data flow

- `content.ts` (source of truth): an ordered array `bookPages`. Each element is a `PageContent` (see `types.ts`) with fields such as `id`, `title`, `content`, `image`, `isCover`, and `isInteractive`.
- `App.tsx` computes `TOTAL_SHEETS = Math.ceil(bookPages.length / 2)` and maps each sheet to a `Sheet` component. Each sheet renders a front (right) and back (left) page. Page pairing: front = `bookPages[index*2]`, back = `bookPages[index*2 + 1]`.
- Interactive pages: a page with `isInteractive: true` renders `<QABoard />` via `BookPageContent`.
- Q&A persistence: `firebase.ts` is a localStorage-backed mock. Key constants: storage key `qa_board_demo_data` and `MY_QUESTIONS_KEY = 'my_qa_ids'` (client-side). Admin password is a hardcoded string in `QABoard.tsx` (`ADMIN_PASSWORD = 'admin'`).

## Project-specific conventions & patterns

- Page model: follow fields in `content.ts`. Minimal required fields used by UI: `id` and `title`.
- Pairing pages: do not reorder without understanding the pairing (two pages per sheet). If adding/removing pages, check `TOTAL_SHEETS` behavior in `App.tsx`.
- Interactive pages: set `isInteractive: true` and leave `content` empty (the UI expects Q&A board there). Example entry:

```ts
{ id: 30, title: '读者互动看板', isInteractive: true, content: '' }
```

- Audio behavior: `App.tsx` defines `BGM_URL` and attempts to play audio on first user interaction. Audio element is managed via `audioRef` and `toggleAudio()`.

## Integration points & external dependencies

- Vite (dev server + build) and React are primary tooling.
- Tailwind utility classes are used directly via CDN in `index.html` (no Tailwind config files present).
- `vite.config.ts` reads `GEMINI_API_KEY` from env and exposes it via `define`. If you need AI APIs, set `.env.local` accordingly.
- No live Firebase is required for local dev — `firebase.ts` intentionally provides a mock to avoid API keys.

## Security & developer notes

- Admin password is hardcoded (`'admin'`) in `components/QABoard.tsx` — change before any public deployment.
- Q&A data is stored in localStorage (`qa_board_demo_data`) and is not encrypted — treat as demo data.

## Common tasks and file pointers

- Add or edit page content: edit `content.ts` (follow existing structure). Each page may include `image`, `content` (HTML string), `isCover`, `isInteractive`.
- Update layouts/interaction: `App.tsx` contains the sheet flip logic and `Sheet` component; `BookPageContent` decides between static content and interactive content.
- Q&A logic: `components/QABoard.tsx` (subscribe/add/reply/delete) and `firebase.ts` (persistence mock). Keys to know: `MY_QUESTIONS_KEY`, `STORAGE_KEY` (`qa_board_demo_data`).
- Styling: utility classes in JSX rely on Tailwind via CDN (`index.html`) and some small custom CSS in that file for 3D page and scrollbars.

## Minimal examples (copy-paste)

- Add a static page (append to `content.ts`):

```ts
{ id: 31, title: 'New Section', content: '<p>Text here</p>' }
```

- Make a page interactive:

```ts
{ id: 32, title: '互动', isInteractive: true, content: '' }
```

## What an AI agent should not change automatically

- Do not change the `ADMIN_PASSWORD` behaviour or remove the localStorage fallback in `firebase.ts` without accounting for production credentials and a real backend.
- Avoid reordering `bookPages` without updating consumers that assume pairing by index (two pages per sheet).

---
If anything is unclear or you'd like the instructions to include additional examples (e.g., how to wire a real Firebase backend or where to add tests), tell me which area to expand.

## Firebase Migration Guide (step-by-step)

This project currently uses a `localStorage` mock in `firebase.ts` to avoid requiring API keys. The steps below describe how to migrate to Firestore (Firebase v9 modular SDK) safely and with minimal changes.

1. Create a Firebase project
	- Open the Firebase Console and create a new project.
	- Enable Firestore Database (prefer `Start in test mode` for initial dev, then tighten rules).

2. Add web app credentials
	- In Firebase Console → Project settings → Your apps → Add web app.
	- Copy the config object (apiKey, authDomain, projectId, etc.).

3. Add env vars locally (do NOT commit)
	- Create a `.env.local` (already referenced by `vite.config.ts`) and add:

```text
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Install Firebase SDK

```bash
npm install firebase
```

5. Replace `firebase.ts` mock with Firestore implementation
	- Backup the current `firebase.ts` (it contains the localStorage mock). Keep it in the repo for an easy rollback.
	- Create a new `firebase.ts` that uses the modular SDK. Example:

```ts
// firebase.ts (example using v9 modular SDK)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { QAItem } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, 'qa_items');

export const subscribeToQA = (callback: (data: QAItem[]) => void) => {
  const q = query(colRef, orderBy('timestamp', 'desc'));
  const unsub = onSnapshot(q, (snap) => {
	 const items: QAItem[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
	 callback(items as QAItem[]);
  });
  return unsub;
};

export const addQuestion = async (nickname: string, question: string): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const docRef = await addDoc(colRef, { nickname, question, reply: '', isReplied: false, timestamp: now });
  return docRef.id;
};

export const replyToQuestion = async (id: string, reply: string) => {
  const d = doc(db, 'qa_items', id);
  await updateDoc(d, { reply, isReplied: true });
};

export const deleteQuestion = async (id: string) => {
  const d = doc(db, 'qa_items', id);
  await deleteDoc(d);
};
```

6. Migrate local data (optional)
	- If you have existing `localStorage` data under key `qa_board_demo_data`, export it as JSON (use the app's backup button) and import it into Firestore.
	- Simple Node script (run from project root) to import `qa_board_backup.json` into Firestore using the Admin SDK or a small client script. For small data sets you can manually paste via Firebase Console → Add document.

7. Security rules
	- Start with restrictive rules. Example (Firestore rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
	 match /qa_items/{docId} {
		allow read: if true; // public read
		// Allow create for any client; restrict update/delete to server/admin only
		allow create: if request.resource.data.keys().hasAll(['nickname','question','timestamp']);
		allow update, delete: if false; // require server-side or admin flow
	 }
  }
}
```

	- For admin actions (reply/delete) consider adding Firebase Authentication and checking `request.auth.uid` in rules.

8. Environment & CI
	- In CI/CD or deployment, set the same env vars securely (GitHub Actions secrets, Vercel environment vars, etc.). Do not commit `.env.local`.

9. Test locally
	- Run `npm run dev` and test adding, replying, and deleting questions. Watch the Firestore console to confirm documents are created and updated.

10. Rollback plan
	- Keep the old `firebase.ts` mock as `firebase.local.ts` or in git history. If something breaks, switch imports back and deploy quickly.

Notes & tips
- The modular Firebase SDK reduces bundle size; the example above uses only the Firestore parts required by the app.
- If you want to allow the current in-browser admin flow (the hardcoded `ADMIN_PASSWORD`), be aware that client-side admin is insecure; prefer an authenticated admin panel.
- If you need, I can create a ready-to-use `firebase.ts` replacement, add `.env.local.example`, and a small import script to migrate `qa_board_backup.json` into Firestore.

## Firebase Database Rules (Firestore)

To implement the requirement: "Guests can only view others, write message and delete OWN message. Cannot delete others."

This requires Firebase Authentication to securely identify the owner of a document on the server side.

1. **Enable Authentication**: In Firebase Console -> Authentication, enable "Anonymous" sign-in (or Google/Email).
2. **Modify Code**: When adding a question, include `userId: auth.currentUser.uid` in the document data.
3. **Deploy Rules**: Use the following rules.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /qa_items/{docId} {
      // 1. Everyone can read
      allow read: if true;

      // 2. Everyone can create (write new question)
      // Ideally validate data here (e.g. must have nickname, question)
      allow create: if true;

      // 3. Delete: 
      // To allow "Admin" (who uses a client-side password) to delete ANY message, we must relax this rule.
      // Firebase Rules cannot verify the client-side 'isAdmin' variable securely.
      // We allow delete for any authenticated user (Anonymous included) and rely on the UI 
      // to hide the delete button from non-admins/non-owners.
      allow delete: if request.auth != null;

      // 4. Update: Only Admin can update (e.g. to add reply)
      // Since we use a hardcoded password in client for Admin, strictly enforcing this on server 
      // without Custom Claims (Firebase Admin SDK) is difficult.
      // If using client-side admin password only, we might have to allow update loosely 
      // or implement a cloud function for replies.
      // For simple "client-side admin" protection (insecure but matches current architecture):
      allow update: if true; 
    }
  }
}
```
