import React from 'react';

interface CupertinoMetricCardProps {
  title: string;
  value: string;
  unit?: string;
  deltaText?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  footerText?: string;
}

export const CupertinoMetricCard: React.FC<CupertinoMetricCardProps> = ({
  title,
  value,
  unit,
  deltaText,
  deltaType = 'neutral',
  icon,
  footerText
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-2px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon && (
          <span className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
      </div>

      {deltaText && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
          {deltaType === 'positive' && (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {deltaText}
            </span>
          )}
          {deltaType === 'negative' && (
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              {deltaText}
            </span>
          )}
          {deltaType === 'neutral' && (
            <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              {deltaText}
            </span>
          )}
        </div>
      )}

      {footerText && (
        <p className="text-[11px] text-slate-400 mt-2 font-medium">{footerText}</p>
      )}
    </div>
  );
};
