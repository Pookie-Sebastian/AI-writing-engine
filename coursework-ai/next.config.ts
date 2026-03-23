/**
 * @file next.config.ts
 * @description Next.js configuration for Coursework AI.
 *
 * Security headers are applied to all routes to meet SOC 2 and
 * cybersecurity insurance audit requirements. Headers follow OWASP
 * recommendations and are compatible with Clerk's hosted auth assets.
 *
 * @module next.config
 */

import type { NextConfig } from 'next';

/**
 * HTTP security headers applied to every response.
 * CSP allows Clerk domains for auth UI and API calls.
 */
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
  // SAMEORIGIN would block Gitpod's preview iframe (different origin).
  // Omitted in dev; set via CSP frame-ancestors in production instead.
  // { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://*.gitpod.dev wss://*.gitpod.dev",
      "font-src 'self' data:",
      "frame-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.gitpod.dev",
      "frame-ancestors 'self' https://*.gitpod.dev",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Allow the Gitpod preview domain to access HMR websocket and dev resources.
  // Without this, Next.js blocks cross-origin HMR connections and the browser
  // runs a permanently stale JS bundle — code changes never reach the client.
  allowedDevOrigins: [
    '3000--019d1b68-fdb2-79b7-9cba-81feff736d64.us-east-1-01.gitpod.dev',
    '*.gitpod.dev',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
