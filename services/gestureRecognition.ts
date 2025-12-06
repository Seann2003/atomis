
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

// Detect if palm is facing the camera (palm visible, like in the image - "palm up")
export function detectPalmUp(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[WRIST];
    const middleMcp = landmarks[MIDDLE_MCP];
    const indexMcp = landmarks[INDEX_MCP];
    const pinkyMcp = landmarks[PINKY_MCP];
    const indexTip = landmarks[INDEX_TIP];
    const middleTip = landmarks[MIDDLE_TIP];
    const ringTip = landmarks[RING_TIP];
    const pinkyTip = landmarks[PINKY_TIP];
    
    // Calculate palm center z (depth) - average of wrist and knuckles
    const palmCenterZ = (wrist.z + middleMcp.z + indexMcp.z + pinkyMcp.z) / 4;
    
    // Calculate average finger tip z
    const fingerTipsZ = (indexTip.z + middleTip.z + ringTip.z + pinkyTip.z) / 4;
    
    // When palm faces camera (palm visible): palm center is CLOSER to camera than finger tips
    // In MediaPipe: more positive z = closer to camera
    // So palmCenterZ should be greater (more positive) than fingerTipsZ
    const palmFacingCamera = palmCenterZ > fingerTipsZ;
    
    // Check if fingers are extended (not curled) - finger tips should be further from wrist in 2D
    const indexExtended = distance(indexTip, wrist) > distance(indexMcp, wrist) * 1.2;
    const middleExtended = distance(middleTip, wrist) > distance(middleMcp, wrist) * 1.2;
    const fingersExtended = indexExtended && middleExtended;
    
    // Also check that palm is reasonably open (not a fist)
    const handOpen = !detectClosedFist(landmarks);
    
    return palmFacingCamera && fingersExtended && handOpen;
}

// Buffer to track alternating up/down motion pattern
export class AlternatingMotionBuffer {
    leftHistory: { y: number; time: number }[] = [];
    rightHistory: { y: number; time: number }[] = [];
    lastLeftY: number | null = null;
    lastRightY: number | null = null;
    pattern: 'up' | 'down' | null = null; // Current expected pattern
    patternCount: number = 0; // Count of pattern repetitions
    minMovementThreshold = 0.05; // Minimum movement required to count as alternation (5% of screen)
    
    addLeftPoint(y: number) {
        const now = Date.now();
        this.leftHistory.push({ y, time: now });
        this.leftHistory = this.leftHistory.filter(p => now - p.time < 2000); // Keep last 2 seconds
    }
    
    addRightPoint(y: number) {
        const now = Date.now();
        this.rightHistory.push({ y, time: now });
        this.rightHistory = this.rightHistory.filter(p => now - p.time < 2000);
    }
    
    detectAlternatingPattern(leftPalmUp: boolean, rightPalmUp: boolean, leftY: number, rightY: number): boolean {
        // Both palms must be facing up
        if (!leftPalmUp || !rightPalmUp) {
            this.reset();
            return false;
        }
        
        // Check if there's actual movement (not just static position)
        const leftMoved = this.lastLeftY !== null && Math.abs(leftY - this.lastLeftY) > this.minMovementThreshold;
        const rightMoved = this.lastRightY !== null && Math.abs(rightY - this.lastRightY) > this.minMovementThreshold;
        
        // Need movement to detect pattern
        if (!leftMoved && !rightMoved) {
            this.lastLeftY = leftY;
            this.lastRightY = rightY;
            return false;
        }
        
        // Calculate relative positions
        const leftHigher = leftY < rightY; // Lower y = higher on screen
        const rightHigher = rightY < leftY;
        const heightDiff = Math.abs(leftY - rightY);
        
        // Need significant height difference to count as alternation
        if (heightDiff < this.minMovementThreshold) {
            this.lastLeftY = leftY;
            this.lastRightY = rightY;
            return false;
        }
        
        // Detect pattern: one up, one down, alternating
        if (this.pattern === null) {
            // Start pattern detection only if there's clear difference
            if (leftHigher && heightDiff > this.minMovementThreshold) {
                this.pattern = 'up';
                this.patternCount = 1;
            } else if (rightHigher && heightDiff > this.minMovementThreshold) {
                this.pattern = 'down';
                this.patternCount = 1;
            }
            this.lastLeftY = leftY;
            this.lastRightY = rightY;
            return false;
        }
        
        // Check for pattern change (alternation) - must have actual movement
        if (this.pattern === 'up' && rightHigher && heightDiff > this.minMovementThreshold) {
            this.pattern = 'down';
            this.patternCount++;
        } else if (this.pattern === 'down' && leftHigher && heightDiff > this.minMovementThreshold) {
            this.pattern = 'up';
            this.patternCount++;
        }
        
        // Need at least 4 alternations (up-down-up-down)
        if (this.patternCount >= 4) {
            this.reset();
            return true;
        }
        
        this.lastLeftY = leftY;
        this.lastRightY = rightY;
        return false;
    }
    
    reset() {
        this.pattern = null;
        this.patternCount = 0;
        this.leftHistory = [];
        this.rightHistory = [];
        this.lastLeftY = null;
        this.lastRightY = null;
    }
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
    indexPosition: { x: indexTip.x, y: indexTip.y, z: indexTip.z },
    isPresent: true
  };
}
