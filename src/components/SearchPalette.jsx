import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHierarchy } from '../api/client';
import { useTranslation } from 'react-i18next';

export default function SearchPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [allPhcs, setAllPhcs] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aarogya-recent-searches') || '[]'); }
    catch { return []; }
  });
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load PHC data
  useEffect(() => {
    if (isOpen) {
      getHierarchy().then(data => {
        const phcs = [];
        data.states.forEach(state => {
          state.districts.forEach(district => {
            district.phcs.forEach(phc => {
              phcs.push({ ...phc, _state: state.name, _district: district.name });
            });
          });
        });
        setAllPhcs(phcs);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allPhcs
      .filter(phc =>
        phc.name.toLowerCase().includes(q) ||
        phc.id.toLowerCase().includes(q) ||
        phc._district.toLowerCase().includes(q) ||
        phc._state.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, allPhcs]);

  // Group results by district
  const grouped = useMemo(() => {
    const groups = {};
    results.forEach(phc => {
      const key = `${phc._district}, ${phc._state}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(phc);
    });
    return groups;
  }, [results]);

  const flatResults = results;

  const handleSelect = (phc) => {
    const path = `/state/${phc._state.toLowerCase()}/district/${phc._district.toLowerCase()}/phc/${phc.id}`;
    
    // Save to recent searches
    const updated = [{ id: phc.id, name: phc.name, path }, ...recentSearches.filter(r => r.id !== phc.id)].slice(0, 5);
    setRecentSearches(updated);
    try { localStorage.setItem('aarogya-recent-searches', JSON.stringify(updated)); } catch {}
    
    navigate(path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  };

  const triageDotColor = (bucket) => {
    const colors = { Critical: 'bg-triage-imm', High: 'bg-triage-urg', Medium: 'bg-triage-del', Low: 'bg-triage-min' };
    return colors[bucket] || 'bg-rule';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      
      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-paper rounded-xl shadow-2xl border border-rule overflow-hidden animate-search-enter"
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
          <svg className="w-5 h-5 text-ink-soft flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={t('searchPalette.placeholder')}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-ink text-sm font-body placeholder:text-ink-soft/60 focus:outline-none"
            aria-label={t('searchPalette.ariaSearch')}
            aria-activedescendant={flatResults[selectedIndex] ? `search-result-${flatResults[selectedIndex].id}` : undefined}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-ink-soft border border-rule rounded bg-card">{t('searchPalette.esc')}</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto" role="listbox">
          {query.trim() === '' ? (
            // Show recent searches
            <div className="p-3">
              {recentSearches.length > 0 ? (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-ink-soft font-body mb-2 px-1">{t('searchPalette.recent')}</p>
                  {recentSearches.map((recent, i) => (
                    <button
                      key={recent.id}
                      type="button"
                      onClick={() => { navigate(recent.path); onClose(); }}
                      className="w-full text-left px-3 py-2 text-sm font-body text-ink hover:bg-card rounded transition-colors flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-ink-soft flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {recent.name}
                    </button>
                  ))}
                </>
              ) : (
                <p className="text-sm text-ink-soft text-center py-6 font-body">{t('searchPalette.typeToSearch')}</p>
              )}
            </div>
          ) : flatResults.length > 0 ? (
            <div className="py-2">
              {Object.entries(grouped).map(([district, phcs]) => (
                <div key={district}>
                  <p className="text-[10px] uppercase tracking-widest text-ink-soft font-body px-4 py-1.5">{district}</p>
                  {phcs.map((phc, i) => {
                    const globalIndex = flatResults.indexOf(phc);
                    return (
                      <button
                        key={phc.id}
                        id={`search-result-${phc.id}`}
                        type="button"
                        role="option"
                        aria-selected={globalIndex === selectedIndex}
                        onClick={() => handleSelect(phc)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                          globalIndex === selectedIndex ? 'bg-signal/10 text-ink' : 'text-ink hover:bg-card'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${triageDotColor(phc.risk_bucket)}`} />
                        <span className="font-medium truncate flex-1">{phc.name}</span>
                        <span className="text-xs font-mono text-ink-soft">{phc.risk_score}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft text-center py-6 font-body">{t('searchPalette.noResults', { query })}</p>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-rule bg-card/50 flex items-center gap-4 text-[10px] text-ink-soft font-mono">
          <span>{t('searchPalette.navigate')}</span>
          <span>{t('searchPalette.select')}</span>
          <span>{t('searchPalette.close')}</span>
        </div>
      </div>
    </div>
  );
}
