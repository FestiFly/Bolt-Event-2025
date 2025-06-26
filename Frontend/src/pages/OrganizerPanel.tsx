import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Save, X, MapPin, Tags, Users } from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  location: string;
  subreddit: string;
  tags: string[];
  dateAdded: string;
  status: 'active' | 'pending' | 'archived';
}

const OrganizerPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newFestival, setNewFestival] = useState({
    name: '',
    location: '',
    subreddit: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchFestivals();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/organizer/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.username,
          password: loginForm.password,
        }),
      });
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      const data = await response.json();
      if (data.token) {
        setIsAuthenticated(true);
        document.cookie = `jwt=${data.token}; path=/; secure; samesite=strict`;
        console.log('Admin authenticated, token:', data.token);
      } else {
        alert('Invalid credentials.');
      }
    } catch (error) {
      alert('Invalid credentials.');
    }
  };

  const fetchFestivals = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/organizer/festivals/');
      const data = await response.json();
      setFestivals(data.festivals.map((f: any) => ({
        id: f._id,
        name: f.name,
        location: f.location,
        subreddit: f.subreddit,
        tags: f.tags,
        status: f.status,
        dateAdded: new Date(f.dateAdded).toISOString().split("T")[0]
      })));
    } catch (err) {
      console.error("Failed to fetch:", err);
    }
  };


  const handleAddFestival = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/organizer/festival/create/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFestival),
      });
      if (response.ok) {
        fetchFestivals();
        setNewFestival({ name: '', location: '', subreddit: '', tags: [] });
        setShowAddForm(false);
      } else {
        alert("Failed to add festival.");
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleDeleteFestival = async (id: string) => {
    if (!confirm("Are you sure you want to delete?")) return;
    await fetch(`http://127.0.0.1:8000/api/organizer/festival/${id}/delete/`, {
      method: "DELETE"
    });
    fetchFestivals();
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

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        backgroundImage: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
      }}>
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <Shield className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Organizer Access</h2>
              <p className="text-gray-300">Please login to access the festival management panel</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter password"
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Login
              </button>

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4"
    style={{
        background: "linear-gradient(to bottom right, rgb(88, 28, 135), rgb(0, 0, 0), rgb(49, 46, 129))"
      }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Organizer Panel</h1>
            <p className="text-gray-300">Manage festivals and submissions</p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              <span>Add Festival</span>
            </button>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 bg-red-600/20 text-red-200 border border-red-400/30 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Active Festivals</p>
                <p className="text-3xl font-bold text-white">
                  {festivals.filter(f => f.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-green-600/20 rounded-lg">
                <Users className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-white">
                  {festivals.filter(f => f.status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-600/20 rounded-lg">
                <Shield className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Festivals</p>
                <p className="text-3xl font-bold text-white">{festivals.length}</p>
              </div>
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Festival Form */}
        {showAddForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Festival</h2>
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
                disabled={!newFestival.name || !newFestival.location}
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
            <h2 className="text-2xl font-bold text-white">Festival Management</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
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
                {festivals.map((festival) => (
                  <tr key={festival.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">{festival.name}</div>
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
                      <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(festival.status)}`}>
                        {festival.status.charAt(0).toUpperCase() + festival.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300">
                      {festival.dateAdded}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingId(festival.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Edit className="h-4 w-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteFestival(festival.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerPanel;