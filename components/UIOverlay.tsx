import React, { useRef, useEffect, useState } from "react";
import { ElementData, TrackingData, CatalystType, GameState } from "../types";
import { ELEMENTS } from "../constants";
import explosionMeme from "../assets/image.png";

interface UIOverlayProps {
  leftElement: ElementData;
  rightElement: ElementData;
  combinedElement: ElementData | null;
  message: string;
  trackingRef: React.MutableRefObject<TrackingData>;
  activeCatalyst: CatalystType;
  labSlots: ElementData[]; // Dashboard slots (8 manually selected)
  labCreatedSlots: ElementData[]; // Lab-created slots (8 auto-discovered)
  isDashboardOpen: boolean;
  onToggleDashboard: () => void;
  savedElements: ElementData[];
  gameState?: GameState;
  deathReason?: string;
  showSixtySeven?: boolean;
}

// Icons
const FlameIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-10 h-10"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      d="M12 22c4.97 0 9-4.03 9-9 0-4.97-9-13-9-13S3 8.03 3 13c0 4.97 4.03 9 9 9z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path
      d="M12 22c4.97 0 9-4.03 9-9 0-4.97-9-13-9-13S3 8.03 3 13c0 4.97 4.03 9 9 9z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 18c2.21 0 4-1.79 4-4 0-2.21-4-6-4-6s-4 3.79-4 6c0 2.21 1.79 4 4 4z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BoltIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-10 h-10"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FlaskIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-10 h-10"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      d="M8.5 2h7M12 2v6M6 22h12a2 2 0 002-2l-3-9a6 6 0 00-6-3h-1a6 6 0 00-6 3l-3 9a2 2 0 002 2z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path
      d="M8.5 2h7M12 2v6M6 22h12a2 2 0 002-2l-3-9a6 6 0 00-6-3h-1a6 6 0 00-6 3l-3 9a2 2 0 002 2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="16" r="1" fill="currentColor" />
    <circle cx="14" cy="18" r="1" fill="currentColor" />
  </svg>
);

const DashboardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-8 h-8"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const DeathScreen: React.FC<{ reason: string }> = ({ reason }) => {
    useEffect(() => {
        const t = setTimeout(() => {
            window.location.href = '/';
        }, 6000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-[fadeInDelayed_2s_ease-out_forwards]">
             <div className="absolute inset-0 z-0 flex items-center justify-center opacity-0 animate-[fadeInDelayed_3s_ease-out_forwards]">
                <img 
                    src={explosionMeme} 
                    alt="Explosion Meme" 
                    className="max-w-full max-h-full object-contain opacity-60"
                />
            </div>
            <h1 className="relative z-10 text-6xl md:text-9xl font-serif text-[#8a0e0e] tracking-widest uppercase scale-110 mb-8 drop-shadow-[0_0_10px_rgba(138,14,14,0.5)]">
                YOU DIED
            </h1>
            <div className="relative z-10 max-w-2xl text-center px-4">
                <p className="text-xl md:text-2xl text-gray-400 font-mono border-t border-b border-gray-800 py-4">
                    {reason}
                </p>
            </div>
            <div className="relative z-10 mt-12 text-sm text-gray-600 animate-pulse">
                RETURNING TO LAB...
            </div>
            <style>{`
                @keyframes fadeInDelayed {
                    0% { opacity: 0; }
                    30% { opacity: 0; } 
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

const UIOverlay: React.FC<UIOverlayProps> = ({
  leftElement,
  rightElement,
  combinedElement,
  message,
  trackingRef,
  activeCatalyst,
  labSlots,
  labCreatedSlots,
  isDashboardOpen,
  onToggleDashboard,
  savedElements,
  gameState,
  deathReason,
  showSixtySeven = false
}) => {
  if (gameState === 'dead') {
      return <DeathScreen reason={deathReason || "Unknown Cause"} />;
  }

  // Combine dashboard slots and lab-created slots for display (max 12 total: 8 dashboard + 4 lab-created)
  const displayElements = [...labSlots, ...labCreatedSlots];

  // Helper for font scaling
  const getSymbolScaleClass = (symbol: string, context: 'shelf' | 'system' | 'center') => {
      const len = symbol.length;
      
      if (context === 'shelf') {
          if (len > 4) return "text-sm";
          if (len > 2) return "text-lg";
          return "text-2xl";
      }
      
      if (context === 'system') {
          if (len > 4) return "text-4xl";
          if (len > 2) return "text-5xl";
          return "text-6xl";
      }
      
      if (context === 'center') {
           if (len > 4) return "text-5xl md:text-7xl";
           return "text-7xl md:text-9xl";
      }
      
      return "";
  };

  // Animation Loop for UI Updates (No React Render Lag)
  useEffect(() => {
    // Skip all gesture effects when dashboard is open
    if (isDashboardOpen) return;

    let animId: number;
    const cursorLeft = document.getElementById("cursor-left");
    const cursorRight = document.getElementById("cursor-right");

    const updateUI = () => {
      // Early return if dashboard opened during animation
      if (isDashboardOpen) {
        // Hide cursors
        if (cursorLeft) cursorLeft.style.opacity = "0";
        if (cursorRight) cursorRight.style.opacity = "0";
        return;
      }

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

      // 0. Update Cursors (Using Index Position)
      if (cursorLeft) {
        if (data.left.isPresent) {
            const l = getScreenCoords(data.left.indexPosition.x, data.left.indexPosition.y);
            cursorLeft.style.transform = `translate(${l.x}px, ${l.y}px)`;
            cursorLeft.style.opacity = '1';
            if (data.left.isPinching) {
                cursorLeft.classList.add('scale-75', 'bg-cyan-500/50', 'border-white');
                cursorLeft.classList.remove('scale-100', 'bg-cyan-500/20', 'border-cyan-400');
            } else {
                cursorLeft.classList.add('scale-100', 'bg-cyan-500/20', 'border-cyan-400');
                cursorLeft.classList.remove('scale-75', 'bg-cyan-500/50', 'border-white');
            }
        } else {
          cursorLeft.style.opacity = "0";
        }
      }

      if (cursorRight) {
        if (data.right.isPresent) {
            const r = getScreenCoords(data.right.indexPosition.x, data.right.indexPosition.y);
            cursorRight.style.transform = `translate(${r.x}px, ${r.y}px)`;
            cursorRight.style.opacity = '1';
            if (data.right.isPinching) {
                cursorRight.classList.add('scale-75', 'bg-purple-500/50', 'border-white');
                cursorRight.classList.remove('scale-100', 'bg-purple-500/20', 'border-purple-500');
            } else {
                cursorRight.classList.add('scale-100', 'bg-purple-500/20', 'border-purple-500');
                cursorRight.classList.remove('scale-75', 'bg-purple-500/50', 'border-white');
            }
        } else {
          cursorRight.style.opacity = "0";
        }
      }

      // 1. Highlight Items (Shelf + Catalyst + Dashboard) on Hover
      const interactables = document.querySelectorAll(".interactable-btn");
      interactables.forEach((item) => {
        const rect = item.getBoundingClientRect();
        let isHovered = false;

        // Check Left Hand (Index)
        if (data.left.isPresent) {
          const l = getScreenCoords(
            data.left.indexPosition.x,
            data.left.indexPosition.y
          );
          if (
            l.x >= rect.left &&
            l.x <= rect.right &&
            l.y >= rect.top &&
            l.y <= rect.bottom
          )
            isHovered = true;
        }
        // Check Right Hand (Index)
        if (data.right.isPresent) {
          const r = getScreenCoords(
            data.right.indexPosition.x,
            data.right.indexPosition.y
          );
          if (
            r.x >= rect.left &&
            r.x <= rect.right &&
            r.y >= rect.top &&
            r.y <= rect.bottom
          )
            isHovered = true;
        }

        // Apply Hover Styles Direct to DOM
        const el = item as HTMLElement;
        const isShelfItem = el.id.startsWith("shelf-item-");
        const isCatalystItem = el.id.startsWith("catalyst-btn-");
        const isDashboardItem = el.id.startsWith("dashboard-");
        const isToggle = el.id === "dashboard-toggle";

        if (isHovered) {
          el.style.transform = "scale(1.15)";
          el.style.zIndex = "100";

          if (isShelfItem) {
            el.style.borderColor = "rgba(0, 255, 255, 0.9)";
            el.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            el.style.boxShadow = `0 0 20px ${el.dataset.color || "#fff"}`;
          } else if (isCatalystItem) {
             const active = el.dataset.active === 'true';
             el.style.borderColor = active ? el.dataset.activecolor! : 'white';
             el.style.boxShadow = `0 0 15px ${active ? el.dataset.activecolor : 'white'}`;
             el.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          } else if (isToggle || isDashboardItem) {
            el.style.boxShadow = "0 0 15px rgba(34,211,238,0.4)";
          }
        } else {
          // Revert to base styles
          el.style.transform = "scale(1)";
          el.style.zIndex = "1";

          if (isShelfItem) {
            const isLeftActive = el.dataset.symbol === leftElement.symbol;
            const isRightActive = el.dataset.symbol === rightElement.symbol;

            if (isLeftActive) {
              el.style.borderColor = "rgba(34, 211, 238, 1)"; // Cyan
              el.style.boxShadow = "0 0 10px rgba(34,211,238,0.3)";
            } else if (isRightActive) {
              el.style.borderColor = "rgba(168, 85, 247, 1)"; // Purple
              el.style.boxShadow = "0 0 10px rgba(168,85,247,0.3)";
            } else {
              el.style.borderColor = "rgba(255, 255, 255, 0.15)";
              el.style.boxShadow = "none";
            }
            el.style.backgroundColor = "rgba(10, 10, 10, 0.7)";
          } else if (isCatalystItem) {
            const active = el.dataset.active === "true";
            el.style.backgroundColor = active ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)';
            el.style.borderColor = active
              ? el.dataset.activecolor!
              : "rgba(255,255,255,0.2)";
            el.style.boxShadow = active
              ? `0 0 20px ${el.dataset.activecolor}`
              : "none";
            el.style.color = active ? el.dataset.activecolor! : "#ffffff";
          } else if (isToggle) {
            el.style.boxShadow = "none";
          }
        }
      });

      animId = requestAnimationFrame(updateUI);
    };

    animId = requestAnimationFrame(updateUI);
    return () => cancelAnimationFrame(animId);
  }, [
    leftElement,
    rightElement,
    activeCatalyst,
    displayElements,
    isDashboardOpen,
  ]);

  // Render Cursors always, but hide other UI if dashboard is open
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      {/* CURSORS (Index Finger Based) - Hidden when dashboard is open */}
      {!isDashboardOpen && (
        <>
          <div
            id="cursor-left"
            className="fixed top-0 left-0 w-12 h-12 rounded-full border-2 border-cyan-400 bg-cyan-500/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 transition-all duration-150 ease-out flex items-center justify-center"
          >
            <div className="w-1 h-1 bg-cyan-200 rounded-full opacity-50"></div>
            {/* Outer Halo */}
            <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-sm"></div>
          </div>
          <div
            id="cursor-right"
            className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-purple-500 bg-purple-500/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[200] transition-colors duration-75"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-purple-200 rounded-full"></div>
          </div>
        </>
      )}

      {/* MAIN UI - Hide when Dashboard Open */}
      <div
        className={`flex-1 flex flex-col justify-between transition-opacity duration-300 ${isDashboardOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        {/* HEADER BAR - REARRANGED */}
        <div className="w-full pt-4 px-6 flex flex-row justify-between items-start pointer-events-auto relative z-20">
          {/* LEFT HAND SYSTEM */}
          <div
            className={`text-left transition-all duration-500 ${combinedElement ? "opacity-0 translate-y-10" : "opacity-100"}`}
          >
            <div className="text-[10px] text-cyan-400 mb-2 font-mono tracking-[0.2em] border-b border-cyan-900 pb-1 inline-block">
              SYSTEM: LEFT HAND
            </div>
            <div className={`${getSymbolScaleClass(leftElement.symbol, 'system')} font-['Orbitron'] font-bold text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]`}>
              {leftElement.symbol}
            </div>
            <div className="text-sm text-cyan-200/70 mt-1 font-mono">
              {leftElement.name}
            </div>
          </div>

          {/* CENTER: LAB SHELF */}
          <div className="flex-1 overflow-visible px-4 flex justify-center max-w-4xl">
            <div className="w-full overflow-x-visible pb-4 no-scrollbar flex justify-center">
              {displayElements.length > 0 ? (
                <div className="flex gap-4 px-4 min-w-max justify-center items-center">
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
                                    ${
                                      isLeft
                                        ? "border-cyan-400 bg-cyan-900/30"
                                        : isRight
                                          ? "border-purple-500 bg-purple-900/30"
                                          : "border-white/10 bg-black/60"
                                    }
                                `}
                      >
                        <div
                          className={`${getSymbolScaleClass(el.symbol, 'shelf')} font-bold font-['Orbitron'] drop-shadow-md`}
                          style={{ color: el.color }}
                        >
                          {el.symbol}
                        </div>
                        <div className="text-[9px] text-gray-300 font-mono mt-1">
                          {el.name.substring(0, 6)}
                        </div>

                        {isLeft && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-cyan-500 text-black font-bold px-2 rounded-full font-mono shadow-lg border border-white">
                            LEFT
                          </div>
                        )}
                        {isRight && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-purple-500 text-black font-bold px-2 rounded-full font-mono shadow-lg border border-white">
                            RIGHT
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center px-4 py-8 text-center">
                  <div className="text-white/40 font-mono text-sm">
                    <div className="mb-2">⚠️ NO ELEMENTS IN SLOTS</div>
                    <div className="text-xs">
                      Open Dashboard to select up to 14 elements
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT HAND SYSTEM */}
          <div
            className={`text-right transition-all duration-500 ${combinedElement ? "opacity-0 translate-y-10" : "opacity-100"}`}
          >
            <div className="text-[10px] text-purple-400 mb-2 font-mono tracking-[0.2em] border-b border-purple-900 pb-1 inline-block">
              SYSTEM: RIGHT HAND
            </div>
            <div className={`${getSymbolScaleClass(rightElement.symbol, 'system')} font-['Orbitron'] font-bold text-white drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]`}>
              {rightElement.symbol}
            </div>
            <div className="text-sm text-purple-200/70 mt-1 font-mono">
              {rightElement.name}
            </div>
          </div>
        </div>

        {/* --- COLLECTION BUTTON (BOTTOM LEFT) --- */}
        <div className="absolute bottom-10 left-10 pointer-events-auto z-40">
          <div
            id="dashboard-toggle"
            onClick={onToggleDashboard}
            className="interactable-btn flex items-center gap-3 bg-black/50 backdrop-blur-md border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-xl cursor-pointer hover:bg-cyan-900/20 transition-all"
          >
            <DashboardIcon />
            <span className="font-['Orbitron'] text-sm font-bold tracking-wider">
              COLLECTION
            </span>
          </div>
        </div>

        {/* --- BOTTOM CATALYST PANEL --- */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto z-30">
          <div className="flex flex-row gap-6">
            <div
              id="catalyst-btn-heat"
              data-type="heat"
              data-active={activeCatalyst === "heat"}
              data-activecolor="#ff4400"
              className="interactable-btn w-20 h-20 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md transition-all duration-300 bg-black/40"
            >
              <div className="scale-75">
                <FlameIcon />
              </div>
            </div>

            <div
              id="catalyst-btn-light"
              data-type="light"
              data-active={activeCatalyst === "light"}
              data-activecolor="#ffff00"
              className="interactable-btn w-20 h-20 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md transition-all duration-300 bg-black/40"
            >
              <div className="scale-75">
                <BoltIcon />
              </div>
            </div>

            <div
              id="catalyst-btn-chemical"
              data-type="chemical"
              data-active={activeCatalyst === "chemical"}
              data-activecolor="#00ff44"
              className="interactable-btn w-20 h-20 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md transition-all duration-300 bg-black/40"
            >
              <div className="scale-75">
                <FlaskIcon />
              </div>
            </div>
          </div>
          <div className="text-[9px] text-white/30 font-mono tracking-[0.3em] uppercase">
            Catalysts (Hover to Select / Pinch to Off)
          </div>
        </div>

        {/* --- BOTTOM HUD --- */}
        <div className="p-6 md:p-10 flex flex-col justify-end pointer-events-none">
          {/* Center Message */}
          {combinedElement && combinedElement.symbol !== 'BOOM' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full pointer-events-none">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-[100px] opacity-20 rounded-full"></div>
                <h2 className={`relative ${getSymbolScaleClass(combinedElement.symbol, 'center')} font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300 drop-shadow-[0_0_60px_rgba(0,255,255,0.8)] animate-pulse`}>
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

          {/* Futuristic Status Ticker - MOVED UP */}
          <div className="absolute bottom-44 left-1/2 transform -translate-x-1/2 text-center w-full pointer-events-none">
            <div className="relative inline-block overflow-hidden rounded-md group">
              {/* High-Tech Clip Path Border */}
              <div
                className={`
                        relative z-10 px-12 py-5 font-mono tracking-widest uppercase text-sm font-bold bg-black/80 backdrop-blur-xl border-l-4 border-r-4
                        ${
                          message.includes("HOLD")
                            ? "border-yellow-500 text-yellow-400"
                            : message.includes("SUCCESS") ||
                                message.includes("SAVED")
                              ? "border-green-500 text-green-400"
                              : message.includes("Unstable") ||
                                  message.includes("Failed") ||
                                  message.includes("WARNING")
                                ? "border-red-500 text-red-400"
                                : "border-cyan-500 text-cyan-400"
                        }
                    `}
                style={{
                  clipPath:
                    "polygon(10% 0, 100% 0, 100% 80%, 90% 100%, 0 100%, 0 20%)",
                }}
              >
                <span className="mr-4 opacity-50 text-xs">STATUS //</span>
                {message}
                {/* Scanning Line Animation */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full animate-[scan_2s_linear_infinite]"></div>
              </div>
            </div>

            {!combinedElement && (
              <div className="mt-6 flex gap-8 justify-center text-[9px] text-white/40 font-mono uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-cyan-400"></div>Hover Select
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-white"></div>Clap Fuse
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-500"></div>Spin Reset
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 67 Gesture Display */}
      {showSixtySeven && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none">
          <div 
            className="text-[20rem] font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_100px_rgba(255,255,255,0.8)] animate-pulse"
            style={{
              animation: 'pulse 1s ease-in-out infinite, fadeInOut 3s ease-in-out forwards'
            }}
          >
            67
          </div>
        </div>
      )}

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
        @keyframes fadeInOut {
            0% { opacity: 0; transform: scale(0.5); }
            20% { opacity: 1; transform: scale(1); }
            80% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.5); }
        }
      `}</style>
    </div>
  );
};

export default UIOverlay;
