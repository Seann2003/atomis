
import React, { useRef, useEffect, useState } from 'react';
import { ElementData, TrackingData, CatalystType } from '../types';
import { ELEMENTS } from '../constants';

interface UIOverlayProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  message: string;
  trackingRef: React.MutableRefObject<TrackingData>;
  activeCatalyst: CatalystType;
  savedElements: ElementData[];
}

// Icons
const FlameIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22c4.97 0 9-4.03 9-9 0-4.97-9-13-9-13S3 8.03 3 13c0 4.97 4.03 9 9 9z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M12 22c4.97 0 9-4.03 9-9 0-4.97-9-13-9-13S3 8.03 3 13c0 4.97 4.03 9 9 9z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 18c2.21 0 4-1.79 4-4 0-2.21-4-6-4-6s-4 3.79-4 6c0 2.21 1.79 4 4 4z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const BoltIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const FlaskIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="1.5">
        <path d="M8.5 2h7M12 2v6M6 22h12a2 2 0 002-2l-3-9a6 6 0 00-6-3h-1a6 6 0 00-6 3l-3 9a2 2 0 002 2z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M8.5 2h7M12 2v6M6 22h12a2 2 0 002-2l-3-9a6 6 0 00-6-3h-1a6 6 0 00-6 3l-3 9a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="16" r="1" fill="currentColor"/>
        <circle cx="14" cy="18" r="1" fill="currentColor"/>
    </svg>
);

