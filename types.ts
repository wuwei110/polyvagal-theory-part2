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
}

export enum TurnDirection {
  NEXT = 'next',
  PREV = 'prev'
}
