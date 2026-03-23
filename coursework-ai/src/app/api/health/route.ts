/**
 * @file route.ts
 * @description GET /api/health — public health check endpoint.
 *
 * Returns the current service status, timestamp, and application version.
 * This route is intentionally public (no auth required) so uptime monitors,
 * load balancers, and deployment pipelines can verify the service is running
 * without needing credentials.
 *
 * Used by:
 * - Uptime monitoring services (e.g. UptimeRobot, Datadog Synthetics)
 * - Deployment verification scripts
 * - Clerk middleware public route allowlist
 *
 * @module app/api/health
 */

import { NextResponse } from 'next/server';
import { version } from '../../../../package.json';

/**
 * GET /api/health
 *
 * @returns 200 JSON with status, timestamp, and version
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
    },
    { status: 200 }
  );
}
