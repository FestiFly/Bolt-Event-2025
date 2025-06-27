import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Edit2, Save, X, Camera, Loader, MapPin, Heart, Users, Copy, Check, AlertCircle, 
  Crown, User, Settings, Calendar, Shield, Star, Gift, TrendingUp, Award, Clock,
  CreditCard, Sparkles, UserPlus, ExternalLink, Bell, Globe, Volume2, Smartphone,
  Monitor, Moon, Sun
} from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

// Internal utility functions
const getAuthToken = (): string | null => {
  return Cookies.get('jwt') || null;
};

const checkPremiumStatus = (user: any) => {
  if (!user || !user.premium) {
    return {
      isActive: false,
      isPro: false,
      isPlus: false,
      plan: null,
      expiresAt: null,
      startedAt: null,
      paymentId: null,
      amount: null,
      currency: null,
      expired: false
    };
  }

  const premium = user.premium;
  
  return {
    isActive: premium.is_active || false,
    isPro: premium.is_pro || false,
    isPlus: premium.is_plus || false,
    plan: premium.plan || null,
    expiresAt: premium.expires_at || null,
    startedAt: premium.started_at || null,
    paymentId: premium.payment_id || null,
    amount: premium.amount || null,
    currency: premium.currency || null,
    expired: premium.expired || false
  };
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

const formatDateOnly = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).format(date);
  } catch (error) {
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

    if (days > 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      return `${years} year${years > 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''} remaining`;
    }

    if (days > 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      return `${months} month${months > 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''} remaining`;
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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    preferences: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: true
    },
    privacy: {
      profileVisibility: 'public',
      showLocation: true,
      showInterests: true
    },
    display: {
      theme: 'dark',
      language: 'en',
      timezone: 'Asia/Kolkata'
    }
  });
  
  const interestOptions = [
    'Music', 'Food', 'Art', 'Technology', 'Culture', 'Comedy',
    'Film', 'Literature', 'Sports', 'Gaming', 'Wellness', 'Dance'
  ];

  const premiumStatus = checkPremiumStatus(user);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/auth');
      return;
    }
    
    fetchUserProfile();
    fetchSubscriptionStatus();
  }, [navigate]);

  const fetchUserProfile = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        navigate('/auth');
        return;
      }
      
      const response = await axios.get('http://localhost:8000/api/user/profile/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const userData = response.data;
        setUser(userData);
        
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          bio: userData.bio || '',
          location: userData.location || '',
          preferences: userData.preferences || []
        });
        
        setReferralCode(userData.referralCode || '');
        calculateProfileCompletion(userData);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 401) {
        Cookies.remove('jwt');
        navigate('/auth');
      }
    } finally {
      setUserLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await axios.get('http://localhost:8000/api/subscription/status/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setSubscriptionStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const calculateProfileCompletion = (userData: any) => {
    let completionScore = 0;
    let totalFields = 5;
    
    if (userData.name) completionScore += 1;
    if (userData.bio) completionScore += 1;
    if (userData.location) completionScore += 1;
    if (userData.preferences && userData.preferences.length > 0) completionScore += 1;
    if (userData.profilePicture) completionScore += 1;
    
    setProfileCompletion(Math.round((completionScore / totalFields) * 100));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceToggle = (preference: string) => {
    setFormData(prev => {
      if (prev.preferences.includes(preference)) {
        return {
          ...prev,
          preferences: prev.preferences.filter(p => p !== preference)
        };
      } else {
        return {
          ...prev,
          preferences: [...prev.preferences, preference]
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = getAuthToken();
      
      const response = await axios.post('http://localhost:8000/api/user/update-profile/', {
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        preferences: formData.preferences
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setIsEditing(false);
        calculateProfileCompletion(response.data.user);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePreferenceChange = (category: string, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <div className="text-center">
          <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <div className="text-center text-white">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to load profile</h2>
          <p className="text-gray-300 mb-6">Please try refreshing the page or logging in again.</p>
          <button 
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const renderProfileTab = () => (
    <div className="space-y-8">
      {/* Personal Information */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-purple-400" />
          Personal Information
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <p className="text-white text-lg">{user.name || 'Not set'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <p className="text-white text-lg">@{user.username}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <p className="text-white text-lg flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-400" />
              {user.email}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
            <p className="text-white text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-400" />
              {user.location || 'Not set'}
            </p>
          </div>
        </div>
        
        {user.bio && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
            <p className="text-white leading-relaxed">{user.bio}</p>
          </div>
        )}
      </div>

      {/* Interests */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-purple-400" />
          Interests ({user.preferences?.length || 0})
        </h3>
        
        {user.preferences && user.preferences.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {user.preferences.map((preference: string) => (
              <span
                key={preference}
                className="px-4 py-2 bg-purple-600/20 text-purple-200 rounded-full text-sm border border-purple-400/30 font-medium"
              >
                {preference}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No interests set. Edit your profile to add some!</p>
        )}
      </div>

      {/* Account Statistics */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-400" />
          Account Statistics
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{profileCompletion}%</div>
            <p className="text-gray-300 text-sm">Profile Complete</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{user.referrals?.length || 0}</div>
            <p className="text-gray-300 text-sm">Successful Referrals</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
            </div>
            <p className="text-gray-300 text-sm">Days as Member</p>
          </div>
        </div>
      </div>

      {/* Premium Status */}
      {renderPremiumStatus()}

      {/* Referral Information */}
      {user.referredBy && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-400/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-400" />
            Referred By
          </h3>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 font-bold text-lg">
                {user.referredBy.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">@{user.referredBy.username}</p>
              <p className="text-gray-300 text-sm">
                Referred you on {formatDateOnly(user.referredBy.date)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  const renderProfileForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-white font-medium mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-purple-400" />
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Your full name"
          />
        </div>
        
        <div>
          <label className="block text-white font-medium mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-purple-400" />
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
            placeholder="Your email"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-white font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-purple-400" />
          Location
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Your city, country"
        />
      </div>
      
      <div>
        <label className="block text-white font-medium mb-2 flex items-center gap-2">
          <Heart className="h-4 w-4 text-purple-400" />
          Bio
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical"
          placeholder="Tell us about yourself..."
        />
      </div>
      
      <div>
        <label className="block text-white font-medium mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          Interests
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {interestOptions.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => handlePreferenceToggle(interest)}
              className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                formData.preferences.includes(interest)
                  ? 'bg-purple-600/30 text-purple-200 border-purple-400/50 shadow-lg'
                  : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-4 justify-end pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
  
  const renderPreferencesTab = () => (
    <div className="space-y-8">
      {/* Notification Preferences */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-400" />
          Notification Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-gray-400 text-sm">Receive updates about festivals and bookings via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Push Notifications</p>
                <p className="text-gray-400 text-sm">Get instant alerts on your device</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifications.push}
                onChange={(e) => handlePreferenceChange('notifications', 'push', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-white font-medium">Marketing Updates</p>
                <p className="text-gray-400 text-sm">Receive news about new features and special offers</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifications.marketing}
                onChange={(e) => handlePreferenceChange('notifications', 'marketing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-400" />
          Privacy Settings
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2">Profile Visibility</label>
            <select
              value={preferences.privacy.profileVisibility}
              onChange={(e) => handlePreferenceChange('privacy', 'profileVisibility', e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="public" className="bg-gray-800">Public - Anyone can see your profile</option>
              <option value="friends" className="bg-gray-800">Friends Only - Only your connections</option>
              <option value="private" className="bg-gray-800">Private - Only you can see your profile</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Location</p>
              <p className="text-gray-400 text-sm">Display your location on your public profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.privacy.showLocation}
                onChange={(e) => handlePreferenceChange('privacy', 'showLocation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Interests</p>
              <p className="text-gray-400 text-sm">Display your interests on your public profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.privacy.showInterests}
                onChange={(e) => handlePreferenceChange('privacy', 'showInterests', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-purple-400" />
          Display Settings
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2 flex items-center gap-2">
              {preferences.display.theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Theme Preference
            </label>
            <select
              value={preferences.display.theme}
              onChange={(e) => handlePreferenceChange('display', 'theme', e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="dark" className="bg-gray-800">Dark Mode</option>
              <option value="light" className="bg-gray-800">Light Mode</option>
              <option value="auto" className="bg-gray-800">Auto (System)</option>
            </select>
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Language
            </label>
            <select
              value={preferences.display.language}
              onChange={(e) => handlePreferenceChange('display', 'language', e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="en" className="bg-gray-800">English</option>
              <option value="hi" className="bg-gray-800">हिंदी (Hindi)</option>
              <option value="ta" className="bg-gray-800">தமிழ் (Tamil)</option>
              <option value="te" className="bg-gray-800">తెలుగు (Telugu)</option>
              <option value="kn" className="bg-gray-800">ಕನ್ನಡ (Kannada)</option>
            </select>
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timezone
            </label>
            <select
              value={preferences.display.timezone}
              onChange={(e) => handlePreferenceChange('display', 'timezone', e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Asia/Kolkata" className="bg-gray-800">India Standard Time (IST)</option>
              <option value="Asia/Dubai" className="bg-gray-800">Gulf Standard Time (GST)</option>
              <option value="UTC" className="bg-gray-800">Coordinated Universal Time (UTC)</option>
              <option value="America/New_York" className="bg-gray-800">Eastern Time (ET)</option>
              <option value="Europe/London" className="bg-gray-800">Greenwich Mean Time (GMT)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Preferences Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // TODO: Save preferences to backend
            console.log('Saving preferences:', preferences);
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-lg"
        >
          <Save className="h-4 w-4" />
          Save Preferences
        </button>
      </div>
    </div>
  );
  
  const renderReferralsTab = () => (
    <div className="space-y-8">
      {/* Referral Code Section */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-400/20">
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-400" />
          Your Referral Code
        </h3>
        <p className="text-gray-300 text-sm mb-4">
          Share this code with friends to earn rewards when they join FestiFly Premium!
        </p>
        
        <div className="flex items-center gap-3 p-4 bg-white/10 rounded-lg border border-white/20">
          <code className="flex-1 text-purple-300 font-mono text-lg font-bold tracking-wider">
            {referralCode}
          </code>
          <button
            onClick={copyReferralCode}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              copySuccess 
                ? 'bg-green-600/20 text-green-300 border border-green-400/30' 
                : 'bg-purple-600/20 text-purple-300 border border-purple-400/30 hover:bg-purple-600/30'
            }`}
          >
            {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        {copySuccess && (
          <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Referral code copied to clipboard!
          </p>
        )}
      </div>

      {/* Referral Statistics */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">{user.referrals?.length || 0}</div>
          <p className="text-gray-300">Successful Referrals</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">₹{(user.referrals?.length || 0) * 50}</div>
          <p className="text-gray-300">Rewards Earned</p>
        </div>
      </div>

      {/* Referral History */}
      {user.referrals && user.referrals.length > 0 ? (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Referral History ({user.referrals.length})
          </h3>
          
          <div className="space-y-4">
            {user.referrals.map((referral: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg border border-green-400/20"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 font-bold text-lg">
                    {referral.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">@{referral.username || 'Unknown User'}</p>
                  <p className="text-gray-300 text-sm">
                    Joined on {formatDateOnly(referral.date)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">+₹50</div>
                  <div className="text-gray-400 text-xs">Reward</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Referrals Yet</h3>
          <p className="text-gray-400 mb-6">
            Start sharing your referral code to earn rewards when friends join FestiFly!
          </p>
          <button
            onClick={copyReferralCode}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Copy className="h-4 w-4" />
            Copy Referral Code
          </button>
        </div>
      )}
    </div>
  );

  const renderPremiumStatus = () => {
    if (!premiumStatus.isActive) {
      return (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-400/20">
          <div className="text-center">
            <Crown className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Upgrade to Premium</h3>
            <p className="text-gray-300 mb-6">
              Unlock exclusive features, priority support, and personalized recommendations
            </p>
            <button
              onClick={() => navigate('/?openPremium=true')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 mx-auto shadow-lg"
            >
              <Crown className="h-4 w-4" />
              View Premium Plans
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-400/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Crown className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                Premium Member
                {premiumStatus.isPlus && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-400/30">
                    PLUS
                  </span>
                )}
              </h3>
              <p className="text-gray-300 text-sm">
                {premiumStatus.plan?.charAt(0).toUpperCase() + premiumStatus.plan?.slice(1)} Plan
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-yellow-400 font-bold text-lg">
              ₹{premiumStatus.amount}
            </div>
            <div className="text-gray-400 text-xs">{premiumStatus.currency}</div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-300">Started</span>
            </div>
            <p className="text-white font-medium">{formatDateOnly(premiumStatus.startedAt)}</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-300">Expires</span>
            </div>
            <p className="text-white font-medium">{formatDateOnly(premiumStatus.expiresAt)}</p>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Status</span>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-medium">
                {getRemainingTime(premiumStatus.expiresAt)}
              </div>
              {premiumStatus.paymentId && (
                <div className="text-gray-400 text-xs">
                  Payment ID: {premiumStatus.paymentId.slice(-8)}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => navigate('/?openPremium=true')}
            className="w-full px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Manage Subscription
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <button className="absolute -bottom-1 -right-1 p-2 bg-white/20 rounded-full border border-white/30 hover:bg-white/30 transition-colors opacity-0 hover:opacity-100">
                  <Camera className="h-3 w-3 text-white" />
                </button>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  {user.name || user.username}
                </h1>
                <p className="text-gray-300 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-purple-600/20 text-purple-200 px-3 py-1 rounded-full border border-purple-400/30">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">{profileCompletion}% Complete</span>
                  </div>
                  
                  {premiumStatus.isActive && (
                    <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-400/30">
                      <Crown className="h-3 w-3" />
                      <span className="text-sm font-medium">
                        {premiumStatus.isPlus ? 'Premium Plus' : 'Premium'}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 bg-blue-600/20 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">
                      Joined {formatDateOnly(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg ${
                isEditing 
                  ? 'bg-red-600/20 text-red-200 border border-red-400/30 hover:bg-red-600/30' 
                  : 'bg-purple-600/20 text-purple-200 border border-purple-400/30 hover:bg-purple-600/30'
              }`}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              {isEditing ? "Cancel Edit" : "Edit Profile"}
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Profile Completion</span>
              <span className="text-sm text-purple-300 font-medium">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/10">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'preferences', label: 'Preferences', icon: Settings },
              { id: 'referrals', label: 'Referrals', icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600/20 text-purple-200 border-b-2 border-purple-400'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-8">
            {activeTab === 'profile' && (isEditing ? renderProfileForm() : renderProfileTab())}
            {activeTab === 'preferences' && renderPreferencesTab()}
            {activeTab === 'referrals' && renderReferralsTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;