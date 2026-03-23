/**
 * @file page.tsx
 * @description Sign-up page for Coursework AI.
 *
 * Renders Clerk's hosted SignUp component centered on a branded page.
 * The [[...sign-up]] catch-all route is required by Clerk to handle
 * multi-step registration flows (email verification, OAuth, etc.).
 *
 * Route: /sign-up
 *
 * @module app/sign-up
 */

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <span className="font-semibold text-slate-900 text-lg tracking-tight">
          Coursework AI
        </span>
      </div>

      {/* Clerk SignUp component */}
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'shadow-sm border border-slate-200 rounded-xl',
            headerTitle: 'text-slate-900 font-semibold',
            headerSubtitle: 'text-slate-500',
            formButtonPrimary:
              'bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg',
            footerActionLink: 'text-indigo-600 hover:text-indigo-700 font-medium',
          },
        }}
      />
    </div>
  );
}
