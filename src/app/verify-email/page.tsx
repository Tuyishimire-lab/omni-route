'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Lock } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const verifiedParam = searchParams.get('verified') === '1';
  const initialErrorParam = searchParams.get('error') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(Boolean(tokenParam));
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialErrorParam);
  const [isSuccess, setIsSuccess] = useState(verifiedParam);

  // If token is provided directly in URL query, verify via GET redirect/fetch
  useEffect(() => {
    if (tokenParam) {
      setIsVerifyingToken(true);
      setError(null);
      // Directly navigate to API GET endpoint for standard cookie assignment and redirect
      window.location.href = `/api/auth/verify-email?token=${encodeURIComponent(tokenParam)}`;
    }
  }, [tokenParam]);

  // Pre-fill email from auth state if not in URL params
  useEffect(() => {
    if (!email) {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((d) => {
          if (d?.user?.email) {
            setEmail(d.user.email);
            if (d.user.emailVerified) {
              setIsSuccess(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [email]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmittingCode(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_code',
          email,
          code: trimmedCode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to verify code. Please try again.');
        return;
      }

      setIsSuccess(true);
      setStatusMessage('Account activated successfully.');
    } catch {
      setError('Network error during verification. Please try again.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setError(null);
    setStatusMessage(null);

    if (!email || !email.includes('@')) {
      setError('A valid email address is required to resend verification.');
      return;
    }

    setIsResending(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to resend verification link.');
        return;
      }

      setStatusMessage(data.message || 'A fresh verification link and 6-digit code have been dispatched to your inbox.');
      setResendCooldown(60); // 60 seconds cooldown
    } catch {
      setError('Network error while requesting verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
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
            <h1 className="text-2xl font-extrabold text-white">Email Verification</h1>
            <p className="text-xs text-[#878787] mt-1">Activate your CiteRoute enterprise account</p>
          </div>
        </div>

        {/* Verification Card */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.12)] space-y-5 shadow-2xl">
          {isVerifyingToken ? (
            <div className="text-center py-8 space-y-4">
              <RefreshCw className="w-8 h-8 text-[#05AD98] animate-spin mx-auto" />
              <p className="text-sm font-medium text-white">Validating verification token...</p>
              <p className="text-xs text-[#878787]">Activating account and establishing session</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#05AD98]/15 border border-[#05AD98]/30 flex items-center justify-center mx-auto text-[#05AD98]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">Account Activated</h2>
                <p className="text-xs text-[#878787] leading-relaxed">
                  Your email address has been verified successfully. You have unlocked full platform access to AI citation audits, site monitoring, and API keys.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push('/my-sites');
                  router.refresh();
                }}
                className="w-full py-3 rounded-xl bg-[#05AD98] hover:bg-[#038a79] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[rgba(5,173,152,0.25)] transition-colors cursor-pointer"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.08)]">
                <MailCheck className="w-5 h-5 text-[#05AD98] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-white block">Verification Link Dispatched</span>
                  <span className="text-[#878787] block leading-relaxed">
                    We sent a tokenized verification link and 6-digit code to{' '}
                    <strong className="text-white font-mono">{email || 'your email'}</strong>.
                  </span>
                </div>
              </div>

              {/* Manual 6-Digit Code Entry Form */}
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="text-xs text-[#878787] block mb-1.5 flex items-center gap-1.5 font-medium">
                    <Lock className="w-3 h-3" /> Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="······"
                    maxLength={6}
                    required
                    className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[8px] text-white focus:outline-none focus:border-[#05AD98] placeholder-[#878787]/30 font-bold"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {statusMessage && (
                  <div className="flex items-start gap-2 text-xs text-[#05AD98] bg-[#05AD98]/10 border border-[#05AD98]/30 rounded-xl p-3">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingCode || code.length !== 6}
                  className="w-full py-3 rounded-xl bg-[#05AD98] hover:bg-[#038a79] text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgba(5,173,152,0.2)] cursor-pointer"
                >
                  {isSubmittingCode ? 'Verifying...' : 'Verify Code & Activate'}
                </button>
              </form>

              {/* Resend Action */}
              <div className="pt-3 border-t border-[rgba(187,191,191,0.08)] flex items-center justify-between text-xs">
                <span className="text-[#878787]">Did not receive an email?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="text-[#05AD98] hover:underline font-semibold disabled:opacity-50 disabled:no-underline transition-opacity"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : isResending ? 'Sending...' : 'Resend Link'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#878787]">
          Need help? Contact{' '}
          <a href="mailto:contact@citeroute.com" className="text-[#05AD98] hover:underline font-medium">
            contact@citeroute.com
          </a>
        </p>
      </div>
    </div>
  );
}
