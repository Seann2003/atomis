import React, { useEffect, useState, useRef } from 'react';
import { ElementData, CombinationResult } from '../types';
import { ELEMENTS, COMBINATIONS } from '../constants';
import { getMascotFact } from '../utils/mascot';
import MascotAvatar from './MascotAvatar';
import { TrackingData } from '../types';
import clickSound from '../assets/sounds/click.wav';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  savedElements: ElementData[];
  labSlots: ElementData[];
  onStartQuiz: (difficulty: 'easy' | 'medium') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ isOpen, onClose, savedElements, labSlots, onStartQuiz }) => {
  const [allDiscoverables, setAllDiscoverables] = useState<ElementData[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<ElementData | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<ElementData[]>([]);
  const MAX_SLOTS = 8;

  // Click sound helper
  const playClickSound = () => {
    try {
      const audio = new Audio(clickSound);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if audio fails to play (e.g., user hasn't interacted yet)
      });
    } catch (error) {
      // Ignore errors
    }
  };

  // Tracking Ref for the Dashboard Avatar
  const dashboardTrackingRef = useRef<TrackingData>({
    left: { 
      pinchDistance: 0, 
      isPinching: false, 
      isPointing: false, 
      position: {x: 0.5, y: 0.5, z: 0}, 
      indexPosition: {x: 0.5, y: 0.5, z: 0},
      isDetected: false,
      isPresent: false
    },
    right: { 
      pinchDistance: 0, 
      isPinching: false, 
      isPointing: false, 
      position: {x: 0.5, y: 0.5, z: 0}, 
      indexPosition: {x: 0.5, y: 0.5, z: 0},
      isDetected: false,
      isPresent: false
    },
    isClapping: false,
    isResetGesture: false,
    isClosedFist: false,
    isSixtySevenGesture: false,
    handDistance: 1000,
    cameraAspect: 1.77
  });

  // Sync selectedSlots with labSlots prop (which updates when new elements are created)
  useEffect(() => {
    setSelectedSlots(labSlots);
  }, [labSlots]); // Update whenever labSlots changes (including when new elements are created in lab)

  // Save slots to localStorage whenever they change
  useEffect(() => {
    if (selectedSlots.length > 0) {
      localStorage.setItem('labSlots', JSON.stringify(selectedSlots));
    }
  }, [selectedSlots]);

  useEffect(() => {
    // 1. Base elements (Level 1) - assign level 1 explicitly
    const baseElements = ELEMENTS.map(el => ({ ...el, level: 1 }));
    
    // 2. Get all unique combination results (Level 2) - assign level 2 explicitly
    const comboResults = COMBINATIONS.map(c => ({ ...c.result, level: 2 }));
    // Deduplicate by symbol
    const uniqueCombos = comboResults.filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i);
    
    // 3. Combine base elements + compounds
    const fullList = [...baseElements, ...uniqueCombos];
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
                dashboardTrackingRef.current.left.isPresent = true;
            }
        }, 50);
    } else {
        // Go back to idle look
        dashboardTrackingRef.current.left.isDetected = false;
        dashboardTrackingRef.current.left.isPresent = false;
    }
  }, [selectedInfo, isOpen]);

  // Calculate progress
  const unlockedCount = allDiscoverables.filter(d => 
    savedElements.some(s => s.symbol === d.symbol) || ELEMENTS.some(e => e.symbol === d.symbol)
  ).length;
  
  const isUnlocked = (el: ElementData) => {
    // Base elements (Level 1, atomicNumber > 0) are always unlocked
    if (el.level === 1 && el.atomicNumber > 0) return true;
    // Compounds (Level 2+) need to be discovered/saved
    return savedElements.some(s => s.symbol === el.symbol);
  };

  // Group elements by Level and sort them
  const getElementsByLevel = (level: number) => {
      // Level 1: Only base elements (from ELEMENTS array, atomicNumber > 0)
      // Compounds (atomicNumber === 0) should NEVER appear in Level 1
      if (level === 1) {
          const baseElements = allDiscoverables.filter(el => 
              el.atomicNumber > 0 && (el.level === 1 || !el.level)
          );
          return baseElements.sort((a, b) => a.atomicNumber - b.atomicNumber);
      }
      
      // Level 2: Only compounds (from COMBINATIONS, atomicNumber === 0)
      // Base elements (atomicNumber > 0) should NEVER appear in Level 2
      if (level === 2) {
          const compounds = allDiscoverables.filter(el => 
              el.atomicNumber === 0 && (el.level === 2 || !el.level)
          );
          return compounds.sort((a, b) => a.symbol.localeCompare(b.symbol));
      }
      
      // Level 3+: Future complex compounds
      const filtered = allDiscoverables.filter(el => el.level === level);
      return filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
  };

  // Check if element is in selected slots
  const isInSlot = (el: ElementData) => {
    return selectedSlots.some(s => s.symbol === el.symbol);
  };

  // Toggle element in/out of slots
  const toggleSlot = (el: ElementData) => {
    if (isInSlot(el)) {
      // Remove from slots
      setSelectedSlots(prev => prev.filter(s => s.symbol !== el.symbol));
    } else {
      // Add to slots (if not at max)
      if (selectedSlots.length < MAX_SLOTS) {
        setSelectedSlots(prev => [...prev, el]);
      }
    }
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
                        <DashboardItem 
                            key={el.symbol} 
                            el={el} 
                            unlocked={true} 
                            inSlot={isInSlot(el)}
                            onClick={() => setSelectedInfo(el)}
                            onToggleSlot={() => toggleSlot(el)}
                            canAdd={selectedSlots.length < MAX_SLOTS}
                        />
                    ))}
                </div>
             </div>

             {/* LEVEL 2: COMPOUNDS */}
             <div>
                <h3 className="text-sm font-mono text-purple-500/80 tracking-widest mb-4 border-b border-purple-500/20 pb-2">LEVEL 2 // COMPOUNDS</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {getElementsByLevel(2).map(el => (
                        <DashboardItem 
                            key={el.symbol} 
                            el={el} 
                            unlocked={isUnlocked(el)} 
                            inSlot={isInSlot(el)}
                            onClick={() => isUnlocked(el) && setSelectedInfo(el)}
                            onToggleSlot={() => isUnlocked(el) && toggleSlot(el)}
                            canAdd={selectedSlots.length < MAX_SLOTS}
                        />
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
             
             {/* Quiz Section */}
             <div className="bg-gradient-to-b from-purple-900/20 to-black/40 border border-purple-500/30 rounded-2xl p-4">
                <div className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-3">Training Modules</div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                          playClickSound();
                          onStartQuiz('easy');
                        }}
                        className="flex-1 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/50 rounded-lg py-2 px-3 transition-all interactable-btn"
                        id="dashboard-quiz-easy"
                    >
                        <div className="text-[10px] text-purple-200 font-mono">EASY</div>
                        <div className="text-sm font-bold text-white">Create Water</div>
                    </button>
                    <button
                        onClick={() => {
                          playClickSound();
                          onStartQuiz('medium');
                        }}
                        className="flex-1 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/50 rounded-lg py-2 px-3 transition-all interactable-btn"
                         id="dashboard-quiz-medium"
                    >
                        <div className="text-[10px] text-purple-200 font-mono">MEDIUM</div>
                        <div className="text-sm font-bold text-white">Soda Water</div>
                    </button>
                </div>
             </div>

             {/* Slot Management Panel */}
             <div className="bg-gradient-to-b from-cyan-900/20 to-black/40 border border-cyan-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Lab Slots</div>
                    <div className="text-sm font-bold font-mono text-cyan-300">
                        {selectedSlots.length} / {MAX_SLOTS}
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                        const slotElement = selectedSlots[i];
                        return (
                            <div
                                key={i}
                                className={`
                                    aspect-square rounded-lg border-2 flex items-center justify-center text-xs
                                    ${slotElement 
                                        ? 'border-cyan-500 bg-cyan-900/30' 
                                        : 'border-white/10 bg-black/40 border-dashed'
                                    }
                                `}
                                style={slotElement ? { color: slotElement.color } : {}}
                            >
                                {slotElement ? slotElement.symbol : '+'}
                            </div>
                        );
                    })}
                </div>
                {selectedSlots.length === 0 && (
                    <div className="text-xs text-yellow-400/70 font-mono mt-2 text-center">
                        Select elements to add to lab slots
                    </div>
                )}
             </div>

             {/* Mascot Area */}
             <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                 {/* Background Element Symbol - Top Left, 50% space */}
                 {selectedInfo && (
                     <div 
                         className="absolute -top-4 left-0 pointer-events-none"
                         style={{ 
                             width: '50%',
                             height: '50%',
                             fontSize: '8rem',
                             fontWeight: 'bold',
                             fontFamily: 'Orbitron, sans-serif',
                             color: selectedInfo.color,
                             opacity: 0.15,
                             zIndex: 0,
                             display: 'flex',
                             alignItems: 'flex-start',
                             justifyContent: 'flex-start',
                             padding: '1rem'
                         }}
                     >
                         {selectedInfo.symbol}
                     </div>
                 )}
                 {/* Mascot Graphic (Live 3D Render) */}
                 <div className="w-full h-48 relative -mt-4 mb-2" style={{ zIndex: 1 }}>
                    {/* Glow */}
                    <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                    {/* Avatar - Positioned bottom right */}
                    <div className="absolute bottom-0 -right-14" style={{ transform: 'translate(15%, 15%)' }}>
                        <MascotAvatar trackingData={dashboardTrackingRef} />
                    </div>
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
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                disabled={selectedSlots.length === 0}
                className={`
                    interactable-btn mt-auto w-full py-4 font-bold font-['Orbitron'] tracking-widest rounded-xl transition-all
                    ${selectedSlots.length === 0
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]'
                    }
                `}
             >
                {selectedSlots.length === 0 ? 'SELECT SLOTS TO ENTER' : 'ENTER LABORATORY'}
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

