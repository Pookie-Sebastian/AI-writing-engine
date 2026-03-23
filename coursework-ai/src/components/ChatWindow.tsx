'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/chat/types';
import type { AnalysisResult, EssayIssue } from '@/lib/ai/types';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
}

export default function ChatWindow({ messages, onSend, loading = false }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 text-center overflow-y-auto">
        <img src="/logo.svg" alt="coursework.ai" className="h-12 w-auto" />
        <div>
          <p className="text-slate-800 font-semibold text-lg">What are you writing today?</p>
          <p className="text-slate-500 text-sm mt-1 max-w-sm leading-relaxed">
            Tell me your topic, paste your assignment brief, or share a draft — I'll write, plan, or improve it.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
          {SUGGESTIONS.map((s) => (
            <SuggestionChip key={s.label} {...s} onSend={onSend} disabled={loading} />
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
          <>
            <FormattedContent content={message.content} isUser={isUser} />
            {message.analysisResult && (
              <AnalysisCard result={message.analysisResult} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Analysis card ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  critical:   'bg-red-100 text-red-700 border-red-200',
  major:      'bg-orange-100 text-orange-700 border-orange-200',
  minor:      'bg-yellow-100 text-yellow-700 border-yellow-200',
  suggestion: 'bg-blue-100 text-blue-700 border-blue-200',
};

function AnalysisCard({ result }: { result: AnalysisResult }) {
  const scoreColor =
    result.overallScore >= 75 ? 'text-green-600' :
    result.overallScore >= 50 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden text-slate-800">
      {/* Score header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Essay Analysis</span>
        <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
          {result.overallScore}<span className="text-sm font-normal text-slate-400">/100</span>
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Strengths */}
        {result.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">Strengths</p>
            <ul className="space-y-1">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-700">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {result.issues.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">Issues to fix</p>
            <ul className="space-y-2">
              {result.issues.map((issue: EssayIssue) => (
                <li key={issue.id} className={`rounded-lg border px-3 py-2 text-xs ${SEVERITY_STYLES[issue.severity] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold capitalize">{issue.severity}</span>
                    <span className="opacity-60">·</span>
                    <span className="capitalize">{issue.category}</span>
                  </div>
                  <p>{issue.description}</p>
                  {issue.suggestion && (
                    <p className="mt-1 opacity-80">Fix: {issue.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-400">
          {result.wordCount.toLocaleString()} words · Ask me to fix any of these issues
        </p>
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
    prompt: 'Write a complete essay on the causes and consequences of the French Revolution. Include a hook, background, thesis, three body paragraphs each with a topic sentence, evidence, and analysis, and a conclusion.',
  },
  {
    label: 'Create an outline',
    prompt: 'Create a detailed essay outline on the impact of social media on mental health in teenagers. Include an introduction, three body paragraph sections with bullet points, and a conclusion.',
  },
  {
    label: 'Write 3 thesis options',
    prompt: 'Write 3 strong thesis statement options for an argumentative essay on whether university education should be free.',
  },
  {
    label: 'Improve my writing',
    prompt: 'Here is a paragraph from my essay — rewrite it to improve clarity, strengthen the argument, and make it more academic:\n\n[paste your paragraph here]',
  },
  {
    label: 'Write an introduction',
    prompt: 'Write a strong introduction for an essay arguing that climate change is the most urgent issue facing humanity today. Include a hook, background context, and a clear thesis.',
  },
  {
    label: 'Fix my conclusion',
    prompt: 'Here is my conclusion — rewrite it so it properly restates the thesis, summarises the main arguments, and ends with a strong final insight:\n\n[paste your conclusion here]',
  },
];

function SuggestionChip({
  label,
  prompt,
  onSend,
  disabled = false,
}: {
  label: string;
  prompt: string;
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => onSend(prompt)}
      disabled={disabled}
      className={`text-left px-4 py-3 rounded-xl border transition-colors text-sm shadow-sm
        ${disabled
          ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 cursor-pointer'
        }`}
    >
      <span className={`font-medium block mb-0.5 ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>{label}</span>
      <span className="text-xs text-slate-400 line-clamp-1">{prompt.slice(0, 55)}…</span>
    </button>
  );
}
