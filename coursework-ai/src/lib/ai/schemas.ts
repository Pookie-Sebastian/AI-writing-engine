/**
 * @file schemas.ts
 * @description Zod validation schemas for the writing API request.
 *
 * Field length limits serve two purposes:
 *   1. Prompt injection prevention — capping user-supplied strings limits the
 *      surface area for adversarial inputs that attempt to override the system
 *      prompt or exfiltrate data.
 *   2. Context window management — the combined prompt must fit within the
 *      model's context window. Enforcing limits here prevents silent truncation
 *      or model errors at inference time.
 *
 * @module lib/ai/schemas
 */

import { z } from 'zod';
import type { WritingTask, EssayTone, CourseLevel } from './types';

// ─── Enum schemas ─────────────────────────────────────────────────────────────

/**
 * Validates that the task field is one of the 12 supported task identifiers.
 */
export const WritingTaskSchema = z.enum([
  'generate_outline',
  'generate_thesis',
  'generate_intro',
  'generate_body_paragraph',
  'generate_conclusion',
  'generate_draft',
  'rewrite_selection',
  'expand_paragraph',
  'improve_clarity',
  'strengthen_argument',
  'generate_transitions',
  'summarize_source',
] as const satisfies readonly WritingTask[]);

/**
 * Validates the essay tone field.
 */
export const EssayToneSchema = z.enum([
  'academic',
  'persuasive',
  'analytical',
  'reflective',
  'narrative',
] as const satisfies readonly EssayTone[]);

/**
 * Validates the course level field.
 */
export const CourseLevelSchema = z.enum([
  'high_school',
  'undergraduate',
  'graduate',
  'professional',
] as const satisfies readonly CourseLevel[]);

// ─── Request schema ───────────────────────────────────────────────────────────

/**
 * Full validation schema for POST /api/ai/write request bodies.
 *
 * Length limits:
 *   - documentText (20 000 chars): fits ~5 000 words, enough for a full draft
 *   - assignmentPrompt / selectedText (5 000 chars): typical assignment briefs
 *   - userInput (2 000 chars): additional instructions from the user
 *   - thesis / documentTitle: short fields, generous limits
 *   - wordTarget: 50–5 000 words covers all realistic essay lengths
 */
export const WritingRequestSchema = z.object({
  task:             WritingTaskSchema,
  assignmentPrompt: z.string().max(5000).optional(),
  documentText:     z.string().max(20000).optional(),
  selectedText:     z.string().max(5000).optional(),
  userInput:        z.string().max(2000).optional(),
  documentTitle:    z.string().max(200).optional(),
  thesis:           z.string().max(1000).optional(),
  tone:             EssayToneSchema.optional(),
  courseLevel:      CourseLevelSchema.optional(),
  wordTarget:       z.number().int().min(50).max(5000).optional(),
});
