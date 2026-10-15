import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;
let loadPromise = null;

export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const MODEL_URL = "/models/face";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      return true;
    } catch (err) {
      console.error("Failed to load local face detection models:", err);
      throw new Error("Could not load local face detection models from /models/face");
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Detect faces in a video element or canvas.
 * Returns { success: boolean, detection?: object, descriptor?: number[], error?: string, message?: string }
 */
export async function detectSingleFace(videoOrCanvas) {
  await loadFaceModels();

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const detections = await faceapi
    .detectAllFaces(videoOrCanvas, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detections || detections.length === 0) {
    return {
      success: false,
      error: "NO_FACE",
      message: "No face detected. Please position your face inside the circular frame.",
    };
  }

  if (detections.length > 1) {
    return {
      success: false,
      error: "MULTIPLE_FACES",
      message: "Multiple faces detected. Please ensure only one person is visible.",
    };
  }

  const detection = detections[0];
  const descriptor = Array.from(detection.descriptor);

  // Analyze landmarks for liveness (head pose & eye aspect ratio)
  const landmarks = detection.landmarks;
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const jawLeft = jaw[0];
  const jawRight = jaw[jaw.length - 1];
  const noseTip = nose[3] || nose[nose.length - 1];
  const jawWidth = Math.abs(jawRight.x - jawLeft.x);
  const minJawX = Math.min(jawLeft.x, jawRight.x);
  const noseRel = jawWidth > 0 ? (noseTip.x - minJawX) / jawWidth : 0.5;

  const eyeDistH = Math.hypot(leftEye[0].x - leftEye[3].x, leftEye[0].y - leftEye[3].y);
  const eyeDistV1 = Math.hypot(leftEye[1].x - leftEye[5].x, leftEye[1].y - leftEye[5].y);
  const eyeDistV2 = Math.hypot(leftEye[2].x - leftEye[4].x, leftEye[2].y - leftEye[4].y);
  const ear = (eyeDistV1 + eyeDistV2) / (2.0 * (eyeDistH || 1));

  return {
    success: true,
    detection,
    descriptor,
    metrics: {
      noseRel,
      ear,
      isCenter: noseRel >= 0.42 && noseRel <= 0.58,
      isTurnedLeft: noseRel < 0.38,
      isTurnedRight: noseRel > 0.62,
      isBlink: ear < 0.18,
    },
  };
}
