/**
 * @file contracts/types.ts
 * @description Canonical shared types for the Coursework AI distributed system.
 *
 * These are the SOURCE OF TRUTH for all inter-service communication.
 * Every service (Writing, Analysis, Recommendation, Orchestration) MUST
 * import from this file — never define local equivalents.
 *
 * Backward compatibility rule: fields may be added (optional) but never
 * removed or renamed without a versioned migration.
 *
 * @module lib/contracts/types
 */

// ─── Document ─────────────────────────────────────────────────────────────────

/**
 * The canonical representation of an essay document passed between services.
 * All services consume and produce content in this shape.
 *
 * @property documentId       - Stable identifier for this document
 * @property title            - Optional document title
 * @property assignmentPrompt - The original assignment question or brief
 * @property thesis           - The essay's thesis statement
 * @property content          - Full plain-text content of the essay
 * @property paragraphs       - Content split into indexed paragraphs for
 *                              targeted analysis and writing operations
 */
export interface EssayDocument {
  documentId: string;
  title?: string;
  assignmentPrompt?: string;
  thesis?: string;
  content: string;
  paragraphs: ParagraphBlock[];
}

/**
 * A single paragraph within an EssayDocument.
 *
 * @property index - Zero-based position in the document
 * @property text  - Plain text of this paragraph
 */
export interface ParagraphBlock {
  index: number;
  text: string;
}

/**
 * A reference to a specific location within a paragraph.
 * Used by Analysis and Recommendation services to pinpoint issues.
 *
 * @property paragraphIndex - Zero-based paragraph index within the document
 * @property startOffset    - Character offset where the reference begins
 * @property endOffset      - Character offset where the reference ends
 */
export interface ParagraphRef {
  paragraphIndex: number;
  startOffset?: number;
  endOffset?: number;
}

// ─── Writing Service contracts ────────────────────────────────────────────────

/**
 * All writing tasks supported by the Writing Service.
 * Maps 1-to-1 with the internal WritingTask type — kept in sync via
 * the WritingTaskSchema in schemas.ts.
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
  | 'fix_issue';

/**
 * Request body for POST /api/v1/write.
 * Consumed by the Writing Service from any upstream caller.
 *
 * @property document    - The essay document to operate on
 * @property task        - Which writing operation to perform
 * @property selectedText - Text excerpt to target (required for refinement tasks)
 * @property userInput   - Additional free-form instructions
 * @property tone        - Desired writing tone
 * @property courseLevel - Academic level
 * @property wordTarget  - Approximate word count for generated output
 */
export interface WriteRequest {
  document: EssayDocument;
  task: WritingTask;
  selectedText?: string;
  userInput?: string;
  tone?: EssayTone;
  courseLevel?: CourseLevel;
  wordTarget?: number;
}

/**
 * Response from POST /api/v1/write.
 * Returned to any downstream caller (Orchestration, frontend).
 *
 * @property task          - The task that was performed
 * @property outputText    - Primary generated text
 * @property bullets       - Structured list items (outlines, thesis options)
 * @property wordCount     - Approximate word count of outputText
 * @property paragraphRef  - Which paragraph this output targets, if applicable
 */
export interface WriteResponse {
  task: WritingTask;
  outputText: string;
  bullets?: string[];
  wordCount?: number;
  paragraphRef?: ParagraphRef;
}

// ─── Analysis Service contracts ───────────────────────────────────────────────

/**
 * All analysis tasks supported by the Analysis Service.
 */
export type AnalysisTask =
  | 'full_essay_analysis'
  | 'paragraph_analysis'
  | 'thesis_analysis'
  | 'structure_analysis'
  | 'clarity_analysis'
  | 'evidence_analysis';

/**
 * Priority level for an analysis issue or recommendation.
 */
export type IssuePriority = 'low' | 'medium' | 'high';

/**
 * A single issue identified by the Analysis Service.
 *
 * @property id           - Stable unique identifier for this issue
 * @property category     - Which dimension of writing is affected
 * @property score        - 0–100 quality score for this dimension
 * @property explanation  - Human-readable description of the problem
 * @property suggestedFix - Concrete actionable fix
 * @property priority     - How urgently this should be addressed
 * @property paragraphRef - Where in the document this issue occurs
 */
export interface AnalysisIssue {
  id: string;
  category: 'thesis' | 'structure' | 'coherence' | 'clarity' | 'evidence';
  score: number;
  explanation: string;
  suggestedFix: string;
  priority: IssuePriority;
  paragraphRef?: ParagraphRef;
}

/**
 * Response from the Analysis Service.
 * Consumed by the Recommendation Service and the Writing Service (fix_issue).
 *
 * @property overallScore - 0–100 composite quality score
 * @property summary      - Plain-English summary of findings
 * @property issues       - Ordered list of issues (highest priority first)
 */
export interface AnalysisResponse {
  overallScore: number;
  summary: string;
  issues: AnalysisIssue[];
}

// ─── Recommendation Service contracts ────────────────────────────────────────

/**
 * The action type a Recommendation maps to in the Writing Service.
 * Each actionType corresponds directly to a WritingTask.
 */
export type RecommendationAction =
  | 'rewrite'
  | 'expand'
  | 'clarify'
  | 'strengthen'
  | 'add_transition';

/**
 * A single actionable recommendation produced by the Recommendation Service.
 * Designed to be passed directly to the Writing Service as a write request.
 *
 * @property id           - Stable unique identifier
 * @property category     - Which writing dimension this addresses
 * @property priority     - How urgently this should be applied
 * @property description  - Human-readable explanation of what to do
 * @property actionType   - Maps to a WritingTask for the Writing Service
 * @property paragraphRef - Which paragraph to target
 */
export interface Recommendation {
  id: string;
  category: string;
  priority: IssuePriority;
  description: string;
  actionType: RecommendationAction;
  paragraphRef?: ParagraphRef;
}

// ─── Shared metadata ──────────────────────────────────────────────────────────

/**
 * Writing tone — shared across Writing and Analysis services.
 */
export type EssayTone =
  | 'academic'
  | 'persuasive'
  | 'analytical'
  | 'reflective'
  | 'narrative';

/**
 * Academic level — shared across Writing and Analysis services.
 */
export type CourseLevel =
  | 'high_school'
  | 'undergraduate'
  | 'graduate'
  | 'professional';

// ─── Envelope ─────────────────────────────────────────────────────────────────

/**
 * Standard success envelope wrapping all service responses.
 * Every service endpoint returns this shape so orchestration layers
 * can handle responses uniformly.
 *
 * @property success   - Always true for this type
 * @property data      - The response payload
 * @property requestId - Echoed from the X-Request-ID header for tracing
 */
export interface ServiceSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

/**
 * Standard error envelope returned by all service endpoints on failure.
 *
 * @property success   - Always false for this type
 * @property error     - Structured error detail
 * @property requestId - Echoed from the X-Request-ID header for tracing
 */
export interface ServiceError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

/** Union of success and error envelopes. */
export type ServiceResponse<T> = ServiceSuccess<T> | ServiceError;
