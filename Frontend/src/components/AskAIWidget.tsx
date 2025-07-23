import React, { useState, useEffect } from 'react';

const DAPPIER_WIDGET_ID = 'wd_01k0vtv9kdebfr0phb8fz5hf8k';


// Dynamically load the Dappier script
function useDappierScript() {
  useEffect(() => {
    if (!document.getElementById('dappier-script')) {
      const script = document.createElement('script');
      script.id = 'dappier-script';
      script.src = 'https://assets.dappier.com/widget/dappier-loader.min.js';
      script.setAttribute('widget-id', DAPPIER_WIDGET_ID);
      script.setAttribute('style-icon', 'chat');
      script.setAttribute('theme', 'light');
      document.body.appendChild(script);
    }
  }, []);
}

declare namespace JSX {
  interface IntrinsicElements {
    'dappier-ask-ai-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      widgetId?: string;
    };
  }
}

export default function AskAIWidget() {
  useDappierScript();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Sticky Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 flex items-center bg-indigo-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 hover:bg-indigo-700 transition-all"
        style={{ gap: '0.5rem' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8a9 9 0 1118 0z" /></svg>
        Ask AI
      </button>
      {/* Modal */}
      {open && (
        <div className="fixed inset-0 flex items-end md:items-center justify-center z-50" style={{ background: 'rgba(30, 27, 75, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-gradient-to-br from-[#4f2d7f] via-[#6c3bbd] to-[#1e1b4b] border border-indigo-500 rounded-2xl shadow-2xl w-full md:w-[540px] max-w-full p-0 relative flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-indigo-400">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8a9 9 0 1118 0z" /></svg>
                <span className="font-semibold text-lg text-white drop-shadow">Ask Festieee</span>
              </div>
              <button
                className="rounded-full p-2 hover:bg-indigo-100 transition-colors"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-300 hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="w-full h-[70vh] md:h-[60vh] overflow-hidden px-6 py-4 flex flex-col justify-between">
              <div id="dappier-ask-ai-widget">
                <dappier-ask-ai-widget widgetId="wd_01k0vtv9kdebfr0phb8fz5hf8k" />
              </div>
              <div className="pt-4 text-xs text-indigo-200 text-center opacity-80">Powered by Dappier • FestiFly 2025</div>
            </div>
          </div>
          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
              animation: fade-in 0.3s cubic-bezier(0.4,0,0.2,1);
            }
          `}</style>
        </div>
      )}
    </>
  );
}
