/**
 * @file proxy.ts
 * @description Next.js edge proxy (middleware) for Coursework AI.
 *
 * When Clerk keys are present: enforces authentication on all routes.
 * When Clerk keys are absent (local dev without a Clerk account): passes
 * all requests through so the app remains usable for testing.
 *
 * Public routes (always unauthenticated):
 *   /sign-in    — Clerk sign-in page
 *   /sign-up    — Clerk sign-up page
 *   /api/health — Uptime monitoring
 *
 * @module proxy
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
]);

const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

// When Clerk keys are configured, enforce auth on all non-public routes.
// When keys are absent (e.g. local dev), pass all requests through.
export default clerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : (_req: NextRequest) => NextResponse.next(); // eslint-disable-line @typescript-eslint/no-unused-vars

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    '/(api|trpc)(.*)',
  ],
};
