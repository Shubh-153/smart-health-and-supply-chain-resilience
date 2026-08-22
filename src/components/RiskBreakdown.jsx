import React from 'react';

const NAMES = {
  medicine: 'Medicine shortage',
  bed: 'Bed occupancy',
  surge: 'Patient surge',
  staff: 'Staff shortage'
};

const COLORS = {
  medicine: 'bg-slate-900', // darkest
  bed: 'bg-slate-700',
  surge: 'bg-slate-500',
  staff: 'bg-slate-300'     // lightest
};

export default function RiskBreakdown({ breakdown }) {
  const segments = Object.entries(breakdown)
    .map(([key, value]) => ({
      key,
      name: NAMES[key] || key,
      value,
      color: COLORS[key] || 'bg-slate-400'
    }))
    .filter(s => s.value > 0)
    // Sort descending by value to make the largest chunk first
    .sort((a, b) => b.value - a.value);

  const uncappedTotal = segments.reduce((sum, s) => sum + s.value, 0);
  const scaleMax = Math.max(100, uncappedTotal);
  
  // Guard against empty state
  if (segments.length === 0) return null;

  const largest = segments[0];

  return (
    <div className="bg-card border border-rule rounded-lg p-6">
      <h3 className="text-lg font-display font-semibold text-ink mb-6">Risk Components</h3>
      
      <div className="relative pt-6 pb-2">
        {/* Show the cap honestly rather than silently rescaling */}
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
                {/* If the segment is wide enough, show the value inside */}
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
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-rule">
        <p className="text-sm font-body text-ink-soft">
          <strong className="text-ink">{largest.name}</strong> is the primary driver of this facility's risk score ({Math.round(largest.value)} pts).
        </p>
      </div>
    </div>
  );
}
