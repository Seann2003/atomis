import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandState } from '../types';

interface HandTrackerProps {
  onHandUpdate: (state: HandState) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs for the landmarker to avoid re-creation
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    let mounted = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        if (!mounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        landmarkerRef.current = landmarker;
        startWebcam();
      } catch (err) {
        console.error("MediaPipe init error:", err);
        setError("Failed to load hand tracking.");
        setLoading(false);
      }
    };

    setupMediaPipe();

    return () => {
      mounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      }
      setLoading(false);
    } catch (err) {
      console.error("Webcam error:", err);
      setError("Camera access denied.");
      setLoading(false);
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker) return;

    if (video.currentTime > 0 && !video.paused && !video.ended) {
       // Only detect if video has valid time
       const result = landmarker.detectForVideo(video, performance.now());
       
       processLandmarks(result);
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const processLandmarks = (result: any) => {
    const landmarks = result.landmarks;
    
    // Default state
    let separation = 0.5;
    let tension = 0;
    let position: [number, number, number] = [0, 0, 0];
    let isTracking = false;

    if (landmarks && landmarks.length > 0) {
      isTracking = true;
      
      // If two hands, calculate separation
      if (landmarks.length === 2) {
        const hand1 = landmarks[0][0]; // Wrist
        const hand2 = landmarks[1][0]; // Wrist
        
        // Simple Euclidean distance in normalized coords (x, y are 0-1)
        const dx = hand1.x - hand2.x;
        const dy = hand1.y - hand2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Map distance to a reasonable expansion factor (0.1 to 0.8 usually)
        separation = Math.min(Math.max((dist - 0.2) * 2.5, 0), 1);
        
        // Center point
        position = [
           (hand1.x + hand2.x) / 2, 
           -(hand1.y + hand2.y) / 2, // Invert Y for 3D world
           0
        ];
      } else {
        // One hand: Use pinch for scale? Or just default.
        // Let's use x-position to pan if only one hand
        const hand = landmarks[0][0];
        position = [hand.x, -hand.y, 0];
      }

      // Calculate tension (avg of all hands)
      // Tension = how close fingers are to palm (wrist)
      let totalTension = 0;
      landmarks.forEach((hand: any[]) => {
        const wrist = hand[0];
        const tips = [hand[4], hand[8], hand[12], hand[16], hand[20]];
        
        let handOpenness = 0;
        tips.forEach(tip => {
            const d = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
            handOpenness += d;
        });
        // Approx: 0.8 sum dist is open, 0.2 is closed
        const t = 1 - Math.min(Math.max((handOpenness - 0.2) / 0.5, 0), 1);
        totalTension += t;
      });
      tension = totalTension / landmarks.length;
    }

    onHandUpdate({
      isTracking,
      separation,
      tension,
      position
    });
  };

  return (
    <div className="absolute top-4 right-4 w-48 h-36 bg-black/50 rounded-lg overflow-hidden border border-white/10 z-0">
      <video 
        ref={videoRef}
        autoPlay 
        playsInline
        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror
      />
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-white">Loading Vision...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400 p-2 text-center">{error}</div>}
      <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/60 text-[10px] text-white/70 rounded">
        Hand Tracker
      </div>
    </div>
  );
};

export default HandTracker;
