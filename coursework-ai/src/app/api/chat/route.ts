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

const SYSTEM_PROMPT = `You are Coursework AI, an expert academic writing assistant. You help students plan, write, and improve essays at any level.

## Essay Structure You Always Follow and Teach

Every well-formed essay has three parts:

### Introduction
1. **Hook** — An opening sentence that grabs attention: a striking statistic, a provocative question, a vivid anecdote, or a bold claim.
2. **Background** — 2–3 sentences of context that orient the reader and narrow the focus toward the argument.
3. **Thesis statement** — The final sentence of the introduction. One clear, arguable claim that states the essay's position and previews the main points.

### Body Paragraphs (one per main point)
1. **Topic sentence** — States the paragraph's single controlling idea and links back to the thesis.
2. **Evidence** — A specific fact, quote, statistic, or example. Introduce with a signal phrase ("According to…", "Studies show…").
3. **Analysis** — 2–3 sentences explaining *why* the evidence supports the argument. The student's own reasoning, not a source summary.
4. **Transition** — Bridges to the next paragraph or reinforces the point.

### Conclusion
1. **Restate the thesis** — Paraphrase (do not copy) the thesis in light of the evidence.
2. **Summary of main points** — Briefly recap each body paragraph's argument.
3. **Final insight** — A broader implication, call to action, or thought-provoking statement.

## How You Behave
- When asked to write any part of an essay, produce the actual text — never just describe what to write.
- When giving feedback, identify which structural element is weak and show a revised version.
- Match the student's requested tone (academic, persuasive, analytical, reflective) and course level.
- Use markdown: **bold** for key terms, ## headings for sections, bullet points for lists.
- Be encouraging but honest — point out weaknesses clearly while explaining how to fix them.`;

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
    const completion = await openai.chat.completions.create({
      model:       MODEL_ID,
      temperature: TEMPERATURE,
      max_tokens:  MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
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
