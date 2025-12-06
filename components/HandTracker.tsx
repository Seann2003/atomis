
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { analyzeHand, GestureBuffer, detectClosedFist } from '../services/gestureRecognition';
import { TrackingData } from '../types';

interface HandTrackerProps {
  onUpdate: (data: TrackingData) => void;
  onCameraReady: () => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onUpdate, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  
  // Gesture Buffers for Reset Detection
  const leftBuffer = useRef(new GestureBuffer());
  const rightBuffer = useRef(new GestureBuffer());
  // COMMENTED OUT - Buffer for alternating motion detection (67 gesture)
  // const alternatingMotionBuffer = useRef(new AlternatingMotionBuffer());

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let isMounted = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        if (!isMounted) return;

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        if (isMounted) {
          startCamera(handLandmarker);
        } else {
          handLandmarker.close();
        }
      } catch (err) {
        console.error("MediaPipe Load Error:", err);
        if (isMounted) setError("Failed to load tracking engine.");
      }
    };

    const startCamera = async (landmarker: HandLandmarker) => {
      if (!videoRef.current) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            facingMode: 'user'
          }
        });
        
        if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          if (isMounted) {
            onCameraReady();
            predictWebcam(landmarker);
          }
        };
      } catch (err) {
        console.error("Camera Error:", err);
        if (isMounted) setError("Camera access denied.");
      }
    };

    const predictWebcam = (landmarker: HandLandmarker) => {
      if (!videoRef.current || !isMounted) return;
      
      const startTimeMs = performance.now();
      let result: HandLandmarkerResult | null = null;
      
      if (videoRef.current.readyState >= 2) {
        try {
          result = landmarker.detectForVideo(videoRef.current, startTimeMs);
        } catch (e) {
          console.warn("Detection dropped frame", e);
        }
      }

      const videoAspect = videoRef.current ? (videoRef.current.videoWidth / videoRef.current.videoHeight) : 1.77;

      const trackingData: TrackingData = {
        left: { pinchDistance: 0.0, isPinching: false, isPointing: false, position: {x: 0.15, y: 0.5, z: 0}, indexPosition: {x: 0.15, y: 0.5, z: 0}, isPresent: false },
        right: { pinchDistance: 0.0, isPinching: false, isPointing: false, position: {x: 0.85, y: 0.5, z: 0}, indexPosition: {x: 0.85, y: 0.5, z: 0}, isPresent: false },
        isClapping: false,
        isResetGesture: false,
        isClosedFist: false,
        isSixtySevenGesture: false,
        handDistance: 1000,
        cameraAspect: videoAspect
      };

      if (result && result.landmarks) {
        let detectedFist = false;
        const detectedHands = new Set<string>();
        // COMMENTED OUT - Variables for 67 gesture detection
        // let leftPalmUp = false;
        // let rightPalmUp = false;
        // let leftLandmarks: any = null;
        // let rightLandmarks: any = null;

        result.handedness.forEach((h, index) => {
          const landmarks = result!.landmarks[index];
          // Mirror Logic: 'Right' is User Left
          const label = h[0].categoryName;
          
          const handState = analyzeHand(landmarks);
          // Mirror Inversion for both positions
          handState.position.x = 1 - handState.position.x;
          handState.indexPosition.x = 1 - handState.indexPosition.x;

          const isFist = detectClosedFist(landmarks);
          if (isFist) detectedFist = true;
          
          // Store palm up state and landmarks for 67 gesture detection
          // COMMENTED OUT - Disabled gesture detection
          /*
          const palmUp = detectPalmUp(landmarks);
          if (label === 'Right') {
            leftPalmUp = palmUp;
            leftLandmarks = landmarks;
          } else {
            rightPalmUp = palmUp;
            rightLandmarks = landmarks;
          }
          */

          // Logic for Circular Reset Gesture using Index Position now for better circular tracking
          if (handState.isPointing) {
            if (label === 'Right') leftBuffer.current.addPoint(handState.indexPosition.x, handState.indexPosition.y);
            else rightBuffer.current.addPoint(handState.indexPosition.x, handState.indexPosition.y);
          } else {
             if (label === 'Right') leftBuffer.current.clear();
             else rightBuffer.current.clear();
          }

          if (label === 'Right') { 
             handState.isDetected = true;
             handState.isPresent = true;
             trackingData.left = handState;
             detectedHands.add('left');
             if (leftBuffer.current.detectCircle()) {
                trackingData.isResetGesture = true;
                leftBuffer.current.clear();
             }
          } else {
             handState.isDetected = true;
             handState.isPresent = true;
             trackingData.right = handState;
             detectedHands.add('right');
             if (rightBuffer.current.detectCircle()) {
                trackingData.isResetGesture = true;
                rightBuffer.current.clear();
             }
          }
        });
        
        // Set isPresent to false for hands that are not detected
        if (!detectedHands.has('left')) {
          trackingData.left.isPresent = false;
        }
        if (!detectedHands.has('right')) {
          trackingData.right.isPresent = false;
        }
        
        trackingData.isClosedFist = detectedFist;

        // Clap Detection
        if (result.landmarks.length === 2) {
          const dx = trackingData.left.position.x - trackingData.right.position.x;
          const dy = trackingData.left.position.y - trackingData.right.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          trackingData.handDistance = dist;
          
          if (dist < 0.12) trackingData.isClapping = true;
          
          // 67 Gesture Detection: DISABLED
          // Both palms up + alternating up/down motion detection has been commented out
          
        } else {
          // Reset buffer if not both hands detected (disabled)
        }
      }

      onUpdateRef.current(trackingData);
      animationFrameId = requestAnimationFrame(() => predictWebcam(landmarker));
    };

    setupMediaPipe();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      handLandmarker?.close();
    };
  }, [onCameraReady]);

  return (
    <>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="fixed top-0 left-0 w-full h-full object-cover z-0 grayscale-[50%] brightness-[0.7] opacity-30"
        style={{ transform: 'scaleX(-1)' }} 
      />
      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-900/90 p-8 rounded-2xl border border-red-500 text-white z-50 text-center shadow-[0_0_50px_rgba(255,0,0,0.5)]">
          <h3 className="text-2xl font-bold font-['Orbitron'] mb-2 text-red-200">SYSTEM ERROR</h3>
          <p className="font-mono text-sm">{error}</p>
        </div>
      )}
    </>
  );
};

export default HandTracker;