const DashboardItem = ({ 
    el, 
    unlocked, 
    inSlot, 
    onClick, 
    onToggleSlot, 
    canAdd 
}: { 
    el: ElementData, 
    unlocked: boolean, 
    inSlot: boolean,
    onClick: () => void,
    onToggleSlot: () => void,
    canAdd: boolean
}) => {
  // Click sound helper
  const playClickSound = () => {
    try {
      const audio = new Audio(clickSound);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if audio fails to play (e.g., user hasn't interacted yet)
      });
    } catch (error) {
      // Ignore errors
    }
  };

  const handleClick = () => {
    playClickSound();
    onClick();
  };

  const handleDoubleClick = () => {
    if (unlocked) {
      playClickSound();
      onToggleSlot();
    }
  };

  return (
    <div 
    id={`dashboard-item-${el.symbol}`} // Hook for hit test
    className={`
        interactable-btn
        aspect-square rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300
        ${unlocked 
            ? inSlot
                ? 'border-cyan-500 bg-cyan-900/20 hover:bg-cyan-900/30 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
            : 'border-white/20 bg-black opacity-80 '}
    `}
    onClick={handleClick}
    onDoubleClick={handleDoubleClick}
    style={!unlocked ? { borderColor: 'rgba(255,255,255,0.1)' } : {}}
    >
    {unlocked ? (
        <>
            {el.atomicNumber > 0 && (
                 <div className="absolute top-2 left-2 text-base font-mono text-white/50">{el.atomicNumber}</div>
            )}
            {inSlot && (
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_#00ffff] border border-white/30"></div>
            )}
            {!inSlot && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#00ff00]"></div>
            )}
            <div className="text-2xl md:text-3xl font-bold font-['Orbitron'] mb-1" style={{color: el.color}}>{el.symbol}</div>
            <div className="text-[8px] md:text-[10px] font-mono text-gray-400 uppercase tracking-wider text-center px-1">{el.name}</div>
            {unlocked && (
                <div className="absolute bottom-1 text-[8px] font-mono text-cyan-400/60">
                    {inSlot ? 'IN SLOT' : canAdd ? 'DBL-CLICK TO ADD' : 'SLOTS FULL'}
                </div>
            )}
        </>
    ) : (
            <div className="text-3xl font-mono text-gray-700">?</div>
    )}
    </div>
  );
};

export default Dashboard;
