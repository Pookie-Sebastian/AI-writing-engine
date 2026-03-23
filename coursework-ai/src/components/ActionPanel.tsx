'use client';

/**
 * @file ActionPanel.tsx
 * @description Shows the selected task details, optional instructions input, and Run button.
 *
 * @module components/ActionPanel
 */

import type { WritingTask } from '@/lib/ai/types';
import { TASK_LABELS, TASK_DESCRIPTIONS, SELECTION_TASKS } from '@/lib/utils/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActionPanelProps {
  /** Currently selected task, or null */
  activeTask: WritingTask | null;
  /** Called when the user clicks Run */
  onRun: () => void;
  /** True while the pipeline is executing */
  loading: boolean;
  /** Whether the user has text selected in the editor */
  hasSelection: boolean;
  /** Additional instructions textarea value */
  userInput: string;
  /** Called on every change to the instructions textarea */
  onUserInputChange: (value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders task details and the Run button.
 * Shows a warning when a selection task is chosen but no text is selected.
 */
export default function ActionPanel({
  activeTask,
  onRun,
  loading,
  hasSelection,
  userInput,
  onUserInputChange,
}: ActionPanelProps) {
  if (!activeTask) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center">
        <p className="text-xs text-slate-400">Select a task from the toolbar</p>
      </div>
    );
  }

  const needsSelection = SELECTION_TASKS.includes(activeTask);
  const selectionMissing = needsSelection && !hasSelection;
  const canRun = !loading && !selectionMissing;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
      {/* Task heading */}
      <div>
        <p className="text-sm font-semibold text-slate-800">{TASK_LABELS[activeTask]}</p>
        <p className="text-xs text-slate-500 mt-0.5">{TASK_DESCRIPTIONS[activeTask]}</p>
      </div>

      {/* Selection warning */}
      {selectionMissing && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-700">Select text in the editor to use this task</p>
        </div>
      )}

      {/* Additional instructions */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Additional instructions <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={userInput}
          onChange={e => onUserInputChange(e.target.value)}
          placeholder="Any specific requirements…"
          rows={2}
          maxLength={2000}
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 disabled:bg-slate-50 disabled:cursor-not-allowed resize-none transition-colors"
        />
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={!canRun}
        className={[
          'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          canRun
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Running…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run
          </>
        )}
      </button>
    </div>
  );
}
