import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Star, Filter, Loader, ExternalLink, ThumbsUp, Search, X, SlidersHorizontal, Tag, TrendingUp, Crown, Lock, Sparkles, Check } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';

interface Festival {
  _id: string;
  title: string;
  location: string;
  tags: string[];
  content: string | null;
  reddit_url: string;
  upvotes: number;
  month: string;
  vibe_score: number | null;
  fetched_at: string;
}

interface FilterState {
  search: string;
  location: string;
  month: string;
  vibeFilter: 'all' | 'positive' | 'neutral' | 'negative';
  tags: string[];
  minUpvotes: number;
  sortBy: 'relevance' | 'upvotes' | 'vibe' | 'recent';
}

interface UserData {
  user_id: string;
  username: string;
  email: string;
  plan: string | null;
  exp: number;
}

const DiscoveryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [personalizedLoading, setPersonalizedLoading] = useState(false);
  const [personalizedError, setPersonalizedError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [userPremiumStatus, setUserPremiumStatus] = useState<any>(null);
  const [loadingPremiumStatus, setLoadingPremiumStatus] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    location: '',
    month: '',
    vibeFilter: 'all',
    tags: [],
    minUpvotes: 0,
    sortBy: 'relevance'
  });

  const searchParams = location.state?.searchParams;
  const results = location.state?.results;

  // Available filter options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const popularTags = [
    'music', 'food', 'art', 'technology', 'culture', 'comedy',
    'film', 'literature', 'sports', 'gaming', 'wellness', 'dance',
    'electronic', 'rock', 'indie', 'jazz', 'classical', 'folk'
  ];

  const locations = [
    'Austin, TX', 'Los Angeles, CA', 'New York, NY', 'Chicago, IL',
    'Miami, FL', 'Denver, CO', 'Seattle, WA', 'Portland, OR',
    'Nashville, TN', 'Atlanta, GA', 'San Francisco, CA', 'Boston, MA'
  ];

  // JWT utility functions
  const decodeJWT = (token: string): UserData | null => {
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

  const isPremiumUser = (): boolean => {
    if (!user) return false;
    return user.plan === 'monthly' || user.plan === 'yearly';
  };

  const getUserSubscriptionPlan = (): string | null => {
    const token = Cookies.get('jwt');
    if (!token) return null;

    const decodedToken = decodeJWT(token);
    return decodedToken?.plan || null;
  };

  const getPremiumBadge = () => {
    if (!user || !isPremiumUser()) return null;
    
    const badgeColor = user.plan === 'yearly' ? 'from-yellow-400 to-orange-500' : 'from-purple-400 to-pink-500';
    const badgeText = user.plan === 'yearly' ? 'YEARLY PRO' : 'MONTHLY PRO';
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 bg-gradient-to-r ${badgeColor} text-black text-xs font-bold rounded-full`}>
        <Crown className="h-3 w-3" />
        <span>{badgeText}</span>
      </span>
    );
  };

  // Check authentication and decode user data on component mount
  useEffect(() => {
    const token = Cookies.get('jwt');
    if (token) {
      const decodedToken = decodeJWT(token);
      if (decodedToken && decodedToken.exp > Date.now() / 1000) {
        setUser(decodedToken);
      } else {
        // Token expired, clear it
        Cookies.remove('jwt');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (results && Array.isArray(results)) {
      setFestivals(results);
      setLoading(false);
    } else {
      fetchFestivals();
    }
  }, [results]);

  const fetchFestivals = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get-all-festivals');
      if (!response.ok) throw new Error('Failed to fetch festivals');
      const data = await response.json();
      if (Array.isArray(data)) {
        setFestivals(data);
      } else if (Array.isArray(data.festivals)) {
        setFestivals(data.festivals);
      } else {
        setFestivals([]);
      }
    } catch (error) {
      console.error('Error fetching festivals:', error);
      setFestivals([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch personalized festivals based on user preferences
  const fetchPersonalizedFestivals = async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      setPersonalizedError('Please login to use this feature.');
      setShowPremiumModal(true);
      return;
    }

    // Check if user has premium plan
    if (!isPremiumUser()) {
      setPersonalizedError('This feature is only available for Pro/Plus users. Upgrade to unlock personalized festival recommendations!');
      setShowPremiumModal(true);
      return;
    }

    setPersonalizedLoading(true);
    setPersonalizedError(null);
    
    try {
      const jwt = Cookies.get('jwt');
      const response = await fetch('http://localhost:8000/api/user/festival-preferences/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      });
      
      const data = await response.json();
      
      if (response.status === 403) {
        setPersonalizedError(data.error || 'This feature is only available for pro/plus users.');
        setShowPremiumModal(true);
        setPersonalizedLoading(false);
        return;
      }
      
      if (data.festivals && Array.isArray(data.festivals)) {
        setFestivals(data.festivals);
        setPersonalizedError(null);
      } else if (data.message) {
        setPersonalizedError(data.message);
      } else {
        setPersonalizedError('No personalized festivals found.');
      }
    } catch (err) {
      setPersonalizedError('Failed to fetch personalized festivals.');
    } finally {
      setPersonalizedLoading(false);
    }
  };

  // Premium subscription functions (from OnboardingPage)
  const checkSubscriptionStatus = async () => {
    if (!isAuthenticated()) return;

    try {
      const token = Cookies.get('jwt');
      const response = await axios.get('http://localhost:8000/api/subscription/status/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        if (!response.data.is_active && response.data.is_expired) {
          setUserPremiumStatus((prev: any) => ({
            ...prev,
            is_active: false,
            expired: true
          }));
        }
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const fetchUserPremiumStatus = async () => {
    if (!isAuthenticated()) return;

    setLoadingPremiumStatus(true);
    try {
      const token = Cookies.get('jwt');
      const response = await axios.get('http://localhost:8000/api/user/profile/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.premium) {
        setUserPremiumStatus(response.data.premium);
      } else {
        const planFromToken = getUserSubscriptionPlan();
        if (planFromToken) {
          setUserPremiumStatus({
            is_active: true,
            plan: planFromToken
          });
        }
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
      const planFromToken = getUserSubscriptionPlan();
      if (planFromToken) {
        setUserPremiumStatus({
          is_active: true,
          plan: planFromToken
        });
      }
    } finally {
      setLoadingPremiumStatus(false);
    }
  };

  useEffect(() => {
    checkSubscriptionStatus();
    const plan = getUserSubscriptionPlan();
    if (plan) {
      setUserPremiumStatus({
        is_active: true,
        plan: plan
      });
    }
  }, []);

  useEffect(() => {
    if (showPremiumModal) {
      fetchUserPremiumStatus();
    }
  }, [showPremiumModal]);

  const launchRazorpayCheckout = (plan: "monthly" | "yearly") => {
    if (!isAuthenticated()) {
      alert("Please log in to subscribe to premium plans");
      navigate('/auth');
      return;
    }

    const token = Cookies.get('jwt');
    const decodedToken = decodeJWT(token!);

    let userEmail = "";
    let userName = "";
    let userId = "";

    if (decodedToken) {
      userEmail = decodedToken.email || "";
      userName = decodedToken.username || "";
      userId = decodedToken.user_id || "";
    }

    if (!userId) {
      alert("Could not identify user. Please try logging in again.");
      navigate('/auth');
      return;
    }

    const options = {
      key: "rzp_test_l3O4pMfo4DDgNl",
      amount: plan === "monthly" ? 4900 : 49900,
      currency: "INR",
      name: "FestiFly",
      description: `${plan === "monthly" ? "Monthly" : "Yearly"} Premium Access`,
      handler: function (response: any) {
        const authToken = Cookies.get('jwt');

        const paymentData = {
          payment_id: response.razorpay_payment_id,
          plan: plan,
          email: userEmail,
          userId: userId
        };

        fetch("http://localhost:8000/api/payment-success/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken || ''}`
          },
          body: JSON.stringify(paymentData),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              if (data.token) {
                Cookies.set('jwt', data.token, { expires: 7 });
                // Update user state with new token
                const newDecodedToken = decodeJWT(data.token);
                if (newDecodedToken) {
                  setUser(newDecodedToken);
                }
              }

              setUserPremiumStatus({
                is_active: true,
                plan: plan,
                expires_at: data.expires_at
              });

              alert(`✅ Payment successful! You are now a Premium user with ${plan} plan.`);
              setShowPremiumModal(false);
            } else {
              alert(data.error || "Payment verification had an issue. Please contact support.");
            }
          })
          .catch(error => {
            console.error("Payment verification error:", error);
            alert(`There was an error confirming your payment. Please contact support.`);
          });
      },
      prefill: {
        email: userEmail,
        name: userName
      },
      theme: {
        color: "#7C3AED",
      },
    };

    const razor = new (window as any).Razorpay(options);
    razor.open();
  };

  const handleSubscribeClick = (plan: "monthly" | "yearly") => {
    if (userPremiumStatus?.is_active && userPremiumStatus?.plan === plan) {
      alert(`You are already subscribed to the ${plan} plan!`);
      return;
    }

    if (!isAuthenticated()) {
      alert("Please log in to subscribe to premium plans");
      navigate('/auth');
      return;
    }

    if (typeof (window as any).Razorpay === 'undefined') {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        launchRazorpayCheckout(plan);
      };
      document.body.appendChild(script);
    } else {
      launchRazorpayCheckout(plan);
    }
  };

  const isPlanActive = (plan: "monthly" | "yearly"): boolean => {
    return userPremiumStatus?.is_active && userPremiumStatus?.plan === plan;
  };

  const getButtonText = (plan: "monthly" | "yearly"): string => {
    if (loadingPremiumStatus) return "Loading...";
    if (isPlanActive(plan)) return "✓ Subscribed";
    if (userPremiumStatus?.is_active && userPremiumStatus?.plan !== plan) {
      return `Switch to ${plan === 'monthly' ? 'Monthly' : 'Yearly'}`;
    }
    return `Subscribe ${plan === 'monthly' ? 'Monthly' : 'Yearly'}`;
  };

  const getButtonStyle = (plan: "monthly" | "yearly") => {
    if (isPlanActive(plan)) {
      return "w-full py-3 bg-green-600 text-white rounded-lg font-semibold cursor-default";
    }

    if (plan === "monthly") {
      return "w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl";
    } else {
      return "w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl";
    }
  };

  const getPlanCardStyle = (plan: "monthly" | "yearly") => {
    if (isPlanActive(plan)) {
      return "flex-1 rounded-xl p-6 border bg-green-500/20 border-green-500/50";
    }

    if (plan === "monthly") {
      return "flex-1 bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all hover:bg-white/10 hover:scale-[1.02]";
    } else {
      return "flex-1 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-xl p-6 border border-yellow-500/30 relative hover:border-yellow-400/70 transition-all hover:scale-[1.02] hover:from-yellow-500/30";
    }
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
        timeZoneName: 'short'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getRemainingTime = (expiryDate: string): string => {
    if (!expiryDate) return '';

    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const diffMs = expiry.getTime() - now.getTime();

      if (diffMs <= 0) return 'Expired';

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 30) {
        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''} remaining`;
      }

      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ${hours} hr${hours !== 1 ? 's' : ''} remaining`;
      }

      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } catch (error) {
      console.error('Error calculating remaining time:', error);
      return '';
    }
  };

  const getVibeEmoji = (vibeScore: number | null) => {
    if (vibeScore === null) return '😐';
    if (vibeScore >= 0.3) return '🎉';
    if (vibeScore >= 0.15) return '😊';
    if (vibeScore >= 0) return '😐';
    return '😕';
  };

  const getVibeColor = (vibeScore: number | null) => {
    if (vibeScore === null) return 'border-gray-400 bg-gray-400/20';
    if (vibeScore >= 0.3) return 'border-green-400 bg-green-400/20';
    if (vibeScore >= 0.15) return 'border-yellow-400 bg-yellow-400/20';
    if (vibeScore >= 0) return 'border-blue-400 bg-blue-400/20';
    return 'border-red-400 bg-red-400/20';
  };

  const getVibeLabel = (vibeScore: number | null) => {
    if (vibeScore === null) return 'Unknown Vibe';
    if (vibeScore >= 0.3) return 'Highly Positive';
    if (vibeScore >= 0.15) return 'Positive';
    if (vibeScore >= 0) return 'Neutral';
    return 'Mixed Reviews';
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      location: '',
      month: '',
      vibeFilter: 'all',
      tags: [],
      minUpvotes: 0,
      sortBy: 'relevance'
    });
  };

  // Helper function to safely convert to lowercase
  const safeToLowerCase = (str: string | null | undefined): string => {
    return str ? str.toLowerCase() : '';
  };

  // Helper function to safely check if string includes substring
  const safeIncludes = (str: string | null | undefined, searchTerm: string): boolean => {
    return str ? str.toLowerCase().includes(searchTerm.toLowerCase()) : false;
  };

  const filteredAndSortedFestivals = React.useMemo(() => {
    let filtered = festivals.filter(festival => {
      // Ensure festival has required properties
      if (!festival || !festival._id) return false;

      // Search filter with null safety
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          safeIncludes(festival.title, searchLower) ||
          safeIncludes(festival.location, searchLower) ||
          (festival.tags && Array.isArray(festival.tags) && 
           festival.tags.some(tag => safeIncludes(tag, searchLower))) ||
          safeIncludes(festival.content, searchLower);
        if (!matchesSearch) return false;
      }

      // Location filter with null safety
      if (filters.location && !safeIncludes(festival.location, filters.location)) {
        return false;
      }

      // Month filter with null safety
      if (filters.month && festival.month !== filters.month) {
        return false;
      }

      // Vibe filter
      if (filters.vibeFilter !== 'all') {
        if (filters.vibeFilter === 'positive' && (festival.vibe_score === null || festival.vibe_score < 0.15)) return false;
        if (filters.vibeFilter === 'neutral' && (festival.vibe_score === null || festival.vibe_score < 0 || festival.vibe_score >= 0.15)) return false;
        if (filters.vibeFilter === 'negative' && (festival.vibe_score === null || festival.vibe_score >= 0)) return false;
      }

      // Tags filter with null safety
      if (filters.tags.length > 0) {
        if (!festival.tags || !Array.isArray(festival.tags)) return false;
        const hasMatchingTag = filters.tags.some(filterTag => 
          festival.tags.some(festivalTag => 
            safeIncludes(festivalTag, filterTag)
          )
        );
        if (!hasMatchingTag) return false;
      }

      // Minimum upvotes filter
      if ((festival.upvotes || 0) < filters.minUpvotes) {
        return false;
      }

      return true;
    });

    // Sort festivals with null safety
    switch (filters.sortBy) {
      case 'upvotes':
        filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case 'vibe':
        filtered.sort((a, b) => (b.vibe_score || 0) - (a.vibe_score || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.fetched_at ? new Date(a.fetched_at).getTime() : 0;
          const dateB = b.fetched_at ? new Date(b.fetched_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      default: // relevance
        // Keep original order or implement relevance scoring
        break;
    }

    return filtered;
  }, [festivals, filters]);

  const getRandomImage = () => {
    const images = [
      'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg',
      'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
      'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
      'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
      'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg',
      'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg'
    ];
    return images[Math.floor(Math.random() * images.length)];
  };

  const truncateContent = (content: string | null, maxLength: number = 150) => {
    if (!content) return 'Discover this amazing festival experience...';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (month: string) => {
    return month ? `${month} 2024` : 'Date TBD';
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.location) count++;
    if (filters.month) count++;
    if (filters.vibeFilter !== 'all') count++;
    if (filters.tags.length > 0) count++;
    if (filters.minUpvotes > 0) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <div className="text-center">
          <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Discovering amazing festivals for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Festival Discoveries
          </h1>
          <p className="text-gray-300 text-lg">
            {searchParams?.location && `Near ${searchParams.location} • `}
            {searchParams?.startDate && `${searchParams.startDate} • `}
            {filteredAndSortedFestivals.length} of {festivals.length} festivals
          </p>
          
          {/* User Status and Personalized Button */}
          <div className="mt-6 flex flex-col items-center gap-4">
            {/* User Status Display */}
            {user && (
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20">
                <div className="text-white text-sm">
                  Welcome back, <span className="font-semibold">{user.username}</span>
                </div>
                {getPremiumBadge()}
              </div>
            )}

            {/* Personalized Discovery Button */}
            <div className="relative">
              <button
                onClick={fetchPersonalizedFestivals}
                disabled={personalizedLoading}
                className={`relative px-8 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isPremiumUser()
                    ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 text-white hover:from-pink-600 hover:via-purple-700 hover:to-blue-700'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 cursor-not-allowed'
                } ${personalizedLoading ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  {isPremiumUser() ? (
                    <Sparkles className="h-6 w-6" />
                  ) : (
                    <Lock className="h-6 w-6" />
                  )}
                  <span>
                    {personalizedLoading ? 'Discovering...' : '🎯 Discover For Me (Pro/Plus)'}
                  </span>
                  {isPremiumUser() && <Crown className="h-5 w-5 text-yellow-300" />}
                </div>
                
                {/* Premium Glow Effect */}
                {isPremiumUser() && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 opacity-30 blur-lg -z-10 animate-pulse"></div>
                )}
              </button>

              {/* Lock Overlay for Non-Premium Users */}
              {!isPremiumUser() && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl cursor-pointer"
                  onClick={() => setShowPremiumModal(true)}
                >
                  <div className="text-center">
                    <Lock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <div className="text-xs text-gray-300 font-medium">Premium Feature</div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {personalizedError && (
              <div className="text-red-400 text-sm mt-2 max-w-xl text-center bg-red-900/20 border border-red-400/30 rounded-lg p-3">
                {personalizedError}
              </div>
            )}
          </div>
        </div>

        {/* Premium Modal - Same as OnboardingPage */}
        {showPremiumModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-4xl w-full border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Upgrade Your Festival Experience</h3>
                <p className="text-gray-300">Choose the plan that fits your festival lifestyle</p>

                {userPremiumStatus?.is_active && (
                  <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2 mt-4">
                    <Check size={16} className="text-green-400" />
                    <span className="text-green-300 text-sm">
                      Currently subscribed to {userPremiumStatus.plan} plan
                      {userPremiumStatus.expires_at && (
                        <>
                          <span className="mx-1">•</span>
                          <span title={formatDateTime(userPremiumStatus.expires_at)}>
                            {getRemainingTime(userPremiumStatus.expires_at)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Monthly Plan */}
                <div className={getPlanCardStyle("monthly")}>
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h4 className="text-xl font-bold text-white">Monthly Plan</h4>
                      {isPlanActive('monthly') && <Check size={20} className="text-green-400" />}
                    </div>
                    <div className="inline-flex items-center gap-1 mb-4">
                      <span className="text-3xl font-bold text-white">₹49</span>
                      <span className="text-gray-400">/month</span>
                    </div>
                    <div className="h-[1px] w-full bg-white/20 my-4"></div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Unlimited festival searches across India</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Basic AI-powered recommendations</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Limited voice assistant (30 mins/month)</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Basic calendar integration</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Standard trip planning tools</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleSubscribeClick("monthly")}
                    disabled={loadingPremiumStatus || isPlanActive('monthly')}
                    className={getButtonStyle('monthly')}
                  >
                    {getButtonText('monthly')}
                  </button>
                </div>

                {/* Yearly Plan */}
                <div className={getPlanCardStyle("yearly")}>
                  {!isPlanActive('yearly') && (
                    <div className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold py-1 px-4 rounded-full">
                      BEST VALUE • Save 50%
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h4 className="text-xl font-bold text-white">Yearly Plan</h4>
                      {isPlanActive('yearly') && <Check size={20} className="text-green-400" />}
                    </div>
                    <div className="inline-flex items-center gap-1 mb-1">
                      <span className="text-3xl font-bold text-white">₹499</span>
                      <span className="text-gray-400">/year</span>
                    </div>
                    <p className="text-yellow-300 text-sm">Just ₹25 per month</p>
                    <div className="h-[1px] w-full bg-white/20 my-4"></div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Everything in Monthly Plan, plus:</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Priority booking assistance with VIP access</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Exclusive festival access and hidden events</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Full video briefings with Tavus (250 mins)</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Multilingual voice AI concierge (unlimited)</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Early bird access to festival tickets</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleSubscribeClick("yearly")}
                    disabled={loadingPremiumStatus || isPlanActive('yearly')}
                    className={getButtonStyle('yearly')}
                  >
                    {getButtonText('yearly')}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowPremiumModal(false)}
                className="mt-6 mx-auto block px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
          {/* Main Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search festivals by name, location, tags, or description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">Quick Filters:</span>
            </div>
            
            <button
              onClick={() => handleFilterChange('vibeFilter', filters.vibeFilter === 'positive' ? 'all' : 'positive')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filters.vibeFilter === 'positive' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🎉 Highly Rated
            </button>
            
            <button
              onClick={() => handleFilterChange('month', filters.month === 'July' ? '' : 'July')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filters.month === 'July' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              📅 July Events
            </button>
            
            <button
              onClick={() => handleFilterChange('tags', filters.tags.includes('music') ? filters.tags.filter(t => t !== 'music') : [...filters.tags, 'music'])}
              className={`px-4 py-2 rounded-lg transition-all ${
                filters.tags.includes('music') 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🎵 Music
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                showAdvancedFilters 
                  ? 'bg-orange-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Advanced</span>
              {activeFiltersCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 text-red-200 border border-red-400/30 rounded-lg hover:bg-red-600/30 transition-all"
              >
                <X className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-white/20 pt-6 space-y-6 animate-fadeIn">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location Filter */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span>Location</span>
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc} className="bg-gray-800">{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span>Month</span>
                  </label>
                  <select
                    value={filters.month}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Months</option>
                    {months.map(month => (
                      <option key={month} value={month} className="bg-gray-800">{month}</option>
                    ))}
                  </select>
                </div>

                {/* Minimum Upvotes */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span>Min Upvotes</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minUpvotes}
                    onChange={(e) => handleFilterChange('minUpvotes', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <Star className="h-4 w-4 text-purple-400" />
                    <span>Sort By</span>
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="relevance" className="bg-gray-800">Relevance</option>
                    <option value="upvotes" className="bg-gray-800">Most Upvoted</option>
                    <option value="vibe" className="bg-gray-800">Best Vibe</option>
                    <option value="recent" className="bg-gray-800">Most Recent</option>
                  </select>
                </div>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-white font-medium mb-3 flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-purple-400" />
                  <span>Festival Types</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-all capitalize ${
                        filters.tags.includes(tag)
                          ? 'bg-purple-600 text-white shadow-lg border-2 border-purple-400'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-300">
            <span className="text-lg font-semibold text-white">{filteredAndSortedFestivals.length}</span> festivals found
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-sm">({activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied)</span>
            )}
          </div>
          
          {filters.search && (
            <div className="text-gray-300 text-sm">
              Searching for: <span className="text-purple-300 font-medium">"{filters.search}"</span>
            </div>
          )}
        </div>

        {/* Festival Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAndSortedFestivals.map((festival, index) => (
            <div
              key={festival._id}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl border-2 ${getVibeColor(festival.vibe_score)} hover:scale-105 transition-all duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative">
                <img
                  src={getRandomImage()}
                  alt={festival.title || 'Festival'}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-2xl">{getVibeEmoji(festival.vibe_score)}</span>
                </div>
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4 text-orange-400" />
                  <span className="text-white text-sm font-semibold">{festival.upvotes || 0}</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-white text-xs font-medium">{getVibeLabel(festival.vibe_score)}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{festival.title || 'Untitled Festival'}</h3>
                <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                  {truncateContent(festival.content)}
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{festival.location || 'Location TBD'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{formatDate(festival.month)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{festival.upvotes || 0} community upvotes</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {festival.tags && Array.isArray(festival.tags) && festival.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-xs border border-purple-400/30 capitalize"
                    >
                      {tag || 'tag'}
                    </span>
                  ))}
                  {festival.tags && Array.isArray(festival.tags) && festival.tags.length > 3 && (
                    <span className="px-3 py-1 bg-gray-600/30 text-gray-200 rounded-full text-xs border border-gray-400/30">
                      +{festival.tags.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/trip/${festival._id}`)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-sm"
                  >
                    View Details
                  </button>
                  {festival.reddit_url && (
                    <a
                      href={festival.reddit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-orange-600/20 text-orange-200 border border-orange-400/30 rounded-lg hover:bg-orange-600/30 transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredAndSortedFestivals.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Festivals Found</h3>
              <p className="text-gray-400 mb-6">
                No festivals match your current search and filter criteria.
              </p>
              <div className="space-y-3">
                <button
                  onClick={clearAllFilters}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Clear All Filters
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Start New Search
                </button>
              </div>
            </div>
          </div>
        )}

        {festivals.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Festivals Available</h3>
              <p className="text-gray-400 mb-6">
                No festivals found in our database. Please try again later.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Go Back Home
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default DiscoveryPage;