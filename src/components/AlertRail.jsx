import { useState, useEffect, useMemo } from 'react';
import { getAlerts } from '../api/client';
import AlertCard from './AlertCard';

export default function AlertRail({ scope, id, phase = 0 }) {
  const [baselineAlerts, setBaselineAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const districtFilter = scope === 'district' ? id.charAt(0).toUpperCase() + id.slice(1) : '';
    
    getAlerts(districtFilter)
      .then(res => {
        if (!isMounted) return;
        setBaselineAlerts(res);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [scope, id]);

  const displayAlerts = useMemo(() => {
    if (!baselineAlerts) return [];
    
    // Phase 4 (900ms): Inject high-priority surge alerts to simulate the emergency outcome
    if (phase >= 4) {
      return [
        {
          alert_text: "CRITICAL: PHC-02 footfall surging abruptly. ORS stockout projected in <24 hours. Immediate transfer required to stabilize reserve."
        },
        ...baselineAlerts
      ];
    }
    
    return baselineAlerts;
  }, [baselineAlerts, phase]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 w-full bg-card border border-rule animate-pulse rounded-lg"></div>
        <div className="h-48 w-full bg-card border border-rule animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        Alert stream disconnected. Showing zero active alerts.
      </div>
    );
  }

  if (!displayAlerts || displayAlerts.length === 0) {
    return (
      <div className="p-6 border border-rule bg-card rounded-lg text-center text-ink-soft text-sm">
        No active alerts for this {scope}.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 relative overflow-hidden pb-4">
      {displayAlerts.map((alert, idx) => {
        // Slide in the newly injected emergency alert at exactly phase 4
        const isNewEmergency = phase >= 4 && idx === 0;
        
        return (
          <div 
            key={idx} 
            className={`transition-all duration-500 ease-out 
              ${isNewEmergency && phase === 4 ? 'animate-slide-left' : ''}
            `}
          >
            <AlertCard alert={alert} />
          </div>
        );
      })}
    </div>
  );
}
