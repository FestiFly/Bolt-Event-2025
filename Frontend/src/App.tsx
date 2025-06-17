import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import OnboardingPage from './pages/OnboardingPage';
import DiscoveryPage from './pages/DiscoveryPage';
import TripPlannerPage from './pages/TripPlannerPage';
import OrganizerPanel from './pages/OrganizerPanel';
import BoltBadge from './components/BoltBadge';
import FestivalDetailPage from './pages/FestivalDetailPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <Navigation />
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/discover" element={<DiscoveryPage />} />
          <Route path="/discover/:festivalId" element={<FestivalDetailPage />} />
          <Route path="/trip/:festivalId" element={<TripPlannerPage />} />
          <Route path="/organizer" element={<OrganizerPanel />} />
        </Routes>
        <BoltBadge />
      </div>
    </Router>
  );
}

export default App;