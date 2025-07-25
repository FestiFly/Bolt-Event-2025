import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navigation from './components/Navigation';
import OnboardingPage from './pages/OnboardingPage';
import DiscoveryPage from './pages/DiscoveryPage';
import TripPlannerPage from './pages/TripPlannerPage';
import OrganizerAuth from './pages/OrganizerAuth';
import OrganizerPanel from './pages/OrganizerPanel';
import AuthPage from './pages/UserLogin';
import ProfilePage from './pages/ProfilePage';
import BoltBadge from './components/BoltBadge';
import BoltWaterMark from './components/BoltWaterMark';
import LangSelector from './components/LangSelector';
import AskAIWidget from './components/AskAIWidget';

// JWT utility functions
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
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

const isOrganizerAuthenticated = (): boolean => {
  const organizerToken = localStorage.getItem('organizerToken');
  const jwtToken = Cookies.get('jwt');

  // Check if organizer token exists and JWT is valid
  if (!organizerToken || !jwtToken) return false;

  const decodedToken = decodeJWT(jwtToken);
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
        // Unauthorized - clear tokens and redirect appropriately
        Cookies.remove('jwt');
        localStorage.removeItem('organizerToken');
        localStorage.removeItem('festifly_token'); // Clean up legacy
        localStorage.removeItem('festifly_user'); // Clean up legacy

        // Redirect based on current path
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/organizer')) {
          window.location.href = '/organizer';
        } else {
          window.location.href = '/auth';
        }
      }
      return Promise.reject(error);
    }
  );
};

// Protected route component for regular users
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

// Protected route component for organizers
const OrganizerProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (!isOrganizerAuthenticated()) {
    return <Navigate to="/organizer" replace />;
  }
  return children;
};

// Google Client ID - replace with your actual Client ID
const GOOGLE_CLIENT_ID = "417585596392-pvibn0rqis2ka0hjesis5k1imten2am8.apps.googleusercontent.com";

function App() {
  const [authChecked, setAuthChecked] = useState(false);

  // Set up axios interceptors and verify authentication on load
  useEffect(() => {
    setupAxiosInterceptors();

    // Clean up any expired tokens on app load
    const token = Cookies.get('jwt');
    if (token) {
      const decodedToken = decodeJWT(token);
      if (!decodedToken || decodedToken.exp <= Date.now() / 1000) {
        // Token expired, clean up
        Cookies.remove('jwt');
        localStorage.removeItem('organizerToken');
        localStorage.removeItem('festifly_token');
        localStorage.removeItem('festifly_user');
      }
    }

    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "linear-gradient(to bottom right, rgb(17, 24, 39), rgb(88, 28, 135), rgb(49, 46, 129))",
        backgroundAttachment: "fixed"
      }}>
        <div style={{
          color: "white",
          fontSize: "1.25rem",
          animation: "pulse 1.5s infinite"
        }}>Loading...</div>
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}} />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div style={{
          minHeight: "100vh",
          backgroundImage: "linear-gradient(to bottom right, rgb(17, 24, 39), rgb(88, 28, 135), rgb(49, 46, 129))",
          backgroundAttachment: "fixed"
        }}>
          <Navigation />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<OnboardingPage />} />
            <Route path="/discover" element={<DiscoveryPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/trip/:festivalId" element={<TripPlannerPage />} />

            {/* Organizer Routes */}
            <Route path="/organizer" element={<OrganizerAuth />} />
            <Route
              path="/organizer/panel"
              element={
                <OrganizerProtectedRoute>
                  <OrganizerPanel />
                </OrganizerProtectedRoute>
              }
            />

            {/* User Protected Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BoltBadge />
          <AskAIWidget />
          <BoltWaterMark />
          <LangSelector />
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;