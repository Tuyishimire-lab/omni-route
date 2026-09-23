import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  accentColor?: 'sky' | 'indigo' | 'emerald' | 'amber' | 'purple';
}

export default function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon: Icon,
  accentColor = 'sky'
}: MetricCardProps) {
  const colorMap = {
    sky: 'bg-[#05AD98]',
    indigo: 'bg-[#05AD98]',
    emerald: 'bg-[#05AD98]',
    amber: 'bg-[#B8A04A]',
    purple: 'bg-[#878787]'
  };

  const iconBgMap = {
    sky: 'bg-[rgba(5,173,152,0.10)] text-[#05AD98] border-[rgba(5,173,152,0.2)]',
    indigo: 'bg-[rgba(5,173,152,0.08)] text-[#05AD98] border-[rgba(5,173,152,0.20)]',
    emerald: 'bg-[rgba(5,173,152,0.10)] text-[#05AD98] border-[rgba(5,173,152,0.20)]',
    amber: 'bg-amber-500/10 text-[#B8A04A] border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
      {/* Subtle solid top accent border */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${colorMap[accentColor]}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#878787] uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 tracking-tight font-mono">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl border ${iconBgMap[accentColor]} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[rgba(187,191,191,0.10)]/60">
        {change && (
          <span
            className={`flex items-center gap-1 font-semibold ${
              isPositive ? 'text-[#05AD98]' : 'text-rose-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}
        {subtitle && <span className="text-[#878787]">{subtitle}</span>}
      </div>
    </div>
  );
}
