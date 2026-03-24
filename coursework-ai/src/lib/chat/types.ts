/**
 * @file types.ts
 * @description Types for the chat interface.
 * @module lib/chat/types
 */

import type { AnalysisResult } from '@/lib/ai/types';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** ISO timestamp */
  createdAt: string;
  /** True while the assistant is still streaming this message */
  streaming?: boolean;
  /**
   * Structured analysis result attached to this message.
   * Set by the analysis engine when it injects findings into the chat.
   * The ChatWindow renders a rich analysis card when this is present.
   */
  analysisResult?: AnalysisResult;
  /**
   * True for messages injected by the analysis engine via injectMessage().
   * These are shown in the UI but excluded from the history sent to the API
   * to avoid polluting the conversation context with status messages.
   */
  injected?: boolean;
}
