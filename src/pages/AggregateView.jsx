import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSummary } from '../api/client';
import SummaryBar from '../components/SummaryBar';
import FacilityList from '../components/FacilityList';
import AlertRail from '../components/AlertRail';
import EmergencyControls from '../components/EmergencyControls';

export default function AggregateView() {
  const { stateId, districtId } = useParams();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Phase 0: Baseline
  // Phase 1: Button locks, "Recalculating" (0ms)
  // Phase 2: Numbers count up, bands crossfade (120ms)
  // Phase 3: FLIP re-sort (600ms)
  // Phase 4: Alerts slide in (900ms)
  const [phase, setPhase] = useState(0);

  let scope = 'india';
  let id = '';
  let parentLink = null;
  let parentLabel = '';
  
  if (districtId) {
    scope = 'district';
    id = districtId;
    parentLink = `/state/${stateId}`;
    parentLabel = `State of ${stateId.charAt(0).toUpperCase() + stateId.slice(1)}`;
  } else if (stateId) {
    scope = 'state';
    id = stateId;
    parentLink = '/';
    parentLabel = 'India (National)';
  }

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setPhase(0);

    getSummary(scope, id)
      .then(res => {
        if (!isMounted) return;
        if (!res) throw new Error('Data not found');
        setData(res);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setError('Location not found in the simulated dataset.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [scope, id]);

  const handleTriggerEmergency = () => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setPhase(4);
      return;
    }
    
    setPhase(1);
    setTimeout(() => setPhase(2), 120);
    setTimeout(() => setPhase(3), 600);
    setTimeout(() => setPhase(4), 900);
  };

  const handleResetEmergency = () => {
    setPhase(0);
  };

  if (error) {
    return (
      <div className="p-8 border border-rule bg-card rounded-lg max-w-xl text-center mx-auto mt-12">
        <h2 className="text-xl font-display font-semibold text-ink mb-2">Data Load Failed</h2>
        <p className="text-ink-soft mb-6">
          The requested {scope} "<strong>{id}</strong>" could not be retrieved from the simulated dataset. Showing an empty dashboard overview.
        </p>
        {parentLink && (
          <Link to={parentLink} className="inline-flex items-center justify-center px-4 py-2 bg-ink text-paper rounded font-medium hover:bg-ink-soft transition-colors">
            Return to {parentLabel}
          </Link>
        )}
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className="p-8 border border-rule bg-card rounded-lg max-w-xl text-center mx-auto mt-12">
        <h2 className="text-xl font-display font-semibold text-ink mb-2">Dataset Unavailable</h2>
        <p className="text-ink-soft mb-6">
          The overview dataset for this location is empty. Showing a blank dashboard shell.
        </p>
        {parentLink && (
          <Link to={parentLink} className="inline-flex items-center justify-center px-4 py-2 bg-ink text-paper rounded font-medium hover:bg-ink-soft transition-colors">
            Return to {parentLabel}
          </Link>
        )}
      </div>
    );
  }

  const title = scope === 'india' 
    ? 'National Summary' 
    : `${id.charAt(0).toUpperCase() + id.slice(1)} Summary`;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink mb-1">{title}</h2>
          <p className="text-ink-soft font-body text-sm">Aggregated metrics and facility status.</p>
        </div>
        
        <EmergencyControls 
          phase={phase} 
          onTrigger={handleTriggerEmergency} 
          onReset={handleResetEmergency} 
        />
      </div>
      
      <div>
        <SummaryBar data={data} loading={loading} />
      </div>
      
      <div className="max-w-[1280px] mx-auto mt-4">
        <div className="flex flex-col min-[900px]:grid min-[900px]:grid-cols-12 gap-8">
          
          <div className="min-[900px]:col-span-8 order-2 min-[900px]:order-1">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Facilities</h3>
            <FacilityList scope={scope} id={id} phase={phase} />
          </div>
          
          <div className="min-[900px]:col-span-4 order-1 min-[900px]:order-2">
            <div className="sticky top-24">
              <h3 className="text-lg font-display font-semibold text-ink mb-4">Active Alerts</h3>
              <AlertRail scope={scope} id={id} phase={phase} />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
