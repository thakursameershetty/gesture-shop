import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export const useHandTracking = (isEnabled) => {
  const videoRef = useRef(null);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 }); 
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // Smoothing & Locking Refs
  const smoothCursor = useRef({ x: 0.5, y: 0.5 });
  const lockedHandedness = useRef(null); 
  const framesSinceLastHand = useRef(0);

  useEffect(() => {
    // 1. If disabled, reset state and do nothing.
    // The 'return' cleanup from the previous run will handle stopping the camera.
    if (!isEnabled) {
        setIsModelLoaded(false);
        return; 
    }

    let handLandmarker;
    let animationFrameId;

    // --- DEFINE HELPER FUNCTIONS FIRST ---

    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (handLandmarker) handLandmarker.close();
    };

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const processHandData = (landmarks) => {
      const getDist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      const pinchDist = getDist(landmarks[4], landmarks[8]);
      const fingerTips = [8, 12, 16, 20]; 
      const fingerPips = [6, 10, 14, 18];
      const wrist = landmarks[0];
      const folded = fingerTips.filter((tip, i) => getDist(landmarks[tip], wrist) < getDist(landmarks[fingerPips[i]], wrist));
      
      setIsGrabbing(pinchDist < 0.05 || folded.length >= 3);

      const palmBase = landmarks[9]; 
      const targetX = 1 - palmBase.x; 
      const targetY = palmBase.y;

      smoothCursor.current.x = lerp(smoothCursor.current.x, targetX, 0.15);
      smoothCursor.current.y = lerp(smoothCursor.current.y, targetY, 0.15);

      setCursor({ x: smoothCursor.current.x, y: smoothCursor.current.y });
    };

    const predictWebcam = () => {
      if (videoRef.current && handLandmarker && videoRef.current.videoWidth > 0) {
        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
            const detectedHandedness = results.handedness[0][0].categoryName;
            
            if (!lockedHandedness.current || framesSinceLastHand.current > 30) {
                lockedHandedness.current = detectedHandedness;
                framesSinceLastHand.current = 0;
            }

            if (detectedHandedness === lockedHandedness.current) {
                framesSinceLastHand.current = 0;
                processHandData(results.landmarks[0]);
            } else {
                framesSinceLastHand.current++;
            }
        } else {
            framesSinceLastHand.current++;
        }
      }
      // Loop
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err) { console.error("Camera denied or not found:", err); }
    };

    const setupMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
      setIsModelLoaded(true);
      startWebcam();
    };

    // --- INITIALIZE ---
    setupMediaPipe();

    // --- CLEANUP ---
    return () => {
        stopWebcam();
    };

  }, [isEnabled]); // Only re-run if enabled/disabled toggles

  return { videoRef, cursor, isGrabbing, isModelLoaded };
};