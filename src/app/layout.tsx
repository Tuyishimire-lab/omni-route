import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';
import OnboardingWizard from '../components/OnboardingWizard';


export const metadata: Metadata = {
  title: 'OmniRoute | Autonomous Agent Traffic & GEO Liquidity Protocol',
  description:
    'The real-time Generative Engine Optimization (GEO) and synthetic-to-human traffic routing protocol for the post-search AI economy.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col antialiased" style={{ background: '#0A0E0E', color: '#FFFFFF' }}>

        {/* Skip to main content - WCAG 2.1 AA keyboard nav requirement */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#05AD98] focus:text-white focus:font-bold focus:text-sm"
        >
          Skip to main content
        </a>
        <OnboardingWizard />
        <Navbar />

        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          {children}
        </main>
        
        {/* Modern Glass Footer */}
        <footer className="w-full border-t border-slate-850 bg-[#0A0E0E]/80 py-10 mt-16 text-xs text-[#878787]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wider">OMNI<span className="text-[#05AD98]">ROUTE</span></span>
              <span className="text-slate-600">/</span>
              <span>The Autonomous Traffic & GEO Standard</span>
            </div>
            <div className="flex items-center gap-6 text-[#878787]">
              <a href="/docs" className="hover:text-[#05AD98] transition-colors">Docs</a>
              <a href="/pricing" className="hover:text-[#05AD98] transition-colors">Pricing</a>
              <a href="/about" className="hover:text-[#05AD98] transition-colors">About</a>
            </div>
            <p className="text-[#878787]">© 2026 OmniRoute Protocol. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
