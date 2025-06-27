import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Authentication utility functions - consistent with UserLogin.tsx
const AUTH_TOKEN_KEY = 'jwt';
const ORGANIZER_TOKEN_KEY = 'organizerToken';
const API_URL = 'http://localhost:8000/api';

// Google Client ID - replace with your actual Client ID
const GOOGLE_CLIENT_ID = "417585596392-pvibn0rqis2ka0hjesis5k1imten2am8.apps.googleusercontent.com";

// Function to store auth data for organizers
const storeOrganizerAuthData = (token: string): void => {
  // Store JWT token in cookie with proper settings
  Cookies.set(AUTH_TOKEN_KEY, token, { 
    expires: 7,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax'
  });
  
  // Store organizer token in localStorage for organizer-specific checks
  localStorage.setItem(ORGANIZER_TOKEN_KEY, token);
};

// Function to clear organizer auth data
const clearOrganizerAuthData = (): void => {
  Cookies.remove(AUTH_TOKEN_KEY);
  localStorage.removeItem(ORGANIZER_TOKEN_KEY);
  // Clean up any legacy items
  localStorage.removeItem('festifly_user');
  localStorage.removeItem('festifly_token');
};

// Function to check if organizer is authenticated
const isOrganizerAuthenticated = (): boolean => {
  const organizerToken = localStorage.getItem(ORGANIZER_TOKEN_KEY);
  const jwtToken = Cookies.get(AUTH_TOKEN_KEY);
  return !!(organizerToken && jwtToken);
};

// Function to get JWT token
const getAuthToken = (): string | null => {
  return Cookies.get(AUTH_TOKEN_KEY) || null;
};

// Function to setup axios interceptors for organizer requests
const setupAxiosInterceptors = (): void => {
  axios.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

const OrganizerAuth = () => {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Setup axios interceptors on component mount
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // Check if organizer is already authenticated
  useEffect(() => {
    if (isOrganizerAuthenticated()) {
      navigate('/organizer/panel');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await axios.post(`${API_URL}/organizer/login/`, {
        email: loginForm.username,
        password: loginForm.password,
      });

      if (!response.data.token) {
        throw new Error('No token received from server');
      }

      // Store authentication data using the same pattern as UserLogin
      storeOrganizerAuthData(response.data.token);
      
      setMessage('Authentication successful! Redirecting to organizer panel...');
      
      console.log('Organizer authenticated successfully, token:', response.data.token);
      
      // Navigate to organizer panel after a brief delay
      setTimeout(() => {
        navigate('/organizer/panel');
        window.location.reload(); // Reload to update navigation state
      }, 1000);
      
    } catch (error: any) {
      console.error('Organizer login error:', error);
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Invalid credentials. Please check your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login success
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      // Send the ID token to your backend
      const response = await axios.post(`${API_URL}/organizer/google-auth/`, {
        token: credentialResponse.credential
      });
      
      if (!response.data.token) {
        throw new Error('No token received from server');
      }
      
      // Store authentication data
      storeOrganizerAuthData(response.data.token);
      
      setMessage('Google authentication successful! Redirecting to organizer panel...');
      
      // Navigate to organizer panel after a brief delay
      setTimeout(() => {
        navigate('/organizer/panel');
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Google login error:', error);
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to authenticate with Google. Please try again or use email login.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle Google login error
  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again or use email login.');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative">
                <Shield className="h-20 w-20 text-purple-400 mx-auto mb-4 animate-pulse" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Organizer Access
              </h2>
              <p className="text-gray-300">
                Secure login to access the festival management panel
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-600/20 border border-red-400/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="mb-6 p-4 bg-green-600/20 border border-green-400/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-green-200 text-sm">{message}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                  <User className="h-4 w-4 text-purple-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  name="username"
                  value={loginForm.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-purple-400" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={loginForm.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !loginForm.username || !loginForm.password}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Access Panel</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              
              {/* Add divider */}
              <div className="flex items-center my-6">
                <div className="flex-grow h-px bg-white/20"></div>
                <span className="px-4 text-sm text-gray-400">OR</span>
                <div className="flex-grow h-px bg-white/20"></div>
              </div>
              
              {/* Google Sign-In Button */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  text="signin_with"
                  locale="en"
                  width="300px"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
                <Shield className="h-4 w-4" />
                <span>Secure authentication powered by FestiFly</span>
              </div>
            </div>
          </div>

          {/* Background Animation */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default OrganizerAuth;