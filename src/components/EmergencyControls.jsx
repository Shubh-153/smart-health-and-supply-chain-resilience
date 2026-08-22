import React from 'react';

export default function EmergencyControls({ onTrigger, onReset, phase }) {
  const isRecalculating = phase > 0 && phase < 4;
  const isEmergency = phase >= 4;

  return (
    <div className="flex items-center gap-4 bg-card border border-rule p-4 rounded-lg shadow-sm">
      <button 
        onClick={onTrigger}
        disabled={isRecalculating || isEmergency}
        className={`px-5 py-2.5 font-display font-semibold rounded-md transition-all flex items-center justify-center min-w-[200px]
          ${isRecalculating 
            ? 'bg-signal/70 text-paper cursor-wait' 
            : isEmergency 
              ? 'bg-triage-imm text-paper opacity-50 cursor-not-allowed'
              : 'bg-signal text-paper hover:bg-blue-600 shadow-md hover:shadow-lg'
          }
        `}
      >
        {isRecalculating ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Recalculating...
          </span>
        ) : (
          'Simulate emergency'
        )}
      </button>

      <button 
        onClick={onReset}
        disabled={isRecalculating || phase === 0}
        className={`px-4 py-2 font-body font-medium rounded-md transition-colors
          ${phase === 0 || isRecalculating
            ? 'text-ink-soft/50 cursor-not-allowed'
            : 'text-ink-soft hover:text-ink hover:bg-slate-100'
          }
        `}
      >
        Reset network
      </button>
    </div>
  );
}
