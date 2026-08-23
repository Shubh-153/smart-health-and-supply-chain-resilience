import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isForecast = data.isPredicted;
    const value = isForecast ? data.predicted : data.actual;
    
    return (
      <div className="bg-paper border border-rule p-3 rounded shadow-lg font-mono text-sm min-w-[150px]">
        <p className="font-bold text-ink mb-2 border-b border-rule pb-1">{label}</p>
        <div className="flex items-center justify-between mb-1">
          <span className="text-ink-soft mr-4">Count:</span>
          <span className={`font-bold ${isForecast ? 'text-signal' : 'text-ink'}`}>
            {value}
          </span>
        </div>
        {isForecast && (
          <div className="flex items-center justify-between mb-1 text-xs text-ink-soft">
            <span className="mr-4">Range:</span>
            <span>{Math.round(data.range[0])} – {Math.round(data.range[1])}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-ink-soft mr-4">Status:</span>
          <span className={`uppercase text-[10px] tracking-wider font-bold ${isForecast ? 'text-signal' : 'text-ink'}`}>
            {isForecast ? 'Predicted' : 'Recorded'}
          </span>
        </div>
        {isForecast && (
          <div className="mt-2 pt-2 border-t border-rule text-[10px] text-ink-soft leading-tight">
            Based on 30-day historical pattern
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ForecastChart({ history = [], forecast = [] }) {
  const chartData = useMemo(() => {
    if (!history.length || !forecast.length) return [];
    
    const data = [];
    const today = new Date();
    
    // history is 30 days (indices 0 to 29)
    // forecast is 7 days (indices 30 to 36)
    for (let i = 0; i < 37; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - 29 + i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      let actual = null;
      let predicted = null;
      let range = null;
      let isPredicted = false;
      
      if (i < 30) {
        const item = history[i];
        actual = (item !== null && typeof item === 'object') ? (item.patients || item.count || 0) : item;
        
        if (i === 29) {
          // The bridge point (Today). Set predicted = actual so lines connect seamlessly.
          predicted = actual;
          range = [actual, actual];
        }
      } else {
        isPredicted = true;
        const item = forecast[i - 30];
        predicted = (item !== null && typeof item === 'object') ? (item.patients || item.count || 0) : item;
        // Generate a 15% confidence band for visual weight
        const margin = Math.round(predicted * 0.15);
        range = [Math.max(0, predicted - margin), predicted + margin];
      }
      
      data.push({
        date: dateStr,
        actual,
        predicted,
        range,
        isPredicted,
        isToday: i === 29
      });
    }
    return data;
  }, [history, forecast]);

  if (chartData.length === 0) return null;

  const todayLabel = chartData[29].date;

  return (
    <div className="w-full h-80 bg-paper rounded-xl p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid 
            vertical={false} 
            stroke="var(--rule)" 
            strokeDasharray="0" 
          />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--ink-soft)' }}
            tickMargin={12}
            axisLine={false}
            tickLine={false}
            minTickGap={40} // Thins out labels to prevent collision on 375px screens
          />
          
          <YAxis 
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--ink-soft)' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Faint confidence band for the forecast */}
          <Area 
            type="monotone" 
            dataKey="range" 
            stroke="none" 
            fill="var(--signal)" 
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          
          {/* Actual line (solid --ink) */}
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="var(--ink)" 
            strokeWidth={2.5} 
            dot={false}
            activeDot={{ r: 4, fill: 'var(--ink)' }}
            isAnimationActive={false}
          />
          
          {/* Forecast line (dashed --signal) */}
          <Line 
            type="monotone" 
            dataKey="predicted" 
            stroke="var(--signal)" 
            strokeWidth={2.5} 
            strokeDasharray="6 6" 
            dot={false}
            activeDot={{ r: 4, fill: 'var(--signal)' }}
            isAnimationActive={false}
          />
          
          {/* Today Boundary Line with real weight */}
          <ReferenceLine 
            x={todayLabel} 
            stroke="var(--ink)" 
            strokeWidth={2}
          >
            <Label 
              value="TODAY" 
              position="insideTopLeft" 
              fill="var(--ink)" 
              fontFamily="var(--font-mono)" 
              fontWeight="bold"
              fontSize={12}
              offset={10}
            />
          </ReferenceLine>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
