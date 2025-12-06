import React, { useEffect, useState, useRef } from 'react';
import { ElementData, CombinationResult } from '../types';
import { ELEMENTS, COMBINATIONS } from '../constants';
import { getMascotFact } from '../utils/mascot';
import MascotAvatar from './MascotAvatar';
import { TrackingData } from '../types';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  savedElements: ElementData[];
}

const Dashboard: React.FC<DashboardProps> = ({ isOpen, onClose, savedElements }) => {
  const [allDiscoverables, setAllDiscoverables] = useState<ElementData[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<ElementData | null>(null);

  // Tracking Ref for the Dashboard Avatar
  const dashboardTrackingRef = useRef<TrackingData>({
    left: { pinchDistance: 0, isPinching: false, isPointing: false, position: {x: 0.5, y: 0.5, z: 0}, isDetected: false },
    right: { pinchDistance: 0, isPinching: false, isPointing: false, position: {x: 0.5, y: 0.5, z: 0}, isDetected: false },
    isClapping: false,
    isResetGesture: false,
    isClosedFist: false,
    handDistance: 1000,
    cameraAspect: 1.77
  });

  useEffect(() => {
    // 1. Get all unique combination results
    const comboResults = COMBINATIONS.map(c => c.result);
    // Deduplicate by symbol
    const uniqueCombos = comboResults.filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i);
    
    // 2. Combine basic elements + combos
    const fullList = [...ELEMENTS, ...uniqueCombos];
    setAllDiscoverables(fullList);
  }, []);

  // Effect to track selected element position
  useEffect(() => {
    if (selectedInfo && isOpen) {
        // Small delay to allow render
        setTimeout(() => {
            const el = document.getElementById(`dashboard-item-${selectedInfo.symbol}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                // Calculate normalized center (0-1) relative to window
                const centerX = (rect.left + rect.width / 2) / window.innerWidth;
                const centerY = (rect.top + rect.height / 2) / window.innerHeight;
                
                // Update ref to simulate a "hand" at the element's position
                // We use the 'left' hand slot for this target
                dashboardTrackingRef.current.left.position.x = centerX;
                dashboardTrackingRef.current.left.position.y = centerY;
                dashboardTrackingRef.current.left.isDetected = true;
            }
        }, 50);
    } else {
        // Go back to idle look
        dashboardTrackingRef.current.left.isDetected = false;
    }
  }, [selectedInfo, isOpen]);

  // Calculate progress
  const unlockedCount = allDiscoverables.filter(d => 
    savedElements.some(s => s.symbol === d.symbol) || ELEMENTS.some(e => e.symbol === d.symbol)
  ).length;
  
  const isUnlocked = (el: ElementData) => {
    // Basic elements (Level 1) are always unlocked
    if (el.level === 1) return true;
    // Check if in saved history
    return savedElements.some(s => s.symbol === el.symbol);
  };

  // Group elements by Level
  const getElementsByLevel = (level: number) => {
      return allDiscoverables.filter(el => (el.level || 1) === level);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center text-white p-8 animate-fadeIn">
      
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-end mb-8 border-b border-white/20 pb-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-['Orbitron'] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            ATOMIS LAB
          </h1>
          <p className="text-sm font-mono text-cyan-200/60 tracking-widest mt-2">RESEARCH & SYNTHESIS INTERFACE</p>
        </div>
        <div className="text-right">
           <div className="text-xs text-gray-400 font-mono uppercase mb-1">Discovery Progress</div>
           <div className="text-2xl font-bold font-mono text-cyan-400">{Math.floor((unlockedCount / allDiscoverables.length) * 100)}%</div>
           <div className="w-32 h-1 bg-gray-800 mt-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-400 transition-all duration-500" 
                style={{ width: `${(unlockedCount / allDiscoverables.length) * 100}%` }}
              ></div>
           </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 w-full max-w-6xl flex gap-8 overflow-hidden">
          
          {/* Element Grid - Grouped by Level */}
          <div className="flex-1 overflow-y-auto pr-4 no-scrollbar flex flex-col gap-8 pb-20">
             
             {/* LEVEL 1: BASE ELEMENTS */}
             <div>
                <h3 className="text-sm font-mono text-cyan-500/80 tracking-widest mb-4 border-b border-cyan-500/20 pb-2">LEVEL 1 // BASE ELEMENTS</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {getElementsByLevel(1).map(el => (
                        <DashboardItem key={el.symbol} el={el} unlocked={true} onClick={() => setSelectedInfo(el)} />
                    ))}
                </div>
             </div>

             {/* LEVEL 2: COMPOUNDS */}
             <div>
                <h3 className="text-sm font-mono text-purple-500/80 tracking-widest mb-4 border-b border-purple-500/20 pb-2">LEVEL 2 // COMPOUNDS</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {getElementsByLevel(2).map(el => (
                        <DashboardItem key={el.symbol} el={el} unlocked={isUnlocked(el)} onClick={() => isUnlocked(el) && setSelectedInfo(el)} />
                    ))}
                </div>
             </div>

             {/* LEVEL 3: COMING SOON */}
             <div>
                <h3 className="text-sm font-mono text-yellow-500/40 tracking-widest mb-4 border-b border-yellow-500/10 pb-2">LEVEL 3 // COMPLEX (LOCKED)</h3>
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 opacity-90">
                    <div className="aspect-square rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center relative grayscale cursor-not-allowed">
                        <div className="text-2xl font-mono text-gray-700">?</div>
                    </div>
                     <div className="aspect-square rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center relative grayscale cursor-not-allowed">
                        <div className="text-2xl font-mono text-gray-700">?</div>
                    </div>
                </div>
             </div>

          </div>

          {/* Mascot / Info Panel */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-4">
             
             {/* Selected Info Card */}
             <div className="bg-black/40 border border-white/10 rounded-2xl p-6 min-h-[200px] flex flex-col items-center justify-center text-center relative">
                {selectedInfo ? (
                    <>
                        <div className="absolute top-6 right-6 text-[10px] font-mono border border-white/20 px-2 py-1 rounded text-white/50">LVL {selectedInfo.level || 1}</div>
                        <div className="text-6xl font-['Orbitron'] font-bold mb-2" style={{color: selectedInfo.color}}>{selectedInfo.symbol}</div>
                        <div className="text-xl font-bold text-white mb-4">{selectedInfo.name}</div>
                        <p className="text-sm text-gray-400 leading-relaxed">{selectedInfo.description}</p>
                    </>
                ) : (
                    <div className="text-white/20 font-mono text-sm">
                        <div className="text-4xl mb-4 opacity-20">?</div>
                        SELECT AN ELEMENT<br/>TO ANALYZE
                    </div>
                )}
             </div>

             {/* Mascot Area */}
             <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                 {/* Mascot Graphic (Live 3D Render) */}
                 <div className="w-full h-48 relative -mt-4 mb-2">
                    {/* Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                    {/* Avatar */}
                    <MascotAvatar trackingData={dashboardTrackingRef} />
                 </div>

                 <div className="relative z-10 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                        <div className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-widest">Atom Analysis</div>
                    </div>
                    
                    <p className="text-xs text-gray-300 leading-relaxed font-mono min-h-[80px]">
                        {selectedInfo 
                          ? getMascotFact(selectedInfo)
                          : "Select an element from the grid to view its properties. I'll analyze the chemical structure for you!"}
                    </p>
                 </div>
             </div>

             {/* Close Button */}
             <button 
                id="dashboard-close-btn"
                onClick={onClose}
                className="interactable-btn mt-auto w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-['Orbitron'] tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
             >
                ENTER LABORATORY
             </button>
          </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

const DashboardItem = ({ el, unlocked, onClick }: { el: ElementData, unlocked: boolean, onClick: () => void }) => (
    <div 
    id={`dashboard-item-${el.symbol}`} // Hook for hit test
    className={`
        interactable-btn
        aspect-square rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300
        ${unlocked 
            ? 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
            : 'border-white/20 bg-black opacity-80 '}
    `}
    onClick={onClick}
    style={!unlocked ? { borderColor: 'rgba(255,255,255,0.1)' } : {}}
    >
    {unlocked ? (
        <>
            {el.atomicNumber > 0 && (
                 <div className="absolute top-2 left-2 text-base font-mono text-white/50">{el.atomicNumber}</div>
            )}
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#00ff00]"></div>
            <div className="text-2xl md:text-3xl font-bold font-['Orbitron'] mb-1" style={{color: el.color}}>{el.symbol}</div>
            <div className="text-[8px] md:text-[10px] font-mono text-gray-400 uppercase tracking-wider text-center px-1">{el.name}</div>
        </>
    ) : (
            <div className="text-3xl font-mono text-gray-700">?</div>
    )}
    </div>
);

export default Dashboard;
