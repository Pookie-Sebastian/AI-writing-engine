/**
 * @file context.ts
 * @description Transforms a raw WritingRequest into a WritingContext ready for
 * prompt injection.
 *
 * Responsibilities:
 *   - Truncate long text fields to prevent context window overflow
 *   - Apply default word target when none is provided
 *   - Provide helpers for extracting and formatting context for prompts
 *
 * @module lib/ai/context
 */

import type { WritingRequest, WritingContext } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_DOCUMENT_CHARS  = 15000;
const MAX_SELECTION_CHARS = 3000;
const DEFAULT_WORD_TARGET = 300;

// ─── Context builder ──────────────────────────────────────────────────────────

/**
 * Builds a WritingContext from a raw WritingRequest.
 * Copies all DocumentContext fields, truncates long text fields, and resolves
 * the word target to its default if not provided.
 *
 * @param request - The validated and normalised writing request
 * @returns A WritingContext ready for use by prompt builders
 */
export function buildWritingContext(request: WritingRequest): WritingContext {
  return {
    // Pass through all DocumentContext fields
    documentText:     request.documentText,
    selectedText:     request.selectedText,
    assignmentPrompt: request.assignmentPrompt,
    thesis:           request.thesis,
    tone:             request.tone,
    courseLevel:      request.courseLevel,
    documentTitle:    request.documentTitle,
    // Truncated versions for prompt injection
    truncatedDocument:  truncateText(request.documentText,  MAX_DOCUMENT_CHARS),
    truncatedSelection: truncateText(request.selectedText,  MAX_SELECTION_CHARS),
    // Resolved word target
    resolvedWordTarget: request.wordTarget ?? DEFAULT_WORD_TARGET,
    // User-supplied additional instructions or source text
    userInput: request.userInput,
  };
}

// ─── Text truncation ──────────────────────────────────────────────────────────

/**
 * Truncates text to maxChars characters, appending a truncation notice.
 * Returns undefined if the input is undefined or empty.
 *
 * @param text     - The text to truncate (may be undefined)
 * @param maxChars - Maximum number of characters to retain
 * @returns The (possibly truncated) text, or undefined
 */
export function truncateText(
  text: string | undefined,
  maxChars: number
): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[truncated]';
}

// ─── Selection extractor ──────────────────────────────────────────────────────

/**
 * Returns the most specific text available for refinement tasks.
 * Prefers truncatedSelection over truncatedDocument, falls back to empty string.
 *
 * @param context - The WritingContext to extract from
 * @returns The selected text, full document, or empty string
 */
export function extractSelectedSection(context: WritingContext): string {
  return context.truncatedSelection ?? context.truncatedDocument ?? '';
}

// ─── Prompt context formatter ─────────────────────────────────────────────────

/**
 * Builds a structured context block for injection into prompt strings.
 * Omits any line whose value is undefined or empty.
 *
 * Output format:
 *   Assignment: {assignmentPrompt}
 *   Course level: {courseLevel}
 *   Tone: {tone}
 *   Thesis: {thesis}
 *   Word target: {resolvedWordTarget}
 *
 * @param context - The WritingContext to format
 * @returns A multi-line string block, or empty string if no fields are set
 */
export function formatContextForPrompt(context: WritingContext): string {
  const lines: string[] = [];

  if (context.assignmentPrompt) lines.push(`Assignment: ${context.assignmentPrompt}`);
  if (context.courseLevel)      lines.push(`Course level: ${context.courseLevel}`);
  if (context.tone)             lines.push(`Tone: ${context.tone}`);
  if (context.thesis)           lines.push(`Thesis: ${context.thesis}`);
  lines.push(`Word target: ${context.resolvedWordTarget}`);

  return lines.join('\n');
}
