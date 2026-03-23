/**
 * @file validators.ts
 * @description Three-layer validation applied in sequence by the API route.
 *
 * Layer 1 — validateWritingRequest:  Zod schema validation of the raw body
 * Layer 2 — validateTaskRequirements: Task-specific field requirements
 * Layer 3 — normalizeWritingRequest:  Trim strings, apply defaults
 *
 * @module lib/ai/validators
 */

import type { WritingRequest, WritingTask } from './types';
import { WritingRequestSchema } from './schemas';
import { ValidationError } from '@/lib/errors';

// ─── Task requirement sets ────────────────────────────────────────────────────

const REQUIRES_SELECTED_TEXT = new Set<WritingTask>([
  'rewrite_selection',
  'expand_paragraph',
  'improve_clarity',
  'strengthen_argument',
  'generate_transitions',
]);

const REQUIRES_USER_INPUT = new Set<WritingTask>([
  'summarize_source',
]);

// ─── Layer 1: Schema validation ───────────────────────────────────────────────

/**
 * Validates the raw request body against the WritingRequestSchema.
 * Throws ValidationError with the first Zod issue message on failure.
 *
 * @param body - The raw parsed JSON body (unknown type)
 * @returns The validated WritingRequest
 * @throws {ValidationError} When the body fails schema validation
 */
export function validateWritingRequest(body: unknown): WritingRequest {
  const result = WritingRequestSchema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Invalid request.';
    throw new ValidationError(msg);
  }
  return result.data as WritingRequest;
}

// ─── Layer 2: Task requirements ───────────────────────────────────────────────

/**
 * Checks that task-specific required fields are present.
 * Selection refinement tasks require selectedText; summarize_source requires userInput.
 *
 * @param request - The validated WritingRequest
 * @throws {ValidationError} When a required field is missing for the given task
 */
export function validateTaskRequirements(request: WritingRequest): void {
  if (REQUIRES_SELECTED_TEXT.has(request.task) && !request.selectedText) {
    throw new ValidationError(`Task '${request.task}' requires selectedText.`);
  }
  if (REQUIRES_USER_INPUT.has(request.task) && !request.userInput) {
    throw new ValidationError(`Task '${request.task}' requires userInput.`);
  }
}

// ─── Layer 3: Normalisation ───────────────────────────────────────────────────

/**
 * Returns a new WritingRequest with all string fields trimmed and defaults applied.
 * Does not mutate the input object.
 *
 * Defaults applied:
 *   tone        → 'academic'
 *   courseLevel → 'undergraduate'
 *   wordTarget  → 300
 *
 * @param request - The validated WritingRequest
 * @returns A new normalised WritingRequest
 */
export function normalizeWritingRequest(request: WritingRequest): WritingRequest {
  return {
    ...request,
    documentText:     request.documentText?.trim(),
    selectedText:     request.selectedText?.trim(),
    assignmentPrompt: request.assignmentPrompt?.trim(),
    userInput:        request.userInput?.trim(),
    documentTitle:    request.documentTitle?.trim(),
    thesis:           request.thesis?.trim(),
    tone:             request.tone        ?? 'academic',
    courseLevel:      request.courseLevel ?? 'undergraduate',
    wordTarget:       request.wordTarget  ?? 300,
  };
}
