'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to ~200px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  // Re-focus the textarea when loading finishes so Enter works immediately
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const hasText = value.trim().length > 0;
  const canSend = hasText && !disabled;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div
          className={`flex items-end gap-2 rounded-2xl border px-4 py-2 transition-colors
            ${disabled
              ? 'border-slate-200 bg-slate-50'
              : 'border-slate-300 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'
            }`}
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              // Block input while loading without using disabled/readOnly,
              // both of which suppress keyboard events in some browsers.
              if (!disabled) setValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Waiting for response…' : 'Ask me to write, plan, or improve your essay…'}
            rows={1}
            className={`flex-1 resize-none bg-transparent text-sm placeholder:text-slate-400 focus:outline-none leading-relaxed py-1
              ${disabled ? 'text-slate-400 cursor-default' : 'text-slate-800'}`}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              submit();
            }}
            disabled={!canSend}
            aria-label="Send message"
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors mb-0.5
              ${disabled
                ? 'bg-indigo-500 text-white cursor-default pointer-events-none'
                : canSend
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
          >
            {disabled ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Press <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> to send ·{' '}
          <kbd className="font-mono bg-slate-100 px-1 rounded">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