const UIOverlay: React.FC<UIOverlayProps> = ({ leftElement, rightElement, combinedElement, message, trackingRef, activeCatalyst, savedElements }) => {
  
  // Combine constant elements with saved ones for the shelf
  const displayElements = [...savedElements, ...ELEMENTS.filter(e => !savedElements.find(s => s.symbol === e.symbol))];

  // Animation Loop for UI Updates (No React Render Lag)
  useEffect(() => {
    let animId: number;
    const cursorLeft = document.getElementById('cursor-left');
    const cursorRight = document.getElementById('cursor-right');
    
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
            x = nx * screenW; 
            y = ny * videoH_pixels - offsetY;
        } else {
            const videoW_pixels = videoAspect * screenH;
            const offsetX = (videoW_pixels - screenW) / 2;
            x = nx * videoW_pixels - offsetX; 
            y = ny * screenH;
        }
        return { x, y };
      };

      // 0. Update Cursors (Zero Latency)
      if (cursorLeft) {
          if (data.left.position.x !== 0) {
              const l = getScreenCoords(data.left.position.x, data.left.position.y);
              cursorLeft.style.transform = `translate(${l.x}px, ${l.y}px)`;
              cursorLeft.style.opacity = '1';
              // Visual flair for pinching
              cursorLeft.style.borderWidth = data.left.isPinching ? '4px' : '2px';
              cursorLeft.style.borderColor = data.left.isPinching ? '#00ffff' : 'rgba(0,255,255,0.5)';
          } else {
              cursorLeft.style.opacity = '0';
          }
      }

      if (cursorRight) {
          if (data.right.position.x !== 0) {
              const r = getScreenCoords(data.right.position.x, data.right.position.y);
              cursorRight.style.transform = `translate(${r.x}px, ${r.y}px)`;
              cursorRight.style.opacity = '1';
              cursorRight.style.borderWidth = data.right.isPinching ? '4px' : '2px';
              cursorRight.style.borderColor = data.right.isPinching ? '#a855f7' : 'rgba(168,85,247,0.5)';
          } else {
              cursorRight.style.opacity = '0';
          }
      }

      // 1. Highlight Items (Shelf + Catalyst) on Hover
      const interactables = document.querySelectorAll('.interactable-btn');
      interactables.forEach(item => {
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
          const isShelfItem = el.id.startsWith('shelf-item-');
          const isCatalystItem = el.id.startsWith('catalyst-btn-');
          
          if (isHovered) {
              el.style.transform = 'scale(1.15)';
              el.style.zIndex = '100';
              
              if (isShelfItem) {
                  el.style.borderColor = 'rgba(0, 255, 255, 0.9)';
                  el.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  el.style.boxShadow = `0 0 20px ${el.dataset.color || '#fff'}`;
              } else if (isCatalystItem) {
                  el.style.borderColor = 'white';
                  el.style.boxShadow = '0 0 15px white';
                  el.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }
          } else {
              // Revert to base styles
             el.style.transform = 'scale(1)';
             el.style.zIndex = '1';
             
             if (isShelfItem) {
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
                 el.style.backgroundColor = 'rgba(10, 10, 10, 0.7)';
             } else if (isCatalystItem) {
                 const active = el.dataset.active === 'true';
                 el.style.backgroundColor = 'rgba(0,0,0,0.6)';
                 el.style.borderColor = active ? el.dataset.activecolor! : 'rgba(255,255,255,0.2)';
                 el.style.boxShadow = active ? `0 0 15px ${el.dataset.activecolor}` : 'none';
                 el.style.color = active ? el.dataset.activecolor! : '#ffffff';
             }
          }
      });

      animId = requestAnimationFrame(updateUI);
    };

    animId = requestAnimationFrame(updateUI);
    return () => cancelAnimationFrame(animId);
  }, [leftElement, rightElement, activeCatalyst, displayElements]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      
      {/* CURSORS */}
      <div id="cursor-left" className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-cyan-400 bg-cyan-500/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 transition-colors duration-75">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-200 rounded-full"></div>
      </div>
      <div id="cursor-right" className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-purple-500 bg-purple-500/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 transition-colors duration-75">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-purple-200 rounded-full"></div>
      </div>

      {/* --- TOP LAB SHELF --- */}
      <div className="w-full pt-6 pointer-events-auto overflow-hidden">
         <div className="w-full overflow-x-auto pb-8 pt-4 no-scrollbar">
            <div className="flex gap-4 px-8 min-w-max justify-start items-center">
                {displayElements.map((el) => {
                    const isLeft = leftElement.symbol === el.symbol;
                    const isRight = rightElement.symbol === el.symbol;
                    
                    return (
                    <div 
                    key={el.symbol} 
                    id={`shelf-item-${el.symbol}`}
                    data-symbol={el.symbol}
                    data-color={el.color}
                    className={`
                        interactable-btn
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

      {/* --- RIGHT CATALYST PANEL --- */}
      <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex flex-col gap-6 pointer-events-auto z-20">
          <div className="text-[10px] text-white/50 font-mono tracking-widest uppercase text-center rotate-90 origin-right translate-x-4 mb-10">Catalysts</div>
          
          <div 
            id="catalyst-btn-heat"
            data-type="heat"
            data-active={activeCatalyst === 'heat'}
            data-activecolor="#ff4400"
            className="interactable-btn w-24 h-24 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md transition-all duration-300"
          >
            <FlameIcon />
          </div>

          <div 
            id="catalyst-btn-light"
            data-type="light"
            data-active={activeCatalyst === 'light'}
            data-activecolor="#ffff00"
            className="interactable-btn w-24 h-24 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md transition-all duration-300"
          >
            <BoltIcon />
          </div>

          <div 
            id="catalyst-btn-chemical"
            data-type="chemical"
            data-active={activeCatalyst === 'chemical'}
            data-activecolor="#00ff44"
            className="interactable-btn w-24 h-24 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md transition-all duration-300"
          >
            <FlaskIcon />
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
                <div className="mt-4 text-xs font-mono text-cyan-300 animate-pulse">
                    CLOSE FIST TO SAVE ELEMENT
                </div>
            </div>
         )}
         
         {/* Futuristic Status Ticker */}
         <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 text-center w-full pointer-events-none">
            <div className="relative inline-block overflow-hidden rounded-md group">
                 {/* High-Tech Clip Path Border */}
                <div 
                    className={`
                        relative z-10 px-12 py-5 font-mono tracking-widest uppercase text-sm font-bold bg-black/80 backdrop-blur-xl border-l-4 border-r-4
                        ${message.includes("HOLD") ? 'border-yellow-500 text-yellow-400' : 
                          message.includes("SUCCESS") || message.includes("SAVED") ? 'border-green-500 text-green-400' :
                          message.includes("Unstable") || message.includes("Failed") ? 'border-red-500 text-red-400' :
                          'border-cyan-500 text-cyan-400'}
                    `}
                    style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 80%, 90% 100%, 0 100%, 0 20%)' }}
                >
                    <span className="mr-4 opacity-50 text-xs">STATUS //</span>
                    {message}
                    {/* Scanning Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full animate-[scan_2s_linear_infinite]"></div>
                </div>
            </div>

            {!combinedElement && (
                <div className="mt-6 flex gap-8 justify-center text-[9px] text-white/40 font-mono uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-400"></div>Pinch</span>
                    <span className="flex items-center gap-2"><div className="w-1 h-1 bg-white"></div>Clap</span>
                    <span className="flex items-center gap-2"><div className="w-1 h-1 bg-red-500"></div>Spin</span>
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
        @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
};

export default UIOverlay;
