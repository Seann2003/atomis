import React, { useState, useRef, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import Dashboard from './components/Dashboard';
import MascotGuide from './components/MascotGuide';
import { ELEMENTS, COMBINATIONS } from './constants';
import { TrackingData, ElementData, CatalystType } from './types';

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  
  // State stores the actual ElementData object now, not just index
  const [leftElement, setLeftElement] = useState<ElementData>(ELEMENTS[0]);
  const [rightElement, setRightElement] = useState<ElementData>(ELEMENTS[3]); // Chlorine default
  
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
      // Avoid duplicates based on symbol
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
    left: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0}, isDetected: false },
    right: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0}, isDetected: false },
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
    
    // We assume saved elements behave like their base counterparts or we need to add dynamic combinations.
    // For this demo, we check symbols against the COMBINATIONS constant.
    
    const combo = COMBINATIONS.find(c => 
      (c.elements[0] === leftElement.symbol && c.elements[1] === rightElement.symbol) ||
      (c.elements[1] === leftElement.symbol && c.elements[0] === rightElement.symbol)
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
  }, [leftElement, rightElement, combinedElement, activeCatalyst]);

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
    // Filtering based on mode (Dashboard vs Lab)
    const elements = document.querySelectorAll('.interactable-btn');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        // If Dashboard is OPEN, ignore non-dashboard items
        if (isDashboardOpen && !el.id.startsWith('dashboard-')) continue;
        
        // If Dashboard is CLOSED, ignore dashboard items
        if (!isDashboardOpen && el.id.startsWith('dashboard-')) continue;

        if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
            return el;
        }
    }
    return null;
  };

  const handleInteraction = useCallback((hit: HTMLElement, hand: 'LEFT' | 'RIGHT') => {
      // 1. Dashboard Logic
      if (hit.id === 'dashboard-toggle') {
          setIsDashboardOpen(true);
          setMessage("DASHBOARD OPENED");
          return;
      }
      if (hit.id === 'dashboard-close-btn') {
          setIsDashboardOpen(false);
          setMessage("LAB READY");
          return;
      }
      if (hit.id.startsWith('dashboard-item-')) {
           // Trigger click on the element to select it
           hit.click();
           return;
      }

      // 2. Catalyst Logic
      if (hit.id.startsWith('catalyst-btn-')) {
          const type = hit.dataset.type as CatalystType;
          // Toggle off if same, otherwise set new
          setActiveCatalyst(prev => prev === type ? 'none' : type);
          setMessage(`${type.toUpperCase()} CATALYST ACTIVE`);
      }
      // 3. Shelf Logic
      else if (hit.id.startsWith('shelf-item-')) {
          const symbol = hit.dataset.symbol;
          
          // Combine all available elements to find the selected one
          const allElements = [...savedElements, ...ELEMENTS];
          
          // We find the first match. Note: Saved elements appear first in the UI list logic.
          const selectedElement = allElements.find(e => e.symbol === symbol);
          
          if (selectedElement) {
             if (hand === 'LEFT') {
                 setLeftElement(selectedElement);
                 setMessage("ELEMENT SWAPPED (LEFT)");
             } else {
                 setRightElement(selectedElement);
                 setMessage("ELEMENT SWAPPED (RIGHT)");
             }
             
             setTimeout(() => setMessage("LAB READY"), 1000);
          }
      }
  }, [savedElements, isDashboardOpen]);

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
            if (fusionErrorRef.current || combinedElement) {
                setCombinedElement(null);
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

  }, [combinedElement, message, checkCombination, handleInteraction, isDashboardOpen]);

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
                leftElement={leftElement} 
                rightElement={rightElement} 
                combinedElement={combinedElement}
                trackingData={trackingDataRef}
                activeCatalyst={activeCatalyst}
            />
            <UIOverlay 
                leftElement={leftElement} 
                rightElement={rightElement} 
                combinedElement={combinedElement}
                message={message}
                trackingRef={trackingDataRef}
                activeCatalyst={activeCatalyst}
                savedElements={savedElements}
                isDashboardOpen={isDashboardOpen}
                onToggleDashboard={() => setIsDashboardOpen(!isDashboardOpen)}
            />
            <Dashboard 
               isOpen={isDashboardOpen}
               onClose={() => setIsDashboardOpen(false)}
               savedElements={savedElements}
            />
            <MascotGuide 
               message={message}
               isDashboardOpen={isDashboardOpen}
               trackingData={trackingDataRef}
            />
        </>
      )}
    </div>
  );
};

export default App;
