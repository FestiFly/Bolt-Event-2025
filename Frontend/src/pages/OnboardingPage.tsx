import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Heart, Calendar, Search, Crown, Check } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios'; // Make sure to import axios

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: '',
    interests: [] as string[],
    startDate: '',
    endDate: ''
  });
  const [showPremium, setShowPremium] = useState(false);
  const [userPremiumStatus, setUserPremiumStatus] = useState(null);
  const [loadingPremiumStatus, setLoadingPremiumStatus] = useState(false);

  const interestOptions = [
    'Music', 'Food', 'Art', 'Technology', 'Culture', 'Comedy',
    'Film', 'Literature', 'Sports', 'Gaming', 'Wellness', 'Dance'
  ];

  // Decode JWT token to check authentication
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Check if user is authenticated using JWT token
  const isAuthenticated = (): boolean => {
    const token = Cookies.get('jwt');
    if (!token) return false;
    
    const decodedToken = decodeJWT(token);
    return !!(decodedToken && decodedToken.exp > Date.now() / 1000);
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFindFestivals = async () => {
    const payload = {
      location: formData.location,
      interests: formData.interests.map(i => i.toLowerCase()),
      month: formData.startDate, // now directly storing month in startDate
    };

    try {
      const response = await fetch('http://localhost:8000/api/recommendations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        navigate('/discover', { state: { results: data.festivals, searchParams: formData } });
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      alert('Failed to fetch recommendations.');
    }
  };

  const handlePremiumClick = () => {
    if (!isAuthenticated()) {
      // Redirect to login page if not authenticated
      navigate('/auth');
      return;
    }
    // Show premium modal if authenticated
    setShowPremium(true);
  };

  const launchRazorpayCheckout = (plan: "monthly" | "yearly") => {
    if (!isAuthenticated()) {
      alert("Please log in to subscribe to premium plans");
      navigate('/auth');
      return;
    }

    // Get user data from JWT token
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

    console.log('Payment data:', { userEmail, userName, userId, plan }); // Debug log

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

        console.log('Sending payment data to backend:', paymentData); // Debug log
        
        // Direct fetch to ensure we're using the exact URL
        fetch("http://localhost:8000/api/payment-success/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken || ''}`
          },
          body: JSON.stringify(paymentData),
        })
        .then((res) => {
          console.log('Payment response status:', res.status); // Debug response status
          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log('Payment response data:', data); // Debug response data
          if (data.success) {
            // Refresh premium status
            fetchUserPremiumStatus();
            alert(`✅ Payment successful! You are now a Premium user with ${plan} plan.`);
          } else {
            console.error('Payment verification failed:', data);
            alert(data.error || "Payment verification had an issue. Please contact support.");
          }
        })
        .catch(error => {
          console.error("Payment verification error:", error);
          alert(`There was an error confirming your payment: ${error.message}. Please contact support.`);
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
    // Final authentication check before payment
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

  // Add this function to fetch premium status
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
        console.log('User premium status updated:', response.data.premium);
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setLoadingPremiumStatus(false);
    }
  };

  // Add effect to fetch premium status when showing modal
  useEffect(() => {
    if (showPremium) {
      fetchUserPremiumStatus();
    }
  }, [showPremium]);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Discover Your Next
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Festival Adventure
            </span>
          </h1>
          <p className="text-xl text-gray-300">
            AI-powered festival discovery tailored just for you
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="space-y-8">
            <div>
              <label className="flex items-center space-x-2 text-white font-semibold mb-4">
                <MapPin className="h-5 w-5 text-purple-400" />
                <span>Where are you located?</span>
              </label>
              <input
                type="text"
                placeholder="Enter your city or zip code"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2 text-white font-semibold mb-4">
                <Heart className="h-5 w-5 text-purple-400" />
                <span>What interests you?</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      formData.interests.includes(interest)
                        ? 'bg-purple-600 text-white shadow-lg scale-105'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div>
                <label className="flex items-center space-x-2 text-white font-semibold mb-4">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  <span>Which month are you planning for?</span>
                </label>
                <select
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a month</option>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleFindFestivals}
                disabled={!formData.location || formData.interests.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                <Search className="h-5 w-5" />
                <span>Find Festivals</span>
              </button>

              <button
                onClick={handlePremiumClick}
                className="flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
              >
                <Crown className="h-5 w-5" />
                <span>{isAuthenticated() ? 'Premium Plan' : 'Login for Premium'}</span>
              </button>
            </div>
          </div>
        </div>

        {showPremium && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-4xl w-full border border-white/20">
              <div className="text-center mb-6">
                <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Upgrade Your Festival Experience</h3>
                <p className="text-gray-300 mb-6">Choose the plan that fits your festival lifestyle</p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Monthly Plan */}
                <div className="flex-1 bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all hover:bg-white/10 hover:scale-[1.02]">
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-white mb-1">Monthly Plan</h4>
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
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Subscribe Monthly
                  </button>
                </div>
                
                {/* Yearly Plan */}
                <div className="flex-1 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-xl p-6 border border-yellow-500/30 relative hover:border-yellow-400/70 transition-all hover:scale-[1.02] hover:from-yellow-500/30">
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold py-1 px-4 rounded-full">
                    BEST VALUE • Save 50%
                  </div>
                  
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-white mb-1">Yearly Plan</h4>
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
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    Subscribe Yearly
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => setShowPremium(false)}
                className="mt-6 mx-auto block px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;