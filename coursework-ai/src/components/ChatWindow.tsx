'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/chat/types';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatWindow({ messages, onSend }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 text-center overflow-y-auto">
        <img src="/logo.svg" alt="coursework.ai" className="h-12 w-auto" />
        <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
          Your academic writing assistant. Ask me to help plan, write, or improve any essay.
          I understand essay structure and will guide you through every section.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
          {SUGGESTIONS.map((s) => (
            <SuggestionChip key={s.label} {...s} onSend={onSend} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold select-none
        ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
        {isUser ? 'You' : 'AI'}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
        {message.streaming && message.content === '' ? (
          <TypingIndicator />
        ) : (
          <FormattedContent content={message.content} isUser={isUser} />
        )}
        {/* Streaming cursor removed — responses are now delivered in full */}
      </div>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function FormattedContent({ content, isUser }: { content: string; isUser: boolean }) {
  const codeClass = isUser
    ? 'bg-indigo-500 rounded px-1 font-mono text-xs'
    : 'bg-slate-100 rounded px-1 font-mono text-xs text-slate-700';

  function inline(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`);
  }

  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headings: ###, ##, #
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const cls = level === 1
            ? 'font-bold text-base mt-1'
            : 'font-semibold text-sm mt-1';
          return <p key={i} className={cls} dangerouslySetInnerHTML={{ __html: inline(headingMatch[2]) }} />;
        }

        const lines = trimmed.split('\n');

        // Bullet list
        if (lines.every(l => /^[-•*]\s/.test(l.trim()))) {
          return (
            <ul key={i} className="space-y-1">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className={`mt-0.5 shrink-0 ${isUser ? 'text-indigo-200' : 'text-indigo-400'}`}>›</span>
                  <span dangerouslySetInnerHTML={{ __html: inline(line.replace(/^[-•*]\s*/, '')) }} />
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (lines.every(l => /^\d+\.\s/.test(l.trim()))) {
          return (
            <ol key={i} className="space-y-1 list-none">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className={`shrink-0 font-medium tabular-nums ${isUser ? 'text-indigo-200' : 'text-indigo-500'}`}>{j + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: inline(line.replace(/^\d+\.\s*/, '')) }} />
                </li>
              ))}
            </ol>
          );
        }

        // Normal paragraph — single newlines become <br>
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: lines.map(l => inline(l)).join('<br/>') }} />
        );
      })}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <span className="flex gap-1 items-center h-4">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    label: 'Write a full essay',
    prompt: 'Write a complete essay about the causes and consequences of the French Revolution. Include a hook, background, thesis, three body paragraphs each with a topic sentence, evidence, and analysis, and a conclusion with a restated thesis and final insight.',
  },
  {
    label: 'Build an outline',
    prompt: 'Help me create a detailed essay outline about the impact of social media on mental health in teenagers.',
  },
  {
    label: 'Write a thesis statement',
    prompt: 'Write 3 strong thesis statement options for an argumentative essay about whether university education should be free.',
  },
  {
    label: 'Feedback on my intro',
    prompt: 'Here is my introduction — please give feedback on the hook, background, and thesis, then show me an improved version:\n\n[paste your introduction here]',
  },
];

function SuggestionChip({
  label,
  prompt,
  onSend,
}: {
  label: string;
  prompt: string;
  onSend: (text: string) => void;
}) {
  return (
    <button
      onClick={() => onSend(prompt)}
      className="text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm text-slate-700 shadow-sm"
    >
      <span className="font-medium text-slate-800 block mb-0.5">{label}</span>
      <span className="text-xs text-slate-400 line-clamp-1">{prompt.slice(0, 55)}…</span>
    </button>
  );
}
