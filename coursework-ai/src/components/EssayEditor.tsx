'use client';

/**
 * @file EssayEditor.tsx
 * @description Controlled textarea component for the essay document.
 * Forwards its ref to the underlying textarea DOM node so the parent can
 * read selectionStart/selectionEnd for cursor-aware insert and replace.
 *
 * @module components/EssayEditor
 */

import React from 'react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EssayEditorProps {
  /** Current textarea value */
  value: string;
  /** Called on every change with the new value */
  onChange: (value: string) => void;
  /** Placeholder text shown when the editor is empty */
  placeholder?: string;
  /** Disables the textarea when true */
  disabled?: boolean;
  /** Word count displayed in the footer bar */
  wordCount?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Controlled essay textarea with a word-count footer.
 * The ref is forwarded to the underlying <textarea> DOM node.
 */
const EssayEditor = React.forwardRef<HTMLTextAreaElement, EssayEditorProps>(
  function EssayEditor(
    { value, onChange, placeholder, disabled = false, wordCount },
    ref
  ) {
    return (
      <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'Start writing your essay here…'}
          disabled={disabled}
          spellCheck
          className={[
            'flex-1 w-full min-h-0 resize-none p-4 text-sm leading-relaxed',
            'font-sans text-slate-800 placeholder:text-slate-400',
            'focus:outline-none focus:ring-0',
            'disabled:bg-slate-50 disabled:cursor-not-allowed',
          ].join(' ')}
        />
        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-4 py-1.5 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-400">
            {disabled ? 'AI is writing…' : 'Click to edit'}
          </span>
          {wordCount !== undefined && (
            <span className="text-xs text-slate-500 tabular-nums">
              {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
            </span>
          )}
        </div>
      </div>
    );
  }
);

EssayEditor.displayName = 'EssayEditor';

export default EssayEditor;
