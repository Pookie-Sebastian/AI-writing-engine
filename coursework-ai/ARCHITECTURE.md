# Architecture

## Overview

Coursework AI is a Next.js 16 App Router application. The browser communicates with a single API route (`POST /api/ai/write`) that validates the request, checks auth and rate limits, builds a prompt, calls OpenAI, and returns structured output. All AI logic lives in `src/lib/ai/` and is server-only.

```
Browser
  │
  ├─ React UI (page.tsx + components/)
  │    └─ fetch POST /api/ai/write
  │
  └─ Next.js Edge Middleware (proxy.ts)
       └─ Clerk auth check on every request
            │
            └─ API Route Handler (app/api/ai/write/route.ts)
                 ├─ Rate limiter (lib/rate-limiter.ts)
                 ├─ Zod validation (lib/ai/schemas.ts + validators.ts)
                 ├─ AI pipeline (lib/ai/router.ts)
                 │    ├─ Context builder (lib/ai/context.ts)
                 │    ├─ Prompt builder (lib/ai/prompts.ts)
                 │    ├─ Model call (lib/ai/model.ts) → OpenAI API
                 │    └─ Response formatter (lib/ai/formatter.ts)
                 └─ Structured logger (lib/logger.ts)
```

## Request Lifecycle

1. **Middleware** — Clerk validates the session token. Unauthenticated requests are redirected to `/sign-in` before reaching any route handler.

2. **Rate limiter** — `checkRateLimit(ip)` uses an in-memory sliding window (default: 20 req/min per IP). Exceeded requests get a 429 with `Retry-After`.

3. **Validation** — `validateWritingRequest` runs the body through the Zod schema. `validateTaskRequirements` checks task-specific preconditions (e.g. `selectedText` required for rewrite tasks). `preventEmptyGeneration` guards against fully empty requests.

4. **Normalization** — `normalizeWritingRequest` trims strings and applies defaults for `tone`, `courseLevel`, and `wordTarget`.

5. **AI pipeline** (`routeWritingTask`):
   - `buildWritingContext` assembles a `WritingContext` from the request, truncating long strings to fit the context window.
   - `buildBaseSystemPrompt` produces the system turn (persona, register, rules).
   - `resolvePromptTemplate` picks the task-specific prompt builder and produces the user turn.
   - `safeModelCall` → `retryModelCall` → `runModel` calls the OpenAI Chat Completions API with exponential backoff (2 retries).
   - `formatWritingResponse` post-processes the raw text: parses structured output for outline/thesis/summary tasks, normalizes whitespace for all others.

6. **Response** — `{ success: true, data: WritingResponse }` or `{ success: false, error: { code, message } }`.

## Key Design Decisions

### Layered validation

Validation is split into three layers so each concern is independently testable:
- **Schema** (Zod): type correctness and string length limits
- **Task requirements**: task-specific preconditions (selected text, input presence)
- **Empty guard**: prevents sending a request with no content at all

### Typed errors

All error paths use subclasses of `AppError` (`ValidationError`, `AuthError`, `RateLimitError`, `ModelError`, `ConfigurationError`). The API route catches any thrown error, calls `toErrorResponse`, and returns a consistent JSON shape. This avoids leaking stack traces and makes error handling auditable.

### Pluggable logger

`lib/logger.ts` exports a singleton `Logger` with a `LogSink` interface. The default sink writes JSON to stdout in production and human-readable lines in development. Additional sinks (Datadog, Sentry, etc.) can be registered with `logger.addSink(sink)` without modifying the logger itself.

### In-memory rate limiter

The sliding window rate limiter uses a `Map<ip, timestamp[]>`. It is intentionally simple: it resets on server restart and does not share state across multiple instances. For multi-instance deployments, replace `lib/rate-limiter.ts` with a Redis-backed implementation that satisfies the same `checkRateLimit(ip): RateLimitResult` interface.

### forwardRef on EssayEditor

`page.tsx` needs direct access to the textarea DOM node to read `selectionStart`/`selectionEnd` and apply generated text at the cursor. `EssayEditor` is wrapped in `React.forwardRef` so the parent can hold a stable `editorRef` without the component exposing internal state.

### Stale closure avoidance

The essay pipeline in `page.tsx` uses plain `async` functions (not `useCallback`) that capture React state at call time. This avoids the stale closure bug where a memoized callback holds an outdated snapshot of `documentText` or `formData`.

## Adding a New Task

1. Add the task name to the `WritingTask` union in `lib/ai/types.ts`.
2. Add a prompt builder in `lib/ai/prompts.ts`.
3. Add a `case` in `resolvePromptTemplate` in `lib/ai/router.ts`.
4. Add a `TaskConfig` entry in `TASK_CONFIGS` in `lib/ai/router.ts`.
5. Add the task to `REQUIRES_SELECTED_TEXT` or `REQUIRES_INPUT` in `lib/ai/validators.ts` as appropriate.
6. Add labels and descriptions to `lib/utils/constants.ts`.
7. Add the task to `SELECTION_TASKS`, `GENERATION_TASKS`, or `REFINEMENT_TASKS` in `constants.ts`.

## Security Considerations

| Control | Implementation |
|---|---|
| Authentication | Clerk middleware on all routes except `/sign-in`, `/sign-up`, `/api/health` |
| Rate limiting | Per-IP sliding window, configurable via env vars |
| Input bounds | Zod string `.max()` limits on all text fields |
| HTTP headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options in `next.config.ts` |
| Error leakage | `toErrorResponse` strips stack traces; only `code` and `message` reach the client |
| API key | `OPENAI_API_KEY` is server-only; never referenced in client components |
