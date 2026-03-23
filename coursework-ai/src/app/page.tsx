'use client';

/**
 * @file page.tsx
 * @description Root chat page. Layout only — all logic lives in useChat.
 *
 * To embed this chatbot in another project, copy:
 *   src/lib/chat/useChat.ts       ← hook (state + API calls)
 *   src/lib/chat/types.ts         ← ChatMessage type
 *   src/components/ChatWindow.tsx ← message list + empty state
 *   src/components/ChatInput.tsx  ← textarea + send button
 *   src/app/api/chat/route.ts     ← Next.js API route
 *   public/logo.svg               ← brand asset
 *
 * Then drop <ChatWindow> + <ChatInput> into any page and wire useChat().
 */

import { useChat } from '@/lib/chat/useChat';
import ChatWindow from '@/components/ChatWindow';
import ChatInput from '@/components/ChatInput';

export default function ChatPage() {
  const { messages, loading, sendMessage, clearMessages } = useChat();

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <img src="/logo.svg" alt="coursework.ai" className="h-8 w-auto" />
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear chat
          </button>
        )}
      </header>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-3xl w-full mx-auto">
        <ChatWindow messages={messages} onSend={sendMessage} />
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>

    </div>
  );
}
