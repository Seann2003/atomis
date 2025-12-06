import React, { useState, useRef, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import { ELEMENTS, COMBINATIONS } from './constants';
import { TrackingData, ElementData, CatalystType } from './types';

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(3);
  const [combinedElement, setCombinedElement] = useState<ElementData | null>(null);
  const [message, setMessage] = useState("LAB READY");
  const [activeCatalyst, setActiveCatalyst] = useState<CatalystType>('none');
  const [savedElements, setSavedElements] = useState<ElementData[]>([]);

  // Load saved history on mount
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('chemLabHistory') || '[]');
    setSavedElements(history);
  }, []);

  const saveElement = (element: ElementData) => {
      const history = JSON.parse(localStorage.getItem('chemLabHistory') || '[]');
      // Avoid duplicates
      if (!history.find((e: ElementData) => e.symbol === element.symbol)) {
          const newHistory = [element, ...history];
          localStorage.setItem('chemLabHistory', JSON.stringify(newHistory));
          setSavedElements(newHistory);
      }
  };

  // Error State Ref (for update loop access)
  const fusionErrorRef = useRef(false);

  // Refs for logic loop
  const trackingDataRef = useRef<TrackingData>({
    left: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0} },
    right: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0} },
    isClapping: false,
    isResetGesture: false,
    isClosedFist: false,
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

    const leftEl = ELEMENTS[leftIndex] || savedElements.find(e => e.symbol === ELEMENTS[leftIndex]?.symbol) || ELEMENTS[0];
    const rightEl = ELEMENTS[rightIndex] || savedElements.find(e => e.symbol === ELEMENTS[rightIndex]?.symbol) || ELEMENTS[0];
    
    // We need to check against all available elements (including saved) for combinations
    // But currently combinations are hardcoded in constants.ts. 
    // We assume saved elements behave like their base counterparts or we need to add dynamic combinations.
    // For this demo, we check symbols.
    
    const combo = COMBINATIONS.find(c => 
      (c.elements[0] === leftEl.symbol && c.elements[1] === rightEl.symbol) ||
      (c.elements[1] === leftEl.symbol && c.elements[0] === rightEl.symbol)
    );

    if (combo) {
        // Check Catalyst Requirements
        if (combo.requiredCatalyst && combo.requiredCatalyst !== activeCatalyst) {
            setMessage(`Failed: Requires ${combo.requiredCatalyst.toUpperCase()} Catalyst`);
            fusionErrorRef.current = true;
            return;
        }

        setCombinedElement(combo.result);
        setMessage(`FUSION SUCCESS: ${combo.result.name}`);
        fusionErrorRef.current = false;
    } else {
      setMessage("Reaction Unstable: Incompatible");
      fusionErrorRef.current = true; // Set Error State
    }
  }, [leftIndex, rightIndex, combinedElement, activeCatalyst, savedElements]);

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

    // Check all interactable elements (Shelf + Catalyst)
    const elements = document.querySelectorAll('.interactable-btn');
    for (let i = 0; i < elements.length; i++) {
        const rect = elements[i].getBoundingClientRect();
        if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
            return elements[i] as HTMLElement;
        }
    }
    return null;
  };

  const handleInteraction = useCallback((hit: HTMLElement, hand: 'LEFT' | 'RIGHT') => {
      // 1. Catalyst Logic
      if (hit.id.startsWith('catalyst-btn-')) {
          const type = hit.dataset.type as CatalystType;
          // Toggle off if same, otherwise set new
          setActiveCatalyst(prev => prev === type ? 'none' : type);
          setMessage(`${type.toUpperCase()} CATALYST ACTIVE`);
      }
      // 2. Shelf Logic
      else if (hit.id.startsWith('shelf-item-')) {
          const symbol = hit.dataset.symbol;
          // Look up in both generic and saved elements
          const allElements = [...savedElements, ...ELEMENTS];
          const newIndex = allElements.findIndex(e => e.symbol === symbol);
          
          if (newIndex !== -1) {
             // NOTE: Because we merged arrays in UI, indices might be shifted relative to logic.
             // We need to ensure logic uses the correct element data. 
             // For simplicity, we just store the generic index for now, assuming standard ELEMENTS first.
             // A more robust system would store the actual element object.
             // Here we just map back to ELEMENTS array index if possible, or handle saved items differently.
             
             // Simpler approach for demo: Just update the index relative to ELEMENTS if it exists there, 
             // otherwise we need a way to selecting "saved" items. 
             // To keep it compatible with existing code:
             const originalIndex = ELEMENTS.findIndex(e => e.symbol === symbol);
             if (originalIndex !== -1) {
                  if (hand === 'LEFT') setLeftIndex(originalIndex);
                  else setRightIndex(originalIndex);
             } else {
                 // It's a saved element (compound). 
                 // Currently the logic relies on ELEMENTS[index]. 
                 // We will skip selecting saved elements for fusion input in this version 
                 // unless we refactor the whole state to store ElementData instead of indices.
                 setMessage("CANNOT USE COMPOUND AS INPUT");
                 return;
             }
             
             if (hand === 'LEFT') setMessage("ELEMENT SWAPPED (LEFT)");
             else setMessage("ELEMENT SWAPPED (RIGHT)");
             
             setTimeout(() => setMessage("LAB READY"), 1000);
          }
      }
  }, [leftIndex, rightIndex, savedElements]);

  const onTrackingUpdate = useCallback((data: TrackingData) => {
    trackingDataRef.current = data;
    const now = Date.now();

    // 1. Reset Gesture Check (Index Spin) OR Closed Fist Save
    if (data.isResetGesture || (data.isClosedFist && combinedElement)) {
        if (combinedElement) {
            saveElement(combinedElement);
            setCombinedElement(null);
            setMessage("ELEMENT SAVED TO SHELF");
            fusionErrorRef.current = false;
            setTimeout(() => setMessage("LAB READY"), 2000);
        } else if (data.isResetGesture) {
            // Just reset if nothing to save
            if (fusionErrorRef.current) {
                fusionErrorRef.current = false;
                setMessage("LAB READY");
            }
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
            const hit = performHitTest(data.left.position.x, data.left.position.y, data.cameraAspect);
            if (hit) handleInteraction(hit, 'LEFT');
        }
        
        // --- RIGHT HAND ---
        if (data.right.isPinching && !lastRightPinch.current) {
            const hit = performHitTest(data.right.position.x, data.right.position.y, data.cameraAspect);
            if (hit) handleInteraction(hit, 'RIGHT');
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

  }, [combinedElement, message, checkCombination, leftIndex, rightIndex, handleInteraction]);

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
                activeCatalyst={activeCatalyst}
            />
            <UIOverlay 
                leftElement={ELEMENTS[leftIndex]} 
                rightElement={ELEMENTS[rightIndex]} 
                combinedElement={combinedElement}
                message={message}
                trackingRef={trackingDataRef}
                activeCatalyst={activeCatalyst}
                savedElements={savedElements}
            />
        </>
      )}
    </div>
  );
};

export default App;