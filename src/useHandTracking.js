import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export const useHandTracking = () => {
  const videoRef = useRef(null);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 }); // Start at center
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // Store the smoothed position in a ref so it persists between frames
  const smoothCursor = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    let handLandmarker;
    let animationFrameId;

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

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err) { console.error(err); }
    };

    const predictWebcam = () => {
      if (videoRef.current && handLandmarker && videoRef.current.videoWidth > 0) {
        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
        if (results.landmarks && results.landmarks.length > 0) {
          processHandData(results.landmarks[0]);
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    // --- SMOOTHING HELPER ---
    // a = current position, b = target position, factor = speed (0.1 = slow/smooth, 0.9 = fast/jittery)
    const lerp = (start, end, factor) => start + (end - start) * factor;

    const processHandData = (landmarks) => {
      const getDist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      // 1. Logic: Grab Detection
      const pinchDist = getDist(landmarks[4], landmarks[8]);
      const fingerTips = [8, 12, 16, 20]; 
      const fingerPips = [6, 10, 14, 18];
      const wrist = landmarks[0];
      const folded = fingerTips.filter((tip, i) => getDist(landmarks[tip], wrist) < getDist(landmarks[fingerPips[i]], wrist));
      
      setIsGrabbing(pinchDist < 0.05 || folded.length >= 3);

      // 2. Logic: Smooth Cursor
      const palmBase = landmarks[9]; 
      const targetX = 1 - palmBase.x; // Mirror X
      const targetY = palmBase.y;

      // Apply LERP (Linear Interpolation)
      // 0.15 is the "Smooth Factor". Lower = Smoother but more lag. Higher = Faster but more jitter.
      smoothCursor.current.x = lerp(smoothCursor.current.x, targetX, 0.15);
      smoothCursor.current.y = lerp(smoothCursor.current.y, targetY, 0.15);

      setCursor({ x: smoothCursor.current.x, y: smoothCursor.current.y });
    };

    setupMediaPipe();
    return () => { cancelAnimationFrame(animationFrameId); if (handLandmarker) handLandmarker.close(); };
  }, []);

  return { videoRef, cursor, isGrabbing, isModelLoaded };
};