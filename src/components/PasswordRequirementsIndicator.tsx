'use client';

import React from 'react';
import { Check, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  evaluatePasswordCriteria,
  calculatePasswordStrength,
} from '../lib/passwordPolicy';

interface PasswordRequirementsIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordRequirementsIndicator({
  password,
  className = '',
}: PasswordRequirementsIndicatorProps) {
  if (!password) return null;

  const criteria = evaluatePasswordCriteria(password);
  const strength = calculatePasswordStrength(password);

  const requirementItems = [
    { label: 'Min. 8 characters', met: criteria.minLength },
    { label: 'Uppercase letter (A-Z)', met: criteria.hasUppercase },
    { label: 'Lowercase letter (a-z)', met: criteria.hasLowercase },
    { label: 'Numerical digit (0-9)', met: criteria.hasNumber },
    { label: 'Special symbol (!@#$...)', met: criteria.hasSymbol },
  ];

  return (
    <div className={`space-y-2.5 pt-1.5 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-1.5 h-1.5">
          {[1, 2, 3, 4].map((seg) => {
            const isFilled = seg <= strength.score;
            return (
              <div
                key={seg}
                className={`h-full rounded-full transition-all duration-300 ${
                  isFilled ? strength.tailwindBg : 'bg-[#1A2020]'
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] text-[#878787]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#878787]" />
            Security Strength
          </span>
          <span
            className="font-semibold text-xs transition-colors"
            style={{ color: strength.colorHex }}
          >
            {strength.label}
          </span>
        </div>
      </div>

      {/* Blacklist Warning */}
      {!criteria.isNotBlacklisted && (
        <div className="flex items-start gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>This password is too common or easily guessed. Please choose a unique passphrase.</span>
        </div>
      )}

      {/* Criteria Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {requirementItems.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              item.met ? 'text-[#05AD98]' : 'text-[#878787]'
            }`}
          >
            {item.met ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-[#05AD98]" />
            ) : (
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#878787]/50" />
              </div>
            )}
            <span className={item.met ? 'font-medium' : ''}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
