# Coursework AI — Enterprise Upgrade Spec

## Problem Statement

The current Coursework AI codebase is a functional MVP but does not meet enterprise-grade standards. A full audit identified 20 specific gaps across six categories: critical frontend bugs, missing authentication, absent security headers, no structured logging, no rate limiting, and zero documentation. This spec defines the targeted fixes and additions required to bring the system to SOC 2-aligned, production-ready quality without rewriting what already works correctly.

---

## Scope

**Approach:** Targeted fixes and additions on top of the existing codebase. Files that work correctly are not rewritten — only modified where gaps exist.

**Auth provider:** Clerk (hosted, prebuilt UI, minimal infrastructure overhead)  
**Auth scope:** Full app behind login — no unauthenticated access to any route  
**Logging sink:** Generic provider-agnostic adapter (no vendor lock-in)  
**Rate limiting:** In-memory per-IP limiter (no Redis required)  
**Database:** No persistence layer — JWT/session tokens via Clerk only  
**Documentation:** JSDoc on all functions + rewritten README + new ARCHITECTURE.md  

---

## Identified Bugs (Must Fix)

| # | File | Bug | Severity |
|---|------|-----|----------|
| 1 | `page.tsx` | `editorRef` declared but never passed to `EssayEditor` — insert/replace silently broken | Critical |
| 2 | `EssayEditor.tsx` | Not a `forwardRef` component — parent cannot access internal textarea ref | Critical |
| 3 | `page.tsx` | `apiCall()` uses `Record<string, unknown>` — bypasses `WritingRequest` type entirely | High |
| 4 | `page.tsx` | `console.error` in production paths (lines 45, 48, 104) | High |
| 5 | `page.tsx` | `activeTask` reset to `null` in pipeline `finally` — spinner never shows on correct toolbar button | Medium |
| 6 | `page.tsx` | `ActionPanel.onRun` silently does nothing if `activeTask` is null | Medium |
| 7 | `schemas.ts` | No `max()` length validation on string fields — unbounded `documentText` input possible | High |

---

## Requirements

### 1. Bug Fixes

**1.1 Fix EssayEditor ref forwarding**
- Convert `EssayEditor` to use `React.forwardRef<HTMLTextAreaElement, EssayEditorProps>`
- Export the ref so `page.tsx` can access the underlying textarea
- Pass `editorRef` from `page.tsx` to `<EssayEditor ref={editorRef} />`
- Verify `handleInsert` and `handleReplace` now correctly use cursor position

**1.2 Fix apiCall type safety**
- Replace `Record<string, unknown>` with the proper `WritingRequest` type from `@/lib/ai/types`
- Import and use `WritingRequest` as the payload type in `apiCall()`

**1.3 Fix console.error in production paths**
- Remove all `console.error` calls from `page.tsx`
- Replace with calls to the new structured logger (see §4)

**1.4 Fix activeTask during pipeline**
- Do not reset `activeTask` to `null` in the pipeline `finally` block until after `done: true` is set
- Toolbar button for the currently running step should show spinner throughout

**1.5 Fix ActionPanel silent failure**
- Guard `onRun` in `page.tsx` to show an error state if called with no active task
- Or: disable the Run button when `activeTask` is null (already partially done — verify)

**1.6 Add string length limits to Zod schema**
- `assignmentPrompt`: max 5,000 characters
- `documentText`: max 20,000 characters
- `selectedText`: max 5,000 characters
- `userInput`: max 2,000 characters
- `documentTitle`: max 200 characters

---

### 2. Authentication (Clerk)

