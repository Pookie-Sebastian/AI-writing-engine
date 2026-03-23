/**
 * @file prompts.ts
 * @description One prompt builder per writing task, plus the shared system prompt.
 *
 * Each builder takes a WritingContext and returns the user-turn prompt string.
 * The system prompt is returned by buildBaseSystemPrompt() and is the same
 * for every task — task-specific instructions live in the user turn.
 *
 * @module lib/ai/prompts
 */

import type { WritingContext } from './types';
import { formatContextForPrompt, extractSelectedSection } from './context';

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Returns the base system prompt used for all writing tasks.
 * Establishes the AI's role, essay structure knowledge, and output rules.
 *
 * @returns The system prompt string
 */
export function buildBaseSystemPrompt(): string {
  return `You are an expert academic writing assistant. You help students plan, write, and improve essays at any academic level.

## Essay Structure You Follow

### Introduction
1. Hook — A striking opening sentence (statistic, question, anecdote, or bold claim).
2. Background — 2–3 sentences of context narrowing toward the argument.
3. Thesis — The final sentence: one clear, arguable claim previewing the main points.

### Body Paragraphs
1. Topic sentence — States the paragraph's controlling idea, linked to the thesis.
2. Evidence — A specific fact, quote, or example with a signal phrase.
3. Analysis — 2–3 sentences of the writer's own reasoning explaining why the evidence supports the argument.
4. Transition — Bridges to the next paragraph.

### Conclusion
1. Restate thesis — Paraphrase (do not copy) the thesis in light of the evidence.
2. Summary — Briefly recap each body paragraph's argument.
3. Final insight — A broader implication, call to action, or thought-provoking statement.

## Output Rules
- Produce actual text, never describe what to write.
- Match the requested tone and course level exactly.
- Return clean prose without meta-commentary such as "Here is your paragraph:" or "Certainly!".
- Use markdown only when the task explicitly calls for structured output (outlines, numbered lists).
- Do not add unsolicited commentary before or after the requested output.`;
}

// ─── Generation tasks ─────────────────────────────────────────────────────────

/**
 * Builds the prompt for generating a structured essay outline.
 *
 * @param context - The writing context
 * @returns User-turn prompt string
 */
export function buildOutlinePrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  return `${ctx}

Generate a structured essay outline. Use the following format:

## Introduction
- Hook idea
- Background context
- Thesis statement

## Body Paragraph 1: [Topic]
- Topic sentence
- Evidence point
- Analysis angle
- Transition idea

(Repeat for each body paragraph — typically 3)

## Conclusion
- Thesis restatement
- Summary of main points
- Final insight

Produce only the outline. No preamble.`;
}

/**
 * Builds the prompt for generating thesis statement options.
 *
 * @param context - The writing context
 * @returns User-turn prompt string
 */
export function buildThesisPrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  return `${ctx}

Write exactly 3 thesis statement options for this essay. Each thesis must:
- Make one clear, arguable claim
- Preview the main supporting points
- Be a single sentence

Format:
1. [thesis option]
2. [thesis option]
3. [thesis option]

Produce only the numbered list. No preamble.`;
}

/**
 * Builds the prompt for generating a full introduction paragraph.
 *
 * @param context - The writing context
 * @returns User-turn prompt string
 */
export function buildIntroPrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  return `${ctx}

Write a complete introduction paragraph (approximately ${context.resolvedWordTarget} words) with:
1. A compelling hook
2. 2–3 sentences of background context
3. A clear thesis statement as the final sentence

Produce only the paragraph. No labels, no preamble.`;
}

/**
 * Builds the prompt for generating a single body paragraph.
 *
 * @param context - The writing context
 * @returns User-turn prompt string
 */
export function buildBodyParagraphPrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  const docContext = context.truncatedDocument
    ? `\n\nExisting essay so far:\n${context.truncatedDocument}`
    : '';
  return `${ctx}${docContext}

Write one body paragraph (approximately ${context.resolvedWordTarget} words) that includes:
1. A topic sentence linked to the thesis
2. Specific evidence with a signal phrase
3. 2–3 sentences of analysis explaining why the evidence supports the argument
4. A transition sentence

Produce only the paragraph. No labels, no preamble.`;
}

/**
 * Builds the prompt for generating a conclusion paragraph.
 *
 * @param context - The writing context
 * @returns User-turn prompt string
 */
