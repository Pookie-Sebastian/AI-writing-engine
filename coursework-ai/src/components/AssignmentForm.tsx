'use client';

/**
 * @file AssignmentForm.tsx
 * @description Assignment metadata inputs: title, prompt, tone, level, word target.
 *
 * @module components/AssignmentForm
 */

import type { EssayTone, CourseLevel } from '@/lib/ai/types';
import {
  TONE_OPTIONS,
  COURSE_LEVEL_OPTIONS,
  WORD_TARGET_OPTIONS,
} from '@/lib/utils/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssignmentFormProps {
  assignmentPrompt: string;
  documentTitle: string;
  thesis: string;
  tone: EssayTone;
  courseLevel: CourseLevel;
  wordTarget: number;
  onChange: (field: string, value: string | number) => void;
  disabled?: boolean;
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 ' +
  'disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors';

const labelBase = 'block text-xs font-medium text-slate-600 mb-1';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders labelled inputs for all assignment metadata fields.
 * All changes are reported via the single onChange(field, value) callback.
 */
export default function AssignmentForm({
  assignmentPrompt,
  documentTitle,
  thesis,
  tone,
  courseLevel,
  wordTarget,
  onChange,
  disabled = false,
}: AssignmentFormProps) {
  return (
    <div className="space-y-3">
      {/* Document title */}
      <div>
        <label className={labelBase}>Essay title</label>
        <input
          type="text"
          value={documentTitle}
          onChange={e => onChange('documentTitle', e.target.value)}
          placeholder="Untitled essay"
          disabled={disabled}
          maxLength={200}
          className={inputBase}
        />
      </div>

      {/* Assignment prompt */}
      <div>
        <label className={labelBase}>Assignment prompt</label>
        <textarea
          value={assignmentPrompt}
          onChange={e => onChange('assignmentPrompt', e.target.value)}
          placeholder="Paste the assignment question or brief…"
          disabled={disabled}
          rows={4}
          maxLength={5000}
          className={`${inputBase} resize-none`}
        />
      </div>

      {/* Thesis */}
      <div>
        <label className={labelBase}>Thesis statement</label>
        <textarea
          value={thesis}
          onChange={e => onChange('thesis', e.target.value)}
          placeholder="Your thesis (optional — AI can generate one)…"
          disabled={disabled}
          rows={2}
          maxLength={1000}
          className={`${inputBase} resize-none`}
        />
      </div>

      {/* Tone */}
      <div>
        <label className={labelBase}>Tone</label>
        <select
          value={tone}
          onChange={e => onChange('tone', e.target.value)}
          disabled={disabled}
          className={inputBase}
        >
          {TONE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Course level */}
      <div>
        <label className={labelBase}>Course level</label>
        <select
          value={courseLevel}
          onChange={e => onChange('courseLevel', e.target.value)}
          disabled={disabled}
          className={inputBase}
        >
          {COURSE_LEVEL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Word target */}
      <div>
        <label className={labelBase}>Word target</label>
        <select
          value={wordTarget}
          onChange={e => onChange('wordTarget', Number(e.target.value))}
          disabled={disabled}
          className={inputBase}
        >
          {WORD_TARGET_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
