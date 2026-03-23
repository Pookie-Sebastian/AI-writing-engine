'use client';

/**
 * @file page.tsx
 * @description Essay writing chat assistant — the main page.
 * ChatGPT-style interface hyper-focused on essay generation and improvement.
 *
 * @module app/page
 */

import { useChat } from '@/lib/chat/useChat';
import ChatWindow from '@/components/ChatWindow';
import ChatInput from '@/components/ChatInput';

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function EssayChatPage() {
  const { messages, loading, sendMessage, clearMessages } = useChat();

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <img src="/logo.svg" alt="coursework.ai" className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              New essay
            </button>
          )}
          {clerkEnabled && <ClerkUserButton />}
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-3xl w-full mx-auto">
        <ChatWindow messages={messages} onSend={sendMessage} loading={loading} />
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>

    </div>
  );
}

function ClerkUserButton() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UserButton } = require('@clerk/nextjs');
    return <UserButton afterSignOutUrl="/sign-in" />;
  } catch {
    return null;
  }
}
