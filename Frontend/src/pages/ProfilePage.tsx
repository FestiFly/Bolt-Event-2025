import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Edit2, Save, X, Camera, Loader, MapPin, Heart, Users, Copy, Check, AlertCircle, Crown, User, Settings } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

// Internal utility functions
const getAuthToken = (): string | null => {
  return Cookies.get('jwt') || null;
};

const checkPremiumStatus = (user: any) => {
  // Return a default structure if user is null or undefined
  if (!user) {
    return {
      isActive: false,
      isPlus: false,
      plan: null,
      expiresAt: null
    };
  }

  // Make sure premium exists before accessing its properties
  const premium = user.premium || {};
  
  if (!premium.is_active) {
    return {
      isActive: false,
      isPlus: false,
      plan: null,
      expiresAt: null
    };
  }

  return {
    isActive: premium.is_active || false,
    isPlus: premium.plan === 'yearly',
    plan: premium.plan || null,
    expiresAt: premium.expires_at || null
  };
};

const formatExpiryDate = (expiryDate: string | null): string => {
  if (!expiryDate) return 'Never';
  
  try {
    const date = new Date(expiryDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
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
  
  const interestOptions = [
    'Music', 'Food', 'Art', 'Technology', 'Culture', 'Comedy',
    'Film', 'Literature', 'Sports', 'Gaming', 'Wellness', 'Dance'
  ];

  const premiumStatus = checkPremiumStatus(user);

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken();
    if (!token) {
      navigate('/auth');
      return;
    }
    
    // Fetch user data from API on component mount
    fetchUserProfile();
    
    // Then check subscription status (after a small delay to ensure user is loaded)
    setTimeout(() => {
      if (user) { // Only check if user exists
        checkSubscriptionStatus();
      }
    }, 500);
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
        // Token expired or invalid, redirect to login
        Cookies.remove('jwt');
        navigate('/auth');
      }
    } finally {
      setUserLoading(false);
    }
  };

  const calculateProfileCompletion = (userData: any) => {
    let completionScore = 0;
    let totalFields = 5; // name, bio, location, preferences, profilePicture (not implemented yet)
    
    if (userData.name) completionScore += 1;
    if (userData.bio) completionScore += 1;
    if (userData.location) completionScore += 1;
    if (userData.preferences && userData.preferences.length > 0) completionScore += 1;
    if (userData.profilePicture) completionScore += 1; // Not implemented yet
    
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

  // Update the checkSubscriptionStatus function with proper null checks
  const checkSubscriptionStatus = () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    fetch('http://localhost:8000/api/subscription/status/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log('Subscription status:', data);
      
      // If subscription has expired, update the local user object
      if (data.is_expired && !data.is_active) {
        setUser((prev: { premium: any; }) => {
          // Make sure prev exists before updating
          if (!prev) return prev;
          
          return {
            ...prev,
            premium: {
              ...(prev.premium || {}), // Use empty object as fallback if premium is null
              is_active: false,
              expired: true
            }
          };
        });
        
        // If needed, show renewal notification
        if (data.need_renewal) {
          // Add your notification code here
        }
      }
    })
    .catch(err => {
      console.error('Error checking subscription status:', err);
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Add another useEffect to check subscription when user changes
  useEffect(() => {
    // Only check if user exists
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]); // This will run when the user object is updated

  if (userLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          gap: "1rem",
          color: "white" 
        }}>
          <Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ 
          color: "white",
          textAlign: "center"
        }}>
          <AlertCircle size={48} color="rgb(248, 113, 113)" style={{ margin: "0 auto 1rem" }} />
          <h2>Unable to load profile</h2>
          <p>Please try refreshing the page or logging in again.</p>
          <button 
            onClick={() => navigate('/auth')}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "rgb(124, 58, 237)",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer"
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const renderProfileTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: "500",
          color: "white",
          marginBottom: "0.5rem"
        }}>About Me</h3>
        <p style={{ color: "rgb(209, 213, 219)" }}>
          {user.bio || "No bio available. Edit your profile to add a bio."}
        </p>
      </div>
      
      <div>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: "500",
          color: "white",
          marginBottom: "0.5rem"
        }}>Location</h3>
        <p style={{ color: "rgb(209, 213, 219)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MapPin size={16} />
          {user.location || "No location set"}
        </p>
      </div>
      
      <div>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: "500",
          color: "white",
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <Heart size={16} />
          Interests
        </h3>
        {user.preferences && user.preferences.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {user.preferences.map((preference: string) => (
              <span
                key={preference}
                style={{
                  backgroundColor: "rgba(124, 58, 237, 0.3)",
                  color: "rgb(216, 180, 254)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.875rem",
                  border: "1px solid rgba(139, 92, 246, 0.3)"
                }}
              >
                {preference}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: "rgb(209, 213, 219)" }}>
            No interests set
          </p>
        )}
      </div>
      
      <div>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: "500",
          color: "white",
          marginBottom: "0.5rem"
        }}>Account Details</h3>
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "0.5rem",
          padding: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem"
          }}>
            <div>
              <p style={{ fontSize: "0.875rem", color: "rgb(156, 163, 175)" }}>Username</p>
              <p style={{ color: "white" }}>{user.username}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", color: "rgb(156, 163, 175)" }}>Member Since</p>
              <p style={{ color: "white" }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
            </div>
          </div>
           
        </div>
      </div>

      {renderPremiumStatus()}
    </div>
  );
  
  const renderProfileForm = () => (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <label style={{
          display: "flex",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <User size={16} />
          Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            color: "white",
            outline: "none"
          }}
          placeholder="Your name"
        />
      </div>
      
      <div>
        <label style={{
          display: "flex",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <Mail size={16} />
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.5rem",
            color: "rgb(156, 163, 175)",
            outline: "none",
            cursor: "not-allowed"
          }}
          placeholder="Your email"
        />
      </div>
      
      <div>
        <label style={{
          display: "flex",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <MapPin size={16} />
          Location
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            color: "white",
            outline: "none"
          }}
          placeholder="Your location"
        />
      </div>
      
      <div>
        <label style={{
          display: "flex",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <Heart size={16} />
          Bio
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            color: "white",
            outline: "none",
            resize: "vertical"
          }}
          placeholder="Tell us about yourself..."
        />
      </div>
      
      <div>
        <label style={{
          display: "flex",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <Heart size={16} />
          Interests
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem" }}>
          {interestOptions.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => handlePreferenceToggle(interest)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backgroundColor: formData.preferences.includes(interest) 
                  ? "rgba(124, 58, 237, 0.3)" 
                  : "rgba(255, 255, 255, 0.1)",
                color: formData.preferences.includes(interest) 
                  ? "rgb(216, 180, 254)" 
                  : "white",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "0.875rem"
              }}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <X size={16} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "linear-gradient(to right, rgb(124, 58, 237), rgb(37, 99, 235))",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
  
  const renderPreferencesTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h3 style={{ color: "white", marginBottom: "1rem" }}>Notification Preferences</h3>
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: "0.5rem",
        padding: "2rem",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        textAlign: "center"
      }}>
        <Settings size={48} color="rgb(156, 163, 175)" style={{ margin: "0 auto 1rem" }} />
        <p style={{ color: "rgb(209, 213, 219)", fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Notification Settings
        </p>
        <p style={{ color: "rgb(156, 163, 175)", fontSize: "0.875rem" }}>
          Customize your notification preferences here. This feature is coming soon!
        </p>
      </div>
    </div>
  );
  
  const renderReferralsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{ 
          color: "white", 
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <Users size={20} />
          Your Referral Code
        </h3>
        <p style={{ color: "rgb(156, 163, 175)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Share this code with friends to earn rewards when they join FestiFly!
        </p>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "1rem",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "0.5rem",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <code style={{ 
            color: "rgb(216, 180, 254)", 
            fontFamily: "monospace", 
            flex: 1,
            fontSize: "1.125rem",
            fontWeight: "500"
          }}>
            {referralCode}
          </code>
          <button
            onClick={copyReferralCode}
            style={{
              padding: "0.5rem",
              backgroundColor: copySuccess ? "rgba(34, 197, 94, 0.2)" : "rgba(124, 58, 237, 0.2)",
              border: `1px solid ${copySuccess ? "rgba(34, 197, 94, 0.3)" : "rgba(124, 58, 237, 0.3)"}`,
              borderRadius: "0.375rem",
              color: copySuccess ? "rgb(74, 222, 128)" : "rgb(216, 180, 254)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {copySuccess ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        {copySuccess && (
          <p style={{ 
            color: "rgb(74, 222, 128)", 
            fontSize: "0.875rem", 
            marginTop: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}>
            <Check size={14} />
            Referral code copied to clipboard!
          </p>
        )}
      </div>
      
      {user.referrals && user.referrals.length > 0 && (
        <div>
          <h3 style={{ 
            color: "white", 
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <Users size={20} />
            Successful Referrals ({user.referrals.length})
          </h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: "1rem" 
          }}>
            {user.referrals.map((referral: any, index: number) => (
              <div
                key={index}
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}
              >
                <div style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(34, 197, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  color: "rgb(74, 222, 128)",
                  fontWeight: "600"
                }}>
                  {referral.username ? referral.username.charAt(0).toUpperCase() : "U"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    color: "rgb(74, 222, 128)", 
                    fontSize: "1rem", 
                    fontWeight: "500",
                    margin: "0 0 0.25rem 0" 
                  }}>
                    {referral.username || "Unknown User"}
                  </p>
                  <p style={{ 
                    color: "rgb(156, 163, 175)", 
                    fontSize: "0.875rem",
                    margin: 0 
                  }}>
                    Joined on {referral.date ? new Date(referral.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : "Unknown date"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPremiumStatus = () => {
    if (!premiumStatus.isActive) {
      return (
        <div style={{
          backgroundColor: "rgba(124, 58, 237, 0.1)",
          border: "1px solid rgba(124, 58, 237, 0.3)",
          borderRadius: "0.5rem",
          padding: "1rem",
          textAlign: "center"
        }}>
          <Crown size={24} color="rgb(216, 180, 254)" style={{ margin: "0 auto 0.5rem" }} />
          <h4 style={{ color: "rgb(216, 180, 254)", marginBottom: "0.5rem" }}>Upgrade to Premium</h4>
          <p style={{ color: "rgb(209, 213, 219)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Get access to exclusive features and priority support
          </p>
          <button
            onClick={() => {
              // Navigate to onboarding page and open premium modal
              navigate('/?openPremium=true');
            }}
            style={{
              backgroundColor: "rgb(124, 58, 237)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Crown size={16} />
            View Premium Plans
          </button>
        </div>
      );
    }
    
    return (
      <div style={{
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
        borderRadius: "0.5rem",
        padding: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Crown size={20} color="rgb(74, 222, 128)" />
          <h4 style={{ color: "rgb(74, 222, 128)" }}>Premium Member</h4>
        </div>
        <p style={{ color: "rgb(209, 213, 219)", fontSize: "0.875rem" }}>
          Plan: {premiumStatus.plan} • Expires: {formatExpiryDate(premiumStatus.expiresAt)}
        </p>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "3rem 1rem",
      background: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
    }}>
      <div style={{ maxWidth: "4xl", margin: "0 auto" }}>
        {/* Profile Header */}
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(16px)",
          borderRadius: "1rem",
          padding: "2rem",
          marginBottom: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                height: "4rem",
                width: "4rem",
                borderRadius: "9999px",
                background: "linear-gradient(to bottom right, rgb(124, 58, 237), rgb(37, 99, 235))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}>
                <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white" }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : user.username?.charAt(0).toUpperCase() || "U"}
                </span>
                <button style={{
                  position: "absolute",
                  bottom: "-0.25rem",
                  right: "-0.25rem",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "0.25rem",
                  cursor: "pointer",
                  opacity: 0
                }}>
                  <Camera size={14} color="white" />
                </button>
              </div>
              <div>
                <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "white", marginBottom: "0.25rem" }}>
                  {user.name || user.username}
                </h1>
                <p style={{ color: "rgb(156, 163, 175)" }}>{user.email}</p>
                <div style={{
                  marginTop: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <div style={{
                    backgroundColor: "rgba(124, 58, 237, 0.2)",
                    borderRadius: "9999px",
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.75rem",
                    color: "rgb(216, 180, 254)"
                  }}>
                    {profileCompletion}% Complete
                  </div>
                  {premiumStatus.isActive && (
                    <div style={{
                      backgroundColor: "rgba(34, 197, 94, 0.2)",
                      borderRadius: "9999px",
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.75rem",
                      color: "rgb(74, 222, 128)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}>
                      <Crown size={12} />
                      Premium
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                backgroundColor: isEditing ? "rgba(220, 38, 38, 0.2)" : "rgba(124, 58, 237, 0.2)",
                border: `1px solid ${isEditing ? "rgba(248, 113, 113, 0.3)" : "rgba(139, 92, 246, 0.3)"}`,
                borderRadius: "0.5rem",
                color: isEditing ? "rgb(248, 113, 113)" : "rgb(216, 180, 254)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500"
              }}
            >
              {isEditing ? <X size={16} /> : <Edit2 size={16} />}
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          </div>
          
          {/* Progress Bar */}
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "9999px",
            height: "0.5rem",
            overflow: "hidden"
          }}>
            <div style={{
              backgroundColor: "rgb(124, 58, 237)",
              height: "100%",
              width: `${profileCompletion}%`,
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(16px)",
          borderRadius: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          overflow: "hidden"
        }}>
          <div style={{
            display: "flex",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            {['profile', 'preferences', 'referrals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "1rem",
                  backgroundColor: activeTab === tab ? "rgba(124, 58, 237, 0.2)" : "transparent",
                  border: "none",
                  color: activeTab === tab ? "rgb(216, 180, 254)" : "rgb(209, 213, 219)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  fontWeight: "500",
                  borderBottom: activeTab === tab ? "2px solid rgb(124, 58, 237)" : "2px solid transparent"
                }}
              >
                {tab === 'profile' && <User size={16} style={{ marginRight: "0.5rem", display: "inline" }} />}
                {tab === 'preferences' && <Settings size={16} style={{ marginRight: "0.5rem", display: "inline" }} />}
                {tab === 'referrals' && <Users size={16} style={{ marginRight: "0.5rem", display: "inline" }} />}
                {tab}
              </button>
            ))}
          </div>
          
          <div style={{ padding: "2rem" }}>
            {activeTab === 'profile' && (isEditing ? renderProfileForm() : renderProfileTab())}
            {activeTab === 'preferences' && renderPreferencesTab()}
            {activeTab === 'referrals' && renderReferralsTab()}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        [style*="opacity:0"]:hover {
          opacity: 1 !important;
        }
      `}} />
    </div>
  );
};

export default ProfilePage;