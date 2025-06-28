import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Heart, Calendar, Search, Crown, Check } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Loader } from 'lucide-react';
import AirHockeyGame from '../components/AirHockeyGame';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    location: '',
    interests: [] as string[],
    startDate: '',
    endDate: ''
  });
  const [showPremium, setShowPremium] = useState(false);
  const [userPremiumStatus, setUserPremiumStatus] = useState<any>(null);
  const [loadingPremiumStatus, setLoadingPremiumStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const loaderMessages = [
    "Dusting off the stage lights... 🎭",
    "Tuning guitars in the background... 🎸",
    "Warming up the crowd... 🔥",
    "Grabbing chai with the event organizer... ☕",
    "Scanning your vibe... 🧘‍♂️",
    "Unlocking local legends... 🗺️",
    "Fetching face paint and glow sticks... 🖌️",
    "Checking availability of fairy lights... ✨",
    "Verifying event existence with AI... 🤖",
    "Talking to the festival fairy... 🧚",
    "Running behind the parade float... 🥁",
    "Debugging joy algorithms... 🛠️",
    "Consulting the cosmic playlist... 🎶🔮",
    "Charging your fun battery... 🔋",
    "Waving at the fireworks guy... 🎆",
    "Painting the town purple... 🟣",
    "Tuning into happy frequencies... 📻",
    "Syncing your calendar with the stars... ✨📅",
    "Gossiping with street food vendors... 🌮",
    "Hacking into the music matrix... 🎧",
    "Ordering more excitement... 🍿",

  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [dotPosition, setDotPosition] = useState({ top: '50%', left: '50%' });

  useEffect(() => {
    if (!loading) return;

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % loaderMessages.length);
    }, 2000);

    const moveDot = () => {
      setDotPosition({
        top: `${Math.floor(Math.random() * 70) + 10}%`,
        left: `${Math.floor(Math.random() * 70) + 10}%`,
      });
    };
    const dotInterval = setInterval(moveDot, 700);

    return () => {
      clearInterval(messageInterval);
      clearInterval(dotInterval);
    };
  }, [loading]);

  const handleDotClick = () => setScore(score => score + 1);

  const interestOptions = [
    'Music', 'Food', 'Art', 'Technology', 'Culture', 'Comedy',
    'Film', 'Literature', 'Sports', 'Gaming', 'Wellness', 'Dance'
  ];

  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const isAuthenticated = (): boolean => {
    const token = Cookies.get('jwt');
    if (!token) return false;

    const decodedToken = decodeJWT(token);
    return !!(decodedToken && decodedToken.exp > Date.now() / 1000);
  };

  const getUserSubscriptionPlan = (): string | null => {
    const token = Cookies.get('jwt');
    if (!token) return null;

    const decodedToken = decodeJWT(token);
    return decodedToken?.plan || null;
  };

  const checkSubscriptionStatus = async () => {
    if (!isAuthenticated()) return;

    try {
      const token = Cookies.get('jwt');
      const response = await axios.get('http://localhost:8000/api/subscription/status/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Subscription status check:', response.data);

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
    const searchParams = new URLSearchParams(location.search);
    const openPremium = searchParams.get('openPremium');
    if (openPremium === 'true') {
      setShowPremium(true);
    }
  }, [location.search]);

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFindFestivals = async () => {
    setLoading(true); // Set loading to true when starting the data fetching
    const payload = {
      location: formData.location,
      interests: formData.interests.map(i => i.toLowerCase()),
      month: formData.startDate,
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
    } finally {
      setLoading(false); // Set loading to false once the data fetching is complete
    }
  };

  const handlePremiumClick = () => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }
    setShowPremium(true);
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
        console.log('User premium status updated from API:', response.data.premium);
      } else {
        const planFromToken = getUserSubscriptionPlan();
        if (planFromToken) {
          setUserPremiumStatus({
            is_active: true,
            plan: planFromToken
          });
          console.log('User premium status set from JWT token:', planFromToken);
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
        console.log('User premium status set from JWT token (fallback):', planFromToken);
      }
    } finally {
      setLoadingPremiumStatus(false);
    }
  };

  useEffect(() => {
    if (showPremium) {
      fetchUserPremiumStatus();
    }
  }, [showPremium]);

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

    console.log('Payment data:', { userEmail, userName, userId, plan });

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

        console.log('Sending payment data to backend:', paymentData);

        fetch("http://localhost:8000/api/payment-success/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken || ''}`
          },
          body: JSON.stringify(paymentData),
        })
          .then((res) => {
            console.log('Payment response status:', res.status);
            return res.json();
          })
          .then((data) => {
            console.log('Payment response data:', data);
            if (data.success) {
              if (data.token) {
                Cookies.set('jwt', data.token, { expires: 7 });
              }

              setUserPremiumStatus({
                is_active: true,
                plan: plan,
                expires_at: data.expires_at
              });

              alert(`✅ Payment successful! You are now a Premium user with ${plan} plan.`);
            } else {
              console.error('Payment verification failed:', data);
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
  const getBallColor = () => {
    if (score >= 30) return '#EF4444'; // Red
    if (score >= 20) return '#22C55E'; // Green
    if (score >= 10) return '#3B82F6'; // Blue
    if (score >= 5) return '#EC4899';  // Pink
    return '#7C3AED';                 // Default Purple
  };

  const getScoreColor = () => {
    if (score >= 30) return 'text-red-300';
    if (score >= 20) return 'text-emerald-300';
    if (score >= 10) return 'text-cyan-300';
    if (score >= 5) return 'text-fuchsia-300';
    return 'text-yellow-300';
  };
  const scoreMilestones = [
    { label: "Rookie", minScore: 0, color: "text-yellow-300" },
    { label: "Click Champ", minScore: 5, color: "text-fuchsia-300" },
    { label: "Speedster", minScore: 10, color: "text-cyan-300" },
    { label: "Tap Master", minScore: 20, color: "text-emerald-300" },
    { label: "Ultimate FestiFlyer", minScore: 30, color: "text-red-300" }
  ];

  const getCurrentLevel = () => {
    return scoreMilestones
      .slice()
      .reverse()
      .find(m => score >= m.minScore)?.label || "Rookie";
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

  return (
    <>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
          style={{
            background: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
          }}>
          <Loader className="h-12 w-12 text-purple-400 animate-spin mb-6" />
          <p className="text-white text-xl animate-pulse">
            {loaderMessages[currentMessageIndex]}
          </p>
          <div className="mt-6 text-center space-y-2">
            <p className="text-lg font-semibold text-purple-300 animate-bounce">
              Your festival lineup is loading... meanwhile, flex those fingers!
            </p>
            <p className="text-white text-sm bg-white/10 border border-purple-500/30 px-4 py-2 rounded-full inline-block shadow-md">
              🎯 Score: <span className={`font-bold ${getScoreColor()}`}>{score}</span>
            </p>
          </div>
          <div className="mt-4 text-sm text-gray-300">
            Current Level:{" "}
            <span className={`font-semibold ${getScoreColor()}`}>
              {getCurrentLevel()}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-white/80">
            {scoreMilestones.map((milestone, index) => (
              <div
                key={index}
                className={`px-3 py-1 rounded-full border border-white/10 text-center ${score >= milestone.minScore ? milestone.color : "text-gray-500"
                  } bg-white/5`}
              >
                {milestone.label} ({milestone.minScore}+)
              </div>
            ))}
          </div>

          <div className="mt-8">
            <AirHockeyGame />
          </div>
        </div>
      ) : (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1rem",
          backgroundImage: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
        }}>
          <div className="max-w-2xl mx-auto w-full">
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
                        className={`px-4 py-2 rounded-lg transition-all ${formData.interests.includes(interest)
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
      )}
    </>
  );
};

export default OnboardingPage;
