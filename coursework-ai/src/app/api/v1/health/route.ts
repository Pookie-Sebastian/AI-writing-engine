/**
 * @file route.ts
 * @description GET /api/v1/health — versioned service identity endpoint.
 *
 * Extends the basic /api/health check with service identity metadata
 * so orchestration layers and service registries can identify which
 * service they are talking to and what capabilities it exposes.
 *
 * Always public — no auth required.
 *
 * @module app/api/v1/health
 */

import { NextResponse } from 'next/server';
import { version } from '../../../../../package.json';

/**
 * GET /api/v1/health
 *
 * Returns service identity, version, status, supported tasks,
 * and the API contract version so callers can verify compatibility.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status:      'ok',
      service:     'writing-service',
      version,
      contractVersion: 'v1',
      timestamp:   new Date().toISOString(),
      capabilities: {
        endpoint:    '/api/v1/write',
        method:      'POST',
        tasks: [
          'generate_outline',
          'generate_thesis',
          'generate_intro',
          'generate_body_paragraph',
          'generate_conclusion',
          'generate_draft',
          'rewrite_selection',
          'expand_paragraph',
          'improve_clarity',
          'strengthen_argument',
          'generate_transitions',
          'summarize_source',
          'fix_issue',
        ],
      },
    },
    { status: 200 }
  );
}
