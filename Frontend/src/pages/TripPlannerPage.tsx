import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Video, Mic, Plus, Clock, Star, Share, Heart, ThumbsUp, Loader, MessageCircle, TrendingUp, Play, Pause, Volume2, Download, CheckCircle, Globe, Headphones } from 'lucide-react';

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
  const [voiceLang, setVoiceLang] = useState("en"); // default language
  
  // Use useRef for audio element
  const audioRef = useRef<HTMLAudioElement>(null);

  // Language options with flags and names
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

  // Clean up audio when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
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
      
      // Fallback to mock data for development
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

  const getReviewScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400 bg-green-400/20 border-green-400/30';
    if (score >= 0.4) return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
    return 'text-red-400 bg-red-400/20 border-red-400/30';
  };

  const getReviewScoreEmoji = (score: number) => {
    if (score >= 0.8) return '🔥';
    if (score >= 0.6) return '👍';
    if (score >= 0.4) return '👌';
    return '😐';
  };

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

  const formatDate = (month: string) => {
    return `${month} 2024`;
  };

  const truncateContent = (content: string | null, maxLength: number = 150) => {
    if (!content) return 'Discover this amazing festival experience...';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleAddToCalendar = () => {
    setShowCalendarModal(true);
  };

  const generateGoogleCalendarLink = () => {
    if (!festival) return '';
    
    const festivalName = encodeURIComponent(festival.title);
    const festivalLocation = encodeURIComponent(festival.location);
    const festivalDescription = encodeURIComponent(festival.content || 'Discover this amazing festival experience...');

    // Assuming the festival is a single-day event in the specified month 2024
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

  const handlePlayVideo = () => {
    setShowVideoModal(true);
  };

  const handleVoiceAssistant = async () => {
    if (!festival) return;
    
    // Reset states when opening modal
    setShowVoiceModal(true);
    setLoadingVoice(true);
    setVoiceScript(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setVoiceError(null);

    try {
      const response = await fetch("http://localhost:8000/api/generate-voice-briefing/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: festival._id, language: voiceLang }),
      });

      const data = await response.json();
      console.log('Voice API Response:', data); // Debug log
      
      if (response.ok && data.script) {
        setVoiceScript(data.script);
        setVoiceError(null);

        if (data.audio_url) {
          setAudioUrl(`http://localhost:8000${data.audio_url}`);
        } else if (data.audio_blob) {
          // Convert base64 to Blob URL
          const byteCharacters = atob(data.audio_blob);
          const byteArrays = [];

          for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
          }

          const blob = new Blob([new Uint8Array(byteArrays)], { type: 'audio/mpeg' });
          const blobUrl = URL.createObjectURL(blob);
          setAudioUrl(blobUrl);
        }
      } else {
        console.error("Voice Assistant Error:", data.error || 'Invalid response format');
        setVoiceError(data.error || 'Failed to generate voice briefing');
      }
    } catch (err) {
      console.error("Voice Assistant Failed:", err);
      setVoiceError('Network error occurred while generating voice briefing');
    } finally {
      setLoadingVoice(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(error => {
            console.error('Audio play failed:', error);
            setVoiceError('Failed to play audio. Please try again.');
          });
        }
      } catch (error) {
        console.error('Audio control error:', error);
        setVoiceError('Audio control error occurred');
      }
    }
  };

  // Handle audio events
  const handleAudioEvents = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);
      const handleError = () => {
        setIsPlaying(false);
        setVoiceError('Audio playback error occurred');
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      // Cleanup function
      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  };

  // Effect to handle audio events when audioUrl changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      const cleanup = handleAudioEvents();
      return cleanup;
    }
  }, [audioUrl]);

  const closeVoiceModal = () => {
    // Clean up audio when closing modal
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading festival details...</p>
        </div>
      </div>
    );
  }

  if (error && !festival) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
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

            {/* Description */}
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

            {/* Community Engagement */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
                <MessageCircle className="h-6 w-6 text-orange-400" />
                <span>Community Engagement</span>
              </h2>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 p-3 bg-orange-600/20 rounded-lg border border-orange-400/30">
                    <ThumbsUp className="h-5 w-5 text-orange-400" />
                    <span className="text-white font-semibold">{festival.upvotes.toLocaleString()} upvotes</span>
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

              {/* Reddit Reviews Button */}
              <button
                onClick={handleFetchRedditReviews}
                disabled={loadingReviews}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {loadingReviews ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Fetching Reddit Reviews...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" />
                    <span>Load Reddit Reviews</span>
                  </>
                )}
              </button>
            </div>

            {/* Reddit Reviews Section */}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
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

            {/* Quick Stats */}
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
                  <span className="text-white font-medium">{festival.upvotes.toLocaleString()}</span>
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
          </div>
        </div>

        {/* Enhanced Calendar Modal */}
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

        {/* Enhanced Video Modal */}
        {showVideoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20 transform animate-scale-in">
              <div className="text-center">
                <Video className="h-16 w-16 text-red-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-2xl font-bold text-white mb-4">AI Festival Preview</h3>
                <div className="bg-black/50 rounded-lg aspect-video mb-6 flex items-center justify-center border border-red-400/30">
                  <div className="text-center">
                    <Play className="h-12 w-12 text-red-400 mx-auto mb-2" />
                    <p className="text-gray-300">Tavus AI video player will be embedded here</p>
                    <p className="text-gray-400 text-sm mt-2">Experience the festival through AI-generated content</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Voice Modal with Language Selection */}
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

                {/* Language Selection */}
                <div className="bg-blue-600/10 rounded-lg p-4 mb-6 border border-blue-400/20">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Globe className="h-5 w-5 text-blue-400" />
                    <h4 className="text-blue-200 font-semibold">Select Language</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setVoiceLang(lang.code)}
                        disabled={loadingVoice}
                        className={`p-3 rounded-lg border transition-all transform hover:scale-105 ${
                          voiceLang === lang.code
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                            : 'bg-blue-600/20 border-blue-400/30 text-blue-200 hover:bg-blue-600/30'
                        } ${loadingVoice ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{lang.flag}</span>
                          <div className="text-left">
                            <div className="font-medium text-sm">{lang.name}</div>
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
                    {/* Error State */}
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

                    {/* Audio Player Section */}
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
                        
                        {/* Hidden Audio Element */}
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

                    {/* Script Display Section */}
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

                    {/* No Content State */}
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

                {/* Action Buttons */}
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
      </div>

      <style jsx>{`
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