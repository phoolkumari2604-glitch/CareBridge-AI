import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import "./PhotoEditModal.css";

// Helper to convert any image source (dataUrl, img) to a square JPEG blob (max 5 MB)
const convertToJpegBlob = (sourceUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const cropSize = Math.min(img.width, img.height);
      const sx = (img.width - cropSize) / 2;
      const sy = (img.height - cropSize) / 2;
      const targetDim = Math.min(cropSize, 800);
      canvas.width = targetDim;
      canvas.height = targetDim;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);

      const generateBlob = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Failed to encode JPEG blob"));
            }
            // If exceeds 5 MB and quality can be reduced, compress
            if (blob.size > 5 * 1024 * 1024 && quality > 0.4) {
              generateBlob(quality - 0.2);
            } else {
              const dataUrl = canvas.toDataURL("image/jpeg", quality);
              resolve({ blob, dataUrl });
            }
          },
          "image/jpeg",
          quality
        );
      };
      generateBlob(0.9);
    };
    img.onerror = () => reject(new Error("Failed to load image for processing"));
    img.src = sourceUrl;
  });
};

export default function PhotoEditModal({
  isOpen,
  onClose,
  currentPhoto,
  onSave,
  title = "Edit Profile Photo",
  subtitle = "Take a new photo using your camera or upload an image file",
}) {
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "camera"
  const [previewUrl, setPreviewUrl] = useState(null);
  const [hasNewPhoto, setHasNewPhoto] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [stream, setStream] = useState(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop all camera tracks cleanly
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  }, []);

  // Modal open/close cleanup and reset
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(null);
      setHasNewPhoto(false);
      setIsCaptured(false);
      setErrorMsg("");
      setActiveTab("upload");
    } else {
      stopCameraTracks();
    }
    return () => {
      stopCameraTracks();
    };
  }, [isOpen, stopCameraTracks]);

  // Clean unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  // Attach stream in a useEffect after the <video> element mounts
  useEffect(() => {
    if (videoRef.current && stream && activeTab === "camera" && !isCaptured) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn("video.play() failed or interrupted:", err);
      });
    }
  }, [stream, activeTab, isCaptured]);

  // Start Camera with user facingMode and friendly error handling
  const startCamera = useCallback(async () => {
    setErrorMsg("");
    setIsStartingCamera(true);

    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]");

    if (typeof window !== "undefined" && !window.isSecureContext && !isLocalhost) {
      setErrorMsg("Camera access requires a secure connection (HTTPS). Please upload an image file instead.");
      setIsStartingCamera(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("Webcam API is not supported by your current browser. Please upload an image file instead.");
      setIsStartingCamera(false);
      return;
    }

    // Stop any previous camera tracks before starting a fresh stream
    stopCameraTracks();

    try {
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      } catch (err1) {
        // Fallback for devices where facingMode: "user" constraint fails
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err2) {
          throw err2;
        }
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCaptured(false);
    } catch (err) {
      console.error("Camera access error:", err);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings to take a photo.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorMsg("No camera found. Please check your webcam connection or upload an image file instead.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setErrorMsg("Camera is already in use by another application or browser tab. Please close any apps using your camera and try again.");
      } else {
        setErrorMsg("Unable to access camera. Please check your camera settings or upload an image file.");
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, [stopCameraTracks]);

  // Tab switching
  const handleTabChange = (tab) => {
    setErrorMsg("");
    setActiveTab(tab);
    if (tab === "camera") {
      if (!isCaptured) {
        startCamera();
      }
    } else {
      stopCameraTracks();
    }
  };

  // Capture photo from video feed to canvas
  const handleCapture = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;
      const cropSize = Math.min(vWidth, vHeight);
      const sx = (vWidth - cropSize) / 2;
      const sy = (vHeight - cropSize) / 2;
      const targetDim = Math.min(cropSize, 800);

      const canvas = document.createElement("canvas");
      canvas.width = targetDim;
      canvas.height = targetDim;
      const ctx = canvas.getContext("2d");

      // Mirror horizontally for natural user-facing selfie orientation
      ctx.save();
      ctx.translate(targetDim, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewUrl(dataUrl);
      setHasNewPhoto(true);
      setIsCaptured(true);
      setErrorMsg("");

      // Stop camera tracks immediately on capture
      stopCameraTracks();
    } catch (err) {
      console.error("Capture snapshot failed:", err);
      setErrorMsg("Failed to capture snapshot from webcam.");
    }
  };

  // Retake photo: stop any active tracks, clear captured photo, and restart live camera
  const handleRetake = () => {
    stopCameraTracks();
    setPreviewUrl(null);
    setHasNewPhoto(false);
    setIsCaptured(false);
    setErrorMsg("");
    startCamera();
  };

  // Open hidden file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle uploaded file (JPG, PNG, WebP ≤ 5 MB)
  const handleFileChange = (e) => {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so re-selecting the same file triggers change
    e.target.value = "";

    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["jpg", "jpeg", "png", "webp"];

    if (!allowedMime.includes(file.type) && !allowedExts.includes(ext)) {
      setErrorMsg("Unsupported file format. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 5 MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
      setHasNewPhoto(true);
      setErrorMsg("");
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Save photo: stop camera tracks, convert to JPEG blob (max 5 MB), and call onSave
  const handleSave = async () => {
    if (!previewUrl || !hasNewPhoto) {
      setErrorMsg("Please take a photo or select an image file to save.");
      return;
    }

    stopCameraTracks();
    setIsSaving(true);
    setErrorMsg("");

    try {
      const { blob, dataUrl } = await convertToJpegBlob(previewUrl);

      if (blob.size > 5 * 1024 * 1024) {
        setErrorMsg("Processed image exceeds 5 MB limit. Please select a smaller photo.");
        setIsSaving(false);
        return;
      }

      if (onSave) {
        await onSave(dataUrl, blob);
      }
      onClose();
    } catch (err) {
      console.error("Save profile photo failed:", err);
      setErrorMsg(err.message || "Failed to save profile photo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel modal: stop tracks and close
  const handleCancel = () => {
    stopCameraTracks();
    onClose();
  };

  // Close modal (X or backdrop): stop tracks and close
  const handleClose = () => {
    stopCameraTracks();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="photo-modal-backdrop" onClick={handleClose}>
      <div className="photo-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="photo-modal-header">
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button
            type="button"
            className="photo-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Professional Segmented Toggle */}
        <div className="photo-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "upload"}
            className={`photo-tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => {
              if (activeTab === "upload") {
                triggerFileInput();
              } else {
                handleTabChange("upload");
              }
            }}
          >
            <Upload size={15} /> Upload Image File
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "camera"}
            className={`photo-tab-btn ${activeTab === "camera" ? "active" : ""}`}
            onClick={() => handleTabChange("camera")}
          >
            <Camera size={15} /> Take Photo with Camera
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="photo-modal-error">
            <AlertCircle size={18} className="photo-error-icon" />
            <div className="photo-error-content">
              <p>{errorMsg}</p>
              {activeTab === "camera" && (
                <div className="photo-error-actions">
                  <button
                    type="button"
                    className="photo-btn-inline retry"
                    onClick={startCamera}
                  >
                    <RefreshCw size={12} /> Retry Camera
                  </button>
                  <button
                    type="button"
                    className="photo-btn-inline switch"
                    onClick={() => handleTabChange("upload")}
                  >
                    <Upload size={12} /> Switch to Upload
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="photo-modal-body">
          {/* UPLOAD TAB VIEW */}
          {activeTab === "upload" && (
            <div className="upload-view-box">
              {previewUrl ? (
                <div className="photo-circular-preview-container">
                  <div className="photo-circular-avatar">
                    <img src={previewUrl} alt="Upload preview" />
                  </div>
                  <div className="photo-preview-actions">
                    <button
                      type="button"
                      className="photo-btn secondary"
                      onClick={triggerFileInput}
                    >
                      <Upload size={14} /> Choose Different Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="photo-dropzone"
                  onClick={triggerFileInput}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      triggerFileInput();
                    }
                  }}
                >
                  <div className="dropzone-icon-circle">
                    <Upload size={34} />
                  </div>
                  <strong className="dropzone-action-text">Click to select photo</strong>
                  <p className="dropzone-hint-text">Supports JPG, PNG, WebP up to 5 MB</p>
                  <button
                    type="button"
                    className="photo-btn primary dropzone-upload-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                  >
                    <Upload size={14} /> Upload Image File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CAMERA TAB VIEW */}
          {activeTab === "camera" && (
            <div className="camera-view-box">
              {isStartingCamera ? (
                <div className="camera-loading-container">
                  <div className="photo-circular-avatar camera-loading-avatar">
                    <RefreshCw size={36} className="photo-spinner" />
                  </div>
                  <p className="camera-loading-text">Starting video camera...</p>
                </div>
              ) : isCaptured && previewUrl ? (
                <div className="photo-circular-preview-container">
                  <div className="photo-circular-avatar">
                    <img src={previewUrl} alt="Captured preview" />
                  </div>
                  <div className="camera-controls-row">
                    <button
                      type="button"
                      className="photo-btn secondary retake-btn"
                      onClick={handleRetake}
                    >
                      <RotateCcw size={15} /> Retake
                    </button>
                  </div>
                </div>
              ) : stream ? (
                <div className="camera-live-container">
                  <div className="photo-circular-avatar camera-stream-avatar">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-video-feed"
                    />
                  </div>
                  <div className="camera-controls-row">
                    <button
                      type="button"
                      className="photo-btn primary capture-btn"
                      onClick={handleCapture}
                    >
                      <Camera size={16} /> Capture
                    </button>
                  </div>
                </div>
              ) : (
                <div className="camera-offline-container">
                  <div className="photo-circular-avatar camera-offline-avatar">
                    <Camera size={40} />
                  </div>
                  <h4>Camera Inactive</h4>
                  <p>Click below to start live video stream with your webcam</p>
                  <button
                    type="button"
                    className="photo-btn primary"
                    onClick={startCamera}
                    disabled={isStartingCamera}
                  >
                    <Camera size={15} /> Turn On Camera
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="photo-modal-footer">
          <button
            type="button"
            className="photo-btn secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="photo-btn primary"
            disabled={!hasNewPhoto || isSaving}
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <RefreshCw size={15} className="photo-spinner" /> Saving Photo...
              </>
            ) : (
              <>
                <Check size={15} /> Save Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
