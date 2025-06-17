import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Star, Filter, Loader, ExternalLink, ThumbsUp } from 'lucide-react';

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

const DiscoveryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const searchParams = location.state?.searchParams;
  const results = location.state?.results;

  useEffect(() => {
    if (results && Array.isArray(results)) {
      setFestivals(results);
      setLoading(false);
    } else {
      // Fallback to mock data if no results from backend
      fetchFestivals();
    }
  }, [results]);

  const fetchFestivals = async () => {
    console.log('No backend results found, using fallback data');
    
    // Simulate loading
    setTimeout(() => {
      const mockFestivals: Festival[] = [
        {
          _id: "mock1",
          title: "Electric Dreams Festival - Austin Music Experience",
          location: "Austin, TX",
          tags: ["music", "technology", "art"],
          content: "An electrifying blend of music, technology, and art that brings together the most innovative artists and performers from around the world.",
          reddit_url: "https://reddit.com/r/festivals/mock1",
          upvotes: 286,
          month: "July",
          vibe_score: 0.42,
          fetched_at: "2025-01-17T09:37:05.678"
        },
        {
          _id: "mock2",
          title: "Sunset Food & Music Fest - San Diego Vibes",
          location: "San Diego, CA",
          tags: ["food", "music", "culture"],
          content: "A perfect fusion of culinary delights and musical experiences set against the beautiful San Diego sunset.",
          reddit_url: "https://reddit.com/r/festivals/mock2",
          upvotes: 156,
          month: "July",
          vibe_score: 0.35,
          fetched_at: "2025-01-17T09:37:06.678"
        }
      ];
      
      setFestivals(mockFestivals);
      setLoading(false);
    }, 1500);
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

  const filteredFestivals = festivals.filter(festival => {
    if (filter === 'all') return true;
    if (filter === 'positive') return festival.vibe_score !== null && festival.vibe_score >= 0.15;
    if (filter === 'neutral') return festival.vibe_score !== null && festival.vibe_score >= 0 && festival.vibe_score < 0.15;
    if (filter === 'negative') return festival.vibe_score !== null && festival.vibe_score < 0;
    return true;
  });

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
    return `${month} 2024`; // You can enhance this based on your needs
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Discovering amazing festivals for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Festival Discoveries
          </h1>
          <p className="text-gray-300 text-lg">
            {searchParams?.location && `Near ${searchParams.location} • `}
            {searchParams?.startDate && `${searchParams.startDate} • `}
            {festivals.length} festivals found
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-2 flex items-center space-x-2 border border-white/20">
            <Filter className="h-5 w-5 text-purple-400 ml-2" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              All Festivals
            </button>
            <button
              onClick={() => setFilter('positive')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'positive' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              🎉 Highly Rated
            </button>
            <button
              onClick={() => setFilter('neutral')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'neutral' ? 'bg-yellow-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              😐 Mixed Reviews
            </button>
            <button
              onClick={() => setFilter('negative')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'negative' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              😕 Lower Rated
            </button>
          </div>
        </div>

        {/* Festival Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFestivals.map((festival) => (
            <div
              key={festival._id}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl border-2 ${getVibeColor(festival.vibe_score)} hover:scale-105 transition-all duration-300`}
            >
              <div className="relative">
                <img
                  src={getRandomImage()}
                  alt={festival.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-2xl">{getVibeEmoji(festival.vibe_score)}</span>
                </div>
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4 text-orange-400" />
                  <span className="text-white text-sm font-semibold">{festival.upvotes}</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-white text-xs font-medium">{getVibeLabel(festival.vibe_score)}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{festival.title}</h3>
                <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                  {truncateContent(festival.content)}
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{festival.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{formatDate(festival.month)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{festival.upvotes} community upvotes</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {festival.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-xs border border-purple-400/30 capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/trip/${festival._id}`)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-sm"
                  >
                    Plan Trip
                  </button>
                  <a
                    href={festival.reddit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-orange-600/20 text-orange-200 border border-orange-400/30 rounded-lg hover:bg-orange-600/30 transition-colors flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFestivals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No festivals match your current filter.</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Show All Festivals
            </button>
          </div>
        )}

        {festivals.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No festivals found for your search criteria.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryPage;