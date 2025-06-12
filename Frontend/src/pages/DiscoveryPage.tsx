import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Star, Filter, Loader } from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  location: string;
  dates: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  attendees: number;
  rating: number;
  tags: string[];
  image: string;
  description: string;
}

const DiscoveryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const searchParams = location.state?.searchParams;

  useEffect(() => {
    fetchFestivals();
  }, []);

  const fetchFestivals = async () => {
    // TODO: Connect to backend API
    console.log('Fetching festivals with params:', searchParams);
    
    // Simulate API response
    setTimeout(() => {
      const mockFestivals: Festival[] = [
        {
          id: '1',
          name: 'Electric Dreams Festival',
          location: 'Austin, TX',
          dates: 'March 15-17, 2024',
          sentiment: 'positive',
          attendees: 25000,
          rating: 4.8,
          tags: ['Music', 'Technology', 'Art'],
          image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg',
          description: 'An electrifying blend of music, technology, and art'
        },
        {
          id: '2',
          name: 'Sunset Food & Music Fest',
          location: 'San Diego, CA',
          dates: 'April 5-7, 2024',
          sentiment: 'positive',
          attendees: 15000,
          rating: 4.6,
          tags: ['Food', 'Music', 'Culture'],
          image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
          description: 'A perfect fusion of culinary delights and musical experiences'
        },
        {
          id: '3',
          name: 'Comedy Central Live',
          location: 'Chicago, IL',
          dates: 'May 12-14, 2024',
          sentiment: 'neutral',
          attendees: 8000,
          rating: 4.2,
          tags: ['Comedy', 'Entertainment'],
          image: 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
          description: 'Three days of non-stop laughter with top comedians'
        }
      ];
      
      setFestivals(mockFestivals);
      setLoading(false);
    }, 1500);
  };

  const getSentimentEmoji = (sentiment: Festival['sentiment']) => {
    switch (sentiment) {
      case 'positive': return '🎉';
      case 'neutral': return '😐';
      case 'negative': return '😕';
    }
  };

  const getSentimentColor = (sentiment: Festival['sentiment']) => {
    switch (sentiment) {
      case 'positive': return 'border-green-400 bg-green-400/20';
      case 'neutral': return 'border-yellow-400 bg-yellow-400/20';
      case 'negative': return 'border-red-400 bg-red-400/20';
    }
  };

  const filteredFestivals = festivals.filter(festival => 
    filter === 'all' || festival.sentiment === filter
  );

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
              🎉 Trending
            </button>
            <button
              onClick={() => setFilter('neutral')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'neutral' ? 'bg-yellow-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              😐 Mixed Reviews
            </button>
          </div>
        </div>

        {/* Festival Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFestivals.map((festival) => (
            <div
              key={festival.id}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl border-2 ${getSentimentColor(festival.sentiment)} hover:scale-105 transition-all duration-300`}
            >
              <div className="relative">
                <img
                  src={festival.image}
                  alt={festival.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-2xl">{getSentimentEmoji(festival.sentiment)}</span>
                </div>
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-white text-sm font-semibold">{festival.rating}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{festival.name}</h3>
                <p className="text-gray-300 mb-4">{festival.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span>{festival.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span>{festival.dates}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span>{festival.attendees.toLocaleString()} attendees</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {festival.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-sm border border-purple-400/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => navigate(`/trip/${festival.id}`)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Plan Trip
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredFestivals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No festivals match your current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryPage;