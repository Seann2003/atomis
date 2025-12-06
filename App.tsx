import React, { useState, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import { ELEMENTS, COMBINATIONS } from './constants';
import { TrackingData, ElementData, DragState } from './types';

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(3);
  const [combinedElement, setCombinedElement] = useState<ElementData | null>(null);
  const [message, setMessage] = useState("Initializing Lab...");
  
  // Drag State
  const [dragState, setDragState] = useState<DragState>({ active: false, hand: null, element: null });

  // Use a ref for tracking data to pass to UI overlay without re-renders
  const trackingDataRef = useRef<TrackingData>({
    left: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0} },
    right: { pinchDistance: 0.5, isPinching: false, isPointing: false, position: {x: 0, y: 0, z: 0} },
    isClapping: false,
    isResetGesture: false,
    handDistance: 1000,
    cameraAspect: 1.77
  });

  const clapTimer = useRef<number | null>(null);

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    setMessage("Lab Active. Pinch elements to select.");
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
      setMessage(`FUSION SUCCESS: ${combo.result.name}`);
      
      if (clapTimer.current) window.clearTimeout(clapTimer.current);
    } else {
      setMessage("Reaction Unstable: Incompatible");
    }
  }, [leftIndex, rightIndex, combinedElement]);

  // --- HIT TEST LOGIC ---
  // Converts normalized tracking coords to screen coords and checks collision with Shelf Items
  const performHitTest = (nx: number, ny: number, cameraAspect: number): HTMLElement | null => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const screenAspect = screenW / screenH;
    
    let screenX, screenY;

    if (screenAspect > cameraAspect) {
        const scale = screenW / 1;
        const videoH_pixels = (1 / cameraAspect) * screenW;
        const offsetY = (videoH_pixels - screenH) / 2;
        screenX = (1 - nx) * screenW; 
        screenY = ny * videoH_pixels - offsetY;
    } else {
        const scale = screenH / 1;
        const videoW_pixels = cameraAspect * screenH;
        const offsetX = (videoW_pixels - screenW) / 2;
        screenX = (1 - nx) * videoW_pixels - offsetX; 
        screenY = ny * screenH;
    }

    // Check collision with all shelf items
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

    // 1. Reset Gesture Check
    if (data.isResetGesture) {
        setCombinedElement(null);
        setMessage("Experiment Reset.");
        return;
    }

    if (combinedElement) return; // Disable interaction during fusion

    // 2. Clap Check
    if (data.isClapping) {
       checkCombination();
       return;
    }

    // 3. Drag and Drop Logic State Machine
    setDragState(current => {
        // --- START DRAG ---
        if (!current.active) {
            // Check Left Hand
            if (data.left.isPinching) {
                const hit = performHitTest(data.left.position.x, data.left.position.y, data.cameraAspect);
                if (hit) {
                    const symbol = hit.dataset.symbol;
                    const el = ELEMENTS.find(e => e.symbol === symbol);
                    if (el) return { active: true, hand: 'left', element: el };
                }
            }
            // Check Right Hand
            if (data.right.isPinching) {
                const hit = performHitTest(data.right.position.x, data.right.position.y, data.cameraAspect);
                if (hit) {
                    const symbol = hit.dataset.symbol;
                    const el = ELEMENTS.find(e => e.symbol === symbol);
                    if (el) return { active: true, hand: 'right', element: el };
                }
            }
            return current;
        } 
        
        // --- DURING DRAG ---
        else {
            const handData = current.hand === 'left' ? data.left : data.right;
            
            // --- DROP (Pinch Released) ---
            if (!handData.isPinching) {
                // Check if dropped back on shelf (Cancel)
                const hit = performHitTest(handData.position.x, handData.position.y, data.cameraAspect);
                
                if (!hit && current.element) {
                    // Dropped in main area -> SELECT ELEMENT
                    const newIndex = ELEMENTS.findIndex(e => e.symbol === current.element?.symbol);
                    if (newIndex !== -1) {
                        if (current.hand === 'left') setLeftIndex(newIndex);
                        else setRightIndex(newIndex);
                        setMessage(`Selected ${current.element.name}`);
                    }
                }
                return { active: false, hand: null, element: null };
            }
            return current;
        }
    });

  }, [combinedElement, checkCombination]);

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
                dragState={dragState}
            />
        </>
      )}
    </div>
  );
};

export default App;
