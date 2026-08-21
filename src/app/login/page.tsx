'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(errorParam ? 'OAuth login failed. Please try again.' : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98] mx-auto">
            <LogIn className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome Back</h1>
          <p className="text-xs text-[#878787]">Sign in to your OmniRoute account</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-[#1A2020] border border-[rgba(187,191,191,0.15)] text-sm font-semibold text-[#BBBFBF] hover:text-white hover:border-[rgba(187,191,191,0.3)] transition-all"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          <a
            href="/api/auth/github"
            className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-[#1A2020] border border-[rgba(187,191,191,0.15)] text-sm font-semibold text-[#BBBFBF] hover:text-white hover:border-[rgba(187,191,191,0.3)] transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Continue with GitHub
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[rgba(187,191,191,0.12)]" />
          <span className="text-[10px] text-[#878787] uppercase tracking-wider font-semibold">or</span>
          <div className="flex-1 h-px bg-[rgba(187,191,191,0.12)]" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <div>
            <label className="text-xs text-[#878787] block mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#05AD98] placeholder-[#878787]/50"
            />
          </div>

          <div>
            <label className="text-xs text-[#878787] block mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#05AD98] placeholder-[#878787]/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-[#878787]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#05AD98] hover:underline font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#05AD98] border-t-transparent animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
