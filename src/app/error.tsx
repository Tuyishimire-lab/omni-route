'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Next.js App Router error boundary.
 * Catches unhandled errors in any page component and shows a branded
 * fallback instead of a white screen or generic browser error.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error reporting service in production
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-sm text-[#878787] leading-relaxed">
          An unexpected error occurred. This has been logged and we will look into it.
        </p>
        {error.digest && (
          <p className="text-xs text-[#555] font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#05AD98] text-white text-sm font-semibold hover:bg-[#04967f] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
        <a
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[rgba(187,191,191,0.15)] text-[#BBBFBF] text-sm font-semibold hover:text-white hover:border-[rgba(187,191,191,0.30)] transition-colors"
        >
          <Home className="w-4 h-4" />
          Go home
        </a>
      </div>
    </div>
  );
}
