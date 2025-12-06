import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { HandGestureState } from '../types';

// Indices for landmarks
const WRIST = 0;
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

// Class to track history of points for gesture recognition (Circle Reset)
export class GestureBuffer {
  history: { x: number; y: number; time: number }[] = [];
  
  addPoint(x: number, y: number) {
    const now = Date.now();
    this.history.push({ x, y, time: now });
    // Keep last 1 second of data
    this.history = this.history.filter(p => now - p.time < 1000);
  }

  detectCircle(): boolean {
    if (this.history.length < 20) return false;

    // 1. Calculate Centroid
    let sumX = 0, sumY = 0;
    this.history.forEach(p => { sumX += p.x; sumY += p.y; });
    const centerX = sumX / this.history.length;
    const centerY = sumY / this.history.length;

    // 2. Calculate Winding Number (Total angle change)
    let totalAngle = 0;
    for (let i = 1; i < this.history.length; i++) {
      const p1 = this.history[i-1];
      const p2 = this.history[i];
      const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
      const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);
      
      let diff = angle2 - angle1;
      // Normalize diff to -PI to PI
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      
      totalAngle += diff;
    }

    // Check if total rotation is close to 360 degrees (2 PI)
    // 5.0 radians is approx 286 degrees. Sufficient for a quick circle.
    return Math.abs(totalAngle) > 5.0;
  }
  
  clear() {
    this.history = [];
  }
}

export function detectClosedFist(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[WRIST];
    
    // Check if finger tips are close to wrist/MCPs
    const indexFolded = distance(landmarks[INDEX_TIP], wrist) < distance(landmarks[INDEX_MCP], wrist);
    const middleFolded = distance(landmarks[MIDDLE_TIP], wrist) < distance(landmarks[MIDDLE_MCP], wrist);
    const ringFolded = distance(landmarks[RING_TIP], wrist) < distance(landmarks[RING_TIP-3], wrist); // MCP
    const pinkyFolded = distance(landmarks[PINKY_TIP], wrist) < distance(landmarks[PINKY_TIP-3], wrist);

    return indexFolded && middleFolded && ringFolded && pinkyFolded;
}

export function analyzeHand(landmarks: NormalizedLandmark[]): HandGestureState {
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const middleTip = landmarks[MIDDLE_TIP];
  const ringTip = landmarks[RING_TIP];
  const indexMcp = landmarks[INDEX_MCP];
  const pinkyMcp = landmarks[PINKY_MCP];
  const wrist = landmarks[WRIST];

  // 1. Pinch Detection (Thumb tip to Index tip)
  const pinchDist = distance(thumbTip, indexTip);
  const isPinching = pinchDist < 0.08;

  // Normalize pinch
  const normalizedPinch = Math.max(0, Math.min(1, (pinchDist - 0.02) / 0.20));

  // 2. Pointing Detection (Index extended, others curled)
  const indexExt = distance(indexTip, wrist) > distance(indexMcp, wrist) * 1.5;
  const middleCurled = distance(middleTip, wrist) < distance(landmarks[MIDDLE_MCP], wrist) * 1.2;
  const isPointing = indexExt && middleCurled && !isPinching;

  // 3. Movement Tracking (PALM CENTER)
  // We use the centroid of Wrist, Index Knuckle, and Pinky Knuckle to approximate the stable palm center.
  // This ensures movement follows the hand body, not the fingers.
  const palmX = (wrist.x + indexMcp.x + pinkyMcp.x) / 3;
  const palmY = (wrist.y + indexMcp.y + pinkyMcp.y) / 3;
  
  const handZ = landmarks[0].z; 

  return {
    pinchDistance: normalizedPinch,
    isPinching,
    isPointing,
    position: { x: palmX, y: palmY, z: handZ }
  };
}