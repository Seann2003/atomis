import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { HandGestureState } from '../types';

// Indices for landmarks
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function analyzeHand(landmarks: NormalizedLandmark[]): HandGestureState {
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const pinkyTip = landmarks[PINKY_TIP];
  const pinkyMcp = landmarks[PINKY_MCP];
  const wrist = landmarks[WRIST];
  const indexMcp = landmarks[INDEX_MCP];

  // 1. Pinch Detection (Thumb tip to Index tip)
  const pinchDist = distance(thumbTip, indexTip);
  const isPinching = pinchDist < 0.08; // Slightly Relaxed threshold

  // Normalize pinch for scaling
  // Map 0.02 -> 0.25 to 0.0 -> 1.0
  const normalizedPinch = Math.max(0, Math.min(1, (pinchDist - 0.02) / 0.25));

  // 2. Gesture Detection
  
  // Pinky Gesture (Shaka or just Pinky out)
  // Logic: Pinky extended, Index & Middle curled/close to palm
  const pinkyDist = distance(pinkyTip, wrist);
  const pinkyBaseDist = distance(pinkyMcp, wrist);
  const isPinkyExtended = pinkyDist > pinkyBaseDist * 1.5;

  const indexDist = distance(indexTip, wrist);
  const indexBaseDist = distance(indexMcp, wrist);
  const isIndexCurled = indexDist < indexBaseDist * 1.2;

  const isPinkyGesture = isPinkyExtended && isIndexCurled;

  // Thumb Gesture (Thumbs Up)
  // Logic: Thumb tip is far from Index MCP, and other fingers are curled
  const thumbExt = distance(thumbTip, indexMcp);
  const isThumbExtended = thumbExt > 0.15;
  
  const middleDist = distance(landmarks[MIDDLE_TIP], wrist);
  const middleBaseDist = distance(landmarks[MIDDLE_MCP], wrist);
  const isMiddleCurled = middleDist < middleBaseDist * 1.2;

  // Use a combination of extended thumb and curled fingers
  const isThumbGesture = isThumbExtended && isIndexCurled && isMiddleCurled;

  // Calculate generic hand center position
  const handX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
  const handY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;
  
  // MediaPipe Z is relative to wrist
  const handZ = landmarks[0].z; 

  return {
    pinchDistance: normalizedPinch,
    isPinching,
    isPinkyGesture,
    isThumbGesture,
    position: { x: handX, y: handY, z: handZ }
  };
}