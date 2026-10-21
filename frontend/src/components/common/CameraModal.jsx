import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  X,
  RotateCw,
  RotateCcw,
  Check,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import "./CameraModal.css";

/**
 * CameraModal
 * Reusable modal for capturing medical photos/documents via webcam or device camera fallback.
 *
 * Props:
 * @param {boolean} open - Whether the modal is visible.
 * @param {Function} onClose - Callback when modal is closed.
 * @param {Function} onCapture - Callback receiving captured File: onCapture(file).
 */
export default function CameraModal({ open, onClose, onCapture }) {
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileFallbackRef = useRef(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCameraStream = useCallback(
    async (facing = facingMode) => {
      stopCameraStream();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera API is not supported in this browser environment. You can use the file upload fallback.");
        return;
      }

      try {
        const constraints = {
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          // If specific facingMode fails, try any basic video camera
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Camera start failure:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Please allow camera access in your browser settings or choose a photo from your device.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera hardware detected on this device. You can select an image file instead.");
        } else {
          setCameraError(err.message || "Unable to access camera hardware. You can select an image file instead.");
        }
      }
    },
    [facingMode, stopCameraStream]
  );

  // Manage camera lifecycle based on open state
  useEffect(() => {
    if (open) {
      setCapturedPhotoUrl(null);
      setCapturedBlob(null);
      setCameraError(null);
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
      setCapturedPhotoUrl(null);
      setCapturedBlob(null);
      setCameraError(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [open, facingMode, startCameraStream, stopCameraStream]);

  if (!open) return null;

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Failed to capture image snapshot. Please try again.");
          return;
        }
        const previewUrl = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPhotoUrl(previewUrl);
        stopCameraStream();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    startCameraStream(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera_capture_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    if (onCapture) {
      onCapture(file);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleFlip = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    startCameraStream(nextFacing);
  };

  const handleCloseModal = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    stopCameraStream();
    if (onClose) {
      onClose();
    }
  };

  const handleFallbackFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onCapture) {
        onCapture(file);
      }
      handleCloseModal();
    }
  };

  return (
    <div
      className="camera-modal-backdrop ai-camera-modal-backdrop"
      onClick={handleCloseModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="camera-modal-container ai-camera-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="camera-modal-header">
          <div className="camera-title">
            <Camera size={18} />
            <span>Take Photo of Medical Report or Symptom</span>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="camera-close-btn"
            aria-label="Close camera modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="camera-body">
          {cameraError ? (
            <div className="camera-error-box">
              <AlertTriangle size={32} />
              <p>{cameraError}</p>
              <div className="camera-error-actions">
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="cam-fallback-btn"
                >
                  <Camera size={15} /> Use Device Files / Native Camera
                </button>
                <button
                  type="button"
                  onClick={() => startCameraStream(facingMode)}
                  className="cam-retry-btn"
                >
                  <RefreshCw size={15} /> Retry
                </button>
              </div>
            </div>
          ) : capturedPhotoUrl ? (
            <div className="camera-preview-container">
              <img
                src={capturedPhotoUrl}
                alt="Captured medical photo preview"
                className="camera-captured-img"
              />
            </div>
          ) : (
            <div className="camera-video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video-feed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="camera-modal-footer">
          {!capturedPhotoUrl && !cameraError && (
            <>
              <button
                type="button"
                onClick={handleFlip}
                className="cam-tool-btn"
                title="Switch Front / Back Camera"
              >
                <RotateCw size={16} />
                <span>Flip</span>
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="cam-capture-btn"
                title="Capture Photo"
                aria-label="Capture Photo"
              >
                <div className="capture-inner" />
              </button>
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="cam-tool-btn"
                title="Select from device files"
              >
                <ImageIcon size={16} />
                <span>Files</span>
              </button>
            </>
          )}

          {capturedPhotoUrl && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="cam-retake-btn"
              >
                <RotateCcw size={15} /> Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="cam-use-btn"
              >
                <Check size={16} /> Use Photo
              </button>
            </>
          )}
        </div>

        {/* Hidden fallback file input */}
        <input
          type="file"
          ref={fileFallbackRef}
          style={{ display: "none" }}
          accept="image/*"
          capture="environment"
          onChange={handleFallbackFileChange}
        />
      </div>
    </div>
  );
}
