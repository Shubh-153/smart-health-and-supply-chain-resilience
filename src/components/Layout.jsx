import { Outlet, Link, useLocation } from 'react-router-dom';
import React, { useState, useContext, useEffect } from 'react';
import Sidebar from './Sidebar';
import { SearchContext } from '../App';

function Breadcrumbs() {
  const { pathname } = useLocation();
  const pathParts = pathname.split('/').filter(Boolean);
  
  const crumbs = [{ label: 'India', to: '/' }];
  
  let stateId = '';
  let districtId = '';
  let phcId = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'state' && pathParts[i+1]) {
      stateId = pathParts[i+1];
      const label = stateId.charAt(0).toUpperCase() + stateId.slice(1);
      crumbs.push({ label, to: `/state/${stateId}` });
      i++;
    } else if (pathParts[i] === 'district' && pathParts[i+1]) {
      districtId = pathParts[i+1];
      const label = districtId.charAt(0).toUpperCase() + districtId.slice(1);
      crumbs.push({ label, to: `/state/${stateId}/district/${districtId}` });
      i++;
    } else if (pathParts[i] === 'phc' && pathParts[i+1]) {
      phcId = pathParts[i+1];
      // We will override this label via state if it resolves
      crumbs.push({ id: 'phc-crumb', label: phcId.toUpperCase(), to: `/state/${stateId}/district/${districtId}/phc/${phcId}` });
      i++;
    }
  }

  const [phcName, setPhcName] = useState('');
  useEffect(() => {
    let isMounted = true;
    if (phcId && districtId) {
      import('../api/client').then(({ getPhcs }) => {
        getPhcs(districtId.charAt(0).toUpperCase() + districtId.slice(1)).then(res => {
          if (!isMounted) return;
          const phc = res.find(p => p.id === phcId);
          if (phc) setPhcName(phc.name);
        }).catch(() => {});
      });
    }
    return () => { isMounted = false; };
  }, [phcId, districtId]);

  if (phcName) {
    const pCrumb = crumbs.find(c => c.id === 'phc-crumb');
    if (pCrumb) pCrumb.label = phcName;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm font-body text-ink-soft" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <div key={crumb.to} className="flex items-center">
            {isLast ? (
              <span className="font-medium text-ink" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <>
                <Link to={crumb.to} className="hover:text-signal transition-colors">
                  {crumb.label}
                </Link>
                <span className="mx-2 text-rule">›</span>
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { setIsSearchOpen } = useContext(SearchContext);

  return (
    <div className="min-h-screen bg-paper flex flex-col font-body">
      <header className="border-b border-rule bg-card px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <button 
            type="button" 
            className="md:hidden text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded p-1"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-ink">Aarogya Grid</h1>
          </Link>
          <div className="h-6 w-px bg-rule hidden sm:block"></div>
          <div className="hidden sm:block"><Breadcrumbs /></div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="flex items-center gap-2 text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded p-1.5 sm:px-3 sm:py-1.5 sm:bg-rule/50 sm:hover:bg-rule transition-colors"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search facilities"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span className="hidden sm:inline text-sm font-medium">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono border border-rule rounded bg-card text-ink-soft opacity-70 shadow-sm">⌘K</kbd>
          </button>
          
          <span className="hidden sm:flex px-2.5 py-1 text-xs font-mono font-medium bg-amber-100 text-amber-800 border border-amber-200 rounded-full items-center gap-1.5" title="Data is generated for simulation">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Simulated
          </span>
        </div>
      </header>
      
      <div className="px-4 py-3 bg-card border-b border-rule sm:hidden overflow-x-auto whitespace-nowrap">
        <Breadcrumbs />
      </div>

      <div className="flex flex-1 relative overflow-hidden items-stretch">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
