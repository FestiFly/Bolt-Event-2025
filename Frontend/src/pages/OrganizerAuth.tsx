import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader, Lock, User, ArrowRight, AlertCircle, UserPlus, Mail, Building } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

// Authentication utility functions - consistent with UserLogin.tsx
const AUTH_TOKEN_KEY = 'jwt';
const ORGANIZER_TOKEN_KEY = 'organizerToken';
const API_URL = 'http://localhost:8000/api';

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
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    name: '',           // This will be used as username
    email: '', 
    password: '', 
    confirmPassword: '',
    location: '',       // <-- Add this field
    phone: ''           // <-- This will be sent as phone_number
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    // Validate passwords match
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (signupForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    // Validate all required fields
    if (
      !signupForm.name ||
      !signupForm.email ||
      !signupForm.password ||
      !signupForm.confirmPassword ||
      !signupForm.location ||
      !signupForm.phone
    ) {
      setError('All fields are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/organizer/signup/`, {
        username: signupForm.name,           // Backend expects "username"
        email: signupForm.email,
        password: signupForm.password,
        location: signupForm.location,       // Backend expects "location"
        phone_number: signupForm.phone       // Backend expects "phone_number"
      });

      setMessage('Account created successfully! You can now log in.');
      // Optionally, switch to login tab after signup
      setTimeout(() => {
        switchTab('login');
      }, 1500);

    } catch (error: any) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to create account. Please check your information and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setError(null);
    setMessage(null);
    setLoginForm({ username: '', password: '' });
    setSignupForm({ name: '', email: '', password: '', confirmPassword: '', location: '', phone: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="text-center p-8 pb-6">
            <div className="relative">
              <Shield className="h-20 w-20 text-purple-400 mx-auto mb-4 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Lock className="h-3 w-3 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Organizer Portal
            </h2>
            <p className="text-gray-300">
              {activeTab === 'login' 
                ? 'Access your festival management dashboard' 
                : 'Create your organizer account to get started'
              }
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/20">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-4 px-6 font-semibold transition-all ${
                activeTab === 'login'
                  ? 'bg-purple-600/20 text-purple-200 border-b-2 border-purple-400'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                Login
              </div>
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-4 px-6 font-semibold transition-all ${
                activeTab === 'signup'
                  ? 'bg-purple-600/20 text-purple-200 border-b-2 border-purple-400'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sign Up
              </div>
            </button>
          </div>

          <div className="p-8">
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
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-purple-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    name="username"
                    value={loginForm.username}
                    onChange={handleLoginInputChange}
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
                      onChange={handleLoginInputChange}
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
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Panel</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Signup Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                      <User className="h-4 w-4 text-purple-400" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={signupForm.name}
                      onChange={handleSignupInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Your full name"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                      <Building className="h-4 w-4 text-purple-400" />
                      <span>Organization</span>
                    </label>
                    <input
                      type="text"
                      name="organization"
                      value={signupForm.organization}
                      onChange={handleSignupInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Company/Organization"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-purple-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={signupForm.email}
                    onChange={handleSignupInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <User className="h-4 w-4 text-purple-400" />
                    <span>Location</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={signupForm.location}
                    onChange={handleSignupInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="City, State"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <User className="h-4 w-4 text-purple-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={signupForm.phone}
                    onChange={handleSignupInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="+91 9876543210"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-purple-400" />
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={signupForm.password}
                        onChange={handleSignupInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
                        placeholder="Create password"
                        required
                        disabled={isLoading}
                        minLength={8}
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

                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-purple-400" />
                      <span>Confirm Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={signupForm.confirmPassword}
                        onChange={handleSignupInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
                        placeholder="Confirm password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>At least 8 characters long</li>
                    <li>Must match confirmation password</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !signupForm.name || !signupForm.email || !signupForm.password || !signupForm.confirmPassword || !signupForm.location || !signupForm.phone}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
                <Shield className="h-4 w-4" />
                <span>Secure authentication powered by FestiFly</span>
              </div>
              
              {activeTab === 'login' ? (
                <p className="mt-4 text-gray-400 text-sm">
                  Don't have an organizer account?{' '}
                  <button
                    onClick={() => switchTab('signup')}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    Sign up here
                  </button>
                </p>
              ) : (
                <p className="mt-4 text-gray-400 text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => switchTab('login')}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              )}
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
  );
};

export default OrganizerAuth;