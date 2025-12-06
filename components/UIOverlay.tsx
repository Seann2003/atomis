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
  const cursorLeftRef = useRef<HTMLDivElement>(null);
  const cursorRightRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  
  // Ref for shelf items to enable hit-testing in App.tsx
  // We don't use this here but ensuring standard IDs helps
  
  // Animation Loop for Smooth Cursor Updates (No React Render Lag)
  useEffect(() => {
    let animId: number;
    
    const updateCursors = () => {
      const data = trackingRef.current;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const screenAspect = screenW / screenH;
      const videoAspect = data.cameraAspect;

      // Coordinate Remapping Logic: Map 0-1 Video Coords to Screen Pixels
      // because object-cover crops the video.
      const getScreenCoords = (nx: number, ny: number) => {
        let x, y;
        if (screenAspect > videoAspect) {
            // Screen is wider than video (Video cropped top/bottom)
            // Fit Width
            const scale = screenW / 1; // since normalized width is 1
            const videoH_pixels = (1 / videoAspect) * screenW; // scaled height
            const offsetY = (videoH_pixels - screenH) / 2;
            
            x = (1 - nx) * screenW; // Flip X for mirror
            y = ny * videoH_pixels - offsetY;
        } else {
            // Screen is taller than video (Video cropped left/right)
            // Fit Height
            const scale = screenH / 1;
            const videoW_pixels = videoAspect * screenH;
            const offsetX = (videoW_pixels - screenW) / 2;
            
            x = (1 - nx) * videoW_pixels - offsetX; // Flip X logic: (1-nx) maps 0->1 to 1->0
            y = ny * screenH;
        }
        return { x, y };
      };

      // Update Left Cursor
      if (cursorLeftRef.current) {
        // Use default off-screen if no hand detected (e.g. 0,0)
        if (data.left.position.x !== 0) {
            const {x, y} = getScreenCoords(data.left.position.x, data.left.position.y);
            cursorLeftRef.current.style.transform = `translate(${x}px, ${y}px)`;
            cursorLeftRef.current.style.opacity = '1';
            // Scale cursor on pinch
            cursorLeftRef.current.style.scale = data.left.isPinching ? '0.5' : '1';
        } else {
            cursorLeftRef.current.style.opacity = '0';
        }
      }

      // Update Right Cursor
      if (cursorRightRef.current) {
        if (data.right.position.x !== 0) {
            const {x, y} = getScreenCoords(data.right.position.x, data.right.position.y);
            cursorRightRef.current.style.transform = `translate(${x}px, ${y}px)`;
            cursorRightRef.current.style.opacity = '1';
            cursorRightRef.current.style.scale = data.right.isPinching ? '0.5' : '1';
        } else {
            cursorRightRef.current.style.opacity = '0';
        }
      }

      // Update Drag Ghost
      if (dragState.active && ghostRef.current && dragState.element) {
        const handData = dragState.hand === 'left' ? data.left : data.right;
        const {x, y} = getScreenCoords(handData.position.x, handData.position.y);
        ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      animId = requestAnimationFrame(updateCursors);
    };

    animId = requestAnimationFrame(updateCursors);
    return () => cancelAnimationFrame(animId);
  }, [dragState]); // Re-bind if drag state changes to attach/detach ghost logic

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      
      {/* --- CURSORS --- */}
      <div ref={cursorLeftRef} className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-cyan-400 rounded-full flex items-center justify-center transition-opacity duration-200 z-50">
        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
        <div className="absolute -top-4 text-[8px] font-mono text-cyan-400">L</div>
      </div>
      <div ref={cursorRightRef} className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-purple-500 rounded-full flex items-center justify-center transition-opacity duration-200 z-50">
        <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
        <div className="absolute -top-4 text-[8px] font-mono text-purple-500">R</div>
      </div>

      {/* --- DRAG GHOST --- */}
      {dragState.active && dragState.element && (
        <div ref={ghostRef} className="absolute top-0 left-0 w-16 h-16 bg-black/80 border border-white/50 backdrop-blur rounded flex items-center justify-center -ml-8 -mt-16 z-50">
           <div className="text-xl font-bold font-['Orbitron']" style={{color: dragState.element.color}}>
             {dragState.element.symbol}
           </div>
        </div>
      )}

      {/* --- TOP LAB SHELF --- */}
      <div className="w-full p-4 flex justify-center items-start pointer-events-auto">
         <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex gap-2 shadow-2xl">
            {ELEMENTS.map((el) => (
                <div 
                  key={el.symbol} 
                  id={`shelf-item-${el.symbol}`}
                  data-symbol={el.symbol}
                  className={`w-14 h-14 md:w-16 md:h-16 border border-white/10 rounded-xl flex flex-col items-center justify-center bg-black/40 hover:bg-white/10 transition-colors relative group ${dragState.element?.symbol === el.symbol ? 'opacity-30' : 'opacity-100'}`}
                >
                    <div className="text-sm md:text-lg font-bold font-['Orbitron']" style={{color: el.color}}>{el.symbol}</div>
                    <div className="text-[8px] text-gray-400 font-mono">{el.atomicNumber}</div>
                    
                    {/* Hover tooltip for mouse users (fallback) */}
                    <div className="absolute top-full mt-2 bg-black text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-white/20">
                        {el.name}
                    </div>
                </div>
            ))}
         </div>
         
         <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-3 py-1 rounded border border-white/10">
            <div className="text-[9px] font-mono text-white/70">LAB MODE</div>
            <div className="text-[9px] font-mono text-cyan-400">PINCH TO GRAB</div>
         </div>
      </div>

      {/* --- BOTTOM HUD --- */}
      <div className="p-6 md:p-10 flex flex-col justify-end">
         
         {/* Center Message */}
         {combinedElement && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
                <h2 className="text-6xl md:text-8xl font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 drop-shadow-[0_0_30px_rgba(0,255,255,0.6)] animate-pulse">
                    {combinedElement.symbol}
                </h2>
                <div className="mt-4 text-xl font-mono text-cyan-200 tracking-[0.5em] uppercase">
                    {combinedElement.name}
                </div>
            </div>
         )}
         
         {/* Instruction */}
         <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center w-full">
            <div className={`transition-all duration-300 ${message.includes("FUSION") ? 'scale-110 text-cyan-300' : 'text-white/60'}`}>
                <div className="bg-black/50 backdrop-blur inline-block px-6 py-2 rounded-full border border-white/10">
                    <span className="text-xs font-mono tracking-widest uppercase">{message}</span>
                </div>
            </div>
            {!combinedElement && (
                <div className="mt-2 text-[9px] text-white/30 font-mono">
                    POINT UP & SPIN TO RESET • CLAP TO FUSE
                </div>
            )}
         </div>

         {/* Active Elements Display */}
         <div className="flex justify-between w-full">
            <div className="text-left">
               <div className="text-[10px] text-cyan-400 mb-1 font-mono tracking-widest">ACTIVE LEFT</div>
               <div className="text-4xl font-['Orbitron'] font-bold text-white">{leftElement.symbol}</div>
               <div className="text-xs text-gray-500">{leftElement.name}</div>
            </div>
            <div className="text-right">
               <div className="text-[10px] text-purple-400 mb-1 font-mono tracking-widest">ACTIVE RIGHT</div>
               <div className="text-4xl font-['Orbitron'] font-bold text-white">{rightElement.symbol}</div>
               <div className="text-xs text-gray-500">{rightElement.name}</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;
