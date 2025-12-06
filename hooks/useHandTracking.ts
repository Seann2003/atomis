'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { HandTrackingState, HandData, HandLandmarks } from '@/types';

export const useHandTracking = () => {
  const [handState, setHandState] = useState<HandTrackingState>({
    leftHand: null,
    rightHand: null,
    isClapping: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastClapTimeRef = useRef<number>(0);
  const leftHandPositionRef = useRef<{ x: number; y: number } | null>(null);
  const rightHandPositionRef = useRef<{ x: number; y: number } | null>(null);

  const calculatePinchDistance = useCallback((landmarks: HandLandmarks[]): number => {
    if (landmarks.length < 21) return 1;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    return distance;
  }, []);

  const normalizePinch = useCallback((distance: number): number => {
    const minDistance = 0.02;
    const maxDistance = 0.15;
    const normalized = Math.max(0, Math.min(1, (distance - minDistance) / (maxDistance - minDistance)));
    return 1 - normalized;
  }, []);

  const detectClapping = useCallback((leftHand: HandData | null, rightHand: HandData | null): boolean => {
    if (!leftHand || !rightHand) return false;

    const leftWrist = leftHand.landmarks[0];
    const rightWrist = rightHand.landmarks[0];

    const distance = Math.sqrt(
      Math.pow(leftWrist.x - rightWrist.x, 2) +
      Math.pow(leftWrist.y - rightWrist.y, 2)
    );

    const isClose = distance < 0.15;
    const currentTime = Date.now();
    const timeSinceLastClap = currentTime - lastClapTimeRef.current;

    if (isClose && timeSinceLastClap > 1000) {
      lastClapTimeRef.current = currentTime;
      return true;
    }

    return false;
  }, []);

  const onResults = useCallback((results: any) => {
    let leftHand: HandData | null = null;
    let rightHand: HandData | null = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((landmarks: any[], index: number) => {
        const handedness = results.multiHandedness[index];
        const isLeft = handedness.categoryName === 'Left';

        const pinchDistance = calculatePinchDistance(landmarks);
        const normalizedPinch = normalizePinch(pinchDistance);

        const handData: HandData = {
          landmarks: landmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
          })),
          handedness: isLeft ? 'Left' : 'Right',
          pinchDistance,
          normalizedPinch,
        };

        if (isLeft) {
          leftHand = handData;
          leftHandPositionRef.current = { x: landmarks[0].x, y: landmarks[0].y };
        } else {
          rightHand = handData;
          rightHandPositionRef.current = { x: landmarks[0].x, y: landmarks[0].y };
        }
      });
    }

    const isClapping = detectClapping(leftHand, rightHand);

    setHandState({
      leftHand,
      rightHand,
      isClapping,
    });
  }, [calculatePinchDistance, normalizePinch, detectClapping]);

  useEffect(() => {
    const initializeHandTracking = async () => {
      try {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;

        const hands = new Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);

        const camera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: 640,
          height: 480,
        });

        handsRef.current = hands;
        cameraRef.current = camera;

        await camera.start();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing hand tracking:', error);
      }
    };

    initializeHandTracking();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
    };
  }, [onResults]);

  return {
    handState,
    isInitialized,
    videoElement: videoRef.current,
  };
};

