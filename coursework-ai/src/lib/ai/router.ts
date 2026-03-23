/**
 * @file router.ts
 * @description Orchestration layer for the AI writing pipeline.
 *
 * Receives a validated WritingRequest, builds context and prompts, calls the
 * model, and returns a formatted WritingResponse. This is the single entry
 * point for the API route — it does not expose model or prompt internals.
 *
 * @module lib/ai/router
 */

import type { WritingRequest, WritingResponse, WritingTask, WritingContext, TaskConfig } from './types';
import { buildWritingContext } from './context';
import {
  buildBaseSystemPrompt,
  buildOutlinePrompt,
  buildThesisPrompt,
  buildIntroPrompt,
  buildBodyParagraphPrompt,
  buildConclusionPrompt,
  buildDraftPrompt,
  buildRewritePrompt,
  buildExpandPrompt,
  buildClarityPrompt,
  buildStrengthenArgumentPrompt,
  buildTransitionsPrompt,
  buildSummarizeSourcePrompt,
} from './prompts';
import { retryModelCall } from './model';
import { formatWritingResponse } from './formatter';
import { logger } from '@/lib/logger';
import { ModelError } from '@/lib/errors';

// ─── Task configurations ──────────────────────────────────────────────────────

/**
 * Per-task model parameters. Generation tasks use higher temperature and more
 * tokens; refinement tasks use lower temperature for more deterministic edits;
 * summarization uses the lowest temperature for factual accuracy.
 */
export const TASK_CONFIGS: Record<WritingTask, TaskConfig> = {
  generate_outline:       { temperature: 0.7, maxTokens: 2048, label: 'Generate Outline'       },
  generate_thesis:        { temperature: 0.7, maxTokens: 2048, label: 'Write Thesis'            },
  generate_intro:         { temperature: 0.7, maxTokens: 2048, label: 'Write Introduction'      },
  generate_body_paragraph:{ temperature: 0.7, maxTokens: 2048, label: 'Write Body Paragraph'    },
  generate_conclusion:    { temperature: 0.7, maxTokens: 2048, label: 'Write Conclusion'        },
  generate_draft:         { temperature: 0.7, maxTokens: 4096, label: 'Generate Full Draft'     },
  rewrite_selection:      { temperature: 0.5, maxTokens: 1024, label: 'Rewrite Selection'       },
  expand_paragraph:       { temperature: 0.5, maxTokens: 1024, label: 'Expand Paragraph'        },
  improve_clarity:        { temperature: 0.5, maxTokens: 1024, label: 'Improve Clarity'         },
  strengthen_argument:    { temperature: 0.5, maxTokens: 1024, label: 'Strengthen Argument'     },
  generate_transitions:   { temperature: 0.5, maxTokens: 1024, label: 'Add Transitions'         },
  summarize_source:       { temperature: 0.3, maxTokens: 512,  label: 'Summarize Source'        },
};

// ─── Prompt resolver ──────────────────────────────────────────────────────────

/**
 * Maps a WritingTask to its corresponding prompt builder and returns the
 * user-turn prompt string.
 *
 * @param task    - The writing task to resolve
 * @param context - The WritingContext to pass to the prompt builder
 * @returns The user-turn prompt string
 * @throws {ModelError} For unknown task values (exhaustive check)
 */
export function resolvePromptTemplate(task: WritingTask, context: WritingContext): string {
  switch (task) {
    case 'generate_outline':        return buildOutlinePrompt(context);
    case 'generate_thesis':         return buildThesisPrompt(context);
    case 'generate_intro':          return buildIntroPrompt(context);
    case 'generate_body_paragraph': return buildBodyParagraphPrompt(context);
    case 'generate_conclusion':     return buildConclusionPrompt(context);
    case 'generate_draft':          return buildDraftPrompt(context);
    case 'rewrite_selection':       return buildRewritePrompt(context);
    case 'expand_paragraph':        return buildExpandPrompt(context);
    case 'improve_clarity':         return buildClarityPrompt(context);
    case 'strengthen_argument':     return buildStrengthenArgumentPrompt(context);
    case 'generate_transitions':    return buildTransitionsPrompt(context);
    case 'summarize_source':        return buildSummarizeSourcePrompt(context);
    default: {
      // Exhaustive check — TypeScript will error if a task is unhandled
      const _exhaustive: never = task;
      throw new ModelError(`Unknown task: ${String(_exhaustive)}`);
    }
  }
}

// ─── Task config accessor ─────────────────────────────────────────────────────

/**
 * Returns the TaskConfig for a given WritingTask.
 *
 * @param task - The writing task
 * @returns The TaskConfig with temperature, maxTokens, and label
 */
export function getTaskConfig(task: WritingTask): TaskConfig {
  return TASK_CONFIGS[task];
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Orchestrates the full writing pipeline for a single request.
 * Builds context → resolves prompt → calls model → formats response.
 * Errors are not swallowed — they propagate to the API route handler.
 *
 * @param request - The validated and normalised WritingRequest
 * @returns A structured WritingResponse
 * @throws {ModelError}         When the model call fails after retries
 * @throws {ConfigurationError} When OPENAI_API_KEY is missing
 */
export async function routeWritingTask(request: WritingRequest): Promise<WritingResponse> {
  const startMs    = Date.now();
  const taskConfig = getTaskConfig(request.task);

  logger.info('Writing task started', {
    task:        request.task,
    wordTarget:  request.wordTarget,
    courseLevel: request.courseLevel,
    tone:        request.tone,
  });

  const context      = buildWritingContext(request);
  const systemPrompt = buildBaseSystemPrompt();
  const userPrompt   = resolvePromptTemplate(request.task, context);

  const rawOutput = await retryModelCall(systemPrompt, userPrompt, {
    temperature: taskConfig.temperature,
    maxTokens:   taskConfig.maxTokens,
  });

  const response = formatWritingResponse(rawOutput, request.task);

  logger.info('Writing task complete', {
    task:      request.task,
    wordCount: response.wordCount,
    durationMs: Date.now() - startMs,
  });

  return response;
}
