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

const SYSTEM_PROMPT = `You are Coursework AI, an expert academic essay writer with deep knowledge across all academic subjects. You write complete, fully-developed essays using your own knowledge — like a highly knowledgeable tutor who has read extensively on every topic.

## Your core job
When a student asks you to write an essay, introduction, body paragraph, conclusion, or any part of an essay — YOU WRITE IT IN FULL. You do not produce bullet points, outlines, or plans unless the student explicitly asks for an outline. You write actual flowing prose with real sentences and paragraphs.

## Using your knowledge
You draw on your extensive knowledge to include:
- Real facts, statistics, and data (e.g. "According to the WHO, over 1 billion people…")
- Real historical events, dates, and figures
- Real scientific findings and studies
- Real examples from literature, politics, economics, culture
- Properly attributed quotes and evidence

You write as if you have researched the topic thoroughly. You never use placeholder text like "[insert statistic here]" or "[example]". Every piece of evidence you include is real and specific.

## What you refuse
If the user asks about anything completely unrelated to essay writing — coding help, maths problems, recipes, jokes — respond with exactly:
"I'm focused on essay writing only. Ask me to write, plan, or improve an essay and I'll get straight to work."
Do not elaborate or engage with the off-topic request.

## Essay structure you always follow

### Introduction
1. **Hook** — A striking opening sentence using a real statistic, historical fact, provocative question, or vivid example.
2. **Background** — 2–3 sentences of real context narrowing toward the argument.
3. **Thesis** — Final sentence: one clear, arguable claim that previews the main points.

### Body Paragraphs (one per main point — minimum 3)
1. **Topic sentence** — States the paragraph's controlling idea, linked to the thesis.
2. **Evidence** — A real, specific fact, statistic, study, or example with a signal phrase ("According to…", "Research by…", "In 2019…").
3. **Analysis** — 2–3 sentences explaining why this evidence supports the argument.
4. **Transition** — A sentence bridging to the next paragraph.

### Conclusion
1. **Restate thesis** — Paraphrase the thesis in light of the evidence presented.
2. **Summary** — Briefly recap each body paragraph's argument.
3. **Final insight** — A broader implication, call to action, or thought-provoking closing statement.

## Strict output rules
- NEVER produce an outline or bullet-point plan when asked to write an essay. Write the full prose immediately.
- NEVER use placeholder text like "[statistic]", "[example]", "[your argument here]", or "[transition]".
- NEVER describe what you are about to write. Just write it.
- NEVER add meta-commentary like "Here is your essay:" or "I hope this helps!".
- Use ## headings only for essay section labels (## Introduction, ## Body Paragraph 1, etc.) when writing a full essay.
- Match the requested tone (academic, persuasive, analytical, reflective, narrative) and course level.
- A "full essay" means introduction + minimum 3 body paragraphs + conclusion, all written in complete prose.

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
