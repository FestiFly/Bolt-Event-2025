import React, { useState, useEffect } from 'react';
import { User, Mail, Edit2, Save, X, Camera, Loader, MapPin, Heart, Users, Link as LinkIcon, Copy, Check, AlertCircle, Crown } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { checkPremiumStatus, formatExpiryDate } from '/utils/premium';

// Auth utility function
const getCurrentUser = (): any => {
  const userJson = localStorage.getItem('festifly_user');
  return userJson ? JSON.parse(userJson) : null;
};

const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'preferences', 'referrals'
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
  const [referralInputCode, setReferralInputCode] = useState('');
  const [referralSubmitLoading, setReferralSubmitLoading] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');
  
  const interestOptions = [
    'Music', 'Food', 'Art', 'Technology', 'Culture', 'Comedy',
    'Film', 'Literature', 'Sports', 'Gaming', 'Wellness', 'Dance'
  ];

  const premiumStatus = checkPremiumStatus();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        location: currentUser.location || '',
        preferences: currentUser.preferences || []
      });
      setReferralCode(currentUser.referralCode || 'FESTIFLY' + Math.random().toString(36).substring(2, 8).toUpperCase());
      
      // Calculate profile completion
      calculateProfileCompletion(currentUser);
    }
    
    // Fetch updated user data from backend
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = Cookies.get('jwt');
      if (!token) return;
      
      const response = await axios.get('http://localhost:8000/api/user/profile/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const userData = response.data;
        setUser(userData);
        localStorage.setItem('festifly_user', JSON.stringify(userData));
        
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
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      const token = Cookies.get('jwt');
      
      const updatedUser = {
        ...user,
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        preferences: formData.preferences
      };
      
      // Call API to update user profile
      await axios.post('http://localhost:8000/api/user/update-profile/', updatedUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local storage
      localStorage.setItem('festifly_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      calculateProfileCompletion(updatedUser);
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

  const submitReferralCode = async () => {
    if (!referralInputCode) return;
    
    setReferralError('');
    setReferralSuccess('');
    setReferralSubmitLoading(true);
    
    try {
      const token = Cookies.get('jwt');
      
      const response = await axios.post(
        'http://localhost:8000/api/user/apply-referral/',
        { referralCode: referralInputCode },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        setReferralSuccess('Referral code applied successfully!');
        setReferralInputCode('');
        
        // Refresh user data
        fetchUserProfile();
      } else {
        setReferralError(response.data.error || 'Invalid referral code');
      }
    } catch (error: any) {
      setReferralError(error.response?.data?.error || 'Error applying referral code');
    } finally {
      setReferralSubmitLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ color: "white" }}>Loading profile...</div>
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
          display: "block",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem"
        }}>Full Name</label>
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
          display: "block",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem"
        }}>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          disabled
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.5rem",
            color: "rgb(156, 163, 175)",
            cursor: "not-allowed"
          }}
        />
        <p style={{
          fontSize: "0.75rem",
          color: "rgb(156, 163, 175)",
          marginTop: "0.25rem"
        }}>Email cannot be changed</p>
      </div>
      
      <div>
        <label style={{
          display: "block",
          color: "white",
          fontWeight: "500",
          marginBottom: "0.5rem"
        }}>Bio</label>
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
            outline: "none"
          }}
          placeholder="Tell us about yourself"
        ></textarea>
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
          placeholder="City, State"
        />
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
          <Heart size={16} />
          Interests
        </label>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", 
          gap: "0.75rem",
          marginBottom: "1rem" 
        }}>
          {interestOptions.map((interest) => (
            <button
              type="button"
              key={interest}
              onClick={() => handlePreferenceToggle(interest)}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                transition: "all 0.2s",
                cursor: "pointer",
                ...(formData.preferences.includes(interest) 
                  ? {
                      backgroundColor: "rgba(124, 58, 237, 0.5)",
                      color: "white",
                      border: "1px solid rgba(139, 92, 246, 0.5)",
                      transform: "scale(1.05)"
                    } 
                  : {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgb(209, 213, 219)",
                      border: "1px solid rgba(255, 255, 255, 0.2)"
                    })
              }}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.75rem 1.5rem",
          background: "linear-gradient(to right, rgb(124, 58, 237), rgb(37, 99, 235))",
          color: "white",
          borderRadius: "0.5rem",
          fontWeight: "600",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? (
          <Loader size={20} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <>
            <Save size={20} />
            <span>Save Changes</span>
          </>
        )}
      </button>
    </form>
  );
  
  const renderPreferencesTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: "500",
          color: "white",
          marginBottom: "1rem"
        }}>Complete Your Profile</h3>
        
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "0.5rem" 
          }}>
            <span style={{ color: "white", fontSize: "0.875rem" }}>
              Profile Completion
            </span>
            <span style={{ 
              color: profileCompletion >= 70 ? "rgb(134, 239, 172)" : "rgb(252, 165, 165)",
              fontSize: "0.875rem",
              fontWeight: "500"
            }}>
              {profileCompletion}%
            </span>
          </div>
          
          <div style={{
            height: "0.5rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "9999px",
            overflow: "hidden"
          }}>
            <div 
              style={{
                height: "100%",
                width: `${profileCompletion}%`,
                backgroundColor: profileCompletion >= 70 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
                borderRadius: "9999px",
                transition: "width 1s ease-in-out"
              }}
            ></div>
          </div>
        </div>
        
        <button
          onClick={() => setIsEditing(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "0.75rem",
            backgroundColor: profileCompletion < 100 ? "rgba(124, 58, 237, 0.3)" : "rgba(34, 197, 94, 0.3)",
            color: profileCompletion < 100 ? "rgb(216, 180, 254)" : "rgb(134, 239, 172)",
            border: `1px solid ${profileCompletion < 100 ? "rgba(139, 92, 246, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
            borderRadius: "0.5rem",
            cursor: "pointer",
            marginBottom: "2rem"
          }}
        >
          <Edit2 size={16} />
          <span>{profileCompletion < 100 ? "Complete Your Profile" : "Update Your Profile"}</span>
        </button>
        
        <div>
          <h4 style={{
            fontSize: "1rem",
            fontWeight: "500",
            color: "white",
            marginBottom: "0.75rem"
          }}>Why Complete Your Profile?</h4>
          
          <ul style={{ color: "rgb(209, 213, 219)", paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>Get better festival recommendations</li>
            <li style={{ marginBottom: "0.5rem" }}>Connect with like-minded festival goers</li>
            <li style={{ marginBottom: "0.5rem" }}>Receive personalized notifications about events</li>
            <li>Earn referral rewards faster</li>
          </ul>
        </div>
      </div>
    </div>
  );
  
  const renderReferralsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: "500",
          color: "white",
          marginBottom: "1rem"
        }}>Your Referral Code</h3>
        
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "0.5rem",
          padding: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "1.5rem"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "white"
            }}>
              <LinkIcon size={16} />
              <span style={{ fontWeight: "600", letterSpacing: "0.05em" }}>{referralCode}</span>
            </div>
            
            <button
              onClick={copyReferralCode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer"
              }}
            >
              {copySuccess ? <Check size={16} /> : <Copy size={16} />}
              <span>{copySuccess ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          
          <p style={{ 
            color: "rgb(209, 213, 219)", 
            fontSize: "0.875rem", 
            marginTop: "0.75rem" 
          }}>
            Share this code with friends and earn rewards when they sign up!
          </p>
        </div>
        
        <div>
          <h4 style={{
            fontSize: "1rem",
            fontWeight: "500",
            color: "white",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <Users size={16} />
            Your Referrals
          </h4>
          
          {user.referrals && user.referrals.length > 0 ? (
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)"
                  }}>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "rgb(156, 163, 175)", fontWeight: "500" }}>User</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "rgb(156, 163, 175)", fontWeight: "500" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {user.referrals.map((referral: any, index: number) => (
                    <tr key={index} style={{
                      borderBottom: index < user.referrals.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none"
                    }}>
                      <td style={{ padding: "0.75rem 1rem", color: "white" }}>{referral.username}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgb(209, 213, 219)" }}>
                        {new Date(referral.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "rgb(209, 213, 219)" }}>
              You haven't referred anyone yet. Share your code to get started!
            </p>
          )}
        </div>
        
        {!user.referredBy && (
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{
              fontSize: "1rem",
              fontWeight: "500",
              color: "white",
              marginBottom: "0.75rem"
            }}>
              Enter a Referral Code
            </h4>
            
            {referralError && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                color: "rgb(252, 165, 165)",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                border: "1px solid rgba(239, 68, 68, 0.3)"
              }}>
                <AlertCircle size={16} />
                <span>{referralError}</span>
              </div>
            )}
            
            {referralSuccess && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(34, 197, 94, 0.2)",
                color: "rgb(134, 239, 172)",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                border: "1px solid rgba(34, 197, 94, 0.3)"
              }}>
                <Check size={16} />
                <span>{referralSuccess}</span>
              </div>
            )}
            
            <div style={{
              display: "flex",
              gap: "0.5rem"
            }}>
              <input
                type="text"
                value={referralInputCode}
                onChange={(e) => setReferralInputCode(e.target.value.toUpperCase())}
                placeholder="Enter referral code"
                style={{
                  flex: "1 1 0%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "0.5rem",
                  color: "white",
                  outline: "none"
                }}
              />
              <button
                onClick={submitReferralCode}
                disabled={!referralInputCode || referralSubmitLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "rgba(124, 58, 237, 0.3)",
                  color: "rgb(216, 180, 254)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: "0.5rem",
                  cursor: !referralInputCode || referralSubmitLoading ? "not-allowed" : "pointer",
                  opacity: !referralInputCode || referralSubmitLoading ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {referralSubmitLoading ? (
                  <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : 'Apply'}
              </button>
            </div>
          </div>
        )}
        
        {user.referredBy && (
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{
              fontSize: "1rem",
              fontWeight: "500",
              color: "white",
              marginBottom: "0.75rem"
            }}>
              Referred By
            </h4>
            
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              padding: "1rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              <div style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "9999px",
                background: "linear-gradient(to bottom right, rgb(168, 85, 247), rgb(59, 130, 246))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                fontWeight: "bold",
                color: "white"
              }}>
                {user.referredBy.username ? user.referredBy.username.charAt(0).toUpperCase() : "U"}
              </div>
              
              <div>
                <p style={{ color: "white", fontWeight: "500" }}>
                  {user.referredBy.username}
                </p>
                <p style={{ color: "rgb(156, 163, 175)", fontSize: "0.875rem" }}>
                  {new Date(user.referredBy.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPremiumStatus = () => {
    if (!premiumStatus.isActive) {
      return (
        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "0.5rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}>
          <h3 style={{
            color: "white",
            fontSize: "1rem",
            fontWeight: "500",
            marginBottom: "0.5rem"
          }}>
            Premium Status
          </h3>
          <p style={{ color: "rgb(209, 213, 219)" }}>
            You are currently on the <span style={{ color: "white" }}>Free Plan</span>
          </p>
          <button
            onClick={() => navigate('/')} 
            style={{
              marginTop: "0.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "rgba(124, 58, 237, 0.3)",
              color: "rgb(216, 180, 254)",
              borderRadius: "0.375rem",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              cursor: "pointer"
            }}
          >
            <Crown size={16} />
            <span>Upgrade to Premium</span>
          </button>
        </div>
      );
    }
    
    return (
      <div style={{
        marginTop: "1.5rem",
        padding: "1rem",
        backgroundColor: premiumStatus.isPlus ? 
          "rgba(234, 179, 8, 0.1)" : 
          "rgba(124, 58, 237, 0.1)",
        borderRadius: "0.5rem",
        border: `1px solid ${premiumStatus.isPlus ? 
          "rgba(234, 179, 8, 0.3)" : 
          "rgba(124, 58, 237, 0.3)"}`
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem"
        }}>
          <Crown 
            size={20} 
            style={{ 
              color: premiumStatus.isPlus ? "rgb(250, 204, 21)" : "rgb(167, 139, 250)" 
            }} 
          />
          <h3 style={{
            color: "white",
            fontSize: "1rem",
            fontWeight: "500"
          }}>
            {premiumStatus.isPlus ? "Premium Plus" : "Premium"} Plan
          </h3>
        </div>
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <p style={{ color: "rgb(209, 213, 219)" }}>
            Plan: <span style={{ color: "white" }}>
              {premiumStatus.plan === "yearly" ? "Yearly" : "Monthly"}
            </span>
          </p>
          <p style={{ color: "rgb(209, 213, 219)" }}>
            Expires: <span style={{ color: "white" }}>
              {formatExpiryDate(premiumStatus.expiresAt)}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "3rem 1rem"
    }}>
      <div style={{
        maxWidth: "48rem",
        margin: "0 auto"
      }}>
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(16px)",
          borderRadius: "1rem",
          padding: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem"
          }}>
            <h1 style={{
              fontSize: "1.875rem",
              fontWeight: "bold",
              color: "white"
            }}>My Profile</h1>
            
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "rgba(124, 58, 237, 0.3)",
                  color: "rgb(229, 209, 255)",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
              >
                <Edit2 size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "rgba(220, 38, 38, 0.3)",
                  color: "rgb(254, 202, 202)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            )}
          </div>
          
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  height: "8rem",
                  width: "8rem",
                  borderRadius: "9999px",
                  background: "linear-gradient(to bottom right, rgb(168, 85, 247), rgb(59, 130, 246))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.25rem",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "1rem"
                }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : user.username?.charAt(0).toUpperCase() || "U"}
                </div>
                
                {isEditing && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    borderRadius: "9999px",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    cursor: "pointer"
                  }}>
                    <button style={{
                      color: "white",
                      padding: "0.5rem",
                      borderRadius: "9999px",
                      backgroundColor: "rgb(124, 58, 237)",
                      border: "none",
                      cursor: "pointer"
                    }}>
                      <Camera size={24} />
                    </button>
                  </div>
                )}
                
                {/* Profile completion indicator */}
                {profileCompletion < 100 && !isEditing && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    bottom: "1rem",
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "9999px",
                    backgroundColor: profileCompletion >= 70 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
                    border: "2px solid rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "bold"
                  }}>
                    {profileCompletion}%
                  </div>
                )}
              </div>
              
              <h2 style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                color: "white",
                marginBottom: "0.25rem"
              }}>
                {user.name || user.username}
              </h2>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "rgb(209, 213, 219)"
              }}>
                <Mail size={16} />
                <span style={{ fontSize: "0.875rem" }}>{user.email}</span>
              </div>
              
              {/* Tab navigation */}
              <div style={{
                display: "flex",
                gap: "1rem",
                marginTop: "2rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                width: "100%"
              }}>
                <button
                  onClick={() => { setActiveTab('profile'); setIsEditing(false); }}
                  style={{
                    padding: "0.5rem 1rem",
                    color: activeTab === 'profile' ? "white" : "rgb(156, 163, 175)",
                    fontWeight: activeTab === 'profile' ? "600" : "normal",
                    borderBottom: activeTab === 'profile' ? "2px solid rgb(124, 58, 237)" : "none",
                    marginBottom: "-1px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Profile
                </button>
                <button
                  onClick={() => { setActiveTab('preferences'); setIsEditing(false); }}
                  style={{
                    padding: "0.5rem 1rem",
                    color: activeTab === 'preferences' ? "white" : "rgb(156, 163, 175)",
                    fontWeight: activeTab === 'preferences' ? "600" : "normal",
                    borderBottom: activeTab === 'preferences' ? "2px solid rgb(124, 58, 237)" : "none",
                    marginBottom: "-1px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Preferences
                </button>
                <button
                  onClick={() => { setActiveTab('referrals'); setIsEditing(false); }}
                  style={{
                    padding: "0.5rem 1rem",
                    color: activeTab === 'referrals' ? "white" : "rgb(156, 163, 175)",
                    fontWeight: activeTab === 'referrals' ? "600" : "normal",
                    borderBottom: activeTab === 'referrals' ? "2px solid rgb(124, 58, 237)" : "none",
                    marginBottom: "-1px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Referrals
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: "1rem" }}>
              {isEditing ? (
                renderProfileForm()
              ) : activeTab === 'profile' ? (
                renderProfileTab()
              ) : activeTab === 'preferences' ? (
                renderPreferencesTab()
              ) : (
                renderReferralsTab()
              )}
            </div>
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