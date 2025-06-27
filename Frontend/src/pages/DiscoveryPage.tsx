import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Star, Filter, Loader, ExternalLink, ThumbsUp, Search, X, SlidersHorizontal, Tag, TrendingUp } from 'lucide-react';

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

interface FilterState {
  search: string;
  location: string;
  month: string;
  vibeFilter: 'all' | 'positive' | 'neutral' | 'negative';
  tags: string[];
  minUpvotes: number;
  sortBy: 'relevance' | 'upvotes' | 'vibe' | 'recent';
}

const DiscoveryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    location: '',
    month: '',
    vibeFilter: 'all',
    tags: [],
    minUpvotes: 0,
    sortBy: 'relevance'
  });

  const searchParams = location.state?.searchParams;
  const results = location.state?.results;

  // Available filter options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const popularTags = [
    'music', 'food', 'art', 'technology', 'culture', 'comedy',
    'film', 'literature', 'sports', 'gaming', 'wellness', 'dance',
    'electronic', 'rock', 'indie', 'jazz', 'classical', 'folk'
  ];

  const locations = [
    'Austin, TX', 'Los Angeles, CA', 'New York, NY', 'Chicago, IL',
    'Miami, FL', 'Denver, CO', 'Seattle, WA', 'Portland, OR',
    'Nashville, TN', 'Atlanta, GA', 'San Francisco, CA', 'Boston, MA'
  ];

  useEffect(() => {
    if (results && Array.isArray(results)) {
      setFestivals(results);
      setLoading(false);
    } else {
      fetchFestivals();
    }
  }, [results]);

  const fetchFestivals = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get-all-festivals');
      if (!response.ok) throw new Error('Failed to fetch festivals');
      const data = await response.json();
      if (Array.isArray(data)) {
        setFestivals(data);
      } else if (Array.isArray(data.festivals)) {
        setFestivals(data.festivals);
      } else {
        setFestivals([]);
      }
    } catch (error) {
      console.error('Error fetching festivals:', error);
      setFestivals([]);
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

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      location: '',
      month: '',
      vibeFilter: 'all',
      tags: [],
      minUpvotes: 0,
      sortBy: 'relevance'
    });
  };

  // Helper function to safely convert to lowercase
  const safeToLowerCase = (str: string | null | undefined): string => {
    return str ? str.toLowerCase() : '';
  };

  // Helper function to safely check if string includes substring
  const safeIncludes = (str: string | null | undefined, searchTerm: string): boolean => {
    return str ? str.toLowerCase().includes(searchTerm.toLowerCase()) : false;
  };

  const filteredAndSortedFestivals = React.useMemo(() => {
    let filtered = festivals.filter(festival => {
      // Ensure festival has required properties
      if (!festival || !festival._id) return false;

      // Search filter with null safety
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          safeIncludes(festival.title, searchLower) ||
          safeIncludes(festival.location, searchLower) ||
          (festival.tags && Array.isArray(festival.tags) && 
           festival.tags.some(tag => safeIncludes(tag, searchLower))) ||
          safeIncludes(festival.content, searchLower);
        if (!matchesSearch) return false;
      }

      // Location filter with null safety
      if (filters.location && !safeIncludes(festival.location, filters.location)) {
        return false;
      }

      // Month filter with null safety
      if (filters.month && festival.month !== filters.month) {
        return false;
      }

      // Vibe filter
      if (filters.vibeFilter !== 'all') {
        if (filters.vibeFilter === 'positive' && (festival.vibe_score === null || festival.vibe_score < 0.15)) return false;
        if (filters.vibeFilter === 'neutral' && (festival.vibe_score === null || festival.vibe_score < 0 || festival.vibe_score >= 0.15)) return false;
        if (filters.vibeFilter === 'negative' && (festival.vibe_score === null || festival.vibe_score >= 0)) return false;
      }

      // Tags filter with null safety
      if (filters.tags.length > 0) {
        if (!festival.tags || !Array.isArray(festival.tags)) return false;
        const hasMatchingTag = filters.tags.some(filterTag => 
          festival.tags.some(festivalTag => 
            safeIncludes(festivalTag, filterTag)
          )
        );
        if (!hasMatchingTag) return false;
      }

      // Minimum upvotes filter
      if ((festival.upvotes || 0) < filters.minUpvotes) {
        return false;
      }

      return true;
    });

    // Sort festivals with null safety
    switch (filters.sortBy) {
      case 'upvotes':
        filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case 'vibe':
        filtered.sort((a, b) => (b.vibe_score || 0) - (a.vibe_score || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.fetched_at ? new Date(a.fetched_at).getTime() : 0;
          const dateB = b.fetched_at ? new Date(b.fetched_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      default: // relevance
        // Keep original order or implement relevance scoring
        break;
    }

    return filtered;
  }, [festivals, filters]);

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
    return month ? `${month} 2024` : 'Date TBD';
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.location) count++;
    if (filters.month) count++;
    if (filters.vibeFilter !== 'all') count++;
    if (filters.tags.length > 0) count++;
    if (filters.minUpvotes > 0) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <div className="text-center">
          <Loader className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Discovering amazing festivals for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Festival Discoveries
          </h1>
          <p className="text-gray-300 text-lg">
            {searchParams?.location && `Near ${searchParams.location} • `}
            {searchParams?.startDate && `${searchParams.startDate} • `}
            {filteredAndSortedFestivals.length} of {festivals.length} festivals
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
          {/* Main Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search festivals by name, location, tags, or description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">Quick Filters:</span>
            </div>
            
            <button
              onClick={() => handleFilterChange('vibeFilter', filters.vibeFilter === 'positive' ? 'all' : 'positive')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filters.vibeFilter === 'positive' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🎉 Highly Rated
            </button>
            
            <button
              onClick={() => handleFilterChange('month', filters.month === 'July' ? '' : 'July')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filters.month === 'July' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              📅 July Events
            </button>
            
            <button
              onClick={() => handleFilterChange('tags', filters.tags.includes('music') ? filters.tags.filter(t => t !== 'music') : [...filters.tags, 'music'])}
              className={`px-4 py-2 rounded-lg transition-all ${
                filters.tags.includes('music') 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🎵 Music
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                showAdvancedFilters 
                  ? 'bg-orange-600 text-white shadow-lg' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Advanced</span>
              {activeFiltersCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 text-red-200 border border-red-400/30 rounded-lg hover:bg-red-600/30 transition-all"
              >
                <X className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-white/20 pt-6 space-y-6 animate-fadeIn">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location Filter */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span>Location</span>
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc} className="bg-gray-800">{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span>Month</span>
                  </label>
                  <select
                    value={filters.month}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Months</option>
                    {months.map(month => (
                      <option key={month} value={month} className="bg-gray-800">{month}</option>
                    ))}
                  </select>
                </div>

                {/* Minimum Upvotes */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span>Min Upvotes</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minUpvotes}
                    onChange={(e) => handleFilterChange('minUpvotes', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center space-x-2">
                    <Star className="h-4 w-4 text-purple-400" />
                    <span>Sort By</span>
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="relevance" className="bg-gray-800">Relevance</option>
                    <option value="upvotes" className="bg-gray-800">Most Upvoted</option>
                    <option value="vibe" className="bg-gray-800">Best Vibe</option>
                    <option value="recent" className="bg-gray-800">Most Recent</option>
                  </select>
                </div>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-white font-medium mb-3 flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-purple-400" />
                  <span>Festival Types</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-all capitalize ${
                        filters.tags.includes(tag)
                          ? 'bg-purple-600 text-white shadow-lg border-2 border-purple-400'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-300">
            <span className="text-lg font-semibold text-white">{filteredAndSortedFestivals.length}</span> festivals found
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-sm">({activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied)</span>
            )}
          </div>
          
          {filters.search && (
            <div className="text-gray-300 text-sm">
              Searching for: <span className="text-purple-300 font-medium">"{filters.search}"</span>
            </div>
          )}
        </div>

        {/* Festival Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAndSortedFestivals.map((festival, index) => (
            <div
              key={festival._id}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl border-2 ${getVibeColor(festival.vibe_score)} hover:scale-105 transition-all duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative">
                <img
                  src={getRandomImage()}
                  alt={festival.title || 'Festival'}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-2xl">{getVibeEmoji(festival.vibe_score)}</span>
                </div>
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4 text-orange-400" />
                  <span className="text-white text-sm font-semibold">{festival.upvotes || 0}</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-white text-xs font-medium">{getVibeLabel(festival.vibe_score)}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{festival.title || 'Untitled Festival'}</h3>
                <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                  {truncateContent(festival.content)}
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{festival.location || 'Location TBD'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{formatDate(festival.month)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">{festival.upvotes || 0} community upvotes</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {festival.tags && Array.isArray(festival.tags) && festival.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-xs border border-purple-400/30 capitalize"
                    >
                      {tag || 'tag'}
                    </span>
                  ))}
                  {festival.tags && Array.isArray(festival.tags) && festival.tags.length > 3 && (
                    <span className="px-3 py-1 bg-gray-600/30 text-gray-200 rounded-full text-xs border border-gray-400/30">
                      +{festival.tags.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/trip/${festival._id}`)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-sm"
                  >
                    View Details
                  </button>
                  {festival.reddit_url && (
                    <a
                      href={festival.reddit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-orange-600/20 text-orange-200 border border-orange-400/30 rounded-lg hover:bg-orange-600/30 transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredAndSortedFestivals.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Festivals Found</h3>
              <p className="text-gray-400 mb-6">
                No festivals match your current search and filter criteria.
              </p>
              <div className="space-y-3">
                <button
                  onClick={clearAllFilters}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Clear All Filters
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Start New Search
                </button>
              </div>
            </div>
          </div>
        )}

        {festivals.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Festivals Available</h3>
              <p className="text-gray-400 mb-6">
                No festivals found in our database. Please try again later.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Go Back Home
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default DiscoveryPage;