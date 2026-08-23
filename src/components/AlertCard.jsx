export default function AlertCard({ alert }) {
  return (
    <div className="bg-amber-50 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-widest">
          Action Required
        </h4>
      </div>
      
      {/* Gemini narrative text at 16px with comfortable leading */}
      <p className="text-[16px] font-body leading-relaxed text-ink mb-5">
        {alert.alert_text}
      </p>
      
      <button type="button" className="w-full py-2.5 bg-signal text-paper font-semibold rounded hover:opacity-90 transition-opacity">
        Review transfer
      </button>
    </div>
  );
}
