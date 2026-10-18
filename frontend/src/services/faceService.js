import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;
let loadPromise = null;

export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const MODEL_URL = "/models/face";
      console.log("[FaceID] Step 3: Loading models from", MODEL_URL);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log("[FaceID] Step 3: Face detection & recognition models loaded successfully.");
      return true;
    } catch (err) {
      console.error("[FaceID] Failed to load local face detection models:", err);
      throw new Error("Could not load local face detection models from /models/face: " + (err?.message || err));
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Detect faces in a video element or canvas.
 * Returns { success: boolean, state: string, detection?: object, descriptor?: number[], score?: number, metrics?: object, error?: string, message?: string }
 */
export async function detectSingleFace(videoOrCanvas) {
  if (!videoOrCanvas) {
    return {
      success: false,
      state: "face not detected",
      error: "NO_ELEMENT",
      message: "Video preview is not ready.",
    };
  }

  await loadFaceModels();

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const detections = await faceapi
    .detectAllFaces(videoOrCanvas, options)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();

  if (!detections || detections.length === 0) {
    return {
      success: false,
      state: "face not detected",
      error: "NO_FACE",
      message: "Face not detected. Please position your face inside the circular frame.",
    };
  }

  if (detections.length > 1) {
    return {
      success: false,
      state: "multiple faces",
      error: "MULTIPLE_FACES",
      count: detections.length,
      message: "Multiple faces detected. Please ensure only one person is visible.",
    };
  }

  const detection = detections[0];
  const score = detection.detection?.score ?? 0.85;

  if (score < 0.6) {
    return {
      success: false,
      state: "face not detected",
      error: "LOW_CONFIDENCE",
      score,
      message: "Low confidence face detection. Please face the camera directly in good lighting.",
    };
  }

  const descriptor = Array.from(detection.descriptor);

  // Analyze landmarks for liveness (head pose, eye aspect ratio, smile)
  const landmarks = detection.landmarks;
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const mouth = landmarks.getMouth();

  const jawLeft = jaw[0];
  const jawRight = jaw[jaw.length - 1];
  const noseTip = nose[3] || nose[nose.length - 1];
  const jawWidth = Math.abs(jawRight.x - jawLeft.x);
  const minJawX = Math.min(jawLeft.x, jawRight.x);
  const noseRel = jawWidth > 0 ? (noseTip.x - minJawX) / jawWidth : 0.5;

  // Eye Aspect Ratio (EAR) for left & right eye
  const leftEyeDistH = Math.hypot(leftEye[0].x - leftEye[3].x, leftEye[0].y - leftEye[3].y);
  const leftEyeDistV1 = Math.hypot(leftEye[1].x - leftEye[5].x, leftEye[1].y - leftEye[5].y);
  const leftEyeDistV2 = Math.hypot(leftEye[2].x - leftEye[4].x, leftEye[2].y - leftEye[4].y);
  const leftEAR = (leftEyeDistV1 + leftEyeDistV2) / (2.0 * Math.max(leftEyeDistH, 1));

  const rightEyeDistH = Math.hypot(rightEye[0].x - rightEye[3].x, rightEye[0].y - rightEye[3].y);
  const rightEyeDistV1 = Math.hypot(rightEye[1].x - rightEye[5].x, rightEye[1].y - rightEye[5].y);
  const rightEyeDistV2 = Math.hypot(rightEye[2].x - rightEye[4].x, rightEye[2].y - rightEye[4].y);
  const rightEAR = (rightEyeDistV1 + rightEyeDistV2) / (2.0 * Math.max(rightEyeDistH, 1));

  const ear = (leftEAR + rightEAR) / 2.0;

  // Smile expression & mouth aspect ratio
  const happyScore = detection.expressions?.happy ?? 0;
  const mouthWidth = mouth ? Math.hypot(mouth[0].x - mouth[6].x, mouth[0].y - mouth[6].y) : 0;
  const mouthRatio = jawWidth > 0 ? mouthWidth / jawWidth : 0;
  const isSmile = happyScore > 0.60 || mouthRatio > 0.48;

  return {
    success: true,
    state: "ready",
    detection,
    score,
    descriptor,
    metrics: {
      noseRel,
      ear,
      happyScore,
      isCenter: noseRel >= 0.42 && noseRel <= 0.58,
      isTurnedLeft: noseRel < 0.38,
      isTurnedRight: noseRel > 0.62,
      isBlink: ear < 0.19,
      isSmile,
    },
  };
}
