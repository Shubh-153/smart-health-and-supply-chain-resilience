import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateDistrictName, translateFacilityName } from '../i18n/dataLocalization';
import { useNavigate } from 'react-router-dom';

function TriageDot({ bucket }) {
  const colors = { Critical: 'bg-triage-imm', High: 'bg-triage-urg', Medium: 'bg-triage-del', Low: 'bg-triage-min' };
  return <span className={`w-2 h-2 rounded-full ${colors[bucket] || 'bg-rule'}`} />;
}

export default function DataGrid({ phcs }) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const navigate = useNavigate();

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...phcs].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const riskBgClass = (bucket) => {
    const map = { Critical: 'bg-red-50', High: 'bg-orange-50', Medium: 'bg-yellow-50', Low: 'bg-green-50' };
    return map[bucket] || '';
  };

  const SortHeader = ({ label, field, align = 'left' }) => (
    <th
      className={`px-4 py-3 font-semibold border-b border-rule cursor-pointer select-none hover:bg-card/80 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-signal">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );

  const handleRowClick = (phc) => {
    const path = `/state/${phc.state.toLowerCase()}/district/${phc.district.toLowerCase()}/phc/${phc.id}`;
    navigate(path);
  };

  return (
    <div className="bg-paper border border-rule rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-card text-ink-soft text-xs uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <SortHeader label={t('dataGrid.facility')} field="name" />
              <SortHeader label={t('dataGrid.risk')} field="risk_score" align="right" />
              <th className="px-4 py-3 font-semibold border-b border-rule text-center">{t('dataGrid.triage')}</th>
              <SortHeader label={t('dataGrid.beds')} field="occupied_beds" align="right" />
              <th className="px-4 py-3 font-semibold border-b border-rule text-right">{t('dataGrid.staff')}</th>
              <SortHeader label={t('dataGrid.district')} field="district" />
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {sorted.map(phc => {
              const bucket = phc.risk_bucket || (phc.risk_score > 80 ? 'Critical' : phc.risk_score > 60 ? 'High' : phc.risk_score > 30 ? 'Medium' : 'Low');
              const staffPresent = (phc.doctors_present || 0) + (phc.nurses_present || 0);
              const staffSanctioned = (phc.doctors_sanctioned || 0) + (phc.nurses_sanctioned || 0);
              const staffPct = staffSanctioned > 0 ? Math.round((staffPresent / staffSanctioned) * 100) : 100;

              return (
                <tr
                  key={phc.id}
                  onClick={() => handleRowClick(phc)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(phc); }}
                >
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{translateFacilityName(phc, i18n.resolvedLanguage)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${riskBgClass(bucket)}`}>
                    {phc.risk_score}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <TriageDot bucket={bucket} />
                      <span className="text-[10px] uppercase tracking-wider font-bold text-ink-soft">{t(`triage.${bucket.toLowerCase()}`)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink-soft">
                    {phc.occupied_beds !== undefined ? `${phc.occupied_beds}/${phc.total_beds}` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${staffPct < 60 ? 'text-triage-imm font-bold' : 'text-ink-soft'}`}>
                    {staffPct}%
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{translateDistrictName(phc.district, i18n.resolvedLanguage)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
