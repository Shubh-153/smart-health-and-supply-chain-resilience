import { useState, useEffect } from 'react';
import { getRecommendations, confirmRecommendation } from '../api/client';
import { useTranslation } from 'react-i18next';
import { translateMedicineName } from '../i18n/dataLocalization';

export default function RecommendationRail({ districtId, phcId, onConfirmSuccess }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const { t, i18n } = useTranslation();
  
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

  const [undoTimer, setUndoTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const [finalized, setFinalized] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    let interval;
    if (confirmed && !finalized && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [confirmed, finalized, timeLeft]);

  const handleConfirm = () => {
    if (!recommendation) return;
    setConfirming(true);
    setErrorMsg(null);
    setConfirmed(true);
    setTimeLeft(5);

    const timer = setTimeout(async () => {
      try {
        const payload = {
          source_phc_id: recommendation.source_phc_id,
          medicine: recommendation.medicine,
          quantity: recommendation.quantity
        };
        const res = await confirmRecommendation(recommendation.id, payload);
        if (onConfirmSuccess) {
          onConfirmSuccess(res.after_risk_score);
        }
        setFinalized(true);
      } catch (err) {
        console.error(err);
        setConfirmed(false);
        setConfirming(false);
        setApiFailed(true);
        setErrorMsg('Transfer request failed. Network issue encountered.');
      }
    }, 5000);

    setUndoTimer(timer);
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setConfirmed(false);
    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="bg-paper shadow-sm rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-rule rounded w-1/2 mb-4"></div>
        <div className="h-24 bg-rule/50 rounded mb-4"></div>
        <div className="h-10 bg-rule rounded"></div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="bg-paper rounded-xl p-6 text-center shadow-sm">
        <h4 className="font-display font-semibold text-ink mb-2">{t("recommendationRail.networkError")}</h4>
        <p className="text-sm font-body text-ink-soft">
          {t('recommendationRail.error')}
        </p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-paper rounded-xl p-6 text-center shadow-sm">
        <h4 className="font-display font-semibold text-ink mb-2">{t("recommendationRail.emptyTransfers")}</h4>
        <p className="text-sm font-body text-ink-soft">
          {t('recommendationRail.empty')}
        </p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="bg-green-50 rounded-xl p-6 shadow-sm border border-green-200">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-display font-semibold text-green-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {finalized ? t("recommendationRail.transferFinalized") : t("recommendationRail.transferQueued")}
          </h4>
          {!finalized && (
            <button 
              onClick={handleUndo}
              className="text-sm font-bold text-green-700 hover:text-green-900 underline underline-offset-2"
            >
              {t("recommendationRail.undo", { timeLeft })}
            </button>
          )}
        </div>
        <p className="text-sm font-body text-green-800 mb-4">
          {finalized ? t("recommendationRail.notifiedFinalized", { quantity: recommendation.quantity, medicine: translateMedicineName(recommendation.medicine, i18n.resolvedLanguage), source: recommendation.source_phc_id }) : t("recommendationRail.notifiedQueued", { quantity: recommendation.quantity, medicine: translateMedicineName(recommendation.medicine, i18n.resolvedLanguage), source: recommendation.source_phc_id })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-xl p-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-signal"></div>
      
      <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
        {t('recommendationRail.title')}
      </h3>

      <div className="bg-card rounded-lg p-4 mb-6">
        <span className="text-xs font-bold text-ink-soft uppercase tracking-widest block mb-3">{t('recommendationRail.riskReductionTitle')}</span>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-ink-soft mb-1">{recommendation.source_phc_id}</div>
            <div className="font-mono text-2xl text-triage-urg font-bold flex items-center gap-2">
              <span className="opacity-50 line-through text-lg text-ink-soft">{recommendation.source_risk_before || 12}</span>
              {recommendation.source_risk_after || 18}
            </div>
          </div>
          <div className="text-rule px-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </div>
          <div className="text-right">
            <div className="text-sm text-ink-soft mb-1">{t("recommendationRail.destination")}</div>
            <div className="font-mono text-2xl text-triage-min font-bold">
              {recommendation.post_transfer_risk_score}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-baseline border-b border-rule pb-2">
          <span className="text-sm text-ink-soft">{t("recommendationRail.itemQuantity")}</span>
          <span className="font-mono font-medium text-ink">
            {recommendation.quantity} × {translateMedicineName(recommendation.medicine, i18n.resolvedLanguage)}
          </span>
        </div>
        
        <div className="flex justify-between items-baseline border-b border-rule pb-2">
          <span className="text-sm text-ink-soft">{t("recommendationRail.logistics")}</span>
          <span className="font-mono font-medium text-ink">
            {recommendation.distance_km} {t('recommendationRail.km')} ({recommendation.travel_time_min} {t("recommendationRail.min")})
          </span>
        </div>
      </div>
      
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md font-body">
          {errorMsg}
        </div>
      )}
      
      <button 
        type="button"
        onClick={handleConfirm}
        disabled={confirming || apiFailed}
        className="w-full py-3 bg-signal text-paper font-semibold rounded hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-signal disabled:opacity-70 flex justify-center items-center font-body"
      >
        {apiFailed ? t("recommendationRail.transferDisabled") : t('recommendationRail.approve')}
      </button>
    </div>
  );
}
