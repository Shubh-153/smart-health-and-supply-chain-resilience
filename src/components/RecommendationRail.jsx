import { useState, useEffect } from 'react';
import { getRecommendations, confirmRecommendation } from '../api/client';

export default function RecommendationRail({ districtId, phcId, onConfirmSuccess }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setInitError(false);

    getRecommendations(districtId.charAt(0).toUpperCase() + districtId.slice(1))
      .then(res => {
        if (!isMounted) return;
        const rec = res.find(r => r.destination_phc_id === phcId);
        setRecommendation(rec || null);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setInitError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [districtId, phcId]);

  const handleConfirm = async () => {
    if (!recommendation) return;
    setConfirming(true);
    setErrorMsg(null);
    try {
      const payload = {
        source_phc_id: recommendation.source_phc_id,
        medicine: recommendation.medicine,
        quantity: recommendation.quantity
      };
      const res = await confirmRecommendation(phcId, payload);
      setConfirmed(true);
      if (onConfirmSuccess) {
        onConfirmSuccess(res.after_risk_score);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Transfer request failed. Network issue encountered and no changes were made.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-rule rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-rule rounded w-1/2 mb-4"></div>
        <div className="h-24 bg-rule/50 rounded mb-4"></div>
        <div className="h-10 bg-rule rounded"></div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="bg-paper border border-rule rounded-lg p-6 text-center shadow-sm">
        <h4 className="font-display font-semibold text-ink mb-2">Recommendation Engine Disconnected</h4>
        <p className="text-sm font-body text-ink-soft">
          Unable to retrieve optimization data from the server. Showing zero active transfers.
        </p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-paper border border-rule rounded-lg p-6 text-center shadow-sm">
        <h4 className="font-display font-semibold text-ink mb-2">No Transfers Needed</h4>
        <p className="text-sm font-body text-ink-soft">
          There are currently no active transfer recommendations for this facility. 
          Stock levels are either within safe operational margins, or no nearby surplus exists to facilitate a transfer.
        </p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
        <h4 className="font-display font-semibold text-green-900 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Transfer Scheduled
        </h4>
        <p className="text-sm font-body text-green-800 mb-4">
          Logistics team notified for {recommendation.quantity} units of {recommendation.medicine} from {recommendation.source_phc_id}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-signal rounded-lg p-6 shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-signal"></div>
      
      <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
        Recommended Action
      </h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-baseline border-b border-rule pb-2">
          <span className="text-sm text-ink-soft">Transfer from</span>
          <span className="font-mono font-medium text-ink">{recommendation.source_phc_id}</span>
        </div>
        
        <div className="flex justify-between items-baseline border-b border-rule pb-2">
          <span className="text-sm text-ink-soft">Item & Quantity</span>
          <span className="font-mono font-medium text-ink">
            {recommendation.quantity} × {recommendation.medicine}
          </span>
        </div>
        
        <div className="flex justify-between items-baseline border-b border-rule pb-2">
          <span className="text-sm text-ink-soft">Logistics</span>
          <span className="font-mono font-medium text-ink">
            {recommendation.distance_km} km ({recommendation.travel_time_min} min)
          </span>
        </div>
        
        <div className="flex justify-between items-baseline pt-2">
          <span className="text-sm text-ink-soft">Est. Final Risk</span>
          <div className="flex items-center gap-2 font-mono font-bold">
            <span className="text-signal text-lg">
              {recommendation.post_transfer_risk_score}
            </span>
          </div>
        </div>
      </div>
      
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md font-body">
          {errorMsg}
        </div>
      )}
      
      <button 
        onClick={handleConfirm}
        disabled={confirming}
        className="w-full py-3 bg-signal text-paper font-semibold rounded hover:bg-blue-600 transition-colors disabled:opacity-70 flex justify-center items-center font-body"
      >
        {confirming ? 'Confirming...' : 'Confirm transfer'}
      </button>
    </div>
  );
}
