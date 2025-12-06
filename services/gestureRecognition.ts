
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
  const indexMcp = landmarks[INDEX_MCP];
  const wrist = landmarks[WRIST];

  // 1. Pinch Detection (Click Gesture)
  // Distance between Thumb Tip and Index Tip
  const pinchDist = distance(thumbTip, indexTip);
  
  // Threshold: 0.15 makes clicking easier/forgiving
  const isPinching = pinchDist < 0.15;

  // Normalize pinch for animation (optional)
  const normalizedPinch = Math.max(0, Math.min(1, (pinchDist - 0.02) / 0.20));

  // 2. Pointing Detection
  const indexExt = distance(indexTip, wrist) > distance(indexMcp, wrist) * 1.5;
  const isPointing = indexExt && !isPinching;

  // 3. Movement Tracking (PALM CENTROID)
  // Averaging Wrist, Index Knuckle, and Pinky Knuckle gives a very stable center point
  const palmX = (landmarks[WRIST].x + landmarks[INDEX_MCP].x + landmarks[PINKY_MCP].x) / 3;
  const palmY = (landmarks[WRIST].y + landmarks[INDEX_MCP].y + landmarks[PINKY_MCP].y) / 3;
  const palmZ = (landmarks[WRIST].z + landmarks[INDEX_MCP].z + landmarks[PINKY_MCP].z) / 3;

  return {
    pinchDistance: normalizedPinch,
    isPinching,
    isPointing,
    position: { x: palmX, y: palmY, z: palmZ },
    indexPosition: { x: indexTip.x, y: indexTip.y, z: indexTip.z }
  };
}
