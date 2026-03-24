'use client';

/**
 * @file page.tsx
 * @description Essay writing chat assistant — the main page.
 * ChatGPT-style interface hyper-focused on essay generation and improvement.
 *
 * @module app/page
 */

import Image from 'next/image';
import { useChat } from '@/lib/chat/useChat';
import ChatWindow from '@/components/ChatWindow';
import ChatInput from '@/components/ChatInput';

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamically require Clerk's UserButton only when Clerk is configured.
// Loaded at module level (not inside a component) so JSX is never constructed
// inside a try/catch, satisfying the react-hooks/error-boundaries lint rule.
let _UserButton: React.ComponentType<{ afterSignOutUrl: string }> | null = null;
if (clerkEnabled) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _UserButton = require('@clerk/nextjs').UserButton;
  } catch {
    _UserButton = null;
  }
}

function ClerkUserButton() {
  if (!_UserButton) return null;
  const UB = _UserButton;
  return <UB afterSignOutUrl="/sign-in" />;
}

export default function EssayChatPage() {
  const { messages, loading, sendMessage, clearMessages } = useChat();

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <Image src="/logo.svg" alt="coursework.ai" width={120} height={32} className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              disabled={loading}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors
                ${loading
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
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
