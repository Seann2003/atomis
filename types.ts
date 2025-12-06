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
  isPointing: boolean; // Index finger up, others curled
  position: { x: number; y: number; z: number };
}

export type Handedness = 'left' | 'right';

export interface DragState {
  active: boolean;
  hand: Handedness | null;
  element: ElementData | null;
}

export interface TrackingData {
  left: HandGestureState;
  right: HandGestureState;
  isClapping: boolean;
  isResetGesture: boolean; // Circular motion detected
  handDistance: number;
  cameraAspect: number; // Width / Height
  hoveredElement?: string; // Symbol of element being hovered
}