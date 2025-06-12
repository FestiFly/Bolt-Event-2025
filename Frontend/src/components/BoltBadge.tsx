import React from 'react';
import { Zap } from 'lucide-react';

const BoltBadge = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-2 rounded-full shadow-lg flex items-center space-x-2 hover:shadow-xl transition-shadow">
        <Zap className="h-4 w-4" />
        <span className="text-sm font-semibold">Built with Bolt</span>
      </div>
    </div>
  );
};

export default BoltBadge;