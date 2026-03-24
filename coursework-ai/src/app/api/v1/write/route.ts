/**
 * @file route.ts
 * @description POST /api/v1/write — service-to-service writing endpoint.
 *
 * This is the canonical inter-service endpoint for the Writing Service.
 * It accepts the shared WriteRequest contract, bridges it to the internal
 * writing pipeline, and returns a WriteResponse wrapped in the standard
 * ServiceResponse envelope.
 *
 * Intended callers:
 *   - Orchestration / API Gateway layer
 *   - Analysis Service (triggering fix_issue tasks)
 *   - Recommendation Service (applying recommendations)
 *
 * Auth: Bearer token via INTERNAL_API_KEY env var when set.
 * In development (key absent) all requests are allowed through.
 *
 * @module app/api/v1/write
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';
import { routeWritingTask } from '@/lib/ai/router';
import { normalizeWritingRequest } from '@/lib/ai/validators';
import { WriteRequestSchema } from '@/lib/contracts';
import type { WriteRequest, WriteResponse, ServiceResponse } from '@/lib/contracts';
import type { WritingRequest } from '@/lib/ai/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Validates the Bearer token against INTERNAL_API_KEY.
 * Returns true when the key is not configured (dev mode).
 */
function isAuthorized(req: NextRequest): boolean {
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) return true; // dev mode — no key required
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${apiKey}`;
}

/**
 * Maps a canonical WriteRequest to the internal WritingRequest shape
 * so the existing pipeline can be reused without modification.
 */
function toInternalRequest(body: WriteRequest): WritingRequest {
  return {
    task:             body.task,
    documentText:     body.document.content,
    selectedText:     body.selectedText,
    assignmentPrompt: body.document.assignmentPrompt,
    thesis:           body.document.thesis,
    documentTitle:    body.document.title,
    userInput:        body.userInput,
    tone:             body.tone,
    courseLevel:      body.courseLevel,
    wordTarget:       body.wordTarget,
  };
}

/**
 * Maps the internal WritingResponse back to the canonical WriteResponse,
 * attaching a ParagraphRef when the request targeted a specific paragraph.
 */
function toContractResponse(
  internal: Awaited<ReturnType<typeof routeWritingTask>>,
  body: WriteRequest,
): WriteResponse {
  // Determine which paragraph was targeted, if any
  const paragraphRef = internal.paragraphIndex !== undefined
    ? { paragraphIndex: internal.paragraphIndex }
    : body.document.paragraphs.length === 1
      ? { paragraphIndex: body.document.paragraphs[0].index }
      : undefined;

  return {
    task:         internal.task,
    outputText:   internal.outputText,
    bullets:      internal.bullets,
    wordCount:    internal.wordCount,
    paragraphRef,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/write
 *
 * Pipeline:
 *   1. Bearer token auth (when INTERNAL_API_KEY is set)
 *   2. Rate limit
 *   3. JSON parse
 *   4. Contract schema validation (WriteRequestSchema)
 *   5. Map to internal request
 *   6. Normalise
 *   7. Run writing pipeline
 *   8. Map to contract response
 *   9. Return ServiceResponse envelope
 */
export async function POST(req: NextRequest): Promise<NextResponse<ServiceResponse<WriteResponse>>> {
  const requestId = crypto.randomUUID();
  const ip        = getClientIp(req);

  // 1. Auth
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_ERROR', message: 'Invalid or missing API key.' }, requestId },
      { status: 401, headers: { 'X-Request-ID': requestId } }
    );
  }

  // 2. Rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: `Rate limit exceeded. Retry after ${retryAfter}s.` }, requestId },
      { status: 429, headers: { 'Retry-After': String(retryAfter), 'X-Request-ID': requestId } }
    );
  }

  // 3. Parse body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON.' }, requestId },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    );
  }

  // 4. Validate against canonical contract schema
  const parsed = WriteRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: issue?.message ?? 'Invalid request.',
          details: parsed.error.issues,
        },
        requestId,
      },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    );
  }

  const contractRequest = parsed.data as WriteRequest;

  logger.info('v1/write request', {
    requestId,
    ip,
    task:       contractRequest.task,
    documentId: contractRequest.document.documentId,
  });

  // 5 & 6. Map to internal shape and normalise
  const internalRequest = normalizeWritingRequest(toInternalRequest(contractRequest));

  // 7. Run pipeline
  try {
    const internalResponse = await routeWritingTask(internalRequest);

    // 8. Map back to contract shape
    const contractResponse = toContractResponse(internalResponse, contractRequest);

    logger.info('v1/write complete', {
      requestId,
      task:      contractResponse.task,
      wordCount: contractResponse.wordCount,
    });

    return NextResponse.json(
      { success: true, data: contractResponse, requestId },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (err) {
    const { code, message, statusCode } = toErrorResponse(err);
    logger.error('v1/write pipeline error', { requestId, error: message });
    return NextResponse.json(
      { success: false, error: { code, message }, requestId },
      { status: statusCode, headers: { 'X-Request-ID': requestId } }
    );
  }
}
