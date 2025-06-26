import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import Navigation from './components/Navigation';
import OnboardingPage from './pages/OnboardingPage';
import DiscoveryPage from './pages/DiscoveryPage';
import TripPlannerPage from './pages/TripPlannerPage';
import OrganizerPanel from './pages/OrganizerPanel';
import AuthPage from './pages/UserLogin';
import ProfilePage from './pages/ProfilePage';
import BoltBadge from './components/BoltBadge';

// JWT utility functions
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

const isAuthenticated = (): boolean => {
  const token = Cookies.get('jwt');
  if (!token) return false;
  
  const decodedToken = decodeJWT(token);
  return !!(decodedToken && decodedToken.exp > Date.now() / 1000);
};

const getToken = (): string | null => {
  const token = Cookies.get('jwt');
  return token === undefined ? null : token;
};

const setupAxiosInterceptors = (): void => {
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Handle authentication errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Unauthorized - clear token and redirect to login
        Cookies.remove('jwt');
        localStorage.removeItem('festifly_token'); // Clean up legacy
        localStorage.removeItem('festifly_user'); // Clean up legacy
        window.location.href = '/auth';
      }
      return Promise.reject(error);
    }
  );
};

// Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

function App() {
  const [authChecked, setAuthChecked] = useState(false);

  // Set up axios interceptors and verify authentication on load
  useEffect(() => {
    setupAxiosInterceptors();
    
    // Just mark authentication check as complete
    // The actual check is done by the ProtectedRoute component
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "linear-gradient(to bottom right, rgb(17, 24, 39), rgb(88, 28, 135), rgb(49, 46, 129))"
      }}>
        <div style={{
          color: "white",
          fontSize: "1.25rem",
          animation: "pulse 1.5s infinite"
        }}>Loading...</div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}} />
      </div>
    );
  }

  return (
    <Router>
      <div style={{
        minHeight: "100vh",
        backgroundImage: "linear-gradient(to bottom right, rgb(17, 24, 39), rgb(88, 28, 135), rgb(49, 46, 129))"
      }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/discover" element={<DiscoveryPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/trip/:festivalId" element={<TripPlannerPage />} />
          <Route 
            path="/organizer" 
            element={
              <ProtectedRoute>
                <OrganizerPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BoltBadge />
      </div>
    </Router>
  );
}

export default App;