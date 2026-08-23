import React from 'react';
import { useTranslation } from 'react-i18next';

export default function MedicineTable({ medicines }) {
  const { t, i18n } = useTranslation();
  if (!medicines || medicines.length === 0) return null;

  const numFormatter = new Intl.NumberFormat(i18n.resolvedLanguage || 'en', { numberingSystem: 'latn' });

  // Compute days_remaining and sort ascending
  const enriched = medicines.map(m => {
    const days = Math.floor(m.current_stock / Math.max(m.avg_daily_consumption, 1));
    let severity = 'Low';
    let color = 'bg-triage-min';
    
    if (days <= 3) {
      severity = 'Critical';
      color = 'bg-triage-imm';
    } else if (days <= 7) {
      severity = 'High';
      color = 'bg-triage-urg';
    } else if (days <= 14) {
      severity = 'Medium';
      color = 'bg-triage-del';
    }
    
    return { ...m, days_remaining: days, severity, color };
  }).sort((a, b) => a.days_remaining - b.days_remaining);

  return (
    <div className="bg-paper rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-sm">
          <thead className="bg-card text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold border-b border-rule">{t('medicineTable.medicine')}</th>
              <th className="px-6 py-4 font-semibold border-b border-rule text-right">{t('medicineTable.currentStock')}</th>
              <th className="px-6 py-4 font-semibold border-b border-rule text-right">{t('medicineTable.dailyCons')}</th>
              <th className="px-6 py-4 font-semibold border-b border-rule text-right">{t('medicineTable.daysRem')}</th>
              <th className="px-6 py-4 font-semibold border-b border-rule text-center">{t('medicineTable.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule text-ink">
            {enriched.map((m, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium whitespace-nowrap">{m.name}</td>
                <td className="px-6 py-4 text-right">{numFormatter.format(m.current_stock)}</td>
                <td className="px-6 py-4 text-right text-ink-soft">{numFormatter.format(m.avg_daily_consumption)}</td>
                <td className={`px-6 py-4 text-right font-bold ${m.days_remaining <= 3 ? 'text-triage-imm' : ''}`}>
                  {numFormatter.format(m.days_remaining)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${m.color}`}></span>
                    <span className={`uppercase tracking-widest text-[10px] font-bold 
                      ${m.severity === 'Critical' ? 'text-triage-imm' : 'text-ink-soft'}
                    `}>
                      {t(`triage.${m.severity.toLowerCase()}`)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
