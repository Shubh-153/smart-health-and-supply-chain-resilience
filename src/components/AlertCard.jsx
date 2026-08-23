import { useTranslation } from 'react-i18next';
import { translateFacilityName, translateMedicineName } from '../i18n/dataLocalization';

export default function AlertCard({ alert }) {
  const { t, i18n } = useTranslation();
  
  let displayText = alert.text || alert.alert_text;
  if (alert.payload) {
    const phc_name = translateFacilityName({ name: alert.payload.phc_name, district: alert.payload.district || alert.payload.phc_id.split('-')[0] }, i18n.resolvedLanguage);
    const medicine = translateMedicineName(alert.payload.medicine, i18n.resolvedLanguage);
    const source = translateFacilityName({ name: alert.payload.recommended_source }, i18n.resolvedLanguage);
    
    displayText = t('alertCard.template', {
      phc_name,
      medicine,
      days: alert.payload.days_remaining || alert.payload.days_until_stockout,
      quantity: alert.payload.transfer_quantity || alert.payload.quantity,
      source
    });
  }

  return (
    <div className="bg-amber-50 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-widest">
          {t('alertCard.actionRequired')}
        </h4>
      </div>
      
      {/* Gemini narrative text at 16px with comfortable leading */}
      <p className="text-[16px] font-body leading-relaxed text-ink mb-5">
        {displayText}
      </p>
      
      <button type="button" className="w-full py-2.5 bg-signal text-paper font-semibold rounded hover:opacity-90 transition-opacity">
        {t('alertCard.reviewTransfer')}
      </button>
    </div>
  );
}
