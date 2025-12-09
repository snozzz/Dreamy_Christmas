import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useAppStore } from '../store';
import { detectGesture } from '../services/gestureRecognition';

const HandManager: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setGesture, setHandPosition, setIsPinching } = useAppStore();
  const [loaded, setLoaded] = useState(false);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        startCamera();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    const startCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: 640,
              height: 480
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
            setLoaded(true);
          }
        } catch (error) {
          console.error("Error accessing camera:", error);
        }
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;

      const video = videoRef.current;
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]; // First hand
          
          // Detect gesture
          const gesture = detectGesture(landmarks as any); // Cast to our interface
          setGesture(gesture);
          setIsPinching(gesture === 'PINCH');

          // Update hand position (Use index finger tip or palm center)
          // Flip X because webcam is mirrored
          setHandPosition({
            x: 1 - landmarks[9].x, 
            y: landmarks[9].y 
          });
        }
      }
      requestRef.current = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      if (handLandmarker) handLandmarker.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute bottom-4 right-4 z-50 w-32 h-24 overflow-hidden rounded-lg border-2 border-white/20 shadow-lg bg-black/50">
       {!loaded && <div className="absolute inset-0 flex items-center justify-center text-xs text-white">Loading AI...</div>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
      />
    </div>
  );
};

export default HandManager;
