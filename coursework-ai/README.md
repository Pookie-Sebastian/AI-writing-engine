# Coursework AI

An AI-powered academic essay writing assistant. Users fill in assignment details, then generate outlines, thesis statements, introductions, body paragraphs, conclusions, and full drafts — or refine existing text with rewrite, expand, clarity, and argument-strengthening tools.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI | OpenAI GPT-4o via `openai` SDK |
| Auth | Clerk (`@clerk/nextjs`) |
| Validation | Zod 4 |

## Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Clerk application](https://dashboard.clerk.com) (free tier works)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local and fill in OPENAI_API_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
# and CLERK_SECRET_KEY

# 3. Start the dev server
npm run dev
```

Open http://localhost:3000. You will be redirected to sign in on first visit.

## Environment Variables

See `.env.local.example` for the full list with descriptions.

**Required:**

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

**Optional (defaults shown):**

| Variable | Default | Description |
|---|---|---|
| `OPENAI_MODEL` | `gpt-4o` | Model ID |
| `OPENAI_MAX_TOKENS` | `2048` | Max completion tokens |
| `OPENAI_TEMPERATURE` | `0.7` | Sampling temperature |
| `RATE_LIMIT_MAX` | `20` | Requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |

## Available Scripts

```bash
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## API

### `POST /api/ai/write`

Requires a valid Clerk session cookie.

**Request body** (`task` is required; all other fields are optional):

```json
{
  "task": "generate_outline",
  "assignmentPrompt": "Discuss the causes of World War I",
  "documentTitle": "WWI Essay",
  "documentText": "...",
  "selectedText": "...",
  "userInput": "Focus on nationalism and alliances",
  "tone": "academic",
  "courseLevel": "undergraduate",
  "wordTarget": 1000
}
```

**Supported tasks:**

| Task | Requires selected text |
|---|---|
| `generate_outline` | No |
| `generate_thesis` | No |
| `generate_intro` | No |
| `generate_body_paragraph` | No |
| `generate_conclusion` | No |
| `generate_draft` | No |
| `rewrite_selection` | Yes |
| `expand_paragraph` | Yes |
| `improve_clarity` | Yes |
| `strengthen_argument` | Yes |
| `generate_transitions` | Yes |
| `summarize_source` | Yes |

**Response:**

```json
{
  "success": true,
  "data": {
    "task": "generate_outline",
    "outputText": "...",
    "bullets": ["..."],
    "notes": "Thesis: ..."
  }
}
```

### `GET /api/health`

Returns `{ "status": "ok", "timestamp": "...", "version": "0.1.0" }`. No auth required.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/write/route.ts   # Main AI endpoint
│   │   └── health/route.ts     # Health check
│   ├── sign-in/                # Clerk sign-in page
│   ├── sign-up/                # Clerk sign-up page
│   ├── layout.tsx              # Root layout with ClerkProvider
│   └── page.tsx                # Main editor page
├── components/
│   ├── AssignmentForm.tsx      # Assignment metadata inputs
│   ├── TaskToolbar.tsx         # Task selection buttons
│   ├── EssayEditor.tsx         # Textarea editor (forwardRef)
│   ├── ActionPanel.tsx         # Task detail and run panel
│   └── OutputPanel.tsx         # AI output display
├── lib/
│   ├── ai/
│   │   ├── types.ts            # Domain types
│   │   ├── schemas.ts          # Zod validation schemas
│   │   ├── validators.ts       # Request validation logic
│   │   ├── context.ts          # WritingContext builder
│   │   ├── prompts.ts          # Prompt builders (one per task)
│   │   ├── router.ts           # Task -> prompt -> model pipeline
│   │   ├── model.ts            # OpenAI client and call utilities
│   │   └── formatter.ts        # Response post-processing
│   ├── utils/
│   │   ├── text.ts             # Textarea helpers, text utilities
│   │   └── constants.ts        # UI labels and option lists
│   ├── errors.ts               # Typed error classes
│   ├── logger.ts               # Structured logger with sink interface
│   └── rate-limiter.ts         # In-memory sliding window rate limiter
└── proxy.ts               # Clerk auth middleware
```

## Security

- All routes except `/sign-in`, `/sign-up`, and `/api/health` require authentication (Clerk middleware).
- The API route validates and rate-limits every request before it reaches the model.
- HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) are set in `next.config.ts`.
- Input lengths are bounded by Zod schemas to prevent prompt injection via oversized payloads.