export function buildConclusionPrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  const docContext = context.truncatedDocument
    ? `\n\nEssay to conclude:\n${context.truncatedDocument}`
    : '';
  return `${ctx}${docContext}

Write a complete conclusion paragraph (approximately ${context.resolvedWordTarget} words) that:
1. Restates the thesis in new words
2. Briefly summarises the main arguments
3. Ends with a final insight, broader implication, or call to action

Produce only the paragraph. No labels, no preamble.`;
}

/**
 * Builds the prompt for generating a complete essay draft.
 *
 * @param context - The writing context
 * @returns User-turn prompt string
 */
export function buildDraftPrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  return `${ctx}

Write a complete essay (approximately ${context.resolvedWordTarget} words) with:
- An introduction (hook, background, thesis)
- Three body paragraphs (topic sentence, evidence, analysis, transition each)
- A conclusion (restate thesis, summarise, final insight)

Produce only the essay. No labels, no preamble.`;
}

// ─── Refinement tasks ─────────────────────────────────────────────────────────

/**
 * Builds the prompt for rewriting a selected passage.
 *
 * @param context - The writing context (selectedText required)
 * @returns User-turn prompt string
 */
export function buildRewritePrompt(context: WritingContext): string {
  const ctx  = formatContextForPrompt(context);
  const text = extractSelectedSection(context);
  return `${ctx}

Rewrite the following passage. Preserve the meaning and argument exactly. Improve clarity, sentence variety, and style. Match the specified tone and course level.

Passage to rewrite:
${text}

Produce only the rewritten passage. No preamble.`;
}

/**
 * Builds the prompt for expanding a selected passage with more detail.
 *
 * @param context - The writing context (selectedText required)
 * @returns User-turn prompt string
 */
export function buildExpandPrompt(context: WritingContext): string {
  const ctx  = formatContextForPrompt(context);
  const text = extractSelectedSection(context);
  return `${ctx}

Expand the following passage to approximately ${context.resolvedWordTarget} words. Add more detail, supporting evidence, and analysis. Do not change the core argument.

Passage to expand:
${text}

Produce only the expanded passage. No preamble.`;
}

/**
 * Builds the prompt for improving sentence-level clarity.
 *
 * @param context - The writing context (selectedText required)
 * @returns User-turn prompt string
 */
export function buildClarityPrompt(context: WritingContext): string {
  const ctx  = formatContextForPrompt(context);
  const text = extractSelectedSection(context);
  return `${ctx}

Improve the clarity of the following passage. Fix awkward phrasing, reduce wordiness, and improve sentence flow. Do not change the meaning or argument.

Passage to improve:
${text}

Produce only the improved passage. No preamble.`;
}

/**
 * Builds the prompt for strengthening the argument in a passage.
 *
 * @param context - The writing context (selectedText required)
 * @returns User-turn prompt string
 */
export function buildStrengthenArgumentPrompt(context: WritingContext): string {
  const ctx  = formatContextForPrompt(context);
  const text = extractSelectedSection(context);
  return `${ctx}

Strengthen the argument in the following passage. Improve the reasoning, add more specific evidence, and make the analysis more persuasive. Maintain the same position.

Passage to strengthen:
${text}

Produce only the improved passage. No preamble.`;
}

/**
 * Builds the prompt for generating transition sentences.
 *
 * @param context - The writing context (selectedText required)
 * @returns User-turn prompt string
 */
export function buildTransitionsPrompt(context: WritingContext): string {
  const ctx  = formatContextForPrompt(context);
  const text = extractSelectedSection(context);
  return `${ctx}

Generate transition sentences for the following passage. Add smooth transitions between paragraphs or ideas where they are missing or weak. Preserve all existing content.

Passage:
${text}

Produce only the passage with transitions added. No preamble.`;
}

/**
 * Builds the prompt for summarising a source into a citation-ready sentence.
 *
 * @param context - The writing context (userInput contains the source passage)
 * @returns User-turn prompt string
 */
export function buildSummarizeSourcePrompt(context: WritingContext): string {
  const ctx = formatContextForPrompt(context);
  // userInput is the source passage the user wants summarised.
  // Fall back to selectedText then documentText for programmatic callers.
  const source = context.userInput ?? context.truncatedSelection ?? context.truncatedDocument ?? '';
  return `${ctx}

Summarise the following source passage into 1–2 citation-ready sentences suitable for use as evidence in an academic essay. Capture the key claim or finding. Do not copy phrases verbatim.

Source passage:
${source}

Produce only the summary sentences. No preamble.`;
}