**2.1 Install and configure Clerk**
- Install `@clerk/nextjs`
- Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`
- Wrap `layout.tsx` with `<ClerkProvider>`

**2.2 Middleware — protect all routes**
- Create `src/middleware.ts`
- Use Clerk's `clerkMiddleware()` to protect all routes
- Public routes: `/sign-in`, `/sign-up`, `/api/health` only
- All other routes (including `/api/ai/write`) require a valid session

**2.3 Sign-in / Sign-up pages**
- Create `src/app/sign-in/[[...sign-in]]/page.tsx` using Clerk's `<SignIn />` component
- Create `src/app/sign-up/[[...sign-up]]/page.tsx` using Clerk's `<SignUp />` component
- Style to match the existing indigo/slate design system

**2.4 User session in API route**
- In `POST /api/ai/write`, extract `userId` from Clerk session using `auth()`
- Attach `userId` to the structured log entry for every request
- Return `401` if no valid session (Clerk middleware handles this, but add explicit guard)

**2.5 User menu in header**
- Add Clerk's `<UserButton />` to the top-right of the app header in `page.tsx`
- Show user avatar and sign-out option

---

### 3. Security Headers

**3.1 Add HTTP security headers in `next.config.ts`**

Add the following headers to all routes:

```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://clerk.com;
```

---

### 4. Structured Logger

**4.1 Create `src/lib/logger.ts`**

The logger must:
- Support log levels: `debug`, `info`, `warn`, `error`
- Output structured JSON in production, human-readable in development
- Include fields: `level`, `message`, `timestamp`, `requestId` (optional), `userId` (optional), `task` (optional), `durationMs` (optional)
- Expose an adapter interface so an external sink (Datadog, Sentry, etc.) can be plugged in by implementing a single `LogSink` interface
- Never throw — logging must be fault-tolerant

**4.2 LogSink interface**

```typescript
interface LogSink {
  write(entry: LogEntry): void;
}
```

Default sink: `ConsoleLogSink` (writes to stdout as JSON).  
Additional sinks can be registered via `logger.addSink(sink)`.

**4.3 Replace all console.* calls**
- Remove all `console.error`, `console.log`, `console.warn` from production paths
- Replace with `logger.error(...)`, `logger.info(...)`, etc.
- Applies to: `page.tsx`, `model.ts`, `route.ts`

---

### 5. In-Memory Rate Limiter

**5.1 Create `src/lib/rate-limiter.ts`**

- Per-IP sliding window rate limiter using a `Map<string, number[]>` (timestamps)
- Default limit: 20 requests per minute per IP
- Configurable via: `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` env vars
- Expose: `checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number }`
- Auto-clean stale entries to prevent memory growth

**5.2 Apply in API route**
- In `POST /api/ai/write`, extract client IP from `x-forwarded-for` or `request.ip`
- Call `checkRateLimit(ip)` before processing
- Return `429 Too Many Requests` with `Retry-After` header if limit exceeded
- Log rate limit hits via the structured logger

---

### 6. Documentation

**6.1 JSDoc on all functions**

Every exported function in `src/lib/` and `src/app/api/` must have a JSDoc block with:
- `@description` — what the function does
- `@param` — each parameter with type and purpose
- `@returns` — return type and meaning
- `@throws` — if the function can throw (model.ts, validators.ts)

Files requiring JSDoc:
- `src/lib/ai/types.ts` — interface-level comments
- `src/lib/ai/schemas.ts` — schema-level comments
- `src/lib/ai/validators.ts` — all 5 exported functions
- `src/lib/ai/context.ts` — all 4 exported functions
- `src/lib/ai/prompts.ts` — all 13 exported functions
- `src/lib/ai/router.ts` — all exported functions
- `src/lib/ai/model.ts` — all 4 exported functions
- `src/lib/ai/formatter.ts` — all 4 exported functions
- `src/lib/logger.ts` — all exported functions (new file)
- `src/lib/rate-limiter.ts` — all exported functions (new file)
- `src/app/api/ai/write/route.ts` — route handler

**6.2 File-level header comments**

Every file in `src/lib/` and `src/app/api/` must start with a block comment:
```
/**
 * @file <filename>
 * @description <what this file does>
 * @module <module path>
 */
```

**6.3 Rewrite README.md**

The README must include:
- Project overview (what Coursework AI is)
- Tech stack
- Prerequisites
- Local setup instructions (step by step)
- All required environment variables with descriptions
- How to run dev server
- How to run production build
- Project structure overview
- How to add a new writing task
- Deployment notes (Vercel)

**6.4 Create ARCHITECTURE.md**

Must include:
- System overview diagram (ASCII)
- Layer descriptions: Frontend → API → AI Router → Model
- Data flow: user action → API call → prompt build → model → format → response
- Auth flow: request → Clerk middleware → userId extraction → API handler
- Rate limiting flow
- Logging flow
- How to swap the AI provider
- Environment variable reference table
- Security controls summary

---

### 7. Additional Code Quality Fixes

**7.1 Add `src/lib/errors.ts`**
- Define typed error classes: `ValidationError`, `ModelError`, `RateLimitError`, `AuthError`
- Each extends a base `AppError` class with `code`, `message`, `statusCode`
- Use these in the API route instead of raw string errors

**7.2 Model config via environment**
- Move `MODEL_ID`, `DEFAULT_MAX_TOKENS`, `DEFAULT_TEMPERATURE` to env vars with fallbacks:
  - `OPENAI_MODEL` (default: `gpt-4o`)
  - `OPENAI_MAX_TOKENS` (default: `2048`)
  - `OPENAI_TEMPERATURE` (default: `0.7`)

**7.3 Add `/api/health` route**
- Create `src/app/api/health/route.ts`
- Returns `200 { status: "ok", timestamp: <ISO>, version: <package.json version> }`
- Public route (no auth required)
- Used for uptime monitoring and deployment verification

**7.4 Request ID on all API responses**
- Generate a `requestId` (UUID v4 or `crypto.randomUUID()`) at the start of every API request
- Attach to log entries
- Return as `X-Request-ID` response header

---

## New File Structure

Files to **create**:
```
src/
  middleware.ts                          # Clerk auth middleware
  lib/
    logger.ts                            # Structured logger with sink adapter
    errors.ts                            # Typed error classes
    rate-limiter.ts                      # In-memory per-IP rate limiter
  app/
    sign-in/[[...sign-in]]/page.tsx      # Clerk sign-in page
    sign-up/[[...sign-up]]/page.tsx      # Clerk sign-up page
    api/
      health/route.ts                    # Health check endpoint
