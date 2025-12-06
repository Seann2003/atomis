import React, { useState, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import { ELEMENTS, COMBINATIONS, GESTURE_COOLDOWN } from './constants';
import { TrackingData, ElementData } from './types';

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(3);
  const [combinedElement, setCombinedElement] = useState<ElementData | null>(null);
  const [message, setMessage] = useState("Initializing System...");
  
  const trackingDataRef = useRef<TrackingData>({
    left: { pinchDistance: 0.5, isPinching: false, isPinkyGesture: false, isThumbGesture: false, position: {x: 0.2, y: 0.5, z: 0} },
    right: { pinchDistance: 0.5, isPinching: false, isPinkyGesture: false, isThumbGesture: false, position: {x: 0.8, y: 0.5, z: 0} },
    isClapping: false,
    handDistance: 1000
  });

  const lastLeftGestureTime = useRef(0);
  const lastRightGestureTime = useRef(0);
  const clapTimer = useRef<number | null>(null);

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    setMessage("System Active. Trackers Online.");
  }, []);

  const checkCombination = useCallback(() => {
    if (combinedElement) return;

    const leftEl = ELEMENTS[leftIndex];
    const rightEl = ELEMENTS[rightIndex];
    
    const combo = COMBINATIONS.find(c => 
      (c.elements[0] === leftEl.symbol && c.elements[1] === rightEl.symbol) ||
      (c.elements[1] === leftEl.symbol && c.elements[0] === rightEl.symbol)
    );

    if (combo) {
      setCombinedElement(combo.result);
      setMessage(`FUSION DETECTED: ${combo.result.name}`);
      
      if (clapTimer.current) window.clearTimeout(clapTimer.current);
      clapTimer.current = window.setTimeout(() => {
        setCombinedElement(null);
        setMessage("Ready for new synthesis.");
      }, 5000);
    } else {
      setMessage("Incompatible Elements");
    }
  }, [leftIndex, rightIndex, combinedElement]);

  const onTrackingUpdate = useCallback((data: TrackingData) => {
    trackingDataRef.current = data;
    
    const now = Date.now();

    if (!combinedElement) {
        // Left Hand Pinky -> Next Left
        if (data.left.isPinkyGesture && (now - lastLeftGestureTime.current > GESTURE_COOLDOWN)) {
            setLeftIndex(prev => (prev + 1) % ELEMENTS.length);
            lastLeftGestureTime.current = now;
        }

        // Right Hand Thumb -> Next Right
        if (data.right.isThumbGesture && (now - lastRightGestureTime.current > GESTURE_COOLDOWN)) {
            setRightIndex(prev => (prev + 1) % ELEMENTS.length);
            lastRightGestureTime.current = now;
        }
    }

    if (data.isClapping && !combinedElement) {
       checkCombination();
    }

  }, [combinedElement, checkCombination]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <HandTracker onUpdate={onTrackingUpdate} onCameraReady={handleCameraReady} />
      
      {!isCameraReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="font-['Orbitron'] text-xl animate-pulse tracking-widest text-cyan-500">INITIALIZING SENSORS</p>
            <p className="text-gray-500 text-xs mt-3 font-mono">REQUESTING OPTICAL FEED ACCESS...</p>
          </div>
        </div>
      )}

      {isCameraReady && (
        <>
            <Scene 
                leftElement={ELEMENTS[leftIndex]} 
                rightElement={ELEMENTS[rightIndex]} 
                combinedElement={combinedElement}
                trackingData={trackingDataRef}
            />
            <UIOverlay 
                leftElement={ELEMENTS[leftIndex]} 
                rightElement={ELEMENTS[rightIndex]} 
                combinedElement={combinedElement}
                message={message}
            />
        </>
      )}
    </div>
  );
};

export default App;