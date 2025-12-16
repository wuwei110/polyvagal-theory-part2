export interface PageContent {
  id: number;
  title?: string;
  content?: string; // HTML string for rich text
  image?: string;
  isCover?: boolean;
  isBackCover?: boolean;
  isInteractive?: boolean;
}

export interface QAItem {
  id: string;
  nickname: string;
  question: string;
  reply?: string;
  timestamp: number;
  isReplied: boolean;
  pending?: boolean; // True if local write not yet acknowledged by server
  userId?: string;   // Optional author ID for future features
}

export enum TurnDirection {
  NEXT = 'next',
  PREV = 'prev'
}