```

Files to **modify**:
```
src/
  app/
    layout.tsx                           # Add ClerkProvider
    page.tsx                             # Fix bugs 1-6, add UserButton, typed apiCall
    api/ai/write/route.ts                # Add auth check, rate limit, request ID, logger
  components/
    EssayEditor.tsx                      # Convert to forwardRef
  lib/ai/
    schemas.ts                           # Add string length limits
    model.ts                             # Read config from env vars
    validators.ts                        # JSDoc
    context.ts                           # JSDoc
    prompts.ts                           # JSDoc
    router.ts                            # JSDoc
    formatter.ts                         # JSDoc
    types.ts                             # Interface comments
  next.config.ts                         # Add security headers
README.md                                # Full rewrite
ARCHITECTURE.md                          # New file
```

---

## Acceptance Criteria

### Bugs
- [ ] Selecting text in the editor and clicking "Replace selection" correctly replaces the selected text
- [ ] Selecting text and clicking "Insert at cursor" inserts at the correct position
- [ ] Toolbar button for the active pipeline step shows a spinner while that step runs
- [ ] Run button in ActionPanel is disabled (not silently broken) when no task is selected
- [ ] Sending a request with `documentText` > 20,000 chars returns a `400` validation error
- [ ] `apiCall` in `page.tsx` is typed as `WritingRequest`, not `Record<string, unknown>`

### Authentication
- [ ] Unauthenticated users are redirected to `/sign-in` when accessing any page
- [ ] `POST /api/ai/write` returns `401` without a valid Clerk session
- [ ] Sign-in and sign-up pages render correctly and match the app design
- [ ] Signed-in user's avatar appears in the header via `<UserButton />`
- [ ] `userId` appears in every API log entry

### Security
- [ ] All 7 security headers present on every response (verified via `curl -I`)
- [ ] `POST /api/ai/write` returns `429` after exceeding 20 requests/minute from same IP
- [ ] `Retry-After` header present on `429` responses
- [ ] No `console.*` calls in any production code path

### Logging
- [ ] Every API request produces a structured JSON log entry with: `requestId`, `userId`, `task`, `statusCode`, `durationMs`, `timestamp`
- [ ] `X-Request-ID` header present on all API responses
- [ ] Logger does not throw under any circumstances
- [ ] `LogSink` interface is documented and a second sink can be added in < 10 lines

### Rate Limiting
- [ ] `checkRateLimit()` correctly blocks after `RATE_LIMIT_MAX` requests in `RATE_LIMIT_WINDOW_MS`
- [ ] Stale entries are cleaned from the in-memory map automatically
- [ ] Limit is configurable via env vars without code changes

### Documentation
- [ ] Every exported function in `src/lib/` has a JSDoc block with `@description`, `@param`, `@returns`
- [ ] Every file in `src/lib/` and `src/app/api/` has a `@file` header comment
- [ ] README covers: setup, env vars, project structure, how to add a task, deployment
- [ ] ARCHITECTURE.md covers: system diagram, data flow, auth flow, provider swap guide
- [ ] `/api/health` returns `200 { status: "ok" }`

### Code Quality
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds with zero warnings
- [ ] No unused imports in any file
- [ ] Typed error classes used in API route instead of raw strings

---

## Implementation Order

Execute in this exact sequence to avoid breaking changes:

1. **Fix EssayEditor forwardRef** — unblocks insert/replace, no other dependencies
2. **Fix apiCall type** — pure type fix, no runtime change
3. **Add string length limits to schemas** — pure validation addition
4. **Add `src/lib/errors.ts`** — needed by logger and route
5. **Add `src/lib/logger.ts`** — needed by route and rate limiter
6. **Add `src/lib/rate-limiter.ts`** — depends on logger
7. **Update `next.config.ts`** — security headers, no code dependencies
8. **Update `src/app/api/ai/write/route.ts`** — add request ID, logger, rate limiter, typed errors
9. **Add `/api/health` route** — standalone, no dependencies
10. **Move model config to env vars** — update `model.ts`
11. **Fix remaining page.tsx bugs** (activeTask, console.error, ActionPanel guard)
12. **Install Clerk, update `layout.tsx`** — add ClerkProvider
13. **Create `src/middleware.ts`** — Clerk route protection
14. **Create sign-in / sign-up pages** — Clerk UI components
15. **Update API route with Clerk auth check** — `auth()` + userId in logs
16. **Add UserButton to header** — final UI change
17. **Add JSDoc to all lib files** — documentation pass
18. **Rewrite README.md**
19. **Create ARCHITECTURE.md**
20. **Final: `tsc --noEmit` + `npm run build`** — verify zero errors

---

## Environment Variables (Complete Reference)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | Model ID |
| `OPENAI_MAX_TOKENS` | No | `2048` | Max output tokens |
| `OPENAI_TEMPERATURE` | No | `0.7` | Model temperature |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | — | Clerk secret key |
| `RATE_LIMIT_MAX` | No | `20` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in ms |
| `NODE_ENV` | No | `development` | Runtime environment |
