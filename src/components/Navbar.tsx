'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Network, Menu, X, Key, LogIn, LogOut, Shield, ChevronDown, User } from 'lucide-react';
import ApiSettingsModal from './ApiSettingsModal';

interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  avatarUrl?: string | null;
}

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'GEO Scanner', href: '/audit' },
  { name: 'Watchlist', href: '/watchlist' },
  { name: 'Benchmark', href: '/benchmark' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'agent.json', href: '/manifest' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Docs', href: '/docs' },
  { name: 'Pricing', href: '/pricing' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null));
  }, [pathname]); // re-check on route change

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setIsUserMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="w-full border-b" style={{ borderColor: 'rgba(187,191,191,0.12)', background: 'rgba(10,14,14,0.95)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg p-[1.5px] transition-shadow" style={{ background: 'linear-gradient(135deg, #05AD98, #038a79)', boxShadow: '0 0 12px rgba(5,173,152,0.2)' }}>
              <div className="w-full h-full rounded-[6px] flex items-center justify-center" style={{ background: '#0A0E0E' }}>
                <Network className="w-4 h-4" style={{ color: '#05AD98' }} />
              </div>
            </div>
            <span className="font-extrabold text-base tracking-tight" style={{ color: '#FFFFFF' }}>
              OMNI<span style={{ color: '#05AD98' }}>ROUTE</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? '#05AD98' : '#BBBFBF',
                    background: isActive ? 'rgba(5,173,152,0.10)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#BBBFBF'; }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Configure API Keys"
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#878787' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#05AD98'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#878787'}
            >
              <Key className="w-4 h-4" />
            </button>

            {/* Auth-aware section */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all hover:bg-[rgba(187,191,191,0.06)]"
                >
                  {/* Avatar */}
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-7 h-7 rounded-full border border-[rgba(5,173,152,0.3)]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#05AD98] to-[#038a79] flex items-center justify-center text-[10px] font-bold text-white">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className="hidden sm:block text-xs text-[#BBBFBF] font-medium max-w-[80px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#878787]" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[rgba(187,191,191,0.12)] overflow-hidden z-50"
                    style={{ background: '#111514', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-[rgba(187,191,191,0.08)]">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-[#878787] font-mono truncate">{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.25)]">
                          {user.tier.toUpperCase()}
                        </span>
                        {user.role === 'admin' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(184,160,74,0.10)] text-[#B8A04A] border border-[rgba(184,160,74,0.25)]">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#BBBFBF] hover:text-white hover:bg-[rgba(187,191,191,0.06)] transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#B8A04A]" />
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#BBBFBF] hover:text-rose-400 hover:bg-[rgba(244,63,94,0.06)] transition-colors w-full text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#BBBFBF] hover:text-white transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #05AD98, #038a79)', color: '#ffffff', boxShadow: '0 2px 12px rgba(5,173,152,0.2)' }}
                >
                  Get Started
                </Link>
              </div>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#BBBFBF' }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden px-4 py-3 space-y-1" style={{ borderTop: '1px solid rgba(187,191,191,0.10)', background: '#0A0E0E' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: isActive ? '#05AD98' : '#BBBFBF', background: isActive ? 'rgba(5,173,152,0.10)' : 'transparent' }}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => { setIsMobileMenuOpen(false); setIsSettingsOpen(true); }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
                style={{ color: '#BBBFBF', background: '#1A2020', border: '1px solid rgba(187,191,191,0.12)' }}
              >
                <Key className="w-3.5 h-3.5" style={{ color: '#05AD98' }} /> Configure API Keys
              </button>

              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-[rgba(5,173,152,0.3)]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#05AD98] to-[#038a79] flex items-center justify-center text-xs font-bold text-white">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-[#878787] font-mono">{user.email}</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
                      style={{ color: '#B8A04A', background: 'rgba(184,160,74,0.08)', border: '1px solid rgba(184,160,74,0.20)' }}
                    >
                      <Shield className="w-3.5 h-3.5" /> Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-rose-400"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.20)' }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                    style={{ color: '#BBBFBF', background: '#1A2020', border: '1px solid rgba(187,191,191,0.12)' }}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #05AD98, #038a79)', color: '#ffffff' }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
