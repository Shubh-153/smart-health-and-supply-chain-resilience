import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPhcDetail, getPhcStockout, getPhcForecast } from '../api/client';
import RiskBreakdown from '../components/RiskBreakdown';
import ForecastChart from '../components/ForecastChart';
import MedicineTable from '../components/MedicineTable';
import RecommendationRail from '../components/RecommendationRail';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getBucket(score) {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Critical';
}

function getTriageClasses(bucket) {
  if (bucket === 'Critical') return 'bg-triage-imm text-paper';
  if (bucket === 'High') return 'bg-triage-urg text-paper';
  if (bucket === 'Medium') return 'bg-triage-del text-ink';
  return 'bg-green-100 text-triage-min text-green-900';
}

function AnimatingScore({ from, to, duration = 800 }) {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    if (from === to) return;
    
    // Check reduced motion explicitly 
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setCurrent(to);
      return;
    }

    let startTimestamp = null;
    let animationFrame;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const nextVal = Math.round(from + (to - from) * progress);
      setCurrent(nextVal);
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCurrent(to);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [from, to, duration]);

  return <>{current}</>;
}

export default function PhcView() {
  const { stateId, districtId, phcId } = useParams();
  
  const [data, setData] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Interactive Confirmation State
  const [resolvedRiskScore, setResolvedRiskScore] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getPhcDetail(phcId),
      getPhcStockout(phcId).catch(() => []), 
      getPhcForecast(phcId).catch(() => null)
    ])
      .then(([phc, stockouts, forecastData]) => {
        if (!isMounted) return;
        if (!phc) throw new Error('Data not found');
        
        setData(phc);
        setForecast(forecastData);
        
        let maxMedicineRisk = 0;
        if (phc.medicines && phc.medicines.length > 0) {
          phc.medicines.forEach(m => {
            const daysRemaining = m.current_stock / Math.max(m.avg_daily_consumption, 1);
            const r = 40 * clamp(1 - (daysRemaining / 14), 0, 1);
            if (r > maxMedicineRisk) maxMedicineRisk = r;
          });
        }
        
        const bedRisk = 25 * clamp(phc.occupied_beds / phc.total_beds, 0, 1);
        
        const staffPresent = (phc.doctors_present || 0) + (phc.nurses_present || 0);
        const staffSanctioned = (phc.doctors_sanctioned || 0) + (phc.nurses_sanctioned || 0);
        const staffRatio = staffSanctioned > 0 ? (staffPresent / staffSanctioned) : 1;
        const staffRisk = 15 * clamp(1 - staffRatio, 0, 1);
        
        let trendPct = 0;
        if (stockouts && stockouts.length > 0) {
          trendPct = Math.max(...stockouts.map(s => s.trend_pct || 0));
        }
        const surgeRisk = 20 * clamp(trendPct / 50, 0, 1);

        setBreakdown({
          medicine: maxMedicineRisk,
          bed: bedRisk,
          surge: surgeRisk,
          staff: staffRisk
        });
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setError('PHC not found in the simulated dataset.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [phcId]);

  const handleConfirmSuccess = (newScore) => {
    setResolvedRiskScore(newScore);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8 max-w-[1280px] mx-auto">
        <div className="h-10 bg-rule rounded w-1/3"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-64 bg-card border border-rule rounded"></div>
          <div className="lg:col-span-4 h-64 bg-card border border-rule rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 border border-rule bg-card rounded-lg max-w-xl text-center mx-auto mt-12">
        <h2 className="text-xl font-display font-semibold text-ink mb-2">Data Load Failed</h2>
        <p className="text-ink-soft mb-6">
          The requested Primary Health Centre "<strong>{phcId}</strong>" could not be retrieved. Showing an empty facility layout.
        </p>
        <Link to={`/state/${stateId}/district/${districtId}`} className="inline-flex items-center justify-center px-4 py-2 bg-ink text-paper rounded font-medium hover:bg-ink-soft transition-colors">
          Return to District
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 border border-rule bg-card rounded-lg max-w-xl text-center mx-auto mt-12">
        <h2 className="text-xl font-display font-semibold text-ink mb-2">Simulation Data Unavailable</h2>
        <p className="text-ink-soft mb-6">
          The dataset is currently blank for this facility. Showing an empty layout.
        </p>
      </div>
    );
  }

  const currentBucket = resolvedRiskScore ? getBucket(resolvedRiskScore) : data.risk_bucket;
  const triageClasses = getTriageClasses(currentBucket);

  return (
    <div className="max-w-[1280px] mx-auto pb-12 relative">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
        
        {/* Main Content Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-10">
          
          {/* Top Section */}
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            {/* Facility Name & Big Score */}
            <div className="flex flex-col justify-between md:w-1/3 flex-shrink-0">
              <h2 className="text-3xl font-display font-bold text-ink leading-tight mb-4">
                {data.name}
              </h2>
              <div className={`flex-1 rounded-xl flex items-center justify-center p-6 transition-colors duration-800 ${triageClasses}`}>
                
                {resolvedRiskScore && (
                  <span className="text-[40px] leading-none font-bold tracking-tighter opacity-60 line-through mr-4 transition-all">
                    {data.risk_score}
                  </span>
                )}
                
                <span className="text-[72px] leading-none font-bold tracking-tighter">
                  {resolvedRiskScore ? (
                    <AnimatingScore from={data.risk_score} to={resolvedRiskScore} />
                  ) : (
                    data.risk_score
                  )}
                </span>
                
                <span className="text-2xl font-medium opacity-80 ml-1 self-end mb-2">
                  /100
                </span>
              </div>
            </div>
            
            {/* Risk Breakdown Beside It */}
            <div className="flex-grow">
              {breakdown && <RiskBreakdown breakdown={breakdown} />}
            </div>
          </div>
          
          {/* Middle Section: Forecast Chart */}
          <div>
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Patient Footfall Forecast</h3>
            {data.footfall_history_30d && forecast?.footfall_forecast_7d ? (
              <ForecastChart 
                history={data.footfall_history_30d} 
                forecast={forecast.footfall_forecast_7d} 
              />
            ) : (
              <div className="h-80 bg-card border border-rule rounded-lg flex items-center justify-center">
                <span className="text-ink-soft">Forecast data unavailable</span>
              </div>
            )}
          </div>
          
          {/* Below Section: Medicine Table */}
          <div>
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Inventory Status</h3>
            <MedicineTable medicines={data.medicines} />
          </div>
          
        </div>
        
        {/* Right Rail (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-24">
            <RecommendationRail 
              districtId={districtId} 
              phcId={phcId} 
              onConfirmSuccess={handleConfirmSuccess} 
            />
          </div>
        </div>
        
      </div>
      
      {/* Interactive Toast Notification */}
      <div 
        className={`fixed bottom-6 right-6 bg-ink text-paper px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-500 z-50 ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-triage-min"></span>
        <span className="font-medium font-body tracking-wide">Transfer confirmed</span>
      </div>
    </div>
  );
}
