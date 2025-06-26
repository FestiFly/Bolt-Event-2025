import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, UserPlus, UserCheck, Mail, Lock, User, Tag, AlertCircle, Loader, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie'; // Import js-cookie

// Inline authentication utility functions
const AUTH_TOKEN_KEY = 'jwt';
const USER_KEY = 'festifly_user';
const API_URL = 'http://localhost:8000/api';

// Function to store auth data in cookies and limited user info in localStorage
const storeAuthData = (token: string, user: any): void => {
  Cookies.set(AUTH_TOKEN_KEY, token, { expires: 7 }); // Store token in cookie for 7 days

  // Store only name and email in localStorage
  const userData = {
    name: user.name,
    email: user.email
  };
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

// Function to clear auth data
const clearAuthData = (): void => {
  Cookies.remove(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Function to check if user is authenticated
const isAuthenticated = (): boolean => {
  return !!Cookies.get(AUTH_TOKEN_KEY);
};

// Function to get current user's name and email
const getCurrentUser = (): any => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// Function to setup axios interceptors
const setupAxiosInterceptors = (): void => {
  axios.interceptors.request.use(
    (config) => {
      const token = Cookies.get(AUTH_TOKEN_KEY);
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

const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Check if we should show signup initially based on location state
  const [isLogin, setIsLogin] = useState<boolean>(!(location.state as any)?.signup);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    preferences: [] as string[],
    referralCode: '' // Add this line
  });

  // Setup axios interceptors on component mount
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      // Verify token validity
      const verifyToken = async () => {
        try {
          const response = await axios.get(`${API_URL}/auth/verify/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}` }
          });
          
          if (response.data.valid) {
            navigate('/discover'); // Redirect to main app page
          }
        } catch (error) {
          // Token is invalid, let user log in again
          clearAuthData();
        }
      };
      
      verifyToken();
    }
    
    // Set sign up or login based on URL state
    if ((location.state as any)?.signup) {
      setIsLogin(false);
    }
  }, [navigate, location.state]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/user/login/`, loginData);
      
      // Store token and user info
      storeAuthData(response.data.token, response.data.user);
      
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.reload(); // Reload to update nav/profile button
        navigate('/discover');
      }, 1000);
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    // Validate password match
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/user/signup/`, {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
        name: signupData.name,
        preferences: signupData.preferences,
        referralCode: signupData.referralCode
      });
      
      // Store token and user info
      storeAuthData(response.data.token, response.data.user);
      
      setMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        window.location.reload(); // Reload to update nav/profile button
        navigate('/discover');
      }, 1000);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.response?.data?.error || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    });
  };

  const addPreference = (preference: string) => {
    if (preference && !signupData.preferences.includes(preference)) {
      setSignupData({
        ...signupData,
        preferences: [...signupData.preferences, preference]
      });
    }
  };

  const removePreference = (preference: string) => {
    setSignupData({
      ...signupData,
      preferences: signupData.preferences.filter(p => p !== preference)
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1rem",
      backgroundImage: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
    }}>
      <div style={{ maxWidth: "28rem", width: "100%" }}>
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(16px)",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              margin: "0 auto 1rem",
              height: "4rem",
              width: "4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Shield color="#c084fc" size={64} />
            </div>
            <h1 style={{
              fontSize: "1.875rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.5rem"
            }}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p style={{ color: "rgb(209, 213, 219)" }}>
              {isLogin ? 'Sign in to access Festifly' : 'Join the festival community'}
            </p>
          </div>

          {/* Error/Success Message */}
          {error && (
            <div style={{
              backgroundColor: "rgba(220, 38, 38, 0.2)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem"
            }}>
              <AlertCircle color="#f87171" size={20} style={{ marginTop: "2px" }} />
              <p style={{ color: "rgb(254, 202, 202)", fontSize: "0.875rem" }}>{error}</p>
            </div>
          )}

          {message && (
            <div style={{
              backgroundColor: "rgba(22, 163, 74, 0.2)",
              border: "1px solid rgba(74, 222, 128, 0.3)",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem"
            }}>
              <AlertCircle color="#4ade80" size={20} style={{ marginTop: "2px" }} />
              <p style={{ color: "rgb(187, 247, 208)", fontSize: "0.875rem" }}>{message}</p>
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <label htmlFor="email" style={{
                  display: "block",
                  color: "white",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <Mail size={16} />
                  <span>Email</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={handleLoginChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "0.5rem",
                    color: "white",
                    outline: "none"
                  }}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" style={{
                  display: "block",
                  color: "white",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <Lock size={16} />
                  <span>Password</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "0.5rem",
                    color: "white",
                    outline: "none"
                  }}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "linear-gradient(to right, rgb(124, 58, 237), rgb(37, 99, 235))",
                  color: "white",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s"
                }}
              >
                {loading ? (
                  <Loader size={20} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <>
                    <UserCheck size={20} style={{ marginRight: "0.5rem" }} />
                    Sign In
                  </>
                )}
              </button>

              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <p style={{ color: "rgb(156, 163, 175)", fontSize: "0.875rem" }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    style={{
                      color: "rgb(192, 132, 252)",
                      fontWeight: "500",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignupSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label htmlFor="username" style={{
                    display: "block",
                    color: "white",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <User size={16} />
                    <span>Username</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={signupData.username}
                    onChange={handleSignupChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "0.5rem",
                      color: "white",
                      outline: "none"
                    }}
                    placeholder="username"
                  />
                </div>

                <div>
                  <label htmlFor="name" style={{
                    display: "block",
                    color: "white",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <User size={16} />
                    <span>Full Name</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={signupData.name}
                    onChange={handleSignupChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "0.5rem",
                      color: "white",
                      outline: "none"
                    }}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" style={{
                  display: "block",
                  color: "white",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <Mail size={16} />
                  <span>Email</span>
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  value={signupData.email}
                  onChange={handleSignupChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "0.5rem",
                    color: "white",
                    outline: "none"
                  }}
                  placeholder="your@email.com"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label htmlFor="signup-password" style={{
                    display: "block",
                    color: "white",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <Lock size={16} />
                    <span>Password</span>
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    value={signupData.password}
                    onChange={handleSignupChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "0.5rem",
                      color: "white",
                      outline: "none"
                    }}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" style={{
                    display: "block",
                    color: "white",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <Lock size={16} />
                    <span>Confirm</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "0.5rem",
                      color: "white",
                      outline: "none"
                    }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <LinkIcon size={16} />
                  <span>Referral Code (Optional)</span>
                </label>
                <input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  value={signupData.referralCode}
                  onChange={handleSignupChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "0.5rem",
                    color: "white",
                    outline: "none"
                  }}
                  placeholder="Enter referral code (if any)"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "linear-gradient(to right, rgb(124, 58, 237), rgb(37, 99, 235))",
                  color: "white",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s"
                }}
              >
                {loading ? (
                  <Loader size={20} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <>
                    <UserPlus size={20} style={{ marginRight: "0.5rem" }} />
                    Create Account
                  </>
                )}
              </button>

              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <p style={{ color: "rgb(156, 163, 175)", fontSize: "0.875rem" }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    style={{
                      color: "rgb(192, 132, 252)",
                      fontWeight: "500",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* This adds the keyframe animation for the spinner inline */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
};

export default AuthPage;