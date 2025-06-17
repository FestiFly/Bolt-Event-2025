import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Video, Mic, Plus, Clock, Star, Share, Heart, ThumbsUp, Loader } from 'lucide-react';

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

const FestivalDetailPage = () => {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<FestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  useEffect(() => {
    fetchFestivalDetails();
  }, [festivalId]);

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

  const handleAddToCalendar = () => {
    console.log('Adding to calendar');
    setShowCalendarModal(true);
  };

  const handlePlayVideo = () => {
    console.log('Playing AI video');
    setShowVideoModal(true);
  };

  const handleVoiceAssistant = () => {
    console.log('Opening voice assistant');
    setShowVoiceModal(true);
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
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Discovery</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={getRandomImage()}
                alt={festival.title}
                className="w-full h-64 md:h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-start justify-between">
                  <div>
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
                    <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                      <Heart className="h-5 w-5 text-white" />
                    </button>
                    <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                      <Share className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 ${getVibeColor(festival.vibe_score)}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">About This Festival</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getVibeEmoji(festival.vibe_score)}</span>
                  <span className="text-sm text-gray-300">{getVibeLabel(festival.vibe_score)}</span>
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed mb-6">
                {festival.content || 'Discover this amazing festival experience...'}
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Festival Details</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><span className="font-medium">Location:</span> {festival.location}</p>
                    <p><span className="font-medium">Month:</span> {formatDate(festival.month)}</p>
                    <p><span className="font-medium">Community Score:</span> {festival.vibe_score?.toFixed(2) || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {festival.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-sm border border-purple-400/30 capitalize"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Community Engagement */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Community Engagement</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <ThumbsUp className="h-5 w-5 text-orange-400" />
                    <span className="text-white font-semibold">{festival.upvotes} upvotes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <span className="text-gray-300">
                      Fetched {new Date(festival.fetched_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <a
                  href={festival.reddit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600/20 text-orange-200 border border-orange-400/30 rounded-lg hover:bg-orange-600/30 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View on Reddit</span>
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 space-y-4">
              <button
                onClick={handleAddToCalendar}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Add to Calendar</span>
              </button>

              <button
                onClick={handlePlayVideo}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Video className="h-5 w-5" />
                <span>Watch AI Preview</span>
              </button>

              <button
                onClick={handleVoiceAssistant}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Mic className="h-5 w-5" />
                <span>Ask Voice Assistant</span>
              </button>

              <a
                href={festival.reddit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                <ExternalLink className="h-5 w-5" />
                <span>View Original Post</span>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Community Score</span>
                  <span className="text-white font-medium">
                    {festival.vibe_score?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Upvotes</span>
                  <span className="text-white font-medium">{festival.upvotes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Tags</span>
                  <span className="text-white font-medium">{festival.tags.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Vibe</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">{getVibeEmoji(festival.vibe_score)}</span>
                    <span className="text-white font-medium text-sm">{getVibeLabel(festival.vibe_score)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Add to Calendar</h3>
                <p className="text-gray-300 mb-6">
                  This will integrate with Google Calendar to add the festival dates to your calendar.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowCalendarModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log('Calendar integration');
                      setShowCalendarModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showVideoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20">
              <div className="text-center">
                <Video className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">AI Festival Preview</h3>
                <div className="bg-black/50 rounded-lg aspect-video mb-6 flex items-center justify-center">
                  <p className="text-gray-300">Tavus AI video player will be embedded here</p>
                </div>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showVoiceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
              <div className="text-center">
                <Mic className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Voice Assistant</h3>
                <div className="bg-blue-600/20 rounded-lg p-6 mb-6 border border-blue-400/30">
                  <p className="text-blue-200">ElevenLabs voice assistant will be integrated here</p>
                  <p className="text-gray-300 text-sm mt-2">Ask questions about the festival!</p>
                </div>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FestivalDetailPage;