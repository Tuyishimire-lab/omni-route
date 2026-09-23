'use client';

import React, { useState } from 'react';
import { Crown, X, CheckCircle2, Loader2, Send } from 'lucide-react';

interface EnterpriseInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEAM_SIZES = [
  '10-50 employees',
  '51-200 employees',
  '201-1,000 employees',
  '1,000+ employees',
];

export default function EnterpriseInquiryModal({ isOpen, onClose }: EnterpriseInquiryModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [teamSize, setTeamSize] = useState(TEAM_SIZES[1]);
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/enterprise/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          product: 'Enterprise Custom Plan',
          industry: teamSize,
          deliveryFormat: 'Enterprise Contract & SLA',
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit enterprise inquiry');
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred while submitting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0D1312] border border-[rgba(184,160,74,0.30)] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 text-[#878787] hover:text-white transition-colors p-1"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(5,173,152,0.15)] border border-[rgba(5,173,152,0.3)] text-[#05AD98] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Inquiry Received</h3>
              <p className="text-xs text-[#BBBFBF] max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{name}</strong>. Our enterprise team has logged your requirements for <strong className="text-[#B8A04A]">{company}</strong>. We will contact you at <strong className="text-white">{email}</strong> within 24 hours.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-[#B8A04A] hover:bg-[#a68e3c] text-black font-bold text-xs shadow-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(184,160,74,0.12)] text-[#B8A04A] border border-[rgba(184,160,74,0.25)] text-[10px] font-extrabold uppercase">
                <Crown className="w-3 h-3" />
                Enterprise Solutions
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Contact Enterprise Sales
              </h3>
              <p className="text-xs text-[#878787]">
                Custom site volume, bespoke integrations, enterprise security compliance, and dedicated SLA guarantees.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Website URL</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="acme.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Organization Size</label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                >
                  {TEAM_SIZES.map((size) => (
                    <option key={size} value={size} className="bg-[#0D1312] text-white">
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">
                  Project Requirements & Goals
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about the number of sites to verify, custom API volume, SLA requirements, or specific security needs..."
                  className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#878787] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#B8A04A] hover:bg-[#a68e3c] text-black font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
