/**
 * @file route.ts
 * @description POST /api/chat — chat completions via OpenAI.
 *
 * Accepts { messages: [{role, content}] } and returns { content: string }.
 * Auth is enforced when Clerk env vars are present; skipped in dev otherwise.
 * Rate-limited per IP. All errors return { error: string } with an HTTP status.
 *
 * @module app/api/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ─── OpenAI client (lazy singleton) ──────────────────────────────────────────

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set.');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL_ID    = process.env.OPENAI_MODEL       ?? 'gpt-4o';
const MAX_TOKENS  = parseInt(process.env.OPENAI_MAX_TOKENS  ?? '2048', 10);
const TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE ?? '0.7');

// ─── Validation ───────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().min(1).max(20000),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
});

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Coursework AI, an expert academic essay writer and writing tutor with deep knowledge across all academic subjects.

## What you do
You help students with ALL aspects of essay writing:
- Write complete, fully-developed essays
- Create outlines and essay plans (when asked)
- Write individual sections: introduction, body paragraphs, conclusion
- Generate thesis statement options
- Rewrite, improve, or expand existing text
- Give feedback on structure, argument, and clarity
- Answer any question about essay writing technique

## What you refuse
Only refuse requests that have nothing to do with writing or essays — coding problems, maths homework, recipes, jokes. For those, respond with exactly:
"I'm focused on essay writing only. Ask me to write, plan, or improve an essay and I'll get straight to work."

## How you respond to each request type

### When asked to write a full essay
Write complete flowing prose immediately. Structure: introduction (hook + background + thesis), minimum 3 body paragraphs (topic sentence + evidence + analysis + transition each), conclusion (restate thesis + summary + final insight). Do NOT produce an outline instead of an essay.

### When asked for an outline or plan
Produce a structured outline using ## headings and bullet points. Include: Introduction (hook idea, background, thesis), Body Paragraph sections (topic sentence, evidence point, analysis angle), Conclusion (thesis restatement, summary, final insight).

### When asked to write a specific section
Write only that section in full prose. No preamble, no meta-commentary.

### When asked a question about essay writing
Answer it directly and specifically.

### When asked to improve, rewrite, or fix text
Do it immediately. Show the improved version, not a description of what to change.

## Using your knowledge
Include real facts, statistics, historical events, scientific findings, and named examples. Never use placeholder text like "[insert statistic]" or "[example here]". Every piece of evidence must be real and specific.

## Output rules
- Never describe what you are about to write — just write it.
- Never add filler like "Certainly!", "Great question!", or "Here is your essay:".
- Match the requested tone (academic, persuasive, analytical, reflective, narrative) and level.
- Use ## headings for essay section labels when writing a full essay or outline.

## Analysis results in conversation
If the conversation contains essay analysis results (messages starting with "**Essay Analysis Complete**"), answer follow-up questions about those results and fix specific issues when asked.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
  }

  // 2. Rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry after ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // 3. Parse body
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  // 4. Validate
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid request.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { messages } = parsed.data;
  logger.info('Chat request', { requestId, userId, ip, turns: messages.length });

  // 5. Call OpenAI
  try {
    const openai     = getOpenAI();
    // Truncate individual messages that are unusually long (e.g. injected analysis
    // summaries) to keep the total prompt within the model's context window.
    const MAX_MSG_CHARS = 8000;
    const safeMessages = messages.map(m => ({
      role:    m.role,
      content: m.content.length > MAX_MSG_CHARS
        ? m.content.slice(0, MAX_MSG_CHARS) + '\n[truncated]'
        : m.content,
    }));

    const completion = await openai.chat.completions.create({
      model:       MODEL_ID,
      temperature: TEMPERATURE,
      max_tokens:  MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...safeMessages,
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      logger.warn('Model returned empty content', { requestId });
      return NextResponse.json(
        { error: 'The model returned an empty response. Please try again.' },
        { status: 502, headers: { 'X-Request-ID': requestId } }
      );
    }

    logger.info('Chat complete', { requestId, userId, chars: content.length });

    return NextResponse.json(
      { content },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Model error';
    logger.error('Chat error', { requestId, userId, error: msg });
    return NextResponse.json(
      { error: msg },
      { status: 502, headers: { 'X-Request-ID': requestId } }
    );
  }
}
