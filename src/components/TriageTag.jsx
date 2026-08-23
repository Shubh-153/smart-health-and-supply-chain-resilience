import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateStateName, translateDistrictName, translateFacilityName } from '../i18n/dataLocalization';
import { Link } from 'react-router-dom';

function AnimatingTagScore({ from, to, delay = 0 }) {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    // Standard baseline OR reduced motion abort
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (from === to || isReduced) {
      setCurrent(to);
      return;
    }

    let animationFrame;
    let startTimestamp = null;
    
    // Obey the precise sequence stagger timing 
    const timeoutId = setTimeout(() => {
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / 400, 1);
        
        const nextVal = Math.round(from + (to - from) * progress);
        setCurrent(nextVal);
        
        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(step);
        } else {
          setCurrent(to);
        }
      };
      
      animationFrame = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [from, to, delay]);

  return <>{current}</>;
}

export default function TriageTag({ phc, phase = 0, index = 0 }) {
  const { t } = useTranslation();
  const toUrl = `/state/${phc.state.toLowerCase()}/district/${phc.district.toLowerCase()}/phc/${phc.id}`;
  
  // Staggered colors natively crossfade thanks to Tailwind transition utilities
  const isEmergencyActive = phase >= 2;
  const displayScore = isEmergencyActive ? phc.risk_score : (phc._origScore || phc.risk_score);
  const displayBucket = isEmergencyActive ? phc.risk_bucket : (phc._origBucket || phc.risk_bucket);

  let triageColor = 'bg-green-100 border-green-200 text-green-800';
  if (displayBucket === 'Critical') triageColor = 'bg-red-100 text-triage-imm border-red-200 text-red-700';
  else if (displayBucket === 'High') triageColor = 'bg-orange-100 text-triage-urg border-orange-200 text-orange-800';
  else if (displayBucket === 'Medium') triageColor = 'bg-yellow-100 text-triage-del border-yellow-200 text-yellow-800';
  
  // Stagger the crossfade timing exactly to match the number count
  const staggerDelay = phase === 2 ? `${index * 40}ms` : '0ms';

  return (
    <Link to={toUrl} className="group flex items-center justify-between p-4 bg-paper rounded-xl hover:shadow-md transition-shadow shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
      <div className="flex items-center space-x-4">
        
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-card rounded-lg font-display font-bold text-xl text-ink">
          {/* Phase 2: Animate numbers up, staggered 40ms apart down the list */}
          {phase === 2 && phc._origScore ? (
            <AnimatingTagScore from={phc._origScore} to={phc.risk_score} delay={index * 40} />
          ) : (
            displayScore
          )}
        </div>
        
        <div>
          <h3 className="font-display font-semibold text-ink group-hover:text-signal transition-colors">
            {translateFacilityName(phc, i18n.resolvedLanguage)}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-body text-ink-soft">
              {translateDistrictName(phc.district, i18n.resolvedLanguage)}, {translateStateName(phc.state, i18n.resolvedLanguage)}
            </p>
            {phc.total_beds !== undefined && (
              <>
                <span className="w-1 h-1 rounded-full bg-rule"></span>
                <p className="text-xs font-mono text-ink-soft flex items-center gap-1" title="Occupied / Total Beds">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                  {phc.occupied_beds}/{phc.total_beds}
                </p>
              </>
            )}
            {phc.doctors_sanctioned !== undefined && (
              <>
                <span className="w-1 h-1 rounded-full bg-rule"></span>
                <p className="text-xs font-mono text-ink-soft flex items-center gap-1" title="Staff Availability">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  {Math.round(((phc.doctors_present + phc.nurses_present) / (phc.doctors_sanctioned + phc.nurses_sanctioned)) * 100)}%
                </p>
              </>
            )}
          </div>
        </div>
        
      </div>
      
      <div 
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border transition-colors duration-500 ${triageColor}`}
        style={{ transitionDelay: staggerDelay }}
      >
        {t(`triage.${displayBucket.toLowerCase()}`)}
      </div>
    </Link>
  );
}
