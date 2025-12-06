import React from 'react';
import { Html } from '@react-three/drei';
import { ElementData } from '../types';

interface AtomLabelProps {
  element: ElementData;
  position: [number, number, number];
}

const AtomLabel: React.FC<AtomLabelProps> = ({ element, position }) => {
  return (
    <Html position={position} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center justify-center opacity-90">
        <div 
          className="text-2xl font-bold font-['Orbitron'] tracking-tighter transition-colors duration-500"
          style={{ 
            color: '#ffffff',
            textShadow: `0 0 10px ${element.color}, 0 0 20px ${element.color}`
          }}
        >
          {element.symbol}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-4 bg-white/20"></div>
            <div className="text-[10px] font-mono text-cyan-200 tracking-[0.2em] uppercase">
            {element.name}
            </div>
            <div className="h-px w-4 bg-white/20"></div>
        </div>
        
        <div className="text-[8px] text-gray-500 mt-0.5 font-mono">
          ATOMIC NO. {element.atomicNumber}
        </div>
      </div>
    </Html>
  );
};

export default AtomLabel;