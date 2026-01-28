# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Single-page interactive React e-book about Polyvagal Theory, built with Vite. The app renders book pages as "sheets" (two consecutive pages per sheet) with a 3D page-flip animation on desktop and a card-based view on mobile.

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Data Flow

1. **Content Source**: `content.ts` exports `bookPages: PageContent[]` - the ordered array of all book pages.
2. **Page Pairing**: `App.tsx` computes `TOTAL_SHEETS = Math.ceil(bookPages.length / 2)`. Each sheet renders two pages: front = `bookPages[index * 2]`, back = `bookPages[index * 2 + 1]`.
3. **View Modes**: The app has two modes (switchable via UI):
   - **Desktop**: 3D book with page-flip animation, pages displayed in two-page spreads
   - **Mobile**: Single-page card view with prev/next navigation

### Key Files

| File | Purpose |
|------|---------|
| `content.ts` | Source of truth for all book page content (`PageContent[]`) |
| `App.tsx` | Main app, handles book navigation, view mode switching, audio |
| `components/QABoard.tsx` | Interactive Q&A component for reader questions |
| `firebase.ts` | Dual-mode persistence: Firebase (when configured) or localStorage mock (fallback) |
| `types.ts` | Type definitions (`PageContent`, `QAItem`) |

### Page Structure

Each `PageContent` has:
- `id`: Number (used for display and navigation)
- `title`: Page title
- `content`: HTML string for rich text
- `image`: Optional image path
- `isCover`: Marks cover pages (special styling)
- `isInteractive`: Renders `QABoard` instead of static content

### Firebase Integration

The app supports two modes:

1. **Firebase Mode** (when env vars are set):
   - Uses anonymous auth and Firestore
   - Real-time sync via `onSnapshot`
   - Shows connection status in UI
   - 10-second timeout on writes

2. **Local Mode** (no config - default):
   - Uses localStorage (`qa_board_demo_data`)
   - No cross-device sync
   - Good for local dev

**Environment Variables** (in `.env.local`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_PASSWORD=admin  # Default: 'admin'
```

## Conventions

### Adding/Modifying Pages

Edit `content.ts`. Pages are ordered; reordering affects pairing logic (2 pages per sheet).

```ts
// Static page
{ id: 31, title: 'New Section', content: '<p>Content here</p>' }

// Interactive page (Q&A board)
{ id: 32, title: '互动', isInteractive: true, content: '' }
```

### Styling

- Tailwind CSS via CDN in `index.html` (no build step for styles)
- Custom CSS for 3D page transforms and scrollbars in `index.html` `<style>`
- Google Fonts: Noto Serif SC (body), Ma Shan Zheng (cover title)

### Audio

- Background music: `/testrec.MP3` (in `public/` directory)
- Audio plays on first user interaction (browser autoplay policy)
- Control button in top-right corner

### Admin Features

- Admin password: `VITE_ADMIN_PASSWORD` (default: `'admin'`) in `QABoard.tsx:6`
- Admin can: reply to questions, delete any question, download backup JSON
- Users can: ask questions, delete their own questions
- User's own question IDs stored in localStorage (`my_qa_ids`)

## Important Notes

- **Page pairing**: Two consecutive pages form one "sheet". Adding/removing odd numbers of pages affects sheet count.
- **isInteractive pages**: Should have empty `content` string; the UI expects `QABoard` there.
- **Firebase mock**: The localStorage fallback in `firebase.ts` is intentional for zero-config local dev.
- **Mobile/desktop view**: Users can manually toggle view modes via UI (top-right button), independent of actual screen size.
- **Pending state**: Questions show `pending: true` while Firebase write is in flight. 10-second timeout with error alert.
