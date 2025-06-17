import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Heart, Calendar, Search, Crown } from 'lucide-react';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: '',
    interests: [] as string[],
    startDate: '',
    endDate: ''
  });
  const [showPremium, setShowPremium] = useState(false);

  const interestOptions = [
    'Music', 'Food', 'Art', 'Technology', 'Culture', 'Comedy',
    'Film', 'Literature', 'Sports', 'Gaming', 'Wellness', 'Dance'
  ];

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
                onClick={() => setShowPremium(true)}
                className="flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
              >
                <Crown className="h-5 w-5" />
                <span>Premium Plan</span>
              </button>
            </div>
          </div>
        </div>

        {showPremium && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
              <div className="text-center">
                <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Premium Features</h3>
                <div className="text-gray-300 space-y-2 mb-6">
                  <p>• Unlimited festival searches</p>
                  <p>• AI-powered recommendations</p>
                  <p>• Priority booking assistance</p>
                  <p>• Exclusive festival access</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowPremium(false)}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={() => {
                      console.log('Premium upgrade requested');
                      setShowPremium(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;