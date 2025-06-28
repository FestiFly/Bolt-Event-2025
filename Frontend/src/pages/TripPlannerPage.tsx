import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Video, Mic, Plus, Clock, Star, Share, Heart, ThumbsUp, Loader, MessageCircle, TrendingUp, Play, Pause, Volume2, Download, CheckCircle, Globe, Headphones, Navigation, Compass, Route, Car, Plane, Train, Film, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { jwtDecode }  from 'jwt-decode';
import Cookies from 'js-cookie';

interface FestivalDetail {
  _id: string;
  title: string;
  location: string;
  tags: string[];
  reddit_url: string;
  upvotes: number;
  month: string;
  vibe_score: number | null;
  content: string | null;
  fetched_at: string;
}

interface Review {
  comment: string;
  post_url: string;
  score: number;
}

const TripPlannerPage = () => {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<FestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [voiceScript, setVoiceScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState("en");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoScript, setVideoScript] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [voiceUsageLeft, setVoiceUsageLeft] = useState<number | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸', accent: 'American' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳', accent: 'Indian' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', accent: 'Indian' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', accent: 'European' },
    { code: 'fr', name: 'French', flag: '🇫🇷', accent: 'European' },
    { code: 'de', name: 'German', flag: '🇩🇪', accent: 'European' },
  ];

  useEffect(() => {
    fetchFestivalDetails();
  }, [festivalId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    // Get and decode JWT token to determine user plan
    const token = Cookies.get('jwt');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUserPlan(decoded.plan || null);
        
        // Fetch voice usage statistics from the server
        fetchVoiceUsageStats();
      } catch (error) {
        console.error("Failed to decode JWT:", error);
        setUserPlan(null);
      }
    } else {
      setUserPlan(null);
    }
  }, []);

  const handleFetchRedditReviews = async () => {
    if (!festival) return;
    setLoadingReviews(true);
    try {
      const res = await fetch("http://localhost:8000/api/fetch-reddit-reviews/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: festival._id }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        setShowReviews(true);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchFestivalDetails = async () => {
    if (!festivalId) {
      setError('Festival ID not provided');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/festival-detail/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: festivalId })
      });

      const data = await response.json();

      if (response.ok) {
        setFestival(data.festival);
      } else {
        setError(data.error || 'Failed to fetch festival details');
      }
    } catch (error) {
      console.error('Error fetching festival details:', error);
      setError('Failed to connect to server');

      setTimeout(() => {
        const mockFestival: FestivalDetail = {
          _id: festivalId!,
          title: "I'm a festival owner who has hosted 50 fests, and I'm publicly sharing my budget.",
          location: "Paige, TX",
          tags: ["music", "culture", "arts"],
          reddit_url: "https://reddit.com/r/festivals/comments/1g1bubm/im_a_festival_owner_who_has_hosted_50_fests_and/",
          upvotes: 2395,
          month: "October",
          vibe_score: 0.06,
          content: "Hi all! I'm the owner of Astronox, a music and arts festival taking place Oct 17-21 at Valkyrie Ranch in Paige, TX. I've decided to share my budget publicly because I think this is very important to help the community understand just what it takes to make these things possible. Please let me know if you have any questions and I'll be happy to answer them! Hopefully this helps people understand what it takes to make these events possible. Astronox.net",
          fetched_at: "2025-06-17T06:12:16.835"
        };

        setFestival(mockFestival);
        setError(null);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceUsageStats = async () => {
    const token = Cookies.get('jwt');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/subscription/status/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Set remaining usage based on plan
        if (data.plan === 'yearly') {
          setVoiceUsageLeft(null); // Unlimited
        } else if (data.plan === 'monthly') {
          setVoiceUsageLeft(5 - (data.voice_usage || 0));
        } else {
          // Free user
          setVoiceUsageLeft(2 - (data.voice_usage || 0));
        }
      }
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    }
  };

  const handleAddToCalendar = () => {
    setShowCalendarModal(true);
  };

  const generateGoogleCalendarLink = () => {
    if (!festival) return '';

    const festivalName = encodeURIComponent(festival.title);
    const festivalLocation = encodeURIComponent(festival.location);
    const festivalDescription = encodeURIComponent(festival.content || 'Discover this amazing festival experience...');

    const festivalDate = new Date(`${festival.month} 1, 2024`).toISOString().replace(/[-:]/g, '').replace('Z', '');
    const startDate = festivalDate.substring(0, 8) + 'T000000';
    const endDate = festivalDate.substring(0, 8) + 'T235959';

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${festivalName}&dates=${startDate}/${endDate}&details=${festivalDescription}&location=${festivalLocation}`;
  };

  const handleCalendarSuccess = () => {
    setCalendarAdded(true);
    setTimeout(() => {
      setShowCalendarModal(false);
      setCalendarAdded(false);
    }, 2000);
  };

  const handlePlayVideo = async () => {
    if (!festival) return;

    setShowVideoModal(true);
    setLoadingVideo(true);
    setVideoScript(null);
    setVideoUrl(null);
    setVideoError(null);

    try {
      const response = await fetch("http://localhost:8000/api/heygen-generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: festival._id, language: voiceLang })
      });

      const data = await response.json();
      console.log('Video API Response:', data);

      if (response.ok) {
        if (data.video_url) {
          setVideoUrl(data.video_url);
          setVideoScript(data.script || null);
          setVideoError(null);
        } else {
          setVideoError('Video URL not provided in response');
        }
      } else {
        console.error("Video Generation Error:", data.error || "Invalid video response");
        setVideoError(data.error || 'Failed to generate AI video');
      }
    } catch (error) {
      console.error("Failed to fetch AI video:", error);
      setVideoError('Network error occurred while generating video');
    } finally {
      setLoadingVideo(false);
    }
  };

  const closeVideoModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setShowVideoModal(false);
    setVideoUrl(null);
    setVideoScript(null);
    setVideoError(null);
    setIsVideoFullscreen(false);
  };

  const toggleVideoFullscreen = () => {
    setIsVideoFullscreen(!isVideoFullscreen);
  };

  const regenerateVideo = () => {
    handlePlayVideo();
  };

  const base64ToBlobUrl = (base64: string): string => {
    const byteCharacters = atob(base64);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArrays], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  };

  const handleVoiceAssistant = async () => {
    if (!festival) return;

    // Check if user is logged in
    const token = Cookies.get('jwt');
    if (!token) {
      setVoiceError("Please log in to use the voice assistant feature.");
      setShowVoiceModal(true);
      return;
    }

    try {
      // Decode token to get user info and plan
      const decoded: any = jwtDecode(token);
      const plan = decoded.plan;
      
      // Free user restrictions
      if (!plan) {
        // Check if language is not English
        if (voiceLang !== 'en') {
          setVoiceLang('en');
          setVoiceError("Free users can only generate voice in English. Please upgrade to access more languages.");
          setShowVoiceModal(true);
          setShowUpgradePrompt(true);
          return;
        }
        
        // Check usage limits directly from the latest state
        if (voiceUsageLeft !== null && voiceUsageLeft <= 0) {
          setVoiceError("You have reached the voice generation limit for free users. Please upgrade to generate more audio briefings.");
          setShowVoiceModal(true);
          setShowUpgradePrompt(true);
          return;
        }
      }
      
      // Monthly plan restrictions
      if (plan === 'monthly' && voiceUsageLeft !== null && voiceUsageLeft <= 0) {
        setVoiceError("You have reached the voice generation limit for your monthly plan. Please upgrade to our yearly plan for unlimited voice briefings.");
        setShowVoiceModal(true);
        setShowUpgradePrompt(true);
        return;
      }

      // Proceed with voice generation
      setShowVoiceModal(true);
      setLoadingVoice(true);
      setVoiceScript(null);
      setAudioUrl(null);
      setIsPlaying(false);
      setVoiceError(null);

      const response = await fetch("http://localhost:8000/api/generate-voice-briefing/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ _id: festival._id, language: voiceLang }),
      });

      const data = await response.json();
      console.log("Voice API Response:", data);

      if (response.ok && data.script) {
        setVoiceScript(data.script);
        setVoiceError(null);

        if (data.audio_url) {
          setAudioUrl(`http://localhost:8000${data.audio_url}`);
        } else if (data.audio_blob) {
          const blobUrl = base64ToBlobUrl(data.audio_blob);
          setAudioUrl(blobUrl);
        }
        
        // Update the voice usage count in our state
        if (plan !== 'yearly') {
          // Refresh usage stats after successful generation
          setTimeout(() => fetchVoiceUsageStats(), 1000);
        }
      } else {
        console.error("Voice Assistant Error:", data.error || "Invalid response format");
        setVoiceError(data.error || "Failed to generate voice briefing");
      }
    } catch (err) {
      console.error("Voice Assistant Failed:", err);
      setVoiceError("Network error occurred while generating voice briefing");
    } finally {
      setLoadingVoice(false);
    }
  };

  const closeVoiceModal = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setShowVoiceModal(false);
    setIsPlaying(false);
    setVoiceScript(null);
    setAudioUrl(null);
    setVoiceError(null);
  };

  const getSelectedLanguage = () => {
    return languageOptions.find(lang => lang.code === voiceLang) || languageOptions[0];
  };

  const getGoogleMapsEmbedUrl = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedLocation}&zoom=12`;
  };

  const getGoogleMapsDirectionsUrl = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
  };

  const handleLanguageSelection = (langCode: string) => {
    if (langCode === 'en' || userPlan === 'yearly' || userPlan === 'monthly') {
      setVoiceLang(langCode);
    } else {
      setVoiceLang('en'); // Default to English
      setShowUpgradePrompt(true);
    }
  };

  const getLanguageButtonClass = (langCode: string) => {
    const isSelected = voiceLang === langCode;
    
    // English is always available
    if (langCode === 'en') {
      return isSelected 
        ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
        : 'bg-blue-600/20 border-blue-400/30 text-blue-200 hover:bg-blue-600/30';
    }
    
    // For other languages, check plan
    if (userPlan === 'yearly' || userPlan === 'monthly') {
      return isSelected 
        ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
        : 'bg-blue-600/20 border-blue-400/30 text-blue-200 hover:bg-blue-600/30';
    }
    
    // Free users - locked state
    return 'bg-gray-600/20 border-gray-400/30 text-gray-400 cursor-not-allowed';
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDate = (month: string) => {
    return month || 'TBA';
  };

  const getRandomImage = () => {
    // Array of festival-related image URLs
    const images = [
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80'
    ];
    return images[Math.floor(Math.random() * images.length)];
  };

  const getVibeEmoji = (score: number | null) => {
    if (score === null) return '😐';
    if (score > 0.7) return '🥳';
    if (score > 0.5) return '😊';
    if (score > 0.3) return '🙂';
    if (score > 0.1) return '😐';
    return '😔';
  };

  const getVibeLabel = (score: number | null) => {
    if (score === null) return 'Unknown';
    if (score > 0.7) return 'Amazing Vibe';
    if (score > 0.5) return 'Good Vibe';
    if (score > 0.3) return 'Neutral Vibe';
    if (score > 0.1) return 'Mixed Feelings';
    return 'Concerning';
  };

  const getVibeColor = (score: number | null) => {
    if (score === null) return 'border-gray-400/30';
    if (score > 0.7) return 'border-green-400/30';
    if (score > 0.5) return 'border-blue-400/30';
    if (score > 0.3) return 'border-yellow-400/30';
    if (score > 0.1) return 'border-orange-400/30';
    return 'border-red-400/30';
  };

  const getReviewScoreEmoji = (score: number) => {
    if (score > 0.8) return '🤩';
    if (score > 0.6) return '😊';
    if (score > 0.4) return '🙂';
    if (score > 0.2) return '😐';
    return '😔';
  };

  const getReviewScoreColor = (score: number) => {
    if (score > 0.8) return 'bg-green-600/20 text-green-200 border-green-400/30';
    if (score > 0.6) return 'bg-blue-600/20 text-blue-200 border-blue-400/30';
    if (score > 0.4) return 'bg-yellow-600/20 text-yellow-200 border-yellow-400/30';
    if (score > 0.2) return 'bg-orange-600/20 text-orange-200 border-orange-400/30';
    return 'bg-red-600/20 text-red-200 border-red-400/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
        }}>
        <div className="text-center">
          <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading festival details...</p>
        </div>
      </div>
    );
  }

  if (error && !festival) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
        }}>
        <div className="text-center">
          <p className="text-white text-xl mb-4">Error: {error}</p>
          <button
            onClick={() => navigate('/discover')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    );
  }

  if (!festival) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
        }}>
        <div className="text-center">
          <p className="text-white text-xl">Festival not found</p>
          <button
            onClick={() => navigate('/discover')}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1rem",
      backgroundImage: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
    }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/discover')}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Discovery</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="relative rounded-2xl overflow-hidden group">
              <img
                src={getRandomImage()}
                alt={festival.title}
                className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 line-clamp-3">
                      {festival.title}
                    </h1>
                    <div className="flex items-center space-x-4 text-gray-200">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{festival.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(festival.month)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all hover:scale-110">
                      <Heart className="h-5 w-5 text-white" />
                    </button>
                    <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all hover:scale-110">
                      <Share className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 ${getVibeColor(festival.vibe_score)} hover:bg-white/15 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">About This Festival</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl animate-pulse">{getVibeEmoji(festival.vibe_score)}</span>
                  <span className="text-sm text-gray-300 font-medium">{getVibeLabel(festival.vibe_score)}</span>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-6 text-lg">
                {festival.content || 'Discover this amazing festival experience...'}
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <span>Festival Details</span>
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="font-medium">Location:</span>
                      <span className="text-white">{festival.location}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="font-medium">Month:</span>
                      <span className="text-white">{formatDate(festival.month)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="font-medium">Community Score:</span>
                      <span className="text-white font-bold">{festival.vibe_score?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    <span>Tags</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {festival.tags.map((tag, index) => (
                      <span
                        key={tag}
                        className="px-3 py-2 bg-purple-600/30 text-purple-200 rounded-full text-sm border border-purple-400/30 capitalize hover:bg-purple-600/40 transition-colors cursor-default"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
                <MessageCircle className="h-6 w-6 text-orange-400" />
                <span>Community Engagement</span>
              </h2>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 p-3 bg-orange-600/20 rounded-lg border border-orange-400/30">
                    <ThumbsUp className="h-5 w-5 text-orange-400" />
                    <span className="text-white font-semibold">{festival.upvotes?.toLocaleString() || '0'} upvotes</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-blue-600/20 rounded-lg border border-blue-400/30">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <span className="text-gray-300">
                      {new Date(festival.fetched_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <a
                  href={festival.reddit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600/20 text-orange-200 border border-orange-400/30 rounded-lg hover:bg-orange-600/30 transition-all hover:scale-105"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View on Reddit</span>
                </a>
              </div>

              <button
                onClick={handleFetchRedditReviews}
                disabled={loadingReviews}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {loadingReviews ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                   
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" />
                    <span>Load Reddit Reviews</span>
                  </>
                )}
              </button>
            </div>

            {showReviews && reviews.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <MessageCircle className="h-6 w-6 text-orange-400" />
                    <span>Reddit Community Reviews</span>
                  </h2>
                  <div className="flex items-center space-x-2 px-3 py-1 bg-orange-600/20 rounded-full border border-orange-400/30">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-200 text-sm font-medium">{reviews.length} reviews</span>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {reviews.map((review, index) => (
                    <div
                      key={index}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg animate-bounce" style={{ animationDelay: `${index * 200}ms` }}>
                            {getReviewScoreEmoji(review.score)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getReviewScoreColor(review.score)}`}>
                            {(review.score * 100).toFixed(0)}% positive
                          </span>
                        </div>
                        <a
                          href={review.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors text-sm hover:scale-110"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Source</span>
                        </a>
                      </div>

                      <p className="text-gray-300 leading-relaxed text-sm">
                        "{review.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showReviews && reviews.length === 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Reviews Found</h3>
                  <p className="text-gray-400">No community reviews were found for this festival.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 space-y-4 hover:bg-white/15 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">Festival Actions</h3>

              <button
                onClick={handleAddToCalendar}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                <span>Add to Calendar</span>
              </button>

              <button
                onClick={handlePlayVideo}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Video className="h-5 w-5" />
                <span>Watch AI Preview</span>
              </button>

              <button
                onClick={handleVoiceAssistant}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Mic className="h-5 w-5" />
                <span>Voice Assistant</span>
              </button>

              <a
                href={festival.reddit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ExternalLink className="h-5 w-5" />
                <span>View Original Post</span>
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Navigation className="h-5 w-5 text-green-400" />
                <span>Location & Navigation</span>
              </h3>

              <div className="bg-gray-800/50 rounded-lg mb-4 h-48 flex items-center justify-center border border-gray-600/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20"></div>
                <div className="text-center z-10">
                  <MapPin className="h-12 w-12 text-green-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-white font-medium">{festival.location}</p>
                  <p className="text-gray-300 text-sm">Interactive Map</p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/40 transition-all"></div>
              </div>

              <div className="space-y-3">
                <a
                  href={getGoogleMapsDirectionsUrl(festival.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 bg-green-600/20 text-green-200 border border-green-400/30 py-2 rounded-lg hover:bg-green-600/30 transition-all hover:scale-105"
                >
                  <Route className="h-4 w-4" />
                  <span>Get Directions</span>
                </a>

                <div className="grid grid-cols-3 gap-2">
                  <button className="flex flex-col items-center space-y-1 p-3 bg-blue-600/20 text-blue-200 border border-blue-400/30 rounded-lg hover:bg-blue-600/30 transition-all hover:scale-105">
                    <Car className="h-4 w-4" />
                    <span className="text-xs">Drive</span>
                  </button>
                  <button className="flex flex-col items-center space-y-1 p-3 bg-purple-600/20 text-purple-200 border border-purple-400/30 rounded-lg hover:bg-purple-600/30 transition-all hover:scale-105">
                    <Plane className="h-4 w-4" />
                    <span className="text-xs">Fly</span>
                  </button>
                  <button className="flex flex-col items-center space-y-1 p-3 bg-orange-600/20 text-orange-200 border border-orange-400/30 rounded-lg hover:bg-orange-600/30 transition-all hover:scale-105">
                    <Train className="h-4 w-4" />
                    <span className="text-xs">Train</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span>Quick Stats</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-gray-300">Community Score</span>
                  <span className="text-white font-medium">
                    {festival.vibe_score?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-gray-300">Upvotes</span>
                  <span className="text-white font-medium">{festival.upvotes?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-gray-300">Tags</span>
                  <span className="text-white font-medium">{festival.tags.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-gray-300">Vibe</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">{getVibeEmoji(festival.vibe_score)}</span>
                    <span className="text-white font-medium text-sm">{getVibeLabel(festival.vibe_score)}</span>
                  </div>
                </div>
                {showReviews && (
                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="text-gray-300">Reviews</span>
                    <span className="text-white font-medium">{reviews.length}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Compass className="h-5 w-5 text-cyan-400" />
                <span>Festival Tips</span>
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-cyan-600/20 rounded-lg border border-cyan-400/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-cyan-400 text-sm font-medium">🌤️ Weather</span>
                  </div>
                  <p className="text-cyan-200 text-sm">Check weather forecast for {festival.month} in {festival.location}</p>
                </div>

                <div className="p-3 bg-yellow-600/20 rounded-lg border border-yellow-400/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-400 text-sm font-medium">🎫 Tickets</span>
                  </div>
                  <p className="text-yellow-200 text-sm">Book early for better prices and availability</p>
                </div>

                <div className="p-3 bg-pink-600/20 rounded-lg border border-pink-400/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-pink-400 text-sm font-medium">🏨 Accommodation</span>
                  </div>
                  <p className="text-pink-200 text-sm">Reserve nearby hotels or camping spots in advance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20 transform animate-scale-in">
              <div className="text-center">
                {calendarAdded ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-white mb-4">Added to Calendar!</h3>
                    <p className="text-gray-300 mb-6">
                      Festival event has been successfully added to your Google Calendar.
                    </p>
                  </>
                ) : (
                  <>
                    <Calendar className="h-16 w-16 text-green-400 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-2xl font-bold text-white mb-4">Add to Calendar</h3>
                    <p className="text-gray-300 mb-6">
                      Add this festival to your Google Calendar to never miss the event!
                    </p>
                    <div className="bg-green-600/20 rounded-lg p-4 mb-6 border border-green-400/30">
                      <div className="text-green-200 text-sm space-y-1">
                        <p><strong>Event:</strong> {festival.title}</p>
                        <p><strong>Date:</strong> {formatDate(festival.month)}</p>
                        <p><strong>Location:</strong> {festival.location}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowCalendarModal(false)}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                      <a
                        href={generateGoogleCalendarLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleCalendarSuccess}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-center font-semibold transform hover:scale-105"
                      >
                        Add to Google Calendar
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showVideoModal && (
          <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${isVideoFullscreen ? 'bg-black/90' : ''}`}>
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 transform animate-scale-in ${isVideoFullscreen ? 'max-w-6xl w-full h-full max-h-screen' : 'max-w-4xl w-full'}`}>
              <div className="text-center h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Film className="h-8 w-8 text-red-400 animate-pulse" />
                    <div className="text-left">
                      <h3 className="text-2xl font-bold text-white">AI Festival Preview</h3>
                      <p className="text-red-200 text-sm">Powered by Tavus AI</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {videoUrl && !loadingVideo && (
                      <button
                        onClick={toggleVideoFullscreen}
                        className="p-2 bg-red-600/20 text-red-200 border border-red-400/30 rounded-lg hover:bg-red-600/30 transition-colors"
                        title={isVideoFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                      >
                        {isVideoFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </button>
                    )}

                    {!loadingVideo && (
                      <button
                        onClick={regenerateVideo}
                        className="p-2 bg-blue-600/20 text-blue-200 border border-blue-400/30 rounded-lg hover:bg-blue-600/30 transition-colors"
                        title="Regenerate Video"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {loadingVideo ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Loader className="h-12 w-12 text-red-400 animate-spin mx-auto mb-4" />
                      <p className="text-red-200 text-lg mb-2">Generating AI video...</p>
                      <div className="flex items-center justify-center space-x-2 text-gray-300 text-sm">
                        <Film className="h-4 w-4" />
                        <span>This may take a few moments</span>
                      </div>
                    </div>
                  </div>
                ) : videoError ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="bg-red-600/20 rounded-lg p-8 border border-red-400/30 max-w-md">
                      <div className="text-center">
                        <Video className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <h4 className="text-red-200 font-semibold mb-2">Video Generation Failed</h4>
                        <p className="text-red-300 text-sm mb-4">❌ {videoError}</p>
                        <button
                          onClick={regenerateVideo}
                          className="px-4 py-2 bg-red-600/50 text-red-200 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center space-x-2 mx-auto"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Try Again</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : videoUrl ? (
                  <div className="flex-1 flex flex-col">
                    <div className={`rounded-lg overflow-hidden border border-red-400/30 bg-black ${isVideoFullscreen ? 'flex-1' : 'aspect-video'} mb-4`}>
                      <video
                        ref={videoRef}
                        controls
                        className="w-full h-full rounded-lg"
                        poster={getRandomImage()}
                      >
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>

                    {videoScript && !isVideoFullscreen && (
                      <div className="bg-red-600/10 text-left text-sm text-red-200 p-4 rounded-lg border border-red-400/20 max-h-48 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-red-300 font-semibold flex items-center space-x-2">
                            <span>📜</span>
                            <span>AI Script</span>
                          </h4>
                          <span className="text-red-300 text-xs bg-red-600/20 px-2 py-1 rounded">
                            {videoScript.length} characters
                          </span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{videoScript}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300 text-lg">⚠️ Video not available yet</p>
                      <p className="text-gray-400 text-sm mt-2">Click "Try Again" to regenerate</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeVideoModal}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showVoiceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20 transform animate-scale-in">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <Mic className="h-16 w-16 text-blue-400 animate-pulse" />
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-white">AI Voice Assistant</h3>
                    <p className="text-blue-200 text-sm">Multilingual Festival Briefing</p>
                  </div>
                </div>

                <div className="bg-blue-600/10 rounded-lg p-4 mb-6 border border-blue-400/20">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Globe className="h-5 w-5 text-blue-400" />
                    <h4 className="text-blue-200 font-semibold">Select Language</h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelection(lang.code)}
                        disabled={loadingVoice || (lang.code !== 'en' && !userPlan)}
                        className={`p-3 rounded-lg border transition-all transform ${
                          lang.code === 'en' || userPlan ? 'hover:scale-105' : ''
                        } ${getLanguageButtonClass(lang.code)} ${
                          loadingVoice ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{lang.flag}</span>
                          <div className="text-left">
                            <div className="font-medium text-sm">
                              {lang.name}
                              {lang.code !== 'en' && !userPlan && (
                                <span className="ml-1 text-xs">🔒</span>
                              )}
                            </div>
                            <div className="text-xs opacity-75">{lang.accent}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-blue-300 text-xs">
                      Selected: {getSelectedLanguage().flag} {getSelectedLanguage().name} ({getSelectedLanguage().accent})
                    </p>
                    
                    {voiceUsageLeft !== null && (
                      <p className="text-amber-300 text-xs mt-1">
                        {voiceUsageLeft} voice generation{voiceUsageLeft !== 1 ? 's' : ''} remaining
                      </p>
                    )}
                    
                    {userPlan === 'yearly' && (
                      <p className="text-green-300 text-xs mt-1">
                        Unlimited voice generations available (Premium Plan)
                      </p>
                    )}
                  </div>
                </div>

                {loadingVoice ? (
                  <div className="bg-blue-600/20 rounded-lg p-6 mb-6 border border-blue-400/30">
                    <Loader className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-blue-200 text-sm mb-2">
                      Generating AI voice briefing in {getSelectedLanguage().name}...
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-gray-300 text-xs">
                      <Headphones className="h-4 w-4" />
                      <span>This may take a few moments</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {voiceError && (
                      <div className="bg-red-600/20 rounded-lg p-6 mb-6 border border-red-400/30">
                        <p className="text-red-200 text-sm">❌ {voiceError}</p>
                        <button
                          onClick={handleVoiceAssistant}
                          className="mt-3 px-4 py-2 bg-red-600/50 text-red-200 rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          Try Again
                        </button>
                      </div>
                    )}

                    {audioUrl && !voiceError && (
                      <div className="bg-blue-600/20 rounded-lg p-6 mb-6 border border-blue-400/30">
                        <div className="flex items-center justify-center space-x-4 mb-4">
                          <button
                            onClick={toggleAudioPlayback}
                            className="p-4 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors transform hover:scale-110 shadow-lg"
                          >
                            {isPlaying ? (
                              <Pause className="h-6 w-6 text-white" />
                            ) : (
                              <Play className="h-6 w-6 text-white" />
                            )}
                          </button>

                          <div className="flex items-center space-x-2">
                            <Volume2 className="h-5 w-5 text-blue-400" />
                            <span className="text-blue-200 text-sm font-medium">
                              {getSelectedLanguage().flag} {getSelectedLanguage().name}
                            </span>
                          </div>

                          <a
                            href={audioUrl}
                            download={`festival-briefing-${festival._id}-${voiceLang}.mp3`}
                            className="p-3 bg-blue-600/50 rounded-full hover:bg-blue-600 transition-colors transform hover:scale-110"
                            title="Download Audio"
                          >
                            <Download className="h-4 w-4 text-white" />
                          </a>
                        </div>

                        <audio
                          ref={audioRef}
                          src={audioUrl}
                          preload="auto"
                          style={{ display: 'none' }}
                        />

                        <div className="mt-3 text-center">
                          <p className="text-blue-200 text-sm">
                            🎧 AI-generated festival briefing ready!
                          </p>
                          <p className="text-blue-300 text-xs mt-1">
                            Click play to listen or download for offline use
                          </p>
                        </div>
                      </div>
                    )}

                    {voiceScript && !voiceError && (
                      <div className="bg-blue-600/10 rounded-lg p-4 mb-6 border border-blue-400/20 max-h-64 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-blue-200 font-semibold text-sm flex items-center space-x-2">
                            <span>📝</span>
                            <span>Voice Script ({getSelectedLanguage().name})</span>
                          </h4>
                          <span className="text-blue-300 text-xs bg-blue-600/20 px-2 py-1 rounded">
                            {voiceScript.length} characters
                          </span>
                        </div>
                        <p className="text-blue-200 text-sm whitespace-pre-line text-left leading-relaxed">
                          {voiceScript}
                        </p>
                      </div>
                    )}

                    {!audioUrl && !voiceScript && !loadingVoice && !voiceError && (
                      <div className="bg-gray-600/20 rounded-lg p-6 mb-6 border border-gray-400/30">
                        <div className="text-center">
                          <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-300 text-sm mb-2">
                            🎤 Generate an AI voice summary of this festival
                          </p>
                          <p className="text-gray-400 text-xs">
                            Select your preferred language and click "Generate Voice Briefing"
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  {!loadingVoice && (
                    <button
                      onClick={handleVoiceAssistant}
                      className="flex-1 px-4 py-3 bg-blue-600/20 text-blue-200 border border-blue-400/30 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Mic className="h-4 w-4" />
                      <span>🔄 {voiceScript || audioUrl ? 'Regenerate' : 'Generate Voice Briefing'}</span>
                    </button>
                  )}
                  <button
                    onClick={closeVoiceModal}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUpgradePrompt && (
          <div className="bg-purple-600/20 rounded-lg p-6 mb-6 border border-purple-400/30">
            <div className="text-center">
              <h4 className="text-purple-200 text-lg font-semibold mb-2">Upgrade Your Experience!</h4>
              <p className="text-purple-300 text-sm mb-4">
                {!userPlan 
                  ? "Get access to all languages and more voice generations with our premium plans"
                  : "Upgrade to yearly plan for unlimited voice generations"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/pricing"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
                >
                  View Premium Plans
                </a>
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
};

export default TripPlannerPage;