/**
 * @file text.ts
 * @description Textarea manipulation and text measurement helpers for the frontend.
 *
 * @module lib/utils/text
 */

// ─── Cursor insertion ─────────────────────────────────────────────────────────

/**
 * Inserts a string into an existing string at the given cursor position.
 *
 * @param current   - The current full string (e.g. textarea value)
 * @param insertion - The text to insert
 * @param cursorPos - The character index at which to insert
 * @returns The new full string and the cursor position after the insertion
 */
export function insertAtCursor(
  current: string,
  insertion: string,
  cursorPos: number
): { text: string; newCursorPos: number } {
  const text = current.slice(0, cursorPos) + insertion + current.slice(cursorPos);
  return { text, newCursorPos: cursorPos + insertion.length };
}

// ─── Selection replacement ────────────────────────────────────────────────────

/**
 * Replaces the substring between selectionStart and selectionEnd with replacement.
 *
 * @param current        - The current full string
 * @param replacement    - The text to substitute in
 * @param selectionStart - Start index of the selection (inclusive)
 * @param selectionEnd   - End index of the selection (exclusive)
 * @returns The new full string and the cursor position at the end of the replacement
 */
export function replaceSelection(
  current: string,
  replacement: string,
  selectionStart: number,
  selectionEnd: number
): { text: string; newCursorPos: number } {
  const text = current.slice(0, selectionStart) + replacement + current.slice(selectionEnd);
  return { text, newCursorPos: selectionStart + replacement.length };
}

// ─── Word count ───────────────────────────────────────────────────────────────

/**
 * Returns the number of words in a string.
 * Splits on whitespace and filters empty tokens.
 *
 * @param text - The text to count
 * @returns Word count
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ─── Reading time ─────────────────────────────────────────────────────────────

/**
 * Estimates reading time in minutes, assuming 200 words per minute.
 * Always rounds up to at least 1 minute.
 *
 * @param text - The text to estimate
 * @returns Estimated reading time in minutes (minimum 1)
 */
export function estimateReadingTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200));
}
