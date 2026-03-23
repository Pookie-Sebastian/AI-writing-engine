'use client';

/**
 * @file useChat.ts
 * @description Single hook that owns all chat state and API communication.
 *
 * Drop this into any React component to get a fully working chat:
 *
 *   const { messages, loading, sendMessage, clearMessages } = useChat();
 *
 * Analysis engine integration:
 *   - injectAnalysis(result) — pushes a structured AnalysisResult into the
 *     conversation as an assistant message with a rich card. The chat AI then
 *     has the analysis summary in its history and can answer follow-up questions.
 *   - injectMessage(content, role?) — pushes any plain message into the
 *     conversation without an API call. Used by the analysis engine to surface
 *     status updates (e.g. "Analysing your essay…").
 *
 * @module lib/chat/useChat
 */

import { useState, useRef } from 'react';
import type { ChatMessage } from './types';
import type { AnalysisResult } from '@/lib/ai/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseChatReturn {
  /** Full conversation history including the current assistant placeholder */
  messages: ChatMessage[];
  /** True while waiting for the API response */
  loading: boolean;
  /** Send a user message and fetch the assistant reply */
  sendMessage: (text: string) => Promise<void>;
  /** Reset the conversation to an empty state */
  clearMessages: () => void;
  /**
   * Push a structured AnalysisResult into the chat as an assistant message.
   * The analysis summary is included as the message content so the chat AI
   * can reference it in follow-up responses.
   * Called by the analysis engine after it finishes analysing an essay.
   *
   * @param result - The AnalysisResult produced by the analysis engine
   */
  injectAnalysis: (result: AnalysisResult) => void;
  /**
   * Push a plain text message into the conversation without an API call.
   * Defaults to role 'assistant'. Used for status messages and notifications
   * from the analysis engine.
   *
   * @param content - The message text
   * @param role    - 'user' or 'assistant' (default: 'assistant')
   */
  injectMessage: (content: string, role?: 'user' | 'assistant') => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(false);

  // A ref that always holds the latest messages array.
  // sendMessage reads from this instead of closing over the state variable,
  // which would capture a stale snapshot on every render.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  async function sendMessage(text: string): Promise<void> {
    if (loading) return;

    const userMsg: ChatMessage = {
      id:        makeId(),
      role:      'user',
      content:   text,
      createdAt: now(),
    };

    // Placeholder bubble shown while the API is in flight
    const assistantId = makeId();
    const placeholder: ChatMessage = {
      id:        assistantId,
      role:      'assistant',
      content:   '',
      createdAt: now(),
      streaming: true,
    };

    // Snapshot current messages from ref — always fresh, never stale
    const current = messagesRef.current;
    setMessages([...current, userMsg, placeholder]);
    setLoading(true);

    // History sent to the API: everything up to and including the new user message
    const history = [...current, userMsg].map(m => ({
      role:    m.role,
      content: m.content,
    }));

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      });

      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

      // Surface any error — including empty content — as a visible message.
      const replyContent = (!res.ok || json.error || !json.content)
        ? (json.error ?? `Request failed (${res.status}). Please try again.`)
        : (json.content as string);

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: replyContent, streaming: false }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Sorry, something went wrong: ${msg}`, streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function clearMessages(): void {
    setMessages([]);
  }

  function injectAnalysis(result: AnalysisResult): void {
    // Build a plain-text summary for the chat history so the AI can reference
    // it in follow-up responses. The full AnalysisResult is attached separately
    // for the UI to render a rich card.
    // Content is capped at 4000 chars so it never exceeds the API's per-message
    // max (20 000 chars) even when combined with a long summary.
    const issueLines = result.issues
      .slice(0, 5)
      .map(i => `- [${i.severity}] ${i.description}`)
      .join('\n');

    const parts = [
      `**Essay Analysis Complete** — Score: ${result.overallScore}/100`,
      result.summary,
      result.issues.length > 0 ? `**Top issues:**\n${issueLines}` : 'No major issues found.',
      result.strengths.length > 0 ? `**Strengths:** ${result.strengths.join(', ')}` : '',
    ].filter(Boolean); // removes empty strings, not just undefined

    const full = parts.join('\n\n').trim();
    // Truncate to 4000 chars to stay well within the API message size limit
    const content = full.length > 4000 ? full.slice(0, 4000) + '\n\n[truncated]' : full;

    const msg: ChatMessage = {
      id:             makeId(),
      role:           'assistant',
      content,
      createdAt:      now(),
      analysisResult: result,
    };

    setMessages(prev => [...prev, msg]);
  }

  function injectMessage(content: string, role: 'user' | 'assistant' = 'assistant'): void {
    const msg: ChatMessage = {
      id:        makeId(),
      role,
      content,
      createdAt: now(),
    };
    setMessages(prev => [...prev, msg]);
  }

  return { messages, loading, sendMessage, clearMessages, injectAnalysis, injectMessage };
}
