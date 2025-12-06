export interface ElementData {
  symbol: string;
  name: string;
  color: string;
  atomicNumber: number;
  description: string;
}

export interface CombinationResult {
  elements: [string, string]; // symbols
  result: ElementData;
}

export interface HandGestureState {
  pinchDistance: number; // 0 to 1
  isPinching: boolean;
  isPinkyGesture: boolean; // Trigger next element
  isThumbGesture: boolean; // Trigger next element
  position: { x: number; y: number; z: number };
}

export type Handedness = 'Left' | 'Right';

export interface TrackingData {
  left: HandGestureState;
  right: HandGestureState;
  isClapping: boolean;
  handDistance: number;
}
