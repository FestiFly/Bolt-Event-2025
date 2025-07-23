import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Zap, Bot, Sparkles, Crown } from 'lucide-react';
import Cookies from 'js-cookie';

// TypeScript declaration for custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dappier-ask-ai-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        widgetId?: string;
      };
    }
  }
}

const DAPPIER_WIDGET_ID = 'wd_01k0vtv9kdebfr0phb8fz5hf8k';

// Check if user is premium
const isPremiumUser = (): boolean => {
  const token = Cookies.get('jwt');
  if (!token) return false;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const decodedToken = JSON.parse(jsonPayload);
    return decodedToken?.plan === 'monthly' || decodedToken?.plan === 'yearly';
  } catch (error) {
    return false;
  }
};

// Dynamically load the Dappier script
function useDappierScript() {
  useEffect(() => {
    if (!document.getElementById('dappier-script')) {
      const script = document.createElement('script');
      script.id = 'dappier-script';
      script.src = 'https://assets.dappier.com/widget/dappier-loader.min.js';
      script.setAttribute('widget-id', DAPPIER_WIDGET_ID);
      script.setAttribute('style-icon', 'chat');
      script.setAttribute('theme', 'dark');
      document.body.appendChild(script);
    }
  }, []);
}

export default function FestiFlyAIChat() {
  useDappierScript();
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check premium status
  const userIsPremium = isPremiumUser();

  return (
    <>
      {/* Floating Action Button */}
      {/* Adjust the button position by changing 'bottom-24' (move up) or other Tailwind classes as needed */}
      <div className="fixed bottom-24 right-4 sm:bottom-15 sm:right-6 z-50">
        <button
          onClick={() => setOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative"
          aria-label="Open FestiFly AI Chat"
        >
          {/* Main Button */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 rounded-full shadow-2xl backdrop-blur-sm border border-white/20 transition-all duration-300 ease-out transform hover:scale-110 hover:shadow-purple-500/30 hover:shadow-2xl">
            {/* Animated Glow Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/30 to-indigo-400/30 blur-xl transition-all duration-300 group-hover:blur-2xl group-hover:scale-125 opacity-60 animate-pulse"></div>

            {/* Icon Container */}
            <div className="relative flex items-center justify-center w-full h-full">
                <MessageCircle
                  className={`w-5 h-5 sm:w-6 sm:h-6 text-white transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}
                  strokeWidth={2}
                />
                {/* Premium Sparkle Effect */}
                {userIsPremium && (
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                  </div>
                )}
                {/* Notification Dot */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full border-2 border-purple-600 animate-bounce"></div>
              </div>

            {/* Pulse Animation Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-20"></div>
          </div>
          {/* Enhanced Tooltip */}
          <div className={`absolute bottom-full right-0 mb-3 px-4 py-3 bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-xl border border-white/20 shadow-2xl transition-all duration-200 min-w-max ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold">FestiFly AI Assistant</span>
              {userIsPremium && <Crown className="w-3 h-3 text-yellow-400" />}
            </div>
            <p className="text-xs text-gray-300">Your festival discovery companion</p>
            {/* Arrow */}
            <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900/95"></div>
          </div>
        </button>
      </div>

      {/* Modal for Dappier Widget */}
      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl mx-auto h-full max-h-[95vh] sm:max-h-[90vh]">
            {/* Main Modal */}
            <div className="relative h-full bg-gradient-to-br from-gray-900/95 via-purple-900/90 to-indigo-900/95 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-modal-slide-up">
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>

              {/* Header */}
              <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-indigo-600/20">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* AI Avatar with Animation */}
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
                    {userIsPremium && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Crown className="w-2 h-2 text-gray-900" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white">FestiFly AI</h2>
                      {userIsPremium && (
                        <span className="px-2 py-1 bg-yellow-400/20 text-yellow-300 text-xs rounded-full border border-yellow-400/30">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-purple-200/80">Festival Discovery Companion</p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-red-500/20 rounded-full border border-white/20 transition-all duration-200 hover:scale-105 flex items-center justify-center group"
                  title="Close Chat"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 group-hover:text-red-300" />
                </button>
              </div>

              {/* Dappier Widget Mode */}
              <div className="h-full p-4 sm:p-6">
                <div id="dappier-ask-ai-widget" className="h-full">
                  <dappier-ask-ai-widget widgetId={DAPPIER_WIDGET_ID} />
                </div>
              </div>

              {/* Footer */}
              <div className="relative border-t border-white/10 p-3 sm:p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20">
                <div className="flex items-center justify-center gap-2 text-xs text-purple-200/60">
                  <Sparkles className="w-3 h-3" />
                  <span>Powered by AI • FestiFly 2025</span>
                  {userIsPremium && (
                    <>
                      <span>•</span>
                      <Crown className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-300">Premium Active</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Custom Styles */}
      <style>{`
        @keyframes modal-slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-modal-slide-up {
          animation: modal-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .animate-modal-slide-up {
            margin: 0.5rem;
            height: calc(100vh - 1rem);
          }
        }
      `}</style>
    </>
  );
}
