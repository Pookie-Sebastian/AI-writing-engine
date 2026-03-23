/**
 * @file route.ts
 * @description POST /api/ai/write — AI writing pipeline endpoint.
 *
 * Accepts a WritingRequest body and returns a WritingResponse.
 * Auth is enforced when Clerk env vars are present; skipped in dev otherwise.
 * Rate-limited per IP. Validation runs in three layers before the pipeline.
 *
 * @module app/api/ai/write
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';
import {
  validateWritingRequest,
  validateTaskRequirements,
  normalizeWritingRequest,
} from '@/lib/ai/validators';
import { routeWritingTask } from '@/lib/ai/router';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the client IP from request headers.
 *
 * @param req - The incoming NextRequest
 * @returns The client IP string, or 'unknown'
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/ai/write
 *
 * Pipeline:
 *   1. Auth check (Clerk, when configured)
 *   2. Rate limit check
 *   3. JSON parse
 *   4. Schema validation
 *   5. Task requirement validation
 *   6. Normalisation
 *   7. AI pipeline (routeWritingTask)
 *   8. Response
 *
 * @param req - The incoming NextRequest
 * @returns NextResponse with { success: true, data: WritingResponse } or error shape
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const ip        = getClientIp(req);

  // 1. Auth — only enforced when Clerk keys are configured
  const clerkEnabled =
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.CLERK_SECRET_KEY;

  let userId = 'dev-user';
  if (clerkEnabled) {
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const session  = await auth();
      userId         = session.userId ?? '';
    } catch { userId = ''; }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication required.' } },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      );
    }
  }

  // 2. Rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: `Rate limit exceeded. Retry after ${retryAfter}s.` } },
      { status: 429, headers: { 'Retry-After': String(retryAfter), 'X-Request-ID': requestId } }
    );
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON.' } },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    );
  }

  // 4. Schema validation
  let request;
  try {
    request = validateWritingRequest(body);
  } catch (err) {
    const { code, message, statusCode } = toErrorResponse(err);
    return NextResponse.json(
      { success: false, error: { code, message } },
      { status: statusCode, headers: { 'X-Request-ID': requestId } }
    );
  }

  // 5. Task requirement validation
  try {
    validateTaskRequirements(request);
  } catch (err) {
    const { code, message, statusCode } = toErrorResponse(err);
    return NextResponse.json(
      { success: false, error: { code, message } },
      { status: statusCode, headers: { 'X-Request-ID': requestId } }
    );
  }

  // 6. Normalise
  const normalizedRequest = normalizeWritingRequest(request);

  // 7. Log and run pipeline
  logger.info('Writing request', {
    requestId,
    userId,
    task: normalizedRequest.task,
    ip,
  });

  try {
    const response = await routeWritingTask(normalizedRequest);

    logger.info('Writing complete', {
      requestId,
      task:      response.task,
      wordCount: response.wordCount,
    });

    return NextResponse.json(
      { success: true, data: response },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (err) {
    const { code, message, statusCode } = toErrorResponse(err);
    logger.error('Writing pipeline error', {
      requestId,
      task:  normalizedRequest.task,
      error: message,
    });
    return NextResponse.json(
      { success: false, error: { code, message } },
      { status: statusCode, headers: { 'X-Request-ID': requestId } }
    );
  }
}
