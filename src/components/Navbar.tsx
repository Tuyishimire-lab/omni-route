'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, Menu, X, Key } from 'lucide-react';
import ApiSettingsModal from './ApiSettingsModal';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'GEO Scanner', href: '/audit' },
  { name: 'Watchlist', href: '/watchlist' },
  { name: 'Benchmark', href: '/benchmark' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'agent.json', href: '/manifest' },
  { name: 'Sandbox', href: '/simulator' },
  { name: 'Analytics', href: '/analytics' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

            <Link
              href="/audit"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-opacity"
              style={{ background: 'linear-gradient(135deg, #05AD98, #038a79)', color: '#ffffff', boxShadow: '0 2px 12px rgba(5,173,152,0.2)' }}
            >
              Audit Site
            </Link>

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
              <Link
                href="/audit"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #05AD98, #038a79)', color: '#ffffff' }}
              >
                Audit Site
              </Link>
            </div>
          </div>
        )}
      </header>

      <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
