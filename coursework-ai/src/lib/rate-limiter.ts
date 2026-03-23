/**
 * @file rate-limiter.ts
 * @description In-memory per-IP sliding window rate limiter for Coursework AI.
 *
 * Uses a Map of IP → timestamp[] to track requests within a rolling window.
 * Stale entries are pruned on every check to prevent unbounded memory growth.
 *
 * Configuration via environment variables:
 *   RATE_LIMIT_MAX        - Max requests per window (default: 20)
 *   RATE_LIMIT_WINDOW_MS  - Window duration in ms (default: 60000 = 1 minute)
 *
 * This module is server-only. Never import it in client components.
 *
 * @module lib/rate-limiter
 */

import { logger } from './logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '20', 10);
const WINDOW_MS    = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10);

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Result returned by checkRateLimit.
 */
export interface RateLimitResult {
  /** Whether the request is allowed to proceed */
  allowed: boolean;
  /** Milliseconds until the oldest request expires and a slot opens */
  retryAfterMs: number;
  /** Number of requests remaining in the current window */
  remaining: number;
}

// ─── State ────────────────────────────────────────────────────────────────────

/**
 * In-memory store: maps each IP address to an array of request timestamps
 * (Unix ms) within the current window.
 *
 * Note: this resets on server restart. For persistent rate limiting across
 * multiple instances, replace with a Redis-backed implementation.
 */
const store = new Map<string, number[]>();

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Checks whether the given IP is within its rate limit and records the request.
 *
 * Algorithm (sliding window):
 * 1. Load existing timestamps for the IP.
 * 2. Prune timestamps older than WINDOW_MS.
 * 3. If count >= MAX_REQUESTS, deny and return retryAfterMs.
 * 4. Otherwise, record the current timestamp and allow.
 *
 * @param ip - The client IP address (from x-forwarded-for or request.ip)
 * @returns RateLimitResult with allowed, retryAfterMs, and remaining
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Load and prune stale timestamps
  const timestamps = (store.get(ip) ?? []).filter(t => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    // Oldest timestamp tells us when the next slot opens.
    // Fall back to WINDOW_MS if the array is somehow empty (e.g. MAX_REQUESTS=0).
    const oldestTimestamp = timestamps[0] ?? now;
    const retryAfterMs = oldestTimestamp + WINDOW_MS - now;

    logger.warn('Rate limit exceeded', { ip, count: timestamps.length, retryAfterMs });

    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0), remaining: 0 };
  }

  // Record this request
  timestamps.push(now);
  store.set(ip, timestamps);

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: MAX_REQUESTS - timestamps.length,
  };
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

/**
 * Removes all IPs from the store that have no timestamps within the current
 * window. Call periodically to prevent unbounded memory growth in long-running
 * processes.
 *
 * This is called automatically every 5 minutes via the interval below.
 */
export function pruneExpiredEntries(): void {
  const windowStart = Date.now() - WINDOW_MS;
  let pruned = 0;

  for (const [ip, timestamps] of store.entries()) {
    const active = timestamps.filter(t => t > windowStart);
    if (active.length === 0) {
      store.delete(ip);
      pruned++;
    } else {
      store.set(ip, active);
    }
  }

  if (pruned > 0) {
    logger.debug('Rate limiter pruned expired entries', { pruned, remaining: store.size });
  }
}

/**
 * Returns the current number of tracked IPs. Useful for monitoring.
 *
 * @returns Number of IPs currently in the store
 */
export function getStoreSize(): number {
  return store.size;
}

/**
 * Clears all rate limit state. Intended for use in tests only.
 */
export function resetStore(): void {
  store.clear();
}

// ─── Auto-prune interval ──────────────────────────────────────────────────────

// Prune every 5 minutes in server environments to prevent memory growth.
// The typeof check ensures this does not run during static builds or tests.
if (typeof setInterval !== 'undefined' && process.env.NODE_ENV !== 'test') {
  setInterval(pruneExpiredEntries, 5 * 60 * 1000);
}
