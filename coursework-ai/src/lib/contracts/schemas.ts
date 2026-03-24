/**
 * @file contracts/schemas.ts
 * @description Zod validation schemas for all inter-service contracts.
 *
 * These schemas validate the canonical shared types at service boundaries.
 * Import these in any API route that receives data from another service.
 *
 * @module lib/contracts/schemas
 */

import { z } from 'zod';

// ─── Enum schemas ─────────────────────────────────────────────────────────────

export const EssayToneSchema = z.enum([
  'academic',
  'persuasive',
  'analytical',
  'reflective',
  'narrative',
]);

export const CourseLevelSchema = z.enum([
  'high_school',
  'undergraduate',
  'graduate',
  'professional',
]);

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
  'fix_issue',
]);

export const AnalysisTaskSchema = z.enum([
  'full_essay_analysis',
  'paragraph_analysis',
  'thesis_analysis',
  'structure_analysis',
  'clarity_analysis',
  'evidence_analysis',
]);

export const IssuePrioritySchema = z.enum(['low', 'medium', 'high']);

export const RecommendationActionSchema = z.enum([
  'rewrite',
  'expand',
  'clarify',
  'strengthen',
  'add_transition',
]);

// ─── Document schemas ─────────────────────────────────────────────────────────

export const ParagraphBlockSchema = z.object({
  index: z.number().int().min(0),
  text:  z.string().min(1),
});

export const ParagraphRefSchema = z.object({
  paragraphIndex: z.number().int().min(0),
  startOffset:    z.number().int().min(0).optional(),
  endOffset:      z.number().int().min(0).optional(),
});

export const EssayDocumentSchema = z.object({
  documentId:       z.string().min(1).max(128),
  title:            z.string().max(300).optional(),
  assignmentPrompt: z.string().max(5000).optional(),
  thesis:           z.string().max(1000).optional(),
  content:          z.string().max(50000),
  paragraphs:       z.array(ParagraphBlockSchema).max(100),
});

// ─── Writing Service schemas ──────────────────────────────────────────────────

export const WriteRequestSchema = z.object({
  document:     EssayDocumentSchema,
  task:         WritingTaskSchema,
  selectedText: z.string().max(5000).optional(),
  userInput:    z.string().max(2000).optional(),
  tone:         EssayToneSchema.optional(),
  courseLevel:  CourseLevelSchema.optional(),
  wordTarget:   z.number().int().min(50).max(5000).optional(),
});

// ─── Analysis Service schemas ─────────────────────────────────────────────────

export const AnalysisIssueSchema = z.object({
  id:           z.string().min(1),
  category:     z.enum(['thesis', 'structure', 'coherence', 'clarity', 'evidence']),
  score:        z.number().min(0).max(100),
  explanation:  z.string(),
  suggestedFix: z.string(),
  priority:     IssuePrioritySchema,
  paragraphRef: ParagraphRefSchema.optional(),
});

export const AnalysisResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary:      z.string(),
  issues:       z.array(AnalysisIssueSchema),
});

// ─── Recommendation Service schemas ──────────────────────────────────────────

export const RecommendationSchema = z.object({
  id:           z.string().min(1),
  category:     z.string(),
  priority:     IssuePrioritySchema,
  description:  z.string(),
  actionType:   RecommendationActionSchema,
  paragraphRef: ParagraphRefSchema.optional(),
});
