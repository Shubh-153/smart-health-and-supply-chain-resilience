import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHierarchy } from '../api/client';
import { useTranslation } from 'react-i18next';
import { translateStateName, translateDistrictName, translateFacilityName } from '../i18n/dataLocalization';

function TriageDot({ bucket }) {
  const colors = {
    Critical: 'bg-triage-imm',
    High: 'bg-triage-urg',
    Medium: 'bg-triage-del',
    Low: 'bg-triage-min',
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[bucket] || 'bg-rule'}`} />;
}

function TreeNode({ label, to, children, isActive, depth = 0, defaultExpanded = false, riskScore, riskBucket, t }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const navigate = useNavigate();
  const hasChildren = children && children.length > 0;

  const handleToggle = () => {
    if (hasChildren) setExpanded(!expanded);
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    if (to) navigate(to);
  };

  const paddingLeft = 12 + depth * 16;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className={`flex items-center gap-2 py-1.5 pr-3 cursor-pointer text-sm font-body transition-colors rounded-r-md
          ${isActive ? 'bg-signal/10 border-l-2 border-signal text-ink font-medium' : 'text-ink-soft hover:bg-card hover:text-ink border-l-2 border-transparent'}
        `}
        style={{ paddingInlineStart: `${paddingLeft}px` }}
        onClick={handleNavigate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigate(e); }
          if (e.key === 'ArrowRight' && hasChildren && !expanded) { e.preventDefault(); setExpanded(true); }
          if (e.key === 'ArrowLeft' && hasChildren && expanded) { e.preventDefault(); setExpanded(false); }
        }}
        tabIndex={0}
        role="button"
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className="w-4 h-4 flex items-center justify-center text-ink-soft hover:text-ink flex-shrink-0"
            aria-label={expanded ? t('sidebar.collapse') : t('sidebar.expand')}
            tabIndex={-1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              {expanded ? <path d="M7 10l5 5 5-5z" /> : <path d="M10 7l5 5-5 5z" />}
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}

        {riskBucket && <TriageDot bucket={riskBucket} />}

        <span className="truncate flex-1">{label}</span>

        {riskScore !== undefined && (
          <span className="text-xs font-mono text-ink-soft ml-auto flex-shrink-0">{riskScore}</span>
        )}
      </div>

      {hasChildren && expanded && (
        <ul role="group" className="list-none">
          {children}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const sidebarRef = useRef(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    getHierarchy()
      .then(data => {
        if (isMounted) setHierarchy(data);
      })
      .catch(err => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Close sidebar on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768 && isOpen) {
      onClose();
    }
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isUnder = (path) => location.pathname.startsWith(path);

  if (loading) {
    return (
      <nav ref={sidebarRef} className={`sidebar-panel ${isOpen ? 'sidebar-open' : ''}`} aria-label={t('sidebar.ariaNavigation')}>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-6 bg-rule/50 rounded animate-pulse" style={{ width: `${70 - i * 8}%`, marginLeft: `${i * 8}px` }} />
          ))}
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav ref={sidebarRef} className={`sidebar-panel ${isOpen ? 'sidebar-open' : ''}`} aria-label={t('sidebar.ariaNavigation')}>
        <div className="p-4 text-sm text-ink-soft">
          {t('sidebar.loading')}
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        ref={sidebarRef}
        className={`sidebar-panel ${isOpen ? 'sidebar-open' : ''}`}
        aria-label={t('sidebar.ariaNavigation')}
      >
        <div className="p-3 border-b border-rule flex items-center justify-between md:hidden">
          <span className="font-display font-semibold text-sm text-ink">{t('sidebar.header')}</span>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink p-1" aria-label={t('sidebar.close')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 py-2">
          <ul role="tree" className="list-none">
            <TreeNode
              label={t("common.indiaNational")}
              to="/"
              isActive={isActive('/')}
              defaultExpanded={true}
              depth={0}
              t={t}
            >
              {hierarchy?.states?.map(state => {
                const statePath = `/state/${state.name.toLowerCase()}`;
                return (
                  <TreeNode
                    key={state.name}
                    label={translateStateName(state.name, i18n.resolvedLanguage)}
                    to={statePath}
                    isActive={isActive(statePath)}
                    defaultExpanded={isUnder(statePath)}
                    depth={1}
                    t={t}
                  >
                    {state.districts.map(district => {
                      const districtPath = `${statePath}/district/${district.name.toLowerCase()}`;
                      return (
                        <TreeNode
                          key={district.name}
                          label={translateDistrictName(district.name, i18n.resolvedLanguage)}
                          to={districtPath}
                          isActive={isActive(districtPath)}
                          defaultExpanded={isUnder(districtPath)}
                          depth={2}
                          t={t}
                        >
                          {district.phcs.map(phc => {
                            const phcPath = `${districtPath}/phc/${phc.id}`;
                            return (
                              <TreeNode
                                key={phc.id}
                                label={translateFacilityName(phc, i18n.resolvedLanguage)}
                                to={phcPath}
                                isActive={isActive(phcPath)}
                                depth={3}
                                riskScore={phc.risk_score}
                                riskBucket={phc.risk_bucket}
                                t={t}
                              />
                            );
                          })}
                        </TreeNode>
                      );
                    })}
                  </TreeNode>
                );
              })}
            </TreeNode>
          </ul>
        </div>
      </nav>
    </>
  );
}
