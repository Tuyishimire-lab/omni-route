'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, ArrowRight, ShieldCheck, Loader2, X } from 'lucide-react';

interface EmailGateModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  /** When set (e.g. from EMAIL_EXPIRED), skip the email-entry step and auto-send a new code. */
  initialEmail?: string;
}

type Step = 'email' | 'code';

export default function EmailGateModal({ open, onClose, onVerified, initialEmail }: EmailGateModalProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus email input on open
  useEffect(() => {
    if (open && step === 'email') {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [open, step]);

  // When opened with a pre-filled email (re-verification), auto-send the code
  useEffect(() => {
    if (open && initialEmail) {
      setEmail(initialEmail);
      // Trigger code send immediately — skips the email-entry step
      const sendCode = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/v1/verify-email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: initialEmail.trim().toLowerCase() }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setStep('code');
            setCode(['', '', '', '', '', '']);
          } else {
            setError(data.error || 'Failed to send code. Try again.');
          }
        } catch {
          setError('Network error. Please check your connection.');
        } finally {
          setLoading(false);
        }
      };
      sendCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEmail]);

  // Focus first code input when switching to code step
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleSendCode = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/verify-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('code');
        setCode(['', '', '', '', '', '']);
      } else {
        setError(data.error || 'Failed to send code. Try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleVerifyCode = useCallback(async (finalCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: finalCode }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onVerified();
      } else {
        setError(data.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [email, onVerified]);

  const handleCodeChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    setCode(prev => {
      const next = [...prev];
      next[index] = digit;

      // Auto-submit when all 6 digits are filled
      if (digit && index === 5) {
        const fullCode = next.join('');
        if (fullCode.length === 6) {
          setTimeout(() => handleVerifyCode(fullCode), 50);
        }
      }

      return next;
    });

    // Auto-advance to next input
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }, [handleVerifyCode]);

  const handleCodeKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }, [code]);

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);

    if (pasted.length === 6) {
      setTimeout(() => handleVerifyCode(pasted), 50);
    } else {
      codeInputRefs.current[pasted.length]?.focus();
    }
  }, [handleVerifyCode]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[rgba(5,173,152,0.2)] overflow-hidden"
        style={{
          backgroundColor: '#0D1313',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(5, 173, 152, 0.08)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#878787] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-[rgba(187,191,191,0.08)]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: 'rgba(5,173,152,0.1)', border: '1px solid rgba(5,173,152,0.2)' }}
          >
            {step === 'email' ? (
              <Mail className="w-7 h-7 text-[#05AD98]" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-[#05AD98]" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            {step === 'email'
              ? (initialEmail ? 'Re-verify your email' : 'Verify your email')
              : 'Enter verification code'}
          </h2>
          <p className="text-sm text-[#878787]">
            {step === 'email'
              ? (initialEmail
                ? 'Your previous verification expired. We\'ll send a new code.'
                : 'We need your email to run a free GEO scan.')
              : (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="text-[#05AD98] font-medium">{email}</span>
                </>
              )
            }
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {step === 'email' ? (
            <form onSubmit={handleSendCode}>
              <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.10)] focus-within:border-[rgba(5,173,152,0.4)] transition-colors">
                <Mail className="w-5 h-5 text-[#878787] shrink-0" />
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <p className="mt-3 text-xs text-rose-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="mt-5 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send verification code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              {/* 6-digit code inputs */}
              <div className="flex items-center justify-center gap-2.5">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeInputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
                    className="w-12 h-14 text-center text-xl font-bold text-white bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.12)] focus:border-[#05AD98] focus:ring-1 focus:ring-[rgba(5,173,152,0.3)] focus:outline-none transition-all"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {error && (
                <p className="mt-3 text-xs text-rose-400 text-center">{error}</p>
              )}

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#878787]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#05AD98]" />
                  <span>Verifying...</span>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between text-xs text-[#878787]">
                <button
                  onClick={() => { setStep('email'); setError(null); setCode(['', '', '', '', '', '']); }}
                  className="hover:text-white transition-colors"
                >
                  ← Change email
                </button>
                <button
                  onClick={() => handleSendCode()}
                  disabled={loading}
                  className="text-[#05AD98] hover:text-[#38d9c6] transition-colors disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-[#64748B]">
            Already have an account?{' '}
            <a href="/login" className="text-[#05AD98] hover:text-[#38d9c6] transition-colors font-medium">
              Sign in
            </a>
          </p>
          <p className="mt-2 text-[10px] text-[#475569] leading-relaxed">
            Your email is used only for scan verification and optional product updates. No spam.
          </p>
        </div>
      </div>
    </div>
  );
}
