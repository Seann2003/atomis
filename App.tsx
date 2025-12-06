import React, { useState, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import { ELEMENTS, COMBINATIONS } from './constants';
import { TrackingData, ElementData } from './types';

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(3);
  const [combinedElement, setCombinedElement] = useState<ElementData | null>(null);
  const [message, setMessage] = useState("LAB READY");

  // Error State Ref (for update loop access)
  const fusionErrorRef = useRef(false);

  // Refs for logic loop
  const trackingDataRef = useRef<TrackingData>({
    left: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0} },
    right: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0} },
    isClapping: false,
    isResetGesture: false,
    handDistance: 1000,
    cameraAspect: 1.77
  });

  // Previous frame pinch state (for detecting rising edge/click)
  const lastLeftPinch = useRef(false);
  const lastRightPinch = useRef(false);

  const clapStartRef = useRef<number>(0);
  const CLAP_DURATION_THRESHOLD = 800; // ms to hold clap

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const checkCombination = useCallback(() => {
    // If already combined, don't do anything
    if (combinedElement) return;

    const leftEl = ELEMENTS[leftIndex];
    const rightEl = ELEMENTS[rightIndex];
    
    const combo = COMBINATIONS.find(c => 
      (c.elements[0] === leftEl.symbol && c.elements[1] === rightEl.symbol) ||
      (c.elements[1] === leftEl.symbol && c.elements[0] === rightEl.symbol)
    );

    if (combo) {
      setCombinedElement(combo.result);
      setMessage(`FUSION SUCCESS: ${combo.result.name}`);
      fusionErrorRef.current = false;
    } else {
      setMessage("Reaction Unstable: Incompatible");
      fusionErrorRef.current = true; // Set Error State
    }
  }, [leftIndex, rightIndex, combinedElement]);

  // --- HIT TEST LOGIC ---
  const performHitTest = (nx: number, ny: number, cameraAspect: number): HTMLElement | null => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const screenAspect = screenW / screenH;
    
    let screenX, screenY;

    if (screenAspect > cameraAspect) {
        const videoH_pixels = (1 / cameraAspect) * screenW;
        const offsetY = (videoH_pixels - screenH) / 2;
        screenX = nx * screenW;  // DIRECT MAPPING
        screenY = ny * videoH_pixels - offsetY;
    } else {
        const videoW_pixels = cameraAspect * screenH;
        const offsetX = (videoW_pixels - screenW) / 2;
        screenX = nx * videoW_pixels - offsetX; // DIRECT MAPPING
        screenY = ny * screenH;
    }

    const elements = document.querySelectorAll('[id^="shelf-item-"]');
    for (let i = 0; i < elements.length; i++) {
        const rect = elements[i].getBoundingClientRect();
        if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
            return elements[i] as HTMLElement;
        }
    }
    return null;
  };

  const onTrackingUpdate = useCallback((data: TrackingData) => {
    trackingDataRef.current = data;
    const now = Date.now();

    // 1. Reset Gesture Check (Index Spin)
    if (data.isResetGesture) {
        if (combinedElement) {
            setCombinedElement(null);
            setMessage("RESET COMPLETE");
            fusionErrorRef.current = false;
            setTimeout(() => setMessage("LAB READY"), 1500);
        } else if (fusionErrorRef.current) {
            // Also allow reset if stuck in error
            fusionErrorRef.current = false;
            setMessage("LAB READY");
        }
        return; 
    }

    // Clear Error State if hands are separated
    if (fusionErrorRef.current) {
        if (!data.isClapping && data.handDistance > 0.25) {
            fusionErrorRef.current = false;
            setMessage("LAB READY");
        }
        // Don't process other logic while in error state
        return;
    }

    // 2. Pinch Selection Logic (Rising Edge Detection - Click)
    // Only if not combined
    if (!combinedElement && !fusionErrorRef.current) {
        
        // --- LEFT HAND ---
        if (data.left.isPinching && !lastLeftPinch.current) {
            // Rising Edge (Just Pinched)
            const hit = performHitTest(data.left.position.x, data.left.position.y, data.cameraAspect);
            if (hit) {
                const symbol = hit.dataset.symbol;
                const newIndex = ELEMENTS.findIndex(e => e.symbol === symbol);
                if (newIndex !== -1 && newIndex !== leftIndex) {
                    setLeftIndex(newIndex);
                    setMessage("ELEMENT SWAPPED (LEFT)");
                    setTimeout(() => setMessage("LAB READY"), 1000);
                }
            }
        }
        
        // --- RIGHT HAND ---
        if (data.right.isPinching && !lastRightPinch.current) {
            // Rising Edge (Just Pinched)
            const hit = performHitTest(data.right.position.x, data.right.position.y, data.cameraAspect);
            if (hit) {
                const symbol = hit.dataset.symbol;
                const newIndex = ELEMENTS.findIndex(e => e.symbol === symbol);
                if (newIndex !== -1 && newIndex !== rightIndex) {
                    setRightIndex(newIndex);
                    setMessage("ELEMENT SWAPPED (RIGHT)");
                    setTimeout(() => setMessage("LAB READY"), 1000);
                }
            }
        }
    }

    // Update previous pinch states
    lastLeftPinch.current = data.left.isPinching;
    lastRightPinch.current = data.right.isPinching;

    // 3. Clap & Hold Logic (Only if not combined)
    if (!combinedElement && data.isClapping && !fusionErrorRef.current) {
        if (clapStartRef.current === 0) {
            clapStartRef.current = now;
        }
        
        const duration = now - clapStartRef.current;
        if (duration > CLAP_DURATION_THRESHOLD) {
            checkCombination();
            clapStartRef.current = 0; // Reset
        } else {
             // Update UI with holding status (throttled slightly via React state, but acceptable)
             if (message !== "HOLD TO FUSE...") setMessage("HOLD TO FUSE...");
        }
    } else {
        // Reset timer if clap broken
        clapStartRef.current = 0;
        if (message === "HOLD TO FUSE...") setMessage("LAB READY");
    }

  }, [combinedElement, message, checkCombination, leftIndex, rightIndex]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <HandTracker onUpdate={onTrackingUpdate} onCameraReady={handleCameraReady} />
      
      {!isCameraReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="font-['Orbitron'] text-xl animate-pulse tracking-widest text-cyan-500">INITIALIZING LAB</p>
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
                trackingRef={trackingDataRef}
            />
        </>
      )}
    </div>
  );
};

export default App;