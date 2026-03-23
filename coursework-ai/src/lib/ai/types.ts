/**
 * @file types.ts
 * @description Domain types for the AI writing pipeline.
 *
 * These types are shared across the API route, the AI pipeline (model, prompts,
 * router, formatter), and the frontend components. Keeping them in one place
 * ensures the request/response contract is consistent end-to-end.
 *
 * @module lib/ai/types
 */

// ─── Task identifiers ─────────────────────────────────────────────────────────

/**
 * All supported writing task identifiers.
 * Each maps to a distinct prompt template and model configuration.
 */
export type WritingTask =
  | 'generate_outline'
  | 'generate_thesis'
  | 'generate_intro'
  | 'generate_body_paragraph'
  | 'generate_conclusion'
  | 'generate_draft'
  | 'rewrite_selection'
  | 'expand_paragraph'
  | 'improve_clarity'
  | 'strengthen_argument'
  | 'generate_transitions'
  | 'summarize_source'
  // Analysis-triggered tasks — called by the analysis engine with a specific
  // paragraphIndex and selectedText targeting the identified issue.
  | 'fix_issue';

// ─── Metadata enums ───────────────────────────────────────────────────────────

/**
 * Writing tone options that influence the model's style and register.
 */
export type EssayTone =
  | 'academic'
  | 'persuasive'
  | 'analytical'
  | 'reflective'
  | 'narrative';

/**
 * Academic level of the document, used to calibrate vocabulary and complexity.
 */
export type CourseLevel =
  | 'high_school'
  | 'undergraduate'
  | 'graduate'
  | 'professional';

// ─── Document context ─────────────────────────────────────────────────────────

/**
 * Shared document context passed with every writing request.
 * All fields are optional so callers can provide only what is relevant.
 * The analysis engine imports and extends this interface — do not add
 * writing-specific fields here.
 *
 * @property documentText     - Full text of the essay being worked on
 * @property selectedText     - Text the user has highlighted in the editor
 * @property assignmentPrompt - The original assignment question or brief
 * @property thesis           - The essay's thesis statement
 * @property tone             - Desired writing tone
 * @property courseLevel      - Academic level of the document
 * @property documentTitle    - Title of the essay or document
 */
export interface DocumentContext {
  documentText?: string;
  selectedText?: string;
  assignmentPrompt?: string;
  thesis?: string;
  tone?: EssayTone;
  courseLevel?: CourseLevel;
  documentTitle?: string;
}

// ─── Request ──────────────────────────────────────────────────────────────────

/**
 * The full writing request sent from the client to POST /api/ai/write.
 * Extends DocumentContext with the required task identifier and optional
 * per-request overrides.
 *
 * @property task        - Which writing task to perform (required)
 * @property userInput   - Free-form additional instructions from the user
 * @property wordTarget  - Approximate word count for generated output
 */
export interface WritingRequest extends DocumentContext {
  task: WritingTask;
  userInput?: string;
  wordTarget?: number;
}

// ─── Response ─────────────────────────────────────────────────────────────────

/**
 * Structured response returned by the AI pipeline to the client.
 *
 * @property task           - The task that was performed
 * @property outputText     - Primary generated text (always present)
 * @property bullets        - Structured list items (outlines, thesis options)
 * @property notes          - Raw model output preserved for reference
 * @property wordCount      - Approximate word count of outputText
 * @property paragraphIndex - Target paragraph index (used by analysis engine)
 */
export interface WritingResponse {
  task: WritingTask;
  outputText: string;
  bullets?: string[];
  notes?: string;
  wordCount?: number;
  paragraphIndex?: number;
}

// ─── Outline ──────────────────────────────────────────────────────────────────

/**
 * A single section in a structured essay outline.
 *
 * @property heading - Section heading (e.g. "Introduction", "Body Paragraph 1")
 * @property points  - Bullet points under this heading
 */
export interface OutlineSection {
  heading: string;
  points: string[];
}

// ─── Internal pipeline types ──────────────────────────────────────────────────

/**
 * Enriched context produced by the context builder from a raw WritingRequest.
 * Adds truncated versions of long text fields and a resolved word target.
 * This is what prompt builders receive — never the raw request.
 *
 * @property truncatedDocument  - documentText truncated to MAX_DOCUMENT_CHARS
 * @property truncatedSelection - selectedText truncated to MAX_SELECTION_CHARS
 * @property resolvedWordTarget - wordTarget with default applied
 * @property userInput          - Additional instructions or source text from the user
 */
export interface WritingContext extends DocumentContext {
  truncatedDocument?: string;
  truncatedSelection?: string;
  resolvedWordTarget: number;
  userInput?: string;
}

/**
 * Per-task model configuration used by the router to override global defaults.
 *
 * @property temperature - Sampling temperature (0–1); lower = more deterministic
 * @property maxTokens   - Maximum tokens in the model response
 * @property label       - Human-readable task label for logging
 */
export interface TaskConfig {
  temperature: number;
  maxTokens: number;
  label: string;
}

// ─── Analysis engine types ────────────────────────────────────────────────────
// These types are the shared contract between the writing engine and the
// analysis engine. The analysis engine produces AnalysisResult objects;
// the writing engine and chat interface consume them.

/**
 * Severity level of an identified essay issue.
 */
export type AnalysisSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * A single issue identified in the essay by the analysis engine.
 *
 * @property id             - Unique identifier for this issue
 * @property severity       - How important this issue is to fix
 * @property category       - Which aspect of writing this affects
 * @property paragraphIndex - Zero-based index of the affected paragraph (if applicable)
 * @property quote          - The exact text excerpt that has the issue
 * @property description    - Human-readable explanation of the problem
 * @property suggestion     - Concrete fix or improvement
 */
export interface EssayIssue {
  id: string;
  severity: AnalysisSeverity;
  category:
    | 'thesis'
    | 'structure'
    | 'argument'
    | 'evidence'
    | 'clarity'
    | 'transitions'
    | 'conclusion'
    | 'grammar';
  paragraphIndex?: number;
  quote?: string;
  description: string;
  suggestion: string;
}

/**
 * The full result produced by the analysis engine for a given essay.
 * Imported by the chat interface to inject analysis findings into the
 * conversation, and by the writing engine to target specific improvements.
 *
 * @property documentTitle   - Title of the analysed essay
 * @property overallScore    - 0–100 quality score
 * @property summary         - One-paragraph plain-English summary of findings
 * @property issues          - Ordered list of identified issues (most severe first)
 * @property strengths       - What the essay does well
 * @property wordCount       - Word count of the analysed text
 * @property analysedAt      - ISO timestamp of when the analysis ran
 */
export interface AnalysisResult {
  documentTitle?: string;
  overallScore: number;
  summary: string;
  issues: EssayIssue[];
  strengths: string[];
  wordCount: number;
  analysedAt: string;
}
