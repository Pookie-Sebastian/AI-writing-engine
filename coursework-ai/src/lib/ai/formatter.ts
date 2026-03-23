/**
 * @file formatter.ts
 * @description Post-processes raw model output into structured WritingResponse objects.
 *
 * The formatter is the last step in the pipeline before the response is
 * returned to the client. It handles task-specific parsing (outlines, thesis
 * options) and attaches metadata like word count.
 *
 * @module lib/ai/formatter
 */

import type { WritingResponse, WritingTask, OutlineSection } from './types';

// ─── Main formatter ───────────────────────────────────────────────────────────

/**
 * Converts raw model output text into a structured WritingResponse.
 * Applies task-specific parsing for outlines and thesis options.
 *
 * @param rawText - The raw string returned by the model
 * @param task    - The writing task that produced this output
 * @returns A structured WritingResponse
 */
export function formatWritingResponse(rawText: string, task: WritingTask): WritingResponse {
  const trimmed = rawText.trim();

  const base: WritingResponse = {
    task,
    outputText: trimmed,
    wordCount:  countWords(trimmed),
  };

  switch (task) {
    case 'generate_outline': {
      const sections = parseOutlineSections(trimmed);
      const bullets  = sections.flatMap(s => s.points);
      return { ...base, bullets, notes: trimmed };
    }

    case 'generate_thesis': {
      const bullets = parseThesisOptions(trimmed);
      return { ...base, bullets };
    }

    case 'summarize_source': {
      return { ...base, notes: trimmed };
    }

    default:
      return base;
  }
}

// ─── Outline parser ───────────────────────────────────────────────────────────

/**
 * Parses model outline text into an array of OutlineSection objects.
 * Treats lines starting with #, a number+period, or ALL CAPS as headings.
 * Treats lines starting with -, •, or * as bullet points under the current heading.
 *
 * @param text - Raw outline text from the model
 * @returns Array of OutlineSection objects
 */
export function parseOutlineSections(text: string): OutlineSection[] {
  const lines    = text.split('\n');
  const sections: OutlineSection[] = [];
  let current: OutlineSection | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const isHeading =
      /^#{1,3}\s/.test(line) ||
      // Only treat "1. WORD" as a heading if the word starts with a capital
      // (avoids treating "1. topic sentence" bullet content as a heading)
      /^\d+\.\s+[A-Z]/.test(line) ||
      /^[A-Z][A-Z\s]{3,}$/.test(line);

    if (isHeading) {
      if (current) sections.push(current);
      const heading = line
        .replace(/^#{1,3}\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim();
      current = { heading, points: [] };
    } else if (/^[-•*]\s/.test(line)) {
      if (!current) {
        current = { heading: 'Notes', points: [] };
      }
      current.points.push(line.replace(/^[-•*]\s+/, '').trim());
    }
  }

  if (current) sections.push(current);
  return sections;
}

// ─── Thesis parser ────────────────────────────────────────────────────────────

/**
 * Extracts numbered thesis options from model output.
 * Filters lines starting with a number followed by . or ), strips the prefix,
 * and returns up to 3 clean thesis strings.
 *
 * @param text - Raw thesis output from the model
 * @returns Array of up to 3 thesis strings
 */
export function parseThesisOptions(text: string): string[] {
  return text
    .split('\n')
    .filter(line => /^\d+[.)]\s/.test(line.trim()))
    .map(line => line.trim().replace(/^\d+[.)]\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

// ─── Word counter ─────────────────────────────────────────────────────────────

/**
 * Counts the words in a string by splitting on whitespace.
 *
 * @param text - The text to count
 * @returns Number of words
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
