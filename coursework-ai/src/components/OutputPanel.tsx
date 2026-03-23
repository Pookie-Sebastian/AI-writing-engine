'use client';

/**
 * @file OutputPanel.tsx
 * @description Displays AI-generated output with insert/replace actions.
 *
 * @module components/OutputPanel
 */

import type { WritingResponse } from '@/lib/ai/types';
import { TASK_LABELS } from '@/lib/utils/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface OutputPanelProps {
  /** The most recent AI response, or null if none yet */
  response: WritingResponse | null;
  /** True while the pipeline is executing */
  loading: boolean;
  /** Called when the user clicks "Insert at cursor" */
  onInsert: (text: string) => void;
  /** Called when the user clicks "Replace selection" */
  onReplace: (text: string) => void;
  /** Error message to display, or null */
  error: string | null;
}

// ─── Formatted content (reuses ChatWindow pattern) ────────────────────────────

function FormattedContent({ content }: { content: string }) {
  function inline(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2 text-sm text-slate-800 leading-relaxed">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (headingMatch) {
          return (
            <p key={i} className="font-semibold text-slate-900 mt-1"
              dangerouslySetInnerHTML={{ __html: inline(headingMatch[2]) }} />
          );
        }

        const lines = trimmed.split('\n');

        if (lines.every(l => /^[-•*]\s/.test(l.trim()))) {
          return (
            <ul key={i} className="space-y-1">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-indigo-400">›</span>
                  <span dangerouslySetInnerHTML={{ __html: inline(line.replace(/^[-•*]\s*/, '')) }} />
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every(l => /^\d+\.\s/.test(l.trim()))) {
          return (
            <ol key={i} className="space-y-1 list-none">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="shrink-0 font-medium tabular-nums text-indigo-500">{j + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: inline(line.replace(/^\d+\.\s*/, '')) }} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: lines.map(l => inline(l)).join('<br/>') }} />
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-200 rounded w-full" />
      <div className="h-3 bg-slate-200 rounded w-5/6" />
      <div className="h-3 bg-slate-200 rounded w-full" />
      <div className="h-3 bg-slate-200 rounded w-2/3" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders the AI output with loading, error, empty, and populated states.
 */
export default function OutputPanel({
  response,
  loading,
  onInsert,
  onReplace,
  error,
}: OutputPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Output</p>
        {response && (
          <p className="text-xs text-slate-400">{TASK_LABELS[response.task]}</p>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && !response && (
          <p className="text-sm text-slate-400 text-center py-4">Output will appear here</p>
        )}

        {!loading && !error && response && (
          <div className="space-y-4">
            {/* Thesis options: flat numbered bullets */}
            {response.task === 'generate_thesis' && response.bullets && response.bullets.length > 0 ? (
              <ol className="space-y-2 list-none">
                {response.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-800">
                    <span className="shrink-0 font-semibold tabular-nums text-indigo-500">{i + 1}.</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ol>
            ) : (
              // All other tasks (including outlines): render formatted outputText
              // which preserves headings and structure from the model.
              <FormattedContent content={response.outputText} />
            )}

            {/* Word count */}
            {response.wordCount !== undefined && (
              <p className="text-xs text-slate-400 tabular-nums">
                {response.wordCount.toLocaleString()} {response.wordCount === 1 ? 'word' : 'words'}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onInsert(response.outputText)}
                className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700 transition-colors"
              >
                Insert at cursor
              </button>
              <button
                onClick={() => onReplace(response.outputText)}
                className="flex-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors"
              >
                Replace selection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
