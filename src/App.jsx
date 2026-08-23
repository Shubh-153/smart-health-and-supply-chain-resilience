import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Styleguide from './Styleguide';
import Layout from './components/Layout';
import AggregateView from './pages/AggregateView';
import NotFound from './pages/NotFound';
import SearchPalette from './components/SearchPalette';
import { useTranslation } from 'react-i18next';
import { languages } from './i18n/languages';
const PhcView = lazy(() => import('./pages/PhcView'));

export const SearchContext = React.createContext();

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { i18n } = useTranslation();
  useEffect(() => {
    const handleLangChange = (lng) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = languages[lng]?.dir || 'ltr';
    };
    
    // Set initial
    if (i18n.resolvedLanguage) {
      handleLangChange(i18n.resolvedLanguage);
    }
    
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, [i18n]);

  return (
    <SearchContext.Provider value={{ isSearchOpen, setIsSearchOpen }}>
      <BrowserRouter>
        <SearchPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <Routes>
          <Route path="/styleguide" element={<Styleguide />} />
          
          <Route path="/" element={<Layout />}>
            {/* India Level */}
            <Route index element={<AggregateView />} />
            
            {/* State Level */}
            <Route path="state/:stateId" element={<AggregateView />} />
            
            {/* District Level */}
            <Route path="state/:stateId/district/:districtId" element={<AggregateView />} />
            
            {/* PHC Level */}
            <Route 
              path="state/:stateId/district/:districtId/phc/:phcId" 
              element={
                <Suspense fallback={<div className="p-12 text-center text-ink-soft animate-pulse">Loading facility layout...</div>}>
                  <PhcView />
                </Suspense>
              } 
            />
            
            {/* Invalid paths fallback */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SearchContext.Provider>
  )
}

export default App;
