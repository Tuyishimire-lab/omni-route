'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Global error boundary - catches errors in the ROOT LAYOUT itself.
 * This is the last-resort fallback. Because the root layout crashed,
 * we must render our own <html>/<body> tags here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ background: '#0A0E0E', color: '#FFFFFF', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: '1rem',
          gap: '1.5rem',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertTriangle size={32} color="#f87171" />
          </div>

          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              CiteRoute encountered a critical error
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#878787', maxWidth: 400, margin: '0 auto' }}>
              The application failed to load. Please try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#555', fontFamily: 'monospace', marginTop: 8 }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              background: '#05AD98',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={16} />
            Refresh page
          </button>
        </div>
      </body>
    </html>
  );
}
