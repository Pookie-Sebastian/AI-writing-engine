/**
 * @file types.ts
 * @description Types for the chat interface.
 * @module lib/chat/types
 */

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** ISO timestamp */
  createdAt: string;
  /** True while the assistant is still streaming this message */
  streaming?: boolean;
}
