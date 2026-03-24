/**
 * @file contracts/index.ts
 * @description Single import point for all inter-service contracts.
 *
 * Other services and internal modules should import from here:
 *   import type { EssayDocument, WriteRequest, AnalysisResponse } from '@/lib/contracts';
 *   import { WriteRequestSchema, EssayDocumentSchema } from '@/lib/contracts';
 *
 * @module lib/contracts
 */

export type {
  // Document
  EssayDocument,
  ParagraphBlock,
  ParagraphRef,
  // Writing Service
  WritingTask,
  WriteRequest,
  WriteResponse,
  // Analysis Service
  AnalysisTask,
  IssuePriority,
  AnalysisIssue,
  AnalysisResponse,
  // Recommendation Service
  RecommendationAction,
  Recommendation,
  // Shared metadata
  EssayTone,
  CourseLevel,
  // Envelopes
  ServiceSuccess,
  ServiceError,
  ServiceResponse,
} from './types';

export {
  // Enum schemas
  EssayToneSchema,
  CourseLevelSchema,
  WritingTaskSchema,
  AnalysisTaskSchema,
  IssuePrioritySchema,
  RecommendationActionSchema,
  // Document schemas
  ParagraphBlockSchema,
  ParagraphRefSchema,
  EssayDocumentSchema,
  // Writing Service schemas
  WriteRequestSchema,
  // Analysis Service schemas
  AnalysisIssueSchema,
  AnalysisResponseSchema,
  // Recommendation Service schemas
  RecommendationSchema,
} from './schemas';
