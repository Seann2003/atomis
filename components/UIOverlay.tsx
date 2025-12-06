import React from 'react';
import { ElementData } from '../types';

interface UIOverlayProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  message: string;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ leftElement, rightElement, combinedElement, message }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 md:p-10">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="backdrop-blur-sm bg-black/20 p-2 rounded-br-2xl border-l-2 border-t-2 border-white/10">
          <h1 className="text-2xl md:text-4xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">
            Chemi<span className="text-cyan-400">Particles</span>
          </h1>
          <p className="text-cyan-400/70 font-mono text-[10px] tracking-[0.3em]">
            INTERACTIVE MOLECULAR SYNTHESIS
          </p>
        </div>
        
        {/* Status */}
        <div className="flex items-center gap-3">
             <div className="bg-black/50 backdrop-blur border border-white/10 px-4 py-2 rounded-lg flex items-center">
                <span className={`w-2 h-2 rounded-full mr-3 ${message.includes("Synthesizing") || message.includes("FUSION") ? "bg-purple-400 animate-ping" : "bg-green-500 animate-pulse"}`}></span>
                <span className="text-xs font-mono text-white/80 uppercase tracking-wider">{message}</span>
            </div>
        </div>
      </div>

      {/* Center Synthesis Message - Only show if combined is active */}
      {combinedElement && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full z-20">
            <div className="relative inline-block animate-pulse">
                <h2 className="relative text-6xl md:text-8xl font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 tracking-tighter drop-shadow-[0_0_30px_rgba(0,255,255,0.6)]">
                    {combinedElement.symbol}
                </h2>
            </div>
            <div className="mt-4 text-xl font-mono text-cyan-200 tracking-[0.5em] uppercase">
                {combinedElement.name}
            </div>
        </div>
      )}

      {/* Footer Controls - Fade out when combined */}
      <div className={`grid grid-cols-2 gap-8 items-end transition-opacity duration-500 ${combinedElement ? 'opacity-0' : 'opacity-100'}`}>
        {/* Left Control */}
        <div className="text-left group">
          <div className="inline-block bg-black/70 backdrop-blur-md p-6 rounded-tr-3xl border-l-4 border-cyan-500 transition-all group-hover:bg-black/80">
            <div className="text-cyan-400 text-xs font-bold font-['Orbitron'] mb-3 flex items-center tracking-widest">
              LEFT ELEMENT
            </div>
            <div className="text-3xl font-bold text-white font-['Orbitron'] mb-1">{leftElement.symbol}</div>
            <div className="text-sm font-mono text-gray-400 mb-4">{leftElement.name}</div>
            
            <div className="space-y-1 text-[10px] font-mono text-gray-500 border-t border-white/10 pt-3">
               <div className="flex items-center"><span className="w-1 h-1 bg-cyan-500 rounded-full mr-2"></span>PINCH TO EXPAND</div>
               <div className="flex items-center"><span className="w-1 h-1 bg-cyan-500 rounded-full mr-2"></span>PINKY EXTEND: NEXT</div>
            </div>
          </div>
        </div>

        {/* Right Control */}
        <div className="text-right flex flex-col items-end group">
           <div className="inline-block bg-black/70 backdrop-blur-md p-6 rounded-tl-3xl border-r-4 border-purple-500 transition-all group-hover:bg-black/80">
            <div className="text-purple-400 text-xs font-bold font-['Orbitron'] mb-3 flex items-center justify-end tracking-widest">
              RIGHT ELEMENT
            </div>
            <div className="text-3xl font-bold text-white font-['Orbitron'] mb-1">{rightElement.symbol}</div>
            <div className="text-sm font-mono text-gray-400 mb-4">{rightElement.name}</div>
            
            <div className="space-y-1 text-[10px] font-mono text-gray-500 border-t border-white/10 pt-3 flex flex-col items-end">
               <div className="flex items-center">PINCH TO EXPAND<span className="w-1 h-1 bg-purple-500 rounded-full ml-2"></span></div>
               <div className="flex items-center">THUMB UP: NEXT<span className="w-1 h-1 bg-purple-500 rounded-full ml-2"></span></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Center Instruction Hint */}
      {!combinedElement && (
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center opacity-60">
             <div className="text-[10px] font-mono text-white tracking-[0.2em] mb-1">SYNTHESIS READY</div>
             <div className="text-lg font-['Orbitron'] text-white animate-pulse">CLAP HANDS TO COMBINE</div>
          </div>
      )}
    </div>
  );
};

export default UIOverlay;