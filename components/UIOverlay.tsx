import React from "react";
import { useAppStore } from "../store";
import { ElementType, ShapeTemplate, ELEMENT_CONFIGS } from "../types";
import { getElementInsight } from "../services/geminiService";
import {
  Atom,
  Heart,
  Flower,
  Zap,
  Rocket,
  Sparkles,
  AlertCircle,
} from "lucide-react";

const UIOverlay: React.FC = () => {
  const {
    selectedElement,
    selectedTemplate,
    customColor,
    aiInsight,
    isLoadingInsight,
    setElement,
    setTemplate,
    setCustomColor,
    setAiInsight,
    setLoadingInsight,
  } = useAppStore();

  const handleElementChange = (el: ElementType) => {
    setElement(el);
    setCustomColor(ELEMENT_CONFIGS[el].color);
    setAiInsight("Ask AI to learn more about this element!");
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      {/* Header */}
      <div className="pointer-events-auto flex justify-between items-start">
        <div className="bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/10 max-w-md">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Elemental Particles
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Use your hands to control the universe. <br />
            <span className="text-xs text-gray-500">
              Pinch/Fist = Tension | Distance = Expansion
            </span>
          </p>
        </div>
      </div>

      {/* Main Controls Panel */}
      <div className="pointer-events-auto bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10 w-full max-w-sm self-end mb-4">
        {/* Element Selection */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            Select Element
          </label>
          <div className="flex gap-2">
            {Object.values(ElementType).map((el) => (
              <button
                key={el}
                onClick={() => handleElementChange(el)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedElement === el
                    ? "bg-white/20 text-white shadow-lg shadow-blue-500/20"
                    : "bg-black/20 text-gray-400 hover:bg-white/10"
                }`}
              >
                {el}
              </button>
            ))}
          </div>
        </div>

        {/* Template Selection */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            Particle Template
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[
              { t: ShapeTemplate.ATOM, i: <Atom size={18} /> },
              { t: ShapeTemplate.HEART, i: <Heart size={18} /> },
              { t: ShapeTemplate.FLOWER, i: <Flower size={18} /> },
              { t: ShapeTemplate.SATURN, i: <Zap size={18} /> }, // Using Zap for Saturn/Energy
              { t: ShapeTemplate.FIREWORKS, i: <Rocket size={18} /> },
            ].map(({ t, i }) => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                title={t}
                className={`flex items-center justify-center aspect-square rounded-lg transition-all ${
                  selectedTemplate === t
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-105"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Color & AI */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
              />
              <span className="text-xs font-mono text-gray-300">
                {customColor}
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight Box */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5 relative overflow-hidden min-h-[60px] flex items-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
          <p className="text-sm text-gray-200 pl-2 leading-snug">{aiInsight}</p>
        </div>
      </div>

      {/* Permissions Note */}
      <div className="absolute bottom-4 left-6 text-[10px] text-gray-600 pointer-events-none">
        Requires Camera Permission for Hand Tracking
      </div>
    </div>
  );
};

export default UIOverlay;
