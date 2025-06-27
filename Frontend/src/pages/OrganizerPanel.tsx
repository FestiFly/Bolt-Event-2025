import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Edit, Trash2, X, MapPin, Users, LogOut, RefreshCw, Search, Filter, Calendar, TrendingUp, BarChart3, Activity } from 'lucide-react';
import Cookies from 'js-cookie';

interface Festival {
  id: string;
  name: string;
  location: string;
  subreddit: string;
  tags: string[];
  dateAdded: string;
  status: 'active' | 'pending' | 'archived';
  url?: string;
  description?: string;
}

const OrganizerPanel = () => {
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'archived'>('all');
  const [newFestival, setNewFestival] = useState({
    name: '',
    location: '',
    subreddit: '',
    tags: [] as string[],
    url: '',
    description: ''
  });

  // Get JWT token from cookies
  const getAuthToken = (): string | null => {
    return Cookies.get('jwt') || null;
  };

  useEffect(() => {
    // Check authentication
    const token = getAuthToken();
    if (!token) {
      navigate('/organizer');
      return;
    }

    fetchFestivals();
  }, [navigate]);

  const fetchFestivals = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.error('No auth token found');
        navigate('/organizer');
        return;
      }
      
      const response = await fetch('http://127.0.0.1:8000/api/organizer/festivals/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Handle unauthorized or other errors
        if (response.status === 401) {
          console.error('Authentication token expired or invalid');
          // Clear cookies and localStorage
          Cookies.remove('jwt');
          localStorage.removeItem('organizerToken');
          navigate('/organizer');
          return;
        }
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map the response data to match our Festival interface
      setFestivals(data.festivals.map((f: any) => ({
        id: f._id,
        name: f.title || f.name || '',  // Handle both title and name fields
        location: f.location || '',
        subreddit: f.subreddit || '',
        tags: f.tags || [],
        status: f.status || 'pending',
        dateAdded: new Date(f.dateAdded?.$date || f.dateAdded || Date.now()).toISOString().split("T")[0],
        url: f.url || '',
        description: f.content || f.description || ''
      })));
    } catch (err) {
      console.error("Failed to fetch festivals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFestival = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.error('No auth token found');
        navigate('/organizer');
        return;
      }
      
      const response = await fetch('http://127.0.0.1:8000/api/organizer/festival/create/', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newFestival),
      });
      
      if (response.ok) {
        fetchFestivals();
        setNewFestival({ 
          name: '', 
          location: '', 
          subreddit: '', 
          tags: [],
          url: '',
          description: ''
        });
        setShowAddForm(false);
      } else {
        // Handle error responses
        const errorData = await response.json();
        alert(`Failed to add festival: ${errorData.error || 'Unknown error'}`);
        
        if (response.status === 401) {
          // Token expired, redirect to login
          navigate('/organizer');
        }
      }
    } catch (err) {
      console.error("Error adding festival:", err);
      alert("An error occurred while adding the festival.");
    }
  };

  const handleDeleteFestival = async (id: string) => {
    if (!confirm("Are you sure you want to delete this festival?")) return;

    try {
      const token = getAuthToken();
      
      if (!token) {
        console.error('No auth token found');
        navigate('/organizer');
        return;
      }
      
      const response = await fetch(`http://127.0.0.1:8000/api/organizer/festival/${id}/delete/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchFestivals();
      } else {
        // Handle error responses
        const errorData = await response.json();
        alert(`Failed to delete festival: ${errorData.error || 'Unknown error'}`);
        
        if (response.status === 401) {
          // Token expired, redirect to login
          navigate('/organizer');
        }
      }
    } catch (err) {
      console.error("Failed to delete festival:", err);
    }
  };

  const handleUpdateFestival = async (id: string, updatedData: Partial<Festival>) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.error('No auth token found');
        navigate('/organizer');
        return;
      }
      
      const response = await fetch(`http://127.0.0.1:8000/api/organizer/festival/${id}/update/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      
      if (response.ok) {
        fetchFestivals();
        setEditingId(null);
      } else {
        // Handle error responses
        const errorData = await response.json();
        alert(`Failed to update festival: ${errorData.error || 'Unknown error'}`);
        
        if (response.status === 401) {
          // Token expired, redirect to login
          navigate('/organizer');
        }
      }
    } catch (err) {
      console.error("Failed to update festival:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('organizerToken');
    Cookies.remove('jwt', { path: '/' });
    navigate('/organizer');
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !newFestival.tags.includes(tag)) {
      setNewFestival(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setNewFestival(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getStatusColor = (status: Festival['status']) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-200 border-green-400/30';
      case 'pending': return 'bg-yellow-600/20 text-yellow-200 border-yellow-400/30';
      case 'archived': return 'bg-gray-600/20 text-gray-200 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: Festival['status']) => {
    switch (status) {
      case 'active': return '🟢';
      case 'pending': return '🟡';
      case 'archived': return '⚪';
    }
  };

  const filteredFestivals = festivals.filter(festival => {
    const festivalName = festival.name || '';
    const festivalLocation = festival.location || '';
    const festivalSubreddit = festival.subreddit || '';

    const matchesSearch = festivalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      festivalLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      festivalSubreddit.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || festival.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: festivals.length,
    active: festivals.filter(f => f.status === 'active').length,
    pending: festivals.filter(f => f.status === 'pending').length,
    archived: festivals.filter(f => f.status === 'archived').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading organizer panel...</p>
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Festival Management
            </h1>
            <p className="text-gray-300 flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Organizer Dashboard</span>
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={fetchFestivals}
              className="flex items-center space-x-2 bg-blue-600/20 text-blue-200 border border-blue-400/30 px-4 py-2 rounded-lg hover:bg-blue-600/30 transition-all hover:scale-105"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              <span>Add Festival</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-600/20 text-red-200 border border-red-400/30 px-4 py-2 rounded-lg hover:bg-red-600/30 transition-all hover:scale-105"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Festivals</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Active Festivals</p>
                <p className="text-3xl font-bold text-white">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-600/20 rounded-lg">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-white">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-600/20 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Archived</p>
                <p className="text-3xl font-bold text-white">{stats.archived}</p>
              </div>
              <div className="p-3 bg-gray-600/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search festivals by name, location, or subreddit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Add Festival Form */}
        {showAddForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Plus className="h-6 w-6 text-green-400" />
                <span>Add New Festival</span>
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Festival Name</label>
                <input
                  type="text"
                  value={newFestival.name}
                  onChange={(e) => setNewFestival(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter festival name"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={newFestival.location}
                  onChange={(e) => setNewFestival(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="City, State"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Subreddit</label>
                <input
                  type="text"
                  value={newFestival.subreddit}
                  onChange={(e) => setNewFestival(prev => ({ ...prev, subreddit: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="r/subredditname"
                />
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">URL (Optional)</label>
                <input
                  type="text"
                  value={newFestival.url}
                  onChange={(e) => setNewFestival(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-white font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newFestival.description}
                  onChange={(e) => setNewFestival(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] resize-y"
                  placeholder="Enter festival description"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newFestival.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center space-x-1 px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-sm border border-purple-400/30"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleTagRemove(tag)}
                        className="hover:text-red-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Type tag and press Enter"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFestival}
                disabled={!newFestival.name || !newFestival.location || !newFestival.subreddit || newFestival.tags.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Festival
              </button>
            </div>
          </div>
        )}

        {/* Festivals List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Festival Management</h2>
              <div className="text-gray-300 text-sm">
                Showing {filteredFestivals.length} of {festivals.length} festivals
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/5">
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Festival</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Location</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Subreddit</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Tags</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Date Added</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFestivals.map((festival, index) => (
                  <tr
                    key={festival.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">{festival.name}</div>
                      {festival.url && (
                        <a 
                          href={festival.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View Details
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1 text-gray-300">
                        <MapPin className="h-4 w-4" />
                        <span>{festival.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-blue-300">{festival.subreddit}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {festival.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-purple-600/20 text-purple-200 rounded text-xs border border-purple-400/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(festival.status)} flex items-center space-x-1 w-fit`}>
                        <span>{getStatusIcon(festival.status)}</span>
                        <span>{festival.status.charAt(0).toUpperCase() + festival.status.slice(1)}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300">
                      {festival.dateAdded}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingId(festival.id)}
                          className="p-2 hover:bg-blue-600/20 rounded-lg transition-colors group"
                          title="Edit Festival"
                        >
                          <Edit className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
                        </button>
                        <button
                          onClick={() => handleDeleteFestival(festival.id)}
                          className="p-2 hover:bg-red-600/20 rounded-lg transition-colors group"
                          title="Delete Festival"
                        >
                          <Trash2 className="h-4 w-4 text-red-400 group-hover:text-red-300" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredFestivals.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Festivals Found</h3>
                <p className="text-gray-400 mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No festivals match your current filters.'
                    : 'No festivals have been added yet.'}
                </p>
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OrganizerPanel;