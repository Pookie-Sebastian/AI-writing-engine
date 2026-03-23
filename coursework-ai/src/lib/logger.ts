/**
 * @file logger.ts
 * @description Structured logger for Coursework AI.
 *
 * Outputs JSON log entries in production and human-readable lines in
 * development. Supports pluggable external sinks (Datadog, Sentry, etc.)
 * via the LogSink interface — add a sink with logger.addSink(sink).
 *
 * Design principles:
 * - Never throws. Logging must not crash the application.
 * - All fields are optional except level, message, and timestamp.
 * - Sinks receive the full LogEntry and decide how to handle it.
 *
 * @module lib/logger
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Severity levels in ascending order. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single structured log entry.
 * All fields beyond level/message/timestamp are optional context.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  task?: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * Interface for external log sinks.
 * Implement this to forward logs to Datadog, Sentry, or any other provider.
 *
 * @example
 * class DatadogSink implements LogSink {
 *   write(entry: LogEntry) {
 *     datadogLogs.logger.log(entry.message, entry);
 *   }
 * }
 * logger.addSink(new DatadogSink());
 */
export interface LogSink {
  /**
   * Receives a fully-formed log entry.
   * Must not throw — wrap in try/catch internally if needed.
   *
   * @param entry - The structured log entry to write
   */
  write(entry: LogEntry): void;
}

// ─── Built-in sinks ───────────────────────────────────────────────────────────

/**
 * Default sink: writes JSON to stdout in production,
 * human-readable lines in development.
 */
class ConsoleLogSink implements LogSink {
  write(entry: LogEntry): void {
    try {
      if (process.env.NODE_ENV === 'production') {
        process.stdout.write(JSON.stringify(entry) + '\n');
      } else {
        const { level, message, timestamp, ...rest } = entry;
        const meta = Object.keys(rest).length
          ? ' ' + JSON.stringify(rest)
          : '';
        const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)}`;
        // eslint-disable-next-line no-console
        console.log(`${prefix} ${message}${meta}`);
      }
    } catch {
      // Sink must never throw
    }
  }
}

// ─── Logger class ─────────────────────────────────────────────────────────────

class Logger {
  private sinks: LogSink[] = [new ConsoleLogSink()];

  /**
   * Registers an additional log sink.
   * The default ConsoleLogSink remains active alongside any added sinks.
   *
   * @param sink - An object implementing the LogSink interface
   */
  addSink(sink: LogSink): void {
    this.sinks.push(sink);
  }

  /**
   * Removes all registered sinks. Useful in tests to suppress output.
   */
  clearSinks(): void {
    this.sinks = [];
  }

  /**
   * Core write method. Builds a LogEntry and dispatches to all sinks.
   * Never throws — any sink error is silently swallowed.
   *
   * @param level   - Severity level
   * @param message - Human-readable description
   * @param context - Optional structured fields to attach
   */
  private write(level: LogLevel, message: string, context?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    for (const sink of this.sinks) {
      try {
        sink.write(entry);
      } catch {
        // Individual sink failures must not affect other sinks or the app
      }
    }
  }

  /**
   * Logs a debug-level message. Use for detailed diagnostic information.
   *
   * @param message - Description of the event
   * @param context - Optional structured context fields
   */
  debug(message: string, context?: Partial<LogEntry>): void {
    this.write('debug', message, context);
  }

  /**
   * Logs an info-level message. Use for normal operational events.
   *
   * @param message - Description of the event
   * @param context - Optional structured context fields
   */
  info(message: string, context?: Partial<LogEntry>): void {
    this.write('info', message, context);
  }

  /**
   * Logs a warn-level message. Use for recoverable unexpected conditions.
   *
   * @param message - Description of the event
   * @param context - Optional structured context fields
   */
  warn(message: string, context?: Partial<LogEntry>): void {
    this.write('warn', message, context);
  }

  /**
   * Logs an error-level message. Use for failures that affect a request.
   *
   * @param message - Description of the failure
   * @param context - Optional structured context fields (include error string)
   */
  error(message: string, context?: Partial<LogEntry>): void {
    this.write('error', message, context);
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/**
 * Application-wide logger singleton.
 * Import and use directly — do not instantiate Logger manually.
 *
 * @example
 * import { logger } from '@/lib/logger';
 * logger.info('Request received', { requestId, userId, task });
 */
export const logger = new Logger();
