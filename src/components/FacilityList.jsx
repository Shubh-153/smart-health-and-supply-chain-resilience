import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPhcs } from '../api/client';
import TriageTag from './TriageTag';
import DataGrid from './DataGrid';

const RANDOM_SEED = 42;
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getSeededRandom(idStr) {
  let seed = RANDOM_SEED;
  for (let i = 0; i < idStr.length; i++) {
    seed += idStr.charCodeAt(i);
  }
  return mulberry32(seed)();
}

export default function FacilityList({ scope, id, phase }) {
  const { t } = useTranslation();
  const [baselinePhcs, setBaselinePhcs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('aarogya-view-mode') || 'cards';
  });

  const listRef = useRef(null);
  const [positions, setPositions] = useState({});

  useEffect(() => {
    localStorage.setItem('aarogya-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const districtFilter = scope === 'district' ? id.charAt(0).toUpperCase() + id.slice(1) : '';
    
    getPhcs(districtFilter)
      .then(res => {
        if (!isMounted) return;
        
        let filtered = res;
        if (scope === 'state') {
           filtered = res.filter(p => p.state.toLowerCase() === id.toLowerCase());
        }
        
        // A triage list that sorts by name has forgotten its job. 
        // Always sort by risk_score descending. No user sort control.
        filtered.sort((a, b) => b.risk_score - a.risk_score);
        
        setBaselinePhcs(filtered);
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

  const emergencyPhcs = useMemo(() => {
    if (!baselinePhcs) return [];
    return baselinePhcs.map(p => {
      // Deterministically mutate the scores to simulate the emergency math globally.
      // E.g., PHC-02 gets a severe surge to climb past the top.
      let boost = p.id === 'PHC-02' ? 38 : (getSeededRandom(p.id) * 15 + 5);
      const newScore = Math.min(100, Math.round(p.risk_score + boost));
      
      let bucket = 'Low';
      if (newScore > 80) bucket = 'Critical';
      else if (newScore > 60) bucket = 'High';
      else if (newScore > 30) bucket = 'Medium';
      
      return { 
        ...p, 
        risk_score: newScore, 
        risk_bucket: bucket, 
        _origScore: p.risk_score, 
        _origBucket: p.risk_bucket 
      };
    });
  }, [baselinePhcs]);

  // Determine what data to render and in what order based on strict timeline phases
  const displayPhcs = useMemo(() => {
    if (!baselinePhcs) return [];
    
    if (phase < 2) {
      return baselinePhcs; // Baseline data, ordered by baseline score
    } 
    else if (phase === 2) {
      // Numbers are animating up, but list MUST NOT re-sort yet. 
      // Keep baseline DOM order but pass the emergency models down so components animate to target.
      return [...emergencyPhcs].sort((a, b) => b._origScore - a._origScore);
    } 
    else {
      // Phase 3 and 4: Re-sort by the NEW emergency score to trigger FLIP transitions
      return [...emergencyPhcs].sort((a, b) => b.risk_score - a.risk_score);
    }
  }, [baselinePhcs, emergencyPhcs, phase]);

  // FLIP Transition logic triggered whenever the rendered array changes (phase 3)
  useLayoutEffect(() => {
    const nodes = listRef.current?.childNodes;
    if (!nodes) return;
    
    // Read new DOM positions
    const newPositions = {};
    nodes.forEach(node => {
      if (node.dataset?.id) {
        newPositions[node.dataset.id] = node.getBoundingClientRect();
      }
    });

    // Animate from old positions
    nodes.forEach(node => {
      const id = node.dataset?.id;
      const oldRect = positions[id];
      const newRect = newPositions[id];
      
      if (oldRect && newRect) {
        const dy = oldRect.top - newRect.top;
        if (dy !== 0) {
          // Invert
          node.style.transform = `translateY(${dy}px)`;
          node.style.transition = 'none';
          
          // Play
          requestAnimationFrame(() => {
            node.style.transform = '';
            node.style.transition = 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)';
          });
        }
      }
    });
    
    setPositions(newPositions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPhcs]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-[82px] w-full bg-card border border-rule animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        {t('facilityList.error')}
      </div>
    );
  }

  if (!baselinePhcs || baselinePhcs.length === 0) {
    return (
      <div className="p-8 border border-rule bg-card rounded-lg text-center text-ink-soft">
        {t('facilityList.empty', { scope })}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 relative">
      <div className="justify-end hidden md:flex">
        <div className="inline-flex bg-rule/50 rounded-lg p-1 border border-rule">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'cards' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            onClick={() => setViewMode('cards')}
          >
            Cards
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="hidden md:block">
          <DataGrid phcs={displayPhcs} />
        </div>
      ) : null}

      <div className={`flex flex-col space-y-3 relative ${viewMode === 'grid' ? 'md:hidden' : ''}`} ref={listRef}>
        {displayPhcs.map((phc, idx) => (
          <div key={phc.id} data-id={phc.id} className="relative bg-paper z-10">
            <TriageTag phc={phc} phase={phase} index={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}
