import React, { useEffect, useState, useRef } from 'react';
import MascotAvatar from './MascotAvatar';
import { getSystemMessage } from '../utils/mascot';
import { TrackingData } from '../types';

interface MascotGuideProps {
  message: string; // System message from App
  isDashboardOpen: boolean;
  trackingData: React.MutableRefObject<TrackingData>;
}

const MascotGuide: React.FC<MascotGuideProps> = ({ message, isDashboardOpen, trackingData }) => {
  const [mascotText, setMascotText] = useState("Welcome to the Lab! I'm Atom.");
  const [isVisible, setIsVisible] = useState(true);

  // Track when the current text was actually displayed
  const lastUpdateRef = useRef<number>(Date.now());
  // Track the timeout to allow cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync system message to mascot speech with smart timing
  useEffect(() => {
    const nextText = getSystemMessage(message);
    const isIdle = message.includes("LAB READY");
    
    const scheduleUpdate = () => {
        const now = Date.now();
        // How long has the *current* message been visible?
        const timeVisible = now - lastUpdateRef.current;
        
        // Default reaction delay
        let delay = 500; 
        
        if (isIdle) {
            // If switching back to Idle, ensure the previous message 
            // was shown for at least 3 seconds.
            const minDuration = 3000;
            if (timeVisible < minDuration) {
                delay = minDuration - timeVisible;
            }
        }
        
        // Clear previous pending update
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            setMascotText(nextText);
            lastUpdateRef.current = Date.now(); // Reset timer upon actual update
        }, delay);
    };

    scheduleUpdate();

    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [message]);

  // Hide mascot when dashboard is open (since dashboard has its own)
  useEffect(() => {
    setIsVisible(!isDashboardOpen);
  }, [isDashboardOpen]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none overflow-visible ">
       {/* Speech Bubble */}
       <div className="mb-2 max-w-xs bg-white/10 backdrop-blur-md border border-cyan-500/30 p-4 rounded-t-2xl rounded-bl-2xl rounded-br-none text-right shadow-[0_0_20px_rgba(34,211,238,0.2)] animate-bounce-slight origin-bottom-right transform transition-all">
          <p className="text-cyan-100 font-mono text-sm leading-relaxed">
            {mascotText}
          </p>
       </div>

       {/* 3D Avatar Container */}
       <div className="w-40 h-40 relative group pointer-events-auto overflow-visible">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/40 transition-all duration-500"></div>
          
          {/* Container */}
          <div className="w-full h-full relative z-10 pointer-events-auto">
             <MascotAvatar trackingData={trackingData} />
          </div>
       </div>

       <style>{`
         @keyframes bounce-slight {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-5px); }
         }
         .animate-bounce-slight {
           animation: bounce-slight 3s ease-in-out infinite;
         }
       `}</style>
    </div>
  );
};

export default MascotGuide;
