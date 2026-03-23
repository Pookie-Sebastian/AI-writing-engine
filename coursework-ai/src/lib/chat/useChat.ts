'use client';

/**
 * @file useChat.ts
 * @description Single hook that owns all chat state and API communication.
 *
 * Drop this into any React component to get a fully working chat:
 *
 *   const { messages, loading, sendMessage, clearMessages } = useChat();
 *
 * No other imports needed. The hook handles:
 *   - Message list state
 *   - Typing-indicator placeholder while waiting for the API
 *   - POST to /api/chat with the full conversation history
 *   - Error messages surfaced as assistant bubbles (never silent failures)
 *   - Stale-closure prevention via messagesRef
 *
 * @module lib/chat/useChat
 */

import { useState, useRef } from 'react';
import type { ChatMessage } from './types';

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

      const replyContent = (!res.ok || json.error)
        ? `Sorry, something went wrong: ${json.error ?? res.status}`
        : (json.content ?? '');

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

  return { messages, loading, sendMessage, clearMessages };
}
