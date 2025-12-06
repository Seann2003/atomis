import React, { useRef, useEffect } from 'react';
import { ElementData, TrackingData, DragState } from '../types';
import { ELEMENTS } from '../constants';

interface UIOverlayProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  message: string;
  trackingRef: React.MutableRefObject<TrackingData>;
  dragState: DragState;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ leftElement, rightElement, combinedElement, message, trackingRef, dragState }) => {
  const ghostRef = useRef<HTMLDivElement>(null);
  
  // Animation Loop for UI Updates (No React Render Lag)
  useEffect(() => {
    let animId: number;
    
    const updateUI = () => {
      const data = trackingRef.current;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const screenAspect = screenW / screenH;
      const videoAspect = data.cameraAspect;

      // Coordinate Remapping Logic
      // NOTE: data.left.position.x is already inverted in HandTracker to match Screen Space (0=Left, 1=Right)
      const getScreenCoords = (nx: number, ny: number) => {
        let x, y;
        if (screenAspect > videoAspect) {
            const videoH_pixels = (1 / videoAspect) * screenW;
            const offsetY = (videoH_pixels - screenH) / 2;
            x = nx * screenW; // DIRECT MAPPING
            y = ny * videoH_pixels - offsetY;
        } else {
            const videoW_pixels = videoAspect * screenH;
            const offsetX = (videoW_pixels - screenW) / 2;
            x = nx * videoW_pixels - offsetX; // DIRECT MAPPING
            y = ny * screenH;
        }
        return { x, y };
      };

      // 1. Highlight Shelf Items on Hover (since no cursor)
      const shelfItems = document.querySelectorAll('[id^="shelf-item-"]');
      shelfItems.forEach(item => {
          const rect = item.getBoundingClientRect();
          let isHovered = false;
          
          // Check Left Hand
          if (data.left.position.x !== 0) {
              const l = getScreenCoords(data.left.position.x, data.left.position.y);
              if (l.x >= rect.left && l.x <= rect.right && l.y >= rect.top && l.y <= rect.bottom) isHovered = true;
          }
          // Check Right Hand
          if (data.right.position.x !== 0) {
              const r = getScreenCoords(data.right.position.x, data.right.position.y);
              if (r.x >= rect.left && r.x <= rect.right && r.y >= rect.top && r.y <= rect.bottom) isHovered = true;
          }

          // Apply Hover Styles Direct to DOM
          const el = item as HTMLElement;
          if (isHovered) {
              el.style.borderColor = 'rgba(0, 255, 255, 0.8)';
              el.style.transform = 'scale(1.1)';
              el.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              el.style.zIndex = '10';
          } else {
              // Revert to base styles (handled partly by CSS classes, but we reset overrides here)
              // We only reset if it's NOT the dragged element
              if (dragState.element?.symbol !== el.dataset.symbol) {
                 // Check if it is an active element (equipped)
                 const isLeftActive = el.dataset.symbol === leftElement.symbol;
                 const isRightActive = el.dataset.symbol === rightElement.symbol;
                 
                 if (isLeftActive) el.style.borderColor = 'rgba(34, 211, 238, 1)'; // Cyan
                 else if (isRightActive) el.style.borderColor = 'rgba(168, 85, 247, 1)'; // Purple
                 else el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                 
                 el.style.transform = 'scale(1)';
                 el.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                 el.style.zIndex = '1';
              }
          }
      });

      // 2. Update Drag Ghost
      if (dragState.active && ghostRef.current && dragState.element) {
        const handData = dragState.hand === 'left' ? data.left : data.right;
        const {x, y} = getScreenCoords(handData.position.x, handData.position.y);
        ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      animId = requestAnimationFrame(updateUI);
    };

    animId = requestAnimationFrame(updateUI);
    return () => cancelAnimationFrame(animId);
  }, [dragState, leftElement, rightElement]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      
      {/* --- DRAG GHOST --- */}
      {dragState.active && dragState.element && (
        <div ref={ghostRef} className="absolute top-0 left-0 w-20 h-20 bg-black/80 border-2 border-white backdrop-blur-xl rounded-2xl flex items-center justify-center -ml-10 -mt-20 z-50 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
           <div className="text-2xl font-bold font-['Orbitron']" style={{color: dragState.element.color}}>
             {dragState.element.symbol}
           </div>
        </div>
      )}

      {/* --- TOP LAB SHELF --- */}
      <div className="w-full p-4 flex justify-center items-start pointer-events-auto">
         <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex gap-3 shadow-2xl">
            {ELEMENTS.map((el) => {
                const isLeft = leftElement.symbol === el.symbol;
                const isRight = rightElement.symbol === el.symbol;
                
                return (
                <div 
                  key={el.symbol} 
                  id={`shelf-item-${el.symbol}`}
                  data-symbol={el.symbol}
                  className={`
                    w-14 h-14 md:w-16 md:h-16 border rounded-xl flex flex-col items-center justify-center relative transition-all duration-200
                    ${isLeft ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 
                      isRight ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 
                      'border-white/10 opacity-80'}
                    ${dragState.element?.symbol === el.symbol ? 'opacity-30' : ''}
                  `}
                >
                    <div className="text-sm md:text-lg font-bold font-['Orbitron']" style={{color: el.color}}>{el.symbol}</div>
                    <div className="text-[8px] text-gray-400 font-mono">{el.atomicNumber}</div>
                    
                    {isLeft && <div className="absolute -bottom-2 text-[8px] bg-cyan-900 text-cyan-200 px-1 rounded border border-cyan-500 font-mono">L</div>}
                    {isRight && <div className="absolute -bottom-2 text-[8px] bg-purple-900 text-purple-200 px-1 rounded border border-purple-500 font-mono">R</div>}
                </div>
            )})}
         </div>
      </div>

      {/* --- BOTTOM HUD --- */}
      <div className="p-6 md:p-10 flex flex-col justify-end">
         
         {/* Center Message */}
         {combinedElement && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
                <h2 className="text-6xl md:text-8xl font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 drop-shadow-[0_0_50px_rgba(0,255,255,0.5)] animate-pulse">
                    {combinedElement.symbol}
                </h2>
                <div className="mt-4 text-xl font-mono text-cyan-200 tracking-[0.5em] uppercase">
                    {combinedElement.name}
                </div>
            </div>
         )}
         
         {/* Instruction / Status */}
         <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center w-full">
            <div className={`transition-all duration-300`}>
                <div className={`
                    inline-block px-8 py-3 rounded-full border backdrop-blur-md font-mono tracking-widest uppercase text-sm font-bold shadow-lg
                    ${message.includes("HOLD") ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200 animate-pulse' : 
                      message.includes("SUCCESS") ? 'bg-green-500/20 border-green-500 text-green-200' :
                      message.includes("Unstable") ? 'bg-red-500/20 border-red-500 text-red-200' :
                      'bg-black/60 border-white/20 text-white'}
                `}>
                    {message}
                </div>
            </div>
            {!combinedElement && (
                <div className="mt-4 flex gap-4 justify-center text-[9px] text-white/40 font-mono uppercase tracking-widest">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Drag to Select</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white"></span>Clap & Hold to Fuse</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Spin to Reset</span>
                </div>
            )}
         </div>

         {/* Active Elements Display */}
         <div className="flex justify-between w-full">
            <div className={`text-left transition-opacity duration-500 ${combinedElement ? 'opacity-0' : 'opacity-100'}`}>
               <div className="text-[10px] text-cyan-400 mb-1 font-mono tracking-widest">ACTIVE LEFT</div>
               <div className="text-5xl font-['Orbitron'] font-bold text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{leftElement.symbol}</div>
               <div className="text-xs text-gray-400 mt-1">{leftElement.name}</div>
            </div>
            <div className={`text-right transition-opacity duration-500 ${combinedElement ? 'opacity-0' : 'opacity-100'}`}>
               <div className="text-[10px] text-purple-400 mb-1 font-mono tracking-widest">ACTIVE RIGHT</div>
               <div className="text-5xl font-['Orbitron'] font-bold text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">{rightElement.symbol}</div>
               <div className="text-xs text-gray-400 mt-1">{rightElement.name}</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;