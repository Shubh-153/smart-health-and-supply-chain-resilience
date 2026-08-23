import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function EmergencyControls({ onTrigger, onReset, phase }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isRecalculating = phase > 0 && phase < 4;
  const isEmergency = phase >= 4;
  const { t } = useTranslation();

  const handleTriggerClick = () => {
    setShowConfirm(true);
  };

  const confirmTrigger = () => {
    setShowConfirm(false);
    onTrigger();
  };

  return (
    <>
      <div className="flex items-center gap-4 bg-paper p-2 rounded-xl shadow-sm">
        <button 
          type="button"
          onClick={handleTriggerClick}
          disabled={isEmergency}
          className={`px-5 py-2.5 font-display font-semibold rounded-lg transition-all flex items-center justify-center min-w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal
            ${isRecalculating 
              ? 'bg-signal text-paper' 
              : isEmergency 
                ? 'bg-triage-imm text-paper opacity-50 cursor-not-allowed'
                : 'bg-signal text-paper hover:opacity-90 shadow-sm hover:shadow'
            }
          `}
        >
          {isRecalculating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('emergencyControls.updating')}
            </span>
          ) : (
            t('emergencyControls.simulate')
          )}
        </button>

        <button 
          type="button"
          onClick={onReset}
          disabled={phase === 0}
          className={`px-4 py-2 font-body font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal
            ${phase === 0
              ? 'text-ink-soft/50 cursor-not-allowed'
              : 'text-ink-soft hover:text-ink hover:bg-slate-100'
            }
          `}
        >
          {t('emergencyControls.reset')}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowConfirm(false)}></div>
          <div className="relative bg-paper rounded-xl shadow-2xl p-6 max-w-sm w-full border border-rule">
            <h3 className="font-display font-bold text-xl text-ink mb-2">{t('emergencyControls.triggerTitle')}</h3>
            <p className="text-sm text-ink-soft mb-6">
              {t('emergencyControls.triggerDesc')}
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-ink-soft hover:text-ink font-medium rounded-md"
              >
                {t('emergencyControls.cancel')}
              </button>
              <button 
                type="button" 
                onClick={confirmTrigger}
                className="px-4 py-2 bg-triage-imm text-paper font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                {t('emergencyControls.triggerBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
