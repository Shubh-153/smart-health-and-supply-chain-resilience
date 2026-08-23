import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import HelpTooltip from './HelpTooltip';

const COLORS = {
  medicine: 'bg-slate-900', // darkest
  bed: 'bg-slate-700',
  surge: 'bg-slate-500',
  staff: 'bg-slate-300'     // lightest
};

export default function RiskBreakdown({ breakdown }) {
  const { t } = useTranslation();
  const [showCalc, setShowCalc] = useState(false);

  const NAMES = {
    medicine: t('riskBreakdown.medicineTitle', { defaultValue: 'Medicine shortage' }),
    bed: t('riskBreakdown.bedTitle', { defaultValue: 'Bed occupancy' }),
    surge: t('riskBreakdown.surgeTitle', { defaultValue: 'Patient surge' }),
    staff: t('riskBreakdown.staff') + ' ' + t('riskBreakdown.shortage', { defaultValue: 'shortage' })
  };

  const HELP_TEXTS = {
    medicine: t('riskBreakdown.medicineHelp', { defaultValue: "Based on days of medicine supply remaining across all tracked medicines. Weight: 40% of total score." }),
    bed: t('riskBreakdown.bedHelp', { defaultValue: "Based on the ratio of occupied beds to total beds. Weight: 25% of total score." }),
    surge: t('riskBreakdown.surgeHelp', { defaultValue: "Based on predicted patient footfall increase from the 7-day AI forecast. Weight: 20% of total score." }),
    staff: t('riskBreakdown.staffHelp', { defaultValue: "Based on the ratio of present staff to sanctioned positions. Weight: 15% of total score." })
  };

  const segments = Object.entries(breakdown)
    .map(([key, value]) => ({
      key,
      name: NAMES[key] || key,
      value,
      color: COLORS[key] || 'bg-slate-400'
    }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const uncappedTotal = segments.reduce((sum, s) => sum + s.value, 0);
  const scaleMax = Math.max(100, uncappedTotal);
  
  if (segments.length === 0) return null;

  const largest = segments[0];

  return (
    <div className="bg-paper rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-display font-semibold text-ink">{t('riskBreakdown.title', { defaultValue: 'Risk Components' })}</h3>
        <HelpTooltip text={t('riskBreakdown.mainHelp', { defaultValue: "Shows the weighted contribution of four key operational metrics to the total risk score." })} />
      </div>
      
      <div className="relative pt-6 pb-2">
        {uncappedTotal > 100 && (
          <div 
            className="absolute top-0 bottom-0 border-l-[2px] border-dashed border-triage-imm z-10"
            style={{ left: `${(100 / scaleMax) * 100}%` }}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-triage-imm uppercase tracking-widest bg-card px-1 whitespace-nowrap">
              Cap (100)
            </span>
          </div>
        )}

        <div className="flex h-10 rounded-sm overflow-hidden w-full relative bg-rule/30">
          {segments.map((s) => {
            const widthPct = (s.value / scaleMax) * 100;
            return (
              <div
                key={s.key}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${s.color} transition-all duration-500 group relative flex items-center justify-center`}
                title={`${s.name}: ${Math.round(s.value)} pts`}
              >
                {widthPct > 8 && (
                  <span className={`text-xs font-mono font-medium ${s.key === 'staff' || s.key === 'surge' ? 'text-ink' : 'text-paper'}`}>
                    {Math.round(s.value)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-2 text-sm font-body">
            <span className={`w-3 h-3 rounded-sm ${s.color}`}></span>
            <span className="text-ink-soft uppercase tracking-wider text-[11px]">{s.name}:</span>
            <span className="font-semibold text-ink">{Math.round(s.value)}</span>
            <HelpTooltip text={HELP_TEXTS[s.key]} position="top" />
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-rule">
        <p className="text-sm font-body text-ink-soft mb-3">
          <strong className="text-ink">{largest.name}</strong> is the primary driver of this facility's risk score ({Math.round(largest.value)} pts).
        </p>

        <button 
          type="button" 
          onClick={() => setShowCalc(!showCalc)}
          className="text-sm text-signal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded px-1 -ml-1"
        >
          {showCalc ? 'Hide calculation details' : 'How is this calculated?'}
        </button>
        
        {showCalc && (
          <div className="mt-3 p-3 bg-card border border-rule rounded text-xs font-mono text-ink-soft leading-relaxed">
            <p className="mb-2 text-ink font-semibold">Risk = Medicine(40%) + {t('riskBreakdown.beds')}(25%) + Surge(20%) + {t('riskBreakdown.staff')}(15%)</p>
            <ul className="space-y-1">
              <li>Medicine: {Math.round(breakdown.medicine)}/40 pts</li>
              <li>{t('riskBreakdown.beds')}: {Math.round(breakdown.bed)}/25 pts</li>
              <li>Surge: {Math.round(breakdown.surge)}/20 pts</li>
              <li>{t('riskBreakdown.staff')}: {Math.round(breakdown.staff)}/15 pts</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
