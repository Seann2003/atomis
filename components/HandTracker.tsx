import React, { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { analyzeHand } from "../services/gestureRecognition";
import { TrackingData } from "../types";

interface HandTrackerProps {
  onUpdate: (data: TrackingData) => void;
  onCameraReady: () => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({
  onUpdate,
  onCameraReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Store the latest callback to avoid effect dependencies
  const onUpdateRef = useRef(onUpdate);

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
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
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
            facingMode: "user",
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
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

      // Only detect if video has data
      if (videoRef.current.readyState >= 2) {
        try {
          result = landmarker.detectForVideo(videoRef.current, startTimeMs);
        } catch (e) {
          console.warn("Detection dropped frame", e);
        }
      }

      // Default state: Hands floating at sides (0.2 and 0.8 x-axis)
      const trackingData: TrackingData = {
        left: {
          pinchDistance: 0.5,
          isPinching: false,
          isPinkyGesture: false,
          isThumbGesture: false,
          position: { x: 0.2, y: 0.5, z: 0 },
        },
        right: {
          pinchDistance: 0.5,
          isPinching: false,
          isPinkyGesture: false,
          isThumbGesture: false,
          position: { x: 0.8, y: 0.5, z: 0 },
        },
        isClapping: false,
        handDistance: 1000,
      };

      if (result && result.landmarks) {
        result.handedness.forEach((h, index) => {
          const landmarks = result!.landmarks[index];
          // Determine handedness: "Left" category in MediaPipe usually refers to the hand
          // that appears on the left in the mirrored video (which is the user's right hand).
          // However, we want logical control.
          // Let's assume standard mirrored webcam:
          // User raises Left hand -> shows on Left side of screen.

          const label = h[0].categoryName;
          const handState = analyzeHand(landmarks);

          if (label === "Right") {
            // MediaPipe "Right" is often the user's left hand in mirrored view,
            // but let's stick to screen position logic for simplicity if needed.
            // Actually, let's just map correctly.
            // MediaPipe 'Right' = User's Right Hand (if unmirrored).
            // In mirrored selfie mode:
            // User raises Right hand -> Image shows hand on Right side. MediaPipe says "Right".
            trackingData.right = handState;
          } else {
            trackingData.left = handState;
          }
        });

        // Calculate Clap Distance if both hands present
        // If only one hand detected, we stick to defaults for the other
        if (result.landmarks.length === 2) {
          const dx =
            trackingData.left.position.x - trackingData.right.position.x;
          const dy =
            trackingData.left.position.y - trackingData.right.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          trackingData.handDistance = dist;

          // Clap detection threshold
          if (dist < 0.15) {
            trackingData.isClapping = true;
          }
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
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
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
        className="fixed top-0 left-0 w-full h-full object-cover opacity-0 pointer-events-none -z-10"
        style={{ transform: "scaleX(-1)" }}
      />
      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-900/90 p-8 rounded-2xl border border-red-500 text-white z-50 text-center shadow-[0_0_50px_rgba(255,0,0,0.5)]">
          <h3 className="text-2xl font-bold font-['Orbitron'] mb-2 text-red-200">
            SYSTEM ERROR
          </h3>
          <p className="font-mono text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-800 hover:bg-red-700 rounded text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Reboot System
          </button>
        </div>
      )}
    </>
  );
};

export default HandTracker;
