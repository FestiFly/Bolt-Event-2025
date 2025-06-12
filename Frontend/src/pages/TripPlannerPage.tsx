import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Video, Mic, Plus, Clock, Star, Share, Heart } from 'lucide-react';

interface FestivalDetail {
  id: string;
  name: string;
  location: string;
  dates: string;
  description: string;
  venue: string;
  ticketPrice: string;
  lineup: string[];
  amenities: string[];
  weatherForecast: string;
  image: string;
  mapUrl: string;
}

const TripPlannerPage = () => {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<FestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  useEffect(() => {
    fetchFestivalDetails();
  }, [festivalId]);

  const fetchFestivalDetails = async () => {
    // TODO: Connect to backend API
    console.log('Fetching festival details for ID:', festivalId);
    
    // Simulate API response
    setTimeout(() => {
      const mockFestival: FestivalDetail = {
        id: festivalId!,
        name: 'Electric Dreams Festival',
        location: 'Austin, TX',
        dates: 'March 15-17, 2024',
        description: 'An electrifying blend of music, technology, and art that brings together the most innovative artists and performers from around the world.',
        venue: 'Zilker Park',
        ticketPrice: '$299 - $599',
        lineup: ['Deadmau5', 'Porter Robinson', 'ODESZA', 'Flume', 'Disclosure', 'Chrome Sparks'],
        amenities: ['Food Trucks', 'Art Installations', 'VIP Areas', 'Charging Stations', 'Medical Tent', 'Lost & Found'],
        weatherForecast: 'Partly cloudy, 75°F high, 55°F low',
        image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg',
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.2936332465836!2d-97.77311068488116!3d30.26371408181688!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8644b5a85b7aa3e9%3A0x7b5c4d8b2e8a9f8e!2sZilker%20Park%2C%20Austin%2C%20TX!5e0!3m2!1sen!2sus!4v1635789456789!5m2!1sen!2sus'
      };
      
      setFestival(mockFestival);
      setLoading(false);
    }, 1000);
  };

  const handleAddToCalendar = () => {
    // TODO: Integrate with Google Calendar API
    console.log('Adding to calendar');
    setShowCalendarModal(true);
  };

  const handlePlayVideo = () => {
    // TODO: Integrate with Tavus
    console.log('Playing AI video');
    setShowVideoModal(true);
  };

  const handleVoiceAssistant = () => {
    // TODO: Integrate with ElevenLabs
    console.log('Opening voice assistant');
    setShowVoiceModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading festival details...</p>
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
                src={festival.image}
                alt={festival.name}
                className="w-full h-64 md:h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {festival.name}
                    </h1>
                    <div className="flex items-center space-x-4 text-gray-200">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{festival.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{festival.dates}</span>
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
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">About This Festival</h2>
              <p className="text-gray-300 leading-relaxed mb-6">{festival.description}</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Venue Details</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><span className="font-medium">Location:</span> {festival.venue}</p>
                    <p><span className="font-medium">Ticket Price:</span> {festival.ticketPrice}</p>
                    <p><span className="font-medium">Weather:</span> {festival.weatherForecast}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {festival.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-full text-sm border border-blue-400/30"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Lineup */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Featured Artists</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {festival.lineup.map((artist, index) => (
                  <div
                    key={artist}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{artist}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Location</h2>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={festival.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
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
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Connect to booking platform
                  console.log('Opening booking link');
                }}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                <ExternalLink className="h-5 w-5" />
                <span>Book Tickets</span>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Duration</span>
                  <span className="text-white font-medium">3 Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Artists</span>
                  <span className="text-white font-medium">{festival.lineup.length}+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-white font-medium">4.8</span>
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
                      // TODO: Google Calendar integration
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

export default TripPlannerPage;