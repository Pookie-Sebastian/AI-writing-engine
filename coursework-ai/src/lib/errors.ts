/**
 * @file errors.ts
 * @description Typed application error classes for Coursework AI.
 *
 * All errors extend AppError which carries a machine-readable `code`,
 * a human-readable `message`, and an HTTP `statusCode`. Using typed errors
 * instead of raw strings allows the API route to produce consistent JSON
 * error responses and makes error handling auditable.
 *
 * @module lib/errors
 */

// ─── Base error ───────────────────────────────────────────────────────────────

/**
 * Base class for all application errors.
 * Extends the native Error so stack traces are preserved.
 */
export class AppError extends Error {
  /** Machine-readable error code (e.g. "VALIDATION_ERROR") */
  readonly code: string;
  /** HTTP status code to return to the client */
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Typed error subclasses ───────────────────────────────────────────────────

/**
 * Thrown when incoming request data fails Zod schema validation
 * or task-specific requirement checks.
 * Maps to HTTP 400 Bad Request.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when a request arrives without a valid authentication session.
 * Maps to HTTP 401 Unauthorized.
 */
export class AuthError extends AppError {
  constructor(message = 'Authentication required.') {
    super('AUTH_ERROR', message, 401);
    this.name = 'AuthError';
  }
}

/**
 * Thrown when a client exceeds the configured rate limit.
 * Maps to HTTP 429 Too Many Requests.
 */
export class RateLimitError extends AppError {
  /** Milliseconds until the client may retry */
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded. Please retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      429
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Thrown when the AI model call fails — either a provider error,
 * a missing API key, or an empty/malformed response.
 * Maps to HTTP 502 Bad Gateway (upstream failure).
 */
export class ModelError extends AppError {
  constructor(message: string) {
    super('MODEL_ERROR', message, 502);
    this.name = 'ModelError';
  }
}

/**
 * Thrown when the OPENAI_API_KEY environment variable is missing or invalid.
 * Maps to HTTP 503 Service Unavailable.
 */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super('CONFIGURATION_ERROR', message, 503);
    this.name = 'ConfigurationError';
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

/**
 * Narrows an unknown caught value to AppError.
 *
 * @param err - The value caught in a catch block
 * @returns true if err is an instance of AppError
 */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * Converts any unknown error into a safe { code, message, statusCode } shape
 * suitable for returning in an API response.
 *
 * @param err - The value caught in a catch block
 * @returns A plain object with code, message, and statusCode
 */
export function toErrorResponse(err: unknown): {
  code: string;
  message: string;
  statusCode: number;
} {
  if (isAppError(err)) {
    return { code: err.code, message: err.message, statusCode: err.statusCode };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    statusCode: 500,
  };
}
