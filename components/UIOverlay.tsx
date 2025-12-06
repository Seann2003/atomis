import React, { useRef, useEffect } from 'react';
import { ElementData, TrackingData } from '../types';
import { ELEMENTS } from '../constants';

interface UIOverlayProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  message: string;
  trackingRef: React.MutableRefObject<TrackingData>;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ leftElement, rightElement, combinedElement, message, trackingRef }) => {
  
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
              el.style.borderColor = 'rgba(0, 255, 255, 0.9)';
              el.style.transform = 'scale(1.15)';
              el.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              el.style.zIndex = '100';
              el.style.boxShadow = `0 0 20px ${el.dataset.color || '#fff'}`;
          } else {
              // Revert to base styles
             const isLeftActive = el.dataset.symbol === leftElement.symbol;
             const isRightActive = el.dataset.symbol === rightElement.symbol;
             
             if (isLeftActive) {
                el.style.borderColor = 'rgba(34, 211, 238, 1)'; // Cyan
                el.style.boxShadow = '0 0 10px rgba(34,211,238,0.3)';
             }
             else if (isRightActive) {
                el.style.borderColor = 'rgba(168, 85, 247, 1)'; // Purple
                el.style.boxShadow = '0 0 10px rgba(168,85,247,0.3)';
             }
             else {
                el.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                el.style.boxShadow = 'none';
             }
             
             el.style.transform = 'scale(1)';
             el.style.backgroundColor = 'rgba(10, 10, 10, 0.7)';
             el.style.zIndex = '1';
          }
      });

      animId = requestAnimationFrame(updateUI);
    };

    animId = requestAnimationFrame(updateUI);
    return () => cancelAnimationFrame(animId);
  }, [leftElement, rightElement]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      
      {/* --- TOP LAB SHELF --- */}
      {/* Container with horizontal scroll */}
      <div className="w-full pt-6 px-4 pointer-events-auto overflow-hidden">
         <div className="mx-auto max-w-5xl overflow-x-auto pb-4 no-scrollbar">
            <div className="flex gap-4 px-4 min-w-max justify-center">
                {ELEMENTS.map((el) => {
                    const isLeft = leftElement.symbol === el.symbol;
                    const isRight = rightElement.symbol === el.symbol;
                    
                    return (
                    <div 
                    key={el.symbol} 
                    id={`shelf-item-${el.symbol}`}
                    data-symbol={el.symbol}
                    data-color={el.color}
                    className={`
                        w-20 h-20 border-2 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 cursor-pointer backdrop-blur-sm
                        ${isLeft ? 'border-cyan-400 bg-cyan-900/30' : 
                        isRight ? 'border-purple-500 bg-purple-900/30' : 
                        'border-white/10 bg-black/60'}
                    `}
                    >
                        <div className="text-2xl font-bold font-['Orbitron'] drop-shadow-md" style={{color: el.color}}>{el.symbol}</div>
                        <div className="text-[9px] text-gray-300 font-mono mt-1">{el.name.substring(0,6)}</div>
                        
                        {isLeft && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-cyan-500 text-black font-bold px-2 rounded-full font-mono shadow-lg border border-white">LEFT</div>}
                        {isRight && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-purple-500 text-black font-bold px-2 rounded-full font-mono shadow-lg border border-white">RIGHT</div>}
                    </div>
                )})}
            </div>
         </div>
      </div>

      {/* --- BOTTOM HUD --- */}
      <div className="p-6 md:p-10 flex flex-col justify-end">
         
         {/* Center Message */}
         {combinedElement && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full pointer-events-none">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500 blur-[100px] opacity-20 rounded-full"></div>
                    <h2 className="relative text-7xl md:text-9xl font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300 drop-shadow-[0_0_60px_rgba(0,255,255,0.8)] animate-pulse">
                        {combinedElement.symbol}
                    </h2>
                </div>
                <div className="mt-6 text-2xl font-mono text-white tracking-[0.6em] uppercase font-bold text-shadow">
                    {combinedElement.name}
                </div>
            </div>
         )}
         
         {/* Instruction / Status */}
         <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 text-center w-full pointer-events-none">
            <div className={`transition-all duration-300`}>
                <div className={`
                    inline-block px-10 py-4 rounded-xl border backdrop-blur-lg font-mono tracking-widest uppercase text-sm font-bold shadow-2xl
                    ${message.includes("HOLD") ? 'bg-yellow-900/40 border-yellow-400 text-yellow-200 animate-pulse ring-2 ring-yellow-500/50' : 
                      message.includes("SUCCESS") ? 'bg-green-900/40 border-green-400 text-green-200 ring-2 ring-green-500/50' :
                      message.includes("Unstable") ? 'bg-red-900/40 border-red-500 text-red-200 ring-2 ring-red-500/50' :
                      'bg-black/80 border-cyan-500/30 text-cyan-50'}
                `}>
                    {message}
                </div>
            </div>
            {!combinedElement && (
                <div className="mt-6 flex gap-6 justify-center text-[10px] text-white/60 font-mono uppercase tracking-widest">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>Hover & Pinch</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>Clap & Hold</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>Spin Reset</span>
                </div>
            )}
         </div>

         {/* Active Elements Display */}
         <div className="flex justify-between w-full px-4">
            <div className={`text-left transition-all duration-500 ${combinedElement ? 'opacity-0 translate-y-10' : 'opacity-100'}`}>
               <div className="text-[10px] text-cyan-400 mb-2 font-mono tracking-[0.2em] border-b border-cyan-900 pb-1 inline-block">SYSTEM: LEFT HAND</div>
               <div className="text-6xl font-['Orbitron'] font-bold text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">{leftElement.symbol}</div>
               <div className="text-sm text-cyan-200/70 mt-1 font-mono">{leftElement.name}</div>
            </div>
            <div className={`text-right transition-all duration-500 ${combinedElement ? 'opacity-0 translate-y-10' : 'opacity-100'}`}>
               <div className="text-[10px] text-purple-400 mb-2 font-mono tracking-[0.2em] border-b border-purple-900 pb-1 inline-block">SYSTEM: RIGHT HAND</div>
               <div className="text-6xl font-['Orbitron'] font-bold text-white drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]">{rightElement.symbol}</div>
               <div className="text-sm text-purple-200/70 mt-1 font-mono">{rightElement.name}</div>
            </div>
         </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default UIOverlay;