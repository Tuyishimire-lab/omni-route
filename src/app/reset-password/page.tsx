'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { PasswordRequirementsIndicator } from '../../components/PasswordRequirementsIndicator';
import { validatePasswordPolicy } from '../../lib/passwordPolicy';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Pre-flight token verification
  useEffect(() => {
    if (!token) {
      setTokenError('No password reset token was provided in the link.');
      setIsVerifying(false);
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valid) {
          setTokenError(data.error || 'This reset link has expired or is invalid. Please request a new one.');
        }
      } catch {
        // Network failure; let user still attempt submission if server becomes reachable
      } finally {
        setIsVerifying(false);
      }
    }

    checkToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const policyResult = validatePasswordPolicy(password);
    if (!policyResult.isValid) {
      setError(policyResult.error || 'Password does not meet enterprise security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to reset password. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('A network error occurred. Please try again.');
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
            <h1 className="text-2xl font-extrabold text-white">Create New Password</h1>
            <p className="text-xs text-[#878787] mt-1">
              Choose a strong password with at least 8 characters
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-5">
          {isVerifying ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#05AD98] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-[#878787]">Verifying reset link...</p>
            </div>
          ) : tokenError ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Invalid or Expired Link</h3>
                <p className="text-xs text-[#BBBFBF] leading-relaxed">
                  {tokenError}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#05AD98] hover:bg-[#038a79] text-white text-sm font-bold transition-colors shadow-md shadow-[rgba(5,173,152,0.2)] cursor-pointer"
                >
                  Request a New Link
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-[rgba(5,173,152,0.15)] border border-[#05AD98]/30 flex items-center justify-center text-[#05AD98] mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Password Updated</h3>
                <p className="text-xs text-[#BBBFBF] leading-relaxed">
                  Your password has been reset successfully. You can now sign in to your CiteRoute account with your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#05AD98] hover:bg-[#038a79] text-white text-sm font-bold transition-colors shadow-md shadow-[rgba(5,173,152,0.2)] cursor-pointer"
                >
                  <span>Sign In Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#878787] block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoFocus
                    className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-4 py-3 pr-10 text-sm text-white font-mono focus:outline-none focus:border-[#05AD98] placeholder-[#878787]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Dynamic Password Policy & Strength Feedback */}
                <PasswordRequirementsIndicator password={password} />
              </div>

              <div>
                <label className="text-xs text-[#878787] block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
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
                className="w-full py-3 rounded-xl bg-[#05AD98] hover:bg-[#038a79] text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[rgba(5,173,152,0.2)] cursor-pointer"
              >
                {isLoading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#878787]">
          Need help? Contact support at{' '}
          <a href="mailto:contact@citeroute.com" className="text-[#05AD98] hover:underline font-semibold">
            contact@citeroute.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#05AD98] border-t-transparent animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
