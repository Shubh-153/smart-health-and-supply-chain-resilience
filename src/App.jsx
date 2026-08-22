import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Styleguide from './Styleguide';
import Layout from './components/Layout';
import AggregateView from './pages/AggregateView';
import NotFound from './pages/NotFound';

const PhcView = lazy(() => import('./pages/PhcView'));

function App() {
  return (
    <BrowserRouter>
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
  )
}

export default App;
