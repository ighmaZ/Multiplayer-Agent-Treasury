// types/chat.ts
// Shared types for chat UI and API

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatMessage extends ChatHistoryMessage {
  id: string;
  createdAt: string;
}
