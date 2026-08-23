import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const TERMS_KEYS = [
  'riskScore',
  'triageBands',
  'stockDays',
  'demandSurge',
  'transferRecommendation',
  'bedOccupancy',
  'staffRatio'
];

export default function Glossary({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const panelRef = useRef(null);
  const { t } = useTranslation();
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const searchInput = panelRef.current.querySelector('input');
      if (searchInput) searchInput.focus();
    }
  }, [isOpen]);

  const translatedTerms = TERMS_KEYS.map(key => ({
    term: t(`glossary.terms.${key}.term`),
    def: t(`glossary.terms.${key}.def`)
  }));

  const filtered = translatedTerms.filter(term => 
    term.term.toLowerCase().includes(query.toLowerCase()) || 
    term.def.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        role="dialog"
        aria-label={t('glossary.ariaLabel')}
        className={`fixed top-0 end-0 h-full w-[320px] bg-paper shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-s border-rule flex flex-col ${isOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'}`}
      >
        <div className="p-4 border-b border-rule flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">{t('glossary.title')}</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded p-1"
            aria-label={t('glossary.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-4 border-b border-rule">
          <div className="relative">
            <svg className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-soft w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder={t('glossary.searchPlaceholder')} 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-card border border-rule rounded-md py-2 ps-9 pe-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filtered.length > 0 ? (
            filtered.map((item, i) => (
              <div key={i}>
                <h3 className="font-semibold text-ink text-sm mb-1">{item.term}</h3>
                <p className="text-ink-soft text-sm font-body leading-relaxed">{item.def}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-soft text-center py-4">{t('glossary.noTermsFound', { query })}</p>
          )}
        </div>
      </div>
    </>
  );
}
