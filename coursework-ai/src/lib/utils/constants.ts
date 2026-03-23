/**
 * @file constants.ts
 * @description UI labels, option lists, and task groupings for frontend components.
 *
 * @module lib/utils/constants
 */

import type { WritingTask, EssayTone, CourseLevel } from '@/lib/ai/types';

// ─── Task labels ──────────────────────────────────────────────────────────────

/**
 * Human-readable label for each WritingTask, used in buttons and headings.
 */
export const TASK_LABELS: Record<WritingTask, string> = {
  generate_outline:        'Generate Outline',
  generate_thesis:         'Write Thesis',
  generate_intro:          'Write Introduction',
  generate_body_paragraph: 'Write Body Paragraph',
  generate_conclusion:     'Write Conclusion',
  generate_draft:          'Generate Full Draft',
  rewrite_selection:       'Rewrite Selection',
  expand_paragraph:        'Expand Paragraph',
  improve_clarity:         'Improve Clarity',
  strengthen_argument:     'Strengthen Argument',
  generate_transitions:    'Add Transitions',
  summarize_source:        'Summarize Source',
  fix_issue:               'Fix Issue',
};

// ─── Task descriptions ────────────────────────────────────────────────────────

/**
 * One-sentence description of what each task does, shown in the action panel.
 */
export const TASK_DESCRIPTIONS: Record<WritingTask, string> = {
  generate_outline:        'Create a structured outline with sections and bullet points.',
  generate_thesis:         'Generate three thesis statement options to choose from.',
  generate_intro:          'Write a full introduction with hook, background, and thesis.',
  generate_body_paragraph: 'Write one body paragraph with evidence and analysis.',
  generate_conclusion:     'Write a conclusion that restates the thesis and closes the essay.',
  generate_draft:          'Generate a complete essay draft from your assignment details.',
  rewrite_selection:       'Rewrite selected text with improved clarity and style.',
  expand_paragraph:        'Expand selected text with more detail and analysis.',
  improve_clarity:         'Fix awkward phrasing and improve sentence flow.',
  strengthen_argument:     'Improve reasoning and evidence in the selected passage.',
  generate_transitions:    'Add smooth transitions between ideas in the selection.',
  summarize_source:        'Summarize a source passage into a citation-ready sentence.',
  fix_issue:               'Fix a specific issue identified by the analysis engine.',
};

// ─── Task groupings ───────────────────────────────────────────────────────────

/**
 * Tasks that generate new content from scratch (no selection required).
 */
export const GENERATION_TASKS: WritingTask[] = [
  'generate_outline',
  'generate_thesis',
  'generate_intro',
  'generate_body_paragraph',
  'generate_conclusion',
  'generate_draft',
];

/**
 * Tasks that require the user to have text selected in the editor.
 */
export const SELECTION_TASKS: WritingTask[] = [
  'rewrite_selection',
  'expand_paragraph',
  'improve_clarity',
  'strengthen_argument',
  'generate_transitions',
];

/**
 * All tasks that operate on existing text (selection tasks + summarize_source).
 */
export const REFINEMENT_TASKS: WritingTask[] = [
  'rewrite_selection',
  'expand_paragraph',
  'improve_clarity',
  'strengthen_argument',
  'generate_transitions',
  'summarize_source',
];

// ─── Select options ───────────────────────────────────────────────────────────

/**
 * Options for the tone select input.
 */
export const TONE_OPTIONS: { value: EssayTone; label: string }[] = [
  { value: 'academic',    label: 'Academic'    },
  { value: 'persuasive',  label: 'Persuasive'  },
  { value: 'analytical',  label: 'Analytical'  },
  { value: 'reflective',  label: 'Reflective'  },
  { value: 'narrative',   label: 'Narrative'   },
];

/**
 * Options for the course level select input.
 */
export const COURSE_LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: 'high_school',    label: 'High School'    },
  { value: 'undergraduate',  label: 'Undergraduate'  },
  { value: 'graduate',       label: 'Graduate'       },
  { value: 'professional',   label: 'Professional'   },
];

/**
 * Default word target when none is specified.
 */
export const DEFAULT_WORD_TARGET = 300;

/**
 * Preset word target options for the word count select input.
 */
export const WORD_TARGET_OPTIONS: { value: number; label: string }[] = [
  { value: 150,  label: '150 words'  },
  { value: 300,  label: '300 words'  },
  { value: 500,  label: '500 words'  },
  { value: 750,  label: '750 words'  },
  { value: 1000, label: '1 000 words' },
  { value: 1500, label: '1 500 words' },
  { value: 2000, label: '2 000 words' },
];
