import { useState, useEffect } from 'react';
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
  const toUrl = `/state/${phc.state.toLowerCase()}/district/${phc.district.toLowerCase()}/phc/${phc.id}`;
  
  // Staggered colors natively crossfade thanks to Tailwind transition utilities
  const isEmergencyActive = phase >= 2;
  const displayScore = isEmergencyActive ? phc.risk_score : (phc._origScore || phc.risk_score);
  const displayBucket = isEmergencyActive ? phc.risk_bucket : (phc._origBucket || phc.risk_bucket);

  let triageColor = 'bg-green-100 text-triage-min border-green-200 text-green-800';
  if (displayBucket === 'Critical') triageColor = 'bg-red-100 text-triage-imm border-red-200 text-red-700';
  else if (displayBucket === 'High') triageColor = 'bg-orange-100 text-triage-urg border-orange-200 text-orange-800';
  else if (displayBucket === 'Medium') triageColor = 'bg-yellow-100 text-triage-del border-yellow-200 text-yellow-800';
  
  // Stagger the crossfade timing exactly to match the number count
  const staggerDelay = phase === 2 ? `${index * 40}ms` : '0ms';

  return (
    <Link to={toUrl} className="group flex items-center justify-between p-4 bg-paper border border-rule rounded-lg hover:border-signal transition-colors shadow-sm hover:shadow">
      <div className="flex items-center space-x-4">
        
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-card border border-rule rounded font-display font-bold text-xl text-ink">
          {/* Phase 2: Animate numbers up, staggered 40ms apart down the list */}
          {phase === 2 && phc._origScore ? (
            <AnimatingTagScore from={phc._origScore} to={phc.risk_score} delay={index * 40} />
          ) : (
            displayScore
          )}
        </div>
        
        <div>
          <h3 className="font-display font-semibold text-ink group-hover:text-signal transition-colors">
            {phc.name}
          </h3>
          <p className="text-sm font-body text-ink-soft">
            {phc.district}, {phc.state}
          </p>
        </div>
        
      </div>
      
      <div 
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border transition-colors duration-500 ${triageColor}`}
        style={{ transitionDelay: staggerDelay }}
      >
        {displayBucket}
      </div>
    </Link>
  );
}
