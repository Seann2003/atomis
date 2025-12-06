
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import Dashboard from './components/Dashboard';
import MascotGuide from './components/MascotGuide';
import { ELEMENTS, COMBINATIONS } from './constants';
import { TrackingData, ElementData, CatalystType, GameState } from './types';

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  
  const [leftElement, setLeftElement] = useState<ElementData>(ELEMENTS[0]);
  const [rightElement, setRightElement] = useState<ElementData>(ELEMENTS[3]); 
  
  const [combinedElement, setCombinedElement] = useState<ElementData | null>(null);
  const [message, setMessage] = useState("LAB READY");
  const [activeCatalyst, setActiveCatalyst] = useState<CatalystType>('none');
  const [savedElements, setSavedElements] = useState<ElementData[]>([]);
  
  const [gameState, setGameState] = useState<GameState>('playing');
  const [deathReason, setDeathReason] = useState<string>('');

  // Fallback to prevent infinite loading if camera fails to init
  useEffect(() => {
    const t = setTimeout(() => {
        if (!isCameraReady) {
            console.warn("Camera init timeout - Forcing app start");
            setIsCameraReady(true);
        }
    }, 10000);
    return () => clearTimeout(t);
  }, [isCameraReady]);

  const [labSlots, setLabSlots] = useState<ElementData[]>([]);

  // Load saved history and lab slots on mount
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('chemLabHistory') || '[]');
    setSavedElements(history);
    
    const savedSlots = localStorage.getItem('labSlots');
    if (savedSlots) {
      try {
        const parsed = JSON.parse(savedSlots);
        setLabSlots(parsed);
        // Set initial elements from slots if available
        if (parsed.length > 0) {
          setLeftElement(parsed[0]);
          if (parsed.length > 1) {
            setRightElement(parsed[1]);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved slots', e);
      }
    }
  }, []);

  // Strict Warning System
  useEffect(() => {
    if (gameState === 'dead') return;
    
    const symbols = [leftElement.symbol, rightElement.symbol];
    const hasNa = symbols.includes('Na');
    const hasH2O = symbols.includes('H2O');
    
    // Check if critical condition exists
    if (hasNa && hasH2O && activeCatalyst === 'heat') {
      setMessage("WARNING: DO NOT FUSE! HIGHLY EXPLOSIVE!");
    } else if (hasNa && hasH2O) {
       if (!message.includes("WARNING")) {
           setMessage("Hint: Heat might be dangerous...");
       }
    }
  }, [leftElement, rightElement, activeCatalyst, gameState, message]);

  const saveElement = (element: ElementData) => {
      const history = JSON.parse(localStorage.getItem('chemLabHistory') || '[]');
      if (!history.find((e: ElementData) => e.symbol === element.symbol)) {
          const newHistory = [element, ...history];
          localStorage.setItem('chemLabHistory', JSON.stringify(newHistory));
          setSavedElements(newHistory);
      }
      
      // Automatically add to lab slots if not already present and slots aren't full
      setLabSlots(prevSlots => {
          // Check if element is already in slots
          if (prevSlots.find(e => e.symbol === element.symbol)) {
              return prevSlots; // Already in slots, no change
          }
          
          // Check if slots are full (max 8)
          if (prevSlots.length >= 8) {
              return prevSlots; // Slots full, can't add
          }
          
          // Add to slots
          const newSlots = [...prevSlots, element];
          localStorage.setItem('labSlots', JSON.stringify(newSlots));
          return newSlots;
      });
  };

  // Error State Ref (for update loop access)
  const fusionErrorRef = useRef(false);
  const lastInteractionTime = useRef(0);

  const trackingDataRef = useRef<TrackingData>({
    left: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0}, indexPosition: {x: 0, y: 0, z: 0}, isPresent: false },
    right: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0}, indexPosition: {x: 0, y: 0, z: 0}, isPresent: false },
    isClapping: false,
    isResetGesture: false,
    isClosedFist: false,
    handDistance: 1000,
    cameraAspect: 1.77
  });

  const lastLeftHoverRef = useRef<string | null>(null);
  const lastRightHoverRef = useRef<string | null>(null);

  const clapStartRef = useRef<number>(0);
  const CLAP_DURATION_THRESHOLD = 800; 

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const checkCombination = useCallback(() => {
    if (combinedElement || gameState === 'dead') return;
    
    const symbols = [leftElement.symbol, rightElement.symbol];

    // EXPLOSION TRAP
    if (symbols.includes('Na') && symbols.includes('H2O') && activeCatalyst === 'heat') {
        setGameState('dead');
        setDeathReason("Sodium reacts violently with water under heat, causing a massive explosion.");
        setCombinedElement({
            symbol: 'BOOM',
            name: 'EXPLOSION',
            color: '#ff0000',
            atomicNumber: 0,
            description: 'Fatal Error'
        });
        return;
    }

    const combo = COMBINATIONS.find(c => 
      (c.elements[0] === leftElement.symbol && c.elements[1] === rightElement.symbol) ||
      (c.elements[1] === leftElement.symbol && c.elements[0] === rightElement.symbol)
    );

    if (combo) {
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
      fusionErrorRef.current = true; 
    }
  }, [leftElement, rightElement, combinedElement, activeCatalyst, gameState]);

  const performHitTest = (nx: number, ny: number, cameraAspect: number): HTMLElement | null => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const screenAspect = screenW / screenH;
    
    let screenX, screenY;

    if (screenAspect > cameraAspect) {
        const videoH_pixels = (1 / cameraAspect) * screenW;
        const offsetY = (videoH_pixels - screenH) / 2;
        screenX = nx * screenW;  
        screenY = ny * videoH_pixels - offsetY;
    } else {
        const videoW_pixels = cameraAspect * screenH;
        const offsetX = (videoW_pixels - screenW) / 2;
        screenX = nx * videoW_pixels - offsetX; 
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
          
          // Only use elements from lab slots
          const selectedElement = labSlots.find(e => e.symbol === symbol);
          
          if (selectedElement) {
             lastInteractionTime.current = now;
             if (hand === 'LEFT') {
                 setLeftElement(selectedElement);
             } else {
                 setRightElement(selectedElement);
             }
          }
      }
  }, [labSlots, isDashboardOpen]);

  const onTrackingUpdate = useCallback((data: TrackingData) => {
    // Disable all gesture effects when dashboard is open
    if (isDashboardOpen) {
      // Still update the ref for visual tracking (mascot, etc.) but don't process gestures
      trackingDataRef.current = data;
      return;
    }
    
    trackingDataRef.current = data;
    const now = Date.now();
    
    if (gameState === 'dead') return;

    if (data.isResetGesture || (data.isClosedFist && combinedElement)) {
        if (combinedElement) {
            saveElement(combinedElement);
            setCombinedElement(null);
            setMessage("ELEMENT SAVED TO SHELF");
            fusionErrorRef.current = false;
            setTimeout(() => setMessage("LAB READY"), 2000);
        } else if (data.isResetGesture) {
            if (fusionErrorRef.current || combinedElement) {
                setCombinedElement(null);
                fusionErrorRef.current = false;
                setMessage("LAB READY");
            }
        }
        return; 
    }

    if (fusionErrorRef.current) {
        if (!data.isClapping && data.handDistance > 0.25) {
            fusionErrorRef.current = false;
            setMessage("LAB READY");
        }
        return;
    }

    if (!combinedElement && !fusionErrorRef.current) {
        // Only hit test if the hand is present
        if (data.left.isPresent) {
            const leftHit = performHitTest(data.left.indexPosition.x, data.left.indexPosition.y, data.cameraAspect);
            if (leftHit) {
                if (leftHit.id !== lastLeftHoverRef.current || data.left.isPinching) {
                    handleInteraction(leftHit, 'LEFT', data.left.isPinching);
                    lastLeftHoverRef.current = leftHit.id;
                }
            } else {
                lastLeftHoverRef.current = null;
            }
        } else {
            // Reset hover state if hand lost
            lastLeftHoverRef.current = null;
        }
        
        if (data.right.isPresent) {
            const rightHit = performHitTest(data.right.indexPosition.x, data.right.indexPosition.y, data.cameraAspect);
            if (rightHit) {
                 if (rightHit.id !== lastRightHoverRef.current || data.right.isPinching) {
                    handleInteraction(rightHit, 'RIGHT', data.right.isPinching);
                    lastRightHoverRef.current = rightHit.id;
                 }
            } else {
                lastRightHoverRef.current = null;
            }
        } else {
             lastRightHoverRef.current = null;
        }
    }

    if (!combinedElement && data.isClapping && !fusionErrorRef.current) {
        if (clapStartRef.current === 0) {
            clapStartRef.current = now;
        }
        
        const duration = now - clapStartRef.current;
        if (duration > CLAP_DURATION_THRESHOLD) {
            checkCombination();
            clapStartRef.current = 0; 
        } else {
             if (!message.includes("WARNING")) {
                if (message !== "HOLD TO FUSE...") setMessage("HOLD TO FUSE...");
             }
        }
    } else {
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
                labSlots={labSlots}
                isDashboardOpen={isDashboardOpen}
                onToggleDashboard={() => setIsDashboardOpen(!isDashboardOpen)}
            />
            <Dashboard 
               isOpen={isDashboardOpen}
               onClose={() => {
                 // Reload slots when closing dashboard in case they changed
                 const savedSlots = localStorage.getItem('labSlots');
                 if (savedSlots) {
                   try {
                     const parsed = JSON.parse(savedSlots);
                     setLabSlots(parsed);
                     // Update active elements if current ones are not in slots
                     if (parsed.length > 0 && !parsed.find(e => e.symbol === leftElement.symbol)) {
                       setLeftElement(parsed[0]);
                     }
                     if (parsed.length > 1 && !parsed.find(e => e.symbol === rightElement.symbol)) {
                       setRightElement(parsed[1] || parsed[0]);
                     }
                   } catch (e) {
                     console.error('Failed to parse saved slots', e);
                   }
                 }
                 setIsDashboardOpen(false);
               }}
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
