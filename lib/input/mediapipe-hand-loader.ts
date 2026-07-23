import type { HandLoader } from "@/lib/input/types";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const DETECTION_INTERVAL_MS = 100;

type Landmark = { x: number; y: number };
type Gesture = "open" | "closed" | "one" | "two" | "three" | null;
type ProgressGesture = "open" | "closed" | null;
type MediaPipeHandLoaderOptions = {
  previewContainer?: HTMLElement | null;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onGestureProgress?: (progress: { gesture: ProgressGesture; heldDurationMs: number }) => void;
};

function distance(first: Landmark, second: Landmark) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function classifyHand(landmarks: Landmark[]): Gesture {
  if (landmarks.length < 21) {
    return null;
  }

  const wrist = landmarks[0];
  const fingerPairs: Array<[number, number]> = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];
  const extendedFingers = fingerPairs.reduce((count, [tipIndex, jointIndex]) => {
    const tipDistance = distance(landmarks[tipIndex], wrist);
    const jointDistance = distance(landmarks[jointIndex], wrist);
    return count + Number(tipDistance > jointDistance * 1.15);
  }, 0);

  if (extendedFingers === 1) {
    return "one";
  }
  if (extendedFingers === 2) {
    return "two";
  }
  if (extendedFingers === 3) {
    return "three";
  }
  if (extendedFingers >= 4) {
    return "open";
  }
  return "closed";
}

async function initializeWithoutXnnpackInfo<T>(operation: () => Promise<T>) {
  const originalConsoleError = console.error;
  console.error = (...data: Parameters<typeof console.error>) => {
    const isXnnpackInfo = data.some((item) => String(item).includes("XNNPACK delegate for CPU"));
    if (!isXnnpackInfo) {
      originalConsoleError.apply(console, data);
    }
  };
  try {
    return await operation();
  } finally {
    console.error = originalConsoleError;
  }
}

function runWithoutXnnpackInfo<T>(operation: () => T) {
  const originalConsoleError = console.error;
  console.error = (...data: Parameters<typeof console.error>) => {
    const isXnnpackInfo = data.some((item) => String(item).includes("XNNPACK delegate for CPU"));
    if (!isXnnpackInfo) {
      originalConsoleError.apply(console, data);
    }
  };
  try {
    return operation();
  } finally {
    console.error = originalConsoleError;
  }
}

function waitForVideoFrame(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("La cámara no entregó una imagen a tiempo."));
    }, 8000);
    const handleReady = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("No se pudo leer la imagen de la cámara."));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("error", handleError, { once: true });
  });
}

/**
 * Creates a browser-only MediaPipe adapter. The model and WASM files remain
 * outside the deployment bundle and are downloaded only after camera consent.
 */
export function createMediaPipeHandLoader(options: MediaPipeHandLoaderOptions = {}): HandLoader {
  return async () => {
    const landmarker = await initializeWithoutXnnpackInfo(async () => {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
    });

    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    let animationFrame = 0;
    let running = false;
    let closed = false;
    let lastDetectionAt = 0;
    let previousCandidate: Gesture = null;
    let candidateFrames = 0;
    let emittedGesture: Gesture = null;
    let closedAt = 0;

    const stop = () => {
      running = false;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (video) {
        video.pause();
        video.srcObject = null;
        video.remove();
        video = null;
      }
      if (!closed) {
        landmarker.close();
        closed = true;
      }
    };

    const reportError = (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error("No se pudo procesar la cámara.");
      options.onError?.(error);
    };

    return {
      async start(listener) {
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Este navegador no permite usar la cámara.");
          }
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: "user",
              width: { ideal: 640, max: 640 },
              height: { ideal: 480, max: 480 },
              frameRate: { ideal: 15, max: 15 },
            },
          });
          video = document.createElement("video");
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.className = "h-full w-full -scale-x-100 object-cover";
          video.setAttribute("aria-label", "Vista previa de la cámara");
          video.srcObject = stream;
          options.previewContainer?.replaceChildren(video);
          await video.play();
          await waitForVideoFrame(video);
          running = true;
          options.onReady?.();

          const detect = () => {
            const currentVideo = video;
            if (!running || !currentVideo) {
              return;
            }
            animationFrame = window.requestAnimationFrame(detect);
            const now = performance.now();
            if (currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || now - lastDetectionAt < DETECTION_INTERVAL_MS) {
              return;
            }
            try {
              lastDetectionAt = now;
              const result = runWithoutXnnpackInfo(() => landmarker.detectForVideo(currentVideo, now));
              const gesture = classifyHand(result.landmarks[0] ?? []);
              if (!gesture) {
                if (previousCandidate !== null) {
                  options.onGestureProgress?.({ gesture: null, heldDurationMs: 0 });
                }
                previousCandidate = null;
                candidateFrames = 0;
                return;
              }
              if (gesture === previousCandidate) {
                candidateFrames += 1;
              } else {
                previousCandidate = gesture;
                candidateFrames = 1;
              }
              if (candidateFrames < 2) {
                return;
              }

              if (gesture === "closed") {
                if (emittedGesture !== "closed") {
                  closedAt = now;
                }
                options.onGestureProgress?.({
                  gesture: "closed",
                  heldDurationMs: Math.min(Math.max(now - closedAt, 0), 2000),
                });
              } else if (gesture === "open" && emittedGesture !== "open") {
                options.onGestureProgress?.({ gesture: "open", heldDurationMs: 0 });
              }

              if (gesture === emittedGesture) {
                return;
              }
              emittedGesture = gesture;
              const timestamp = Date.now();
              if (gesture === "one" || gesture === "two" || gesture === "three") {
                listener({ type: "fingers", count: gesture === "one" ? 1 : gesture === "two" ? 2 : 3, timestamp });
              } else {
                listener({ type: "gesture", gesture, timestamp });
              }
            } catch (error) {
              stop();
              reportError(error);
            }
          };
          detect();
        } catch (error) {
          stop();
          reportError(error);
          throw error;
        }
      },
      stop,
    };
  };
}
