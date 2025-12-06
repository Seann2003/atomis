
export interface ElementData {
  symbol: string;
  name: string;
  color: string;
  atomicNumber: number;
  description: string;
  level?: number; // 1 = Base, 2 = Compound, 3 = Complex
}

export type CatalystType = 'none' | 'heat' | 'light' | 'chemical';

export interface CombinationResult {
  elements: [string, string]; // symbols
  result: ElementData;
  requiredCatalyst?: CatalystType;
}

export interface HandGestureState {
  pinchDistance: number; // 0 to 1
  isPinching: boolean;
  isPointing: boolean; // Index finger up, others curled
  position: { x: number; y: number; z: number }; // Palm Center
  indexPosition: { x: number; y: number; z: number }; // Index Tip
  isDetected?: boolean; // Whether hand is currently being tracked
  isPresent: boolean; // Is the hand currently detected
}

export type Handedness = 'left' | 'right';

export type GameState = 'playing' | 'dead';

export interface TrackingData {
  left: HandGestureState;
  right: HandGestureState;
  isClapping: boolean;
  isResetGesture: boolean; // Circular motion detected
  isClosedFist: boolean; // New gesture for saving
  isSixtySevenGesture: boolean; // Palms up + alternating motion detected
  handDistance: number;
  cameraAspect: number; // Width / Height
  hoveredElement?: string; // Symbol of element being hovered
}
