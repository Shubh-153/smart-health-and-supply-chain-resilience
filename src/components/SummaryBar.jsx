import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AnimatedNumber smoothly increments from 0 to target value.
 * Respects prefers-reduced-motion to skip animation.
 */
function AnimatedNumber({ value, suffix = '', duration = 400 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Check reduced motion inside effect so it's fresh
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setCurrent(value);
      return;
    }

    let startTimestamp = null;
    let animationFrame;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing out sine for smoother stop (optional, but linear is fine for 400ms)
      setCurrent(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{current}{suffix}</>;
}

export default function SummaryBar({ data, loading }) {
  const { t } = useTranslation();
  // If no data yet but loading, create 5 placeholders to map over
  const metrics = loading ? Array(5).fill(null) : [
    { label: t('summaryBar.criticalCount'), value: data.critical, suffix: '', isCritical: true },
    { label: t('summaryBar.atRiskCount'), value: data.at_risk, suffix: '', isCritical: false },
    { label: t('summaryBar.medicineStockOuts'), value: data.stock_outs, suffix: '', isCritical: false },
    { label: t('summaryBar.bedOccupancy'), value: data.bed_occupancy_pct, suffix: '%', isCritical: false },
    { label: t('summaryBar.staffAvailability'), value: data.staff_availability_pct, suffix: '%', isCritical: false },
  ];

  return (
    <div className="grid grid-cols-2 min-[480px]:grid-cols-6 md:grid-cols-5 gap-8 py-4">
      {metrics.map((m, i) => {
        const colClass = i < 3 
          ? 'col-span-1 min-[480px]:col-span-2 md:col-span-1'
          : i === 3 
          ? 'col-span-1 min-[480px]:col-span-3 md:col-span-1'
          : 'col-span-2 min-[480px]:col-span-3 md:col-span-1';

        return (
          <div key={i} className={`flex flex-col ${colClass}`}>
            {loading ? (
              // Skeleton state explicitly holding the layout height.
              // 44px for the number (leading-none), 8px gap (mt-2), 18px for label = ~70px total
              <div className="flex flex-col">
                <div className="h-[44px] w-20 bg-rule/50 animate-pulse rounded"></div>
                <div className="h-[14px] w-28 bg-rule/30 animate-pulse rounded mt-2"></div>
              </div>
            ) : (
              <div className="flex flex-col items-start">
                <div className="text-[44px] leading-none font-display font-bold text-ink">
                  <AnimatedNumber value={m.value} suffix={m.suffix} />
                </div>
                <div className="mt-2 text-[12px] uppercase font-body tracking-widest text-ink-soft">
                  {m.label}
                </div>
                {/* Thin triage-red underline ONLY for the critical stat */}
                {m.isCritical && (
                  <div className="mt-3 h-[2px] w-full max-w-[80%] bg-triage-imm"></div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
