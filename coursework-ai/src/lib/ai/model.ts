/**
 * @file model.ts
 * @description The only module in the codebase that calls OpenAI directly.
 *
 * All other files that need model output call the functions exported here.
 * This centralises API key management, default configuration, error handling,
 * and retry logic in one place.
 *
 * Configuration (environment variables):
 *   OPENAI_API_KEY    — required; throws ConfigurationError if absent
 *   OPENAI_MODEL      — default: 'gpt-4o'
 *   OPENAI_MAX_TOKENS — default: 2048
 *   OPENAI_TEMPERATURE — default: 0.7
 *
 * @module lib/ai/model
 */

import OpenAI from 'openai';
import { ModelError, ConfigurationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_MODEL       = process.env.OPENAI_MODEL ?? 'gpt-4o';
const DEFAULT_MAX_TOKENS  = parseInt(process.env.OPENAI_MAX_TOKENS ?? '2048', 10);
const DEFAULT_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE ?? '0.7');

// ─── Lazy singleton ───────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

/**
 * Returns the shared OpenAI client, creating it on first call.
 * Throws ConfigurationError if OPENAI_API_KEY is not set.
 *
 * @returns The OpenAI client instance
 * @throws {ConfigurationError} When OPENAI_API_KEY is missing
 */
function getOpenAIClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new ConfigurationError('OPENAI_API_KEY is not set.');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// ─── Core call ────────────────────────────────────────────────────────────────

/**
 * Calls the OpenAI chat completions API with a system and user prompt.
 * Uses environment-variable defaults for temperature and maxTokens,
 * overridden by the options argument when provided.
 *
 * @param systemPrompt - The system-turn instruction string
 * @param userPrompt   - The user-turn content string
 * @param options      - Optional overrides for temperature and maxTokens
 * @returns The model's text response
 * @throws {ConfigurationError} When OPENAI_API_KEY is missing
 * @throws {ModelError} When the response contains no content
 */
export async function runModel(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const client      = getOpenAIClient();
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens   = options?.maxTokens   ?? DEFAULT_MAX_TOKENS;

  const completion = await client.chat.completions.create({
    model:       DEFAULT_MODEL,
    temperature,
    max_tokens:  maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ModelError('Model returned an empty response.');
  }

  logger.info('Model call complete', {
    model:        DEFAULT_MODEL,
    promptTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    totalTokens:  completion.usage?.total_tokens,
  });

  return content;
}

// ─── Safe wrapper ─────────────────────────────────────────────────────────────

/**
 * Wraps runModel in a try/catch. Returns null on any error instead of throwing.
 * Use when a failed model call should be handled gracefully rather than
 * propagated as an exception.
 *
 * @param systemPrompt - The system-turn instruction string
 * @param userPrompt   - The user-turn content string
 * @param options      - Optional overrides for temperature and maxTokens
 * @returns The model's text response, or null on failure
 */
export async function safeModelCall(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  try {
    return await runModel(systemPrompt, userPrompt, options);
  } catch (err) {
    logger.error('Model call failed (safe)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

/**
 * Calls runModel with exponential backoff on failure.
 * Delays: 1 000 ms, 2 000 ms (doubles each attempt).
 * Throws ModelError after all retries are exhausted.
 *
 * @param systemPrompt - The system-turn instruction string
 * @param userPrompt   - The user-turn content string
 * @param options      - Optional overrides for temperature, maxTokens, maxRetries
 * @returns The model's text response
 * @throws {ModelError} After all retries are exhausted
 */
export async function retryModelCall(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; maxRetries?: number }
): Promise<string> {
  const maxRetries = options?.maxRetries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runModel(systemPrompt, userPrompt, options);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt);
        logger.warn('Model call failed, retrying', {
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: err instanceof Error ? err.message : String(err),
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'Model call failed after retries.';
  throw new ModelError(msg);
}

// ─── Config accessor ──────────────────────────────────────────────────────────

/**
 * Returns the resolved model configuration derived from environment variables.
 * Used by the router to attach config metadata to log entries.
 *
 * @returns Current model, maxTokens, and temperature settings
 */
export function getModelConfig(): { model: string; maxTokens: number; temperature: number } {
  return {
    model:       DEFAULT_MODEL,
    maxTokens:   DEFAULT_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  };
}
