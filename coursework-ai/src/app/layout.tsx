import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Coursework AI",
  description: "An AI-powered academic writing assistant. Get help planning, writing, and improving essays.",
};

// Evaluated once at server startup — stable across SSR and client hydration.
const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Conditionally wrap with ClerkProvider only when keys are configured.
  // Both branches produce identical HTML structure so hydration always matches.
  if (clerkEnabled) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider>
        <html lang="en" className={`${inter.variable} h-full antialiased`}>
          {/* suppressHydrationWarning silences attribute mismatches injected
              by browser extensions (e.g. bis_skin_checked, __processed_*) */}
          <body className="h-full font-sans" suppressHydrationWarning>
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
