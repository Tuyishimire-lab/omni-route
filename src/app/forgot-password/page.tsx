'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to request password reset. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Image
            src="/citeroute-icon.png"
            alt="CiteRoute Logo"
            width={56}
            height={56}
            priority
            className="w-14 h-14 rounded-2xl mx-auto shadow-xl shadow-[rgba(5,173,152,0.25)] border border-[rgba(5,173,152,0.3)] object-contain"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-white">Reset Your Password</h1>
            <p className="text-xs text-[#878787] mt-1">
              Enter your email and we will send you a link to reset your password
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-5">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-[rgba(5,173,152,0.15)] border border-[#05AD98]/30 flex items-center justify-center text-[#05AD98] mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Check Your Inbox</h3>
                <p className="text-xs text-[#BBBFBF] leading-relaxed">
                  If an account exists for <span className="text-white font-medium">{email}</span>, you will receive an email with instructions to reset your password.
                </p>
                <p className="text-[11px] text-[#878787] pt-2">
                  Be sure to check your spam or promotions folder if you do not see it within a few minutes.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all shadow-md shadow-[rgba(5,173,152,0.2)]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#878787] block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#05AD98] placeholder-[#878787]/50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[rgba(5,173,152,0.2)]"
              >
                {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#878787]">
          Remember your password?{' '}
          <Link href="/login" className="text-[#05AD98] hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
