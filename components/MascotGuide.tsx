import React, { useEffect, useState, useRef } from 'react';
import MascotAvatar from './MascotAvatar';
import { getSystemMessage } from '../utils/mascot';
import { getElementExplanation } from '../utils/gemini';
import { TrackingData, ElementData } from '../types';

interface MascotGuideProps {
  message: string; // System message from App
  isDashboardOpen: boolean;
  trackingData: React.MutableRefObject<TrackingData>;
  combinedElement: ElementData | null; // New element that was just created
}

const MascotGuide: React.FC<MascotGuideProps> = ({ message, isDashboardOpen, trackingData, combinedElement }) => {
  const [mascotText, setMascotText] = useState("Welcome to the Lab! I'm Atom.");
  const [isVisible, setIsVisible] = useState(true);
  
  // Track the current Gemini explanation
  const [geminiExplanation, setGeminiExplanation] = useState<string | null>(null);
  const [explanationStartTime, setExplanationStartTime] = useState<number | null>(null);
  const lastCombinedElementRef = useRef<string | null>(null);
  const geminiLoadingRef = useRef(false);

  // Track when the current text was actually displayed
  const lastUpdateRef = useRef<number>(Date.now());
  // Track the timeout to allow cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle new element creation - call Gemini API
  useEffect(() => {
    // Only trigger when a new element is successfully created (not errors like BOOM or X)
    if (combinedElement && 
        combinedElement.symbol !== 'BOOM' && 
        combinedElement.symbol !== 'X' &&
        combinedElement.symbol !== lastCombinedElementRef.current &&
        (message.includes('FUSION SUCCESS') || message.includes('QUIZ SUCCESS'))) {
      
      // If we have a previous explanation, ensure it was shown for at least 8 seconds
      if (geminiExplanation && explanationStartTime) {
        const timeShown = Date.now() - explanationStartTime;
        const minDisplayTime = 8000; // 8 seconds minimum
        
        if (timeShown < minDisplayTime) {
          // Wait until minimum time is reached before loading new explanation
          const remainingTime = minDisplayTime - timeShown;
          setTimeout(() => {
            // Now load the new explanation
            geminiLoadingRef.current = true;
            lastCombinedElementRef.current = combinedElement.symbol;
            
            getElementExplanation(combinedElement).then((explanation) => {
              setGeminiExplanation(explanation);
              setExplanationStartTime(Date.now());
              geminiLoadingRef.current = false;
            }).catch((error) => {
              console.error('Failed to get Gemini explanation:', error);
              geminiLoadingRef.current = false;
              setGeminiExplanation(`Amazing! You've created ${combinedElement.name}! This is a fascinating compound with unique properties.`);
              setExplanationStartTime(Date.now());
            });
          }, remainingTime);
          return;
        }
      }
      
      // Mark that we're loading a new explanation
      geminiLoadingRef.current = true;
      lastCombinedElementRef.current = combinedElement.symbol;
      
      // Call Gemini API to get explanation
      getElementExplanation(combinedElement).then((explanation) => {
        setGeminiExplanation(explanation);
        setExplanationStartTime(Date.now());
        geminiLoadingRef.current = false;
      }).catch((error) => {
        console.error('Failed to get Gemini explanation:', error);
        geminiLoadingRef.current = false;
        // Use fallback
        setGeminiExplanation(`Amazing! You've created ${combinedElement.name}! This is a fascinating compound with unique properties.`);
        setExplanationStartTime(Date.now());
      });
    }
    
    // Clear explanation when combinedElement is cleared (user resets/clears)
    // But ensure it was shown for at least 8 seconds
    if (!combinedElement && geminiExplanation && explanationStartTime) {
      const timeShown = Date.now() - explanationStartTime;
      const minDisplayTime = 8000; // 8 seconds minimum
      
      if (timeShown < minDisplayTime) {
        // Wait until minimum time is reached
        const timeoutId = setTimeout(() => {
          setGeminiExplanation(null);
          setExplanationStartTime(null);
          lastCombinedElementRef.current = null;
        }, minDisplayTime - timeShown);
        return () => clearTimeout(timeoutId);
      } else {
        setGeminiExplanation(null);
        setExplanationStartTime(null);
        lastCombinedElementRef.current = null;
      }
    }
  }, [combinedElement, message, geminiExplanation, explanationStartTime]);

  // Update text immediately when Gemini explanation is ready or changes
  useEffect(() => {
    if (geminiExplanation) {
      setMascotText(geminiExplanation);
      lastUpdateRef.current = Date.now();
      return; // Don't show system message when Gemini explanation is active
    }
  }, [geminiExplanation]);

  // Sync system message to mascot speech with smart timing
  // BUT: Don't show system message if we have an active Gemini explanation
  useEffect(() => {
    // If we have an active Gemini explanation, prioritize it over system messages
    if (geminiExplanation && explanationStartTime) {
      // Keep showing Gemini explanation as long as combinedElement exists
      // or until minimum 8 seconds have passed
      const timeShown = Date.now() - explanationStartTime;
      if (combinedElement || timeShown < 8000) {
        // Still showing combined element or haven't reached 8 seconds yet
        setMascotText(geminiExplanation);
        return;
      }
      // After 8 seconds and combinedElement is cleared, allow system messages
    }
    
    // Only show system messages if no active Gemini explanation
    if (!geminiExplanation) {
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
    }
  }, [message, geminiExplanation, explanationStartTime, combinedElement]);

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
