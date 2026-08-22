import { Outlet, Link, useLocation } from 'react-router-dom';

function Breadcrumbs() {
  const { pathname } = useLocation();
  const pathParts = pathname.split('/').filter(Boolean);
  
  const crumbs = [{ label: 'India', to: '/' }];
  
  let stateId = '';
  let districtId = '';
  
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
      const phcId = pathParts[i+1];
      crumbs.push({ label: phcId.toUpperCase(), to: `/state/${stateId}/district/${districtId}/phc/${phcId}` });
      i++;
    }
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
  return (
    <div className="min-h-screen bg-paper flex flex-col font-body">
      <header className="border-b border-rule bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="font-display font-bold text-2xl tracking-tight text-ink">Aarogya Grid</h1>
          </Link>
          <div className="h-6 w-px bg-rule hidden sm:block"></div>
          <Breadcrumbs />
        </div>
        <div className="flex items-center">
          <span className="px-2.5 py-1 text-xs font-mono font-medium bg-amber-100 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1.5" title="Data is generated for simulation">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Simulated dataset
          </span>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
