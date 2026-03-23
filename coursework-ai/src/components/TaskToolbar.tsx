'use client';

/**
 * @file TaskToolbar.tsx
 * @description Task selection buttons grouped into Generate and Refine sections.
 *
 * @module components/TaskToolbar
 */

import type { WritingTask } from '@/lib/ai/types';
import {
  TASK_LABELS,
  GENERATION_TASKS,
  REFINEMENT_TASKS,
  SELECTION_TASKS,
} from '@/lib/utils/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskToolbarProps {
  /** Currently selected task, or null if none */
  activeTask: WritingTask | null;
  /** Called when the user clicks a task button */
  onSelectTask: (task: WritingTask) => void;
  /** The task currently being executed (shows spinner) */
  runningTask: WritingTask | null;
  /** Whether the user has text selected in the editor */
  hasSelection: boolean;
  /** Disables all buttons when true */
  disabled?: boolean;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders two groups of task buttons: Generate and Refine.
 * Selection tasks are visually dimmed when no text is selected.
 */
export default function TaskToolbar({
  activeTask,
  onSelectTask,
  runningTask,
  hasSelection,
  disabled = false,
}: TaskToolbarProps) {
  function renderButton(task: WritingTask) {
    const isActive  = task === activeTask;
    const isRunning = task === runningTask;
    const needsSel  = SELECTION_TASKS.includes(task);
    const dimmed    = needsSel && !hasSelection;

    return (
      <button
        key={task}
        onClick={() => onSelectTask(task)}
        disabled={disabled}
        title={dimmed ? 'Select text in the editor first' : TASK_LABELS[task]}
        className={[
          'flex items-center gap-1.5 w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : dimmed
              ? 'text-slate-400 hover:bg-slate-100'
              : 'text-slate-700 hover:bg-slate-100',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        {isRunning && <Spinner />}
        <span className="truncate">{TASK_LABELS[task]}</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Generate group */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
          Generate
        </p>
        <div className="space-y-0.5">
          {GENERATION_TASKS.map(renderButton)}
        </div>
      </div>

      {/* Refine group */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
          Refine
        </p>
        <div className="space-y-0.5">
          {REFINEMENT_TASKS.map(renderButton)}
        </div>
      </div>
    </div>
  );
}
