import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export const useHandTracking = (isEnabled) => {
  const videoRef = useRef(null);
  const cursorRef = useRef({ x: 0.5, y: 0.5 }); 
  const [isGrabbing, setIsGrabbing] = useState(false);
  
  // Smoothing Refs
  const smoothCursor = useRef({ x: 0.5, y: 0.5 });
  const grabHistory = useRef([]); 

  useEffect(() => {
    if (!isEnabled) return; 

    let handLandmarker;
    let animationFrameId;

    const lerp = (start, end, factor) => start + (end - start) * factor;
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const processHandData = (landmarks) => {
      // 1. Gesture Detection
      const getDist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      const pinchDist = getDist(landmarks[4], landmarks[8]);
      const fingerTips = [8, 12, 16, 20]; 
      const fingerPips = [6, 10, 14, 18];
      const wrist = landmarks[0];
      
      const folded = fingerTips.filter((tip, i) => getDist(landmarks[tip], wrist) < getDist(landmarks[fingerPips[i]], wrist));
      const isRawGrabbing = pinchDist < 0.05 || folded.length >= 3;
      
      // Debounce Grab State
      grabHistory.current.push(isRawGrabbing);
      if (grabHistory.current.length > 5) grabHistory.current.shift();
      const stableGrab = grabHistory.current.every(Boolean);
      
      setIsGrabbing(prev => (stableGrab !== prev ? stableGrab : prev));

      // 2. Cursor Calibration & Mapping
      const palmBase = landmarks[9]; 
      
      // Raw Coordinates (0 to 1)
      let rawX = 1 - palmBase.x; // Mirror X
      let rawY = palmBase.y;

      // EXPANSION ALGORITHM:
      // Map a smaller central area of the camera (e.g., 60%) to the full screen (100%).
      // This allows reaching corners without the hand leaving the camera view.
      const SCALE = 1.5; // 1.5x sensitivity
      
      // Center the coordinate (0.5), scale it, then un-center
      let targetX = (rawX - 0.5) * SCALE + 0.5;
      let targetY = (rawY - 0.5) * SCALE + 0.5;

      // Clamp to screen edges so it doesn't fly off
      targetX = clamp(targetX, 0, 1);
      targetY = clamp(targetY, 0, 1);

      // 3. Smoothing
      smoothCursor.current.x = lerp(smoothCursor.current.x, targetX, 0.15);
      smoothCursor.current.y = lerp(smoothCursor.current.y, targetY, 0.15);

      cursorRef.current = { x: smoothCursor.current.x, y: smoothCursor.current.y };
    };

    const predictWebcam = () => {
      if (videoRef.current && handLandmarker && videoRef.current.videoWidth > 0) {
        try {
            const startTimeMs = performance.now();
            const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
            if (results.landmarks && results.landmarks.length > 0) {
                processHandData(results.landmarks[0]);
            } else {
                setIsGrabbing(false);
            }
        } catch (e) { console.error(e); }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err) { console.error(err); }
    };

    const setupMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
      startWebcam();
    };

    setupMediaPipe();

    return () => { 
       if(videoRef.current && videoRef.current.srcObject) {
           videoRef.current.srcObject.getTracks().forEach(t => t.stop());
       }
       cancelAnimationFrame(animationFrameId);
       if(handLandmarker) handLandmarker.close();
    };

  }, [isEnabled]);

  return { videoRef, cursorRef, isGrabbing };
};