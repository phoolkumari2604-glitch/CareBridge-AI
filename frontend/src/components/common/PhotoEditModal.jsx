import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  Video,
  ShieldAlert,
} from "lucide-react";
import "./PhotoEditModal.css";

// Helper to stop any media tracks on a given stream
const stopMediaStream = (stream) => {
  if (stream && typeof stream.getTracks === "function") {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        // ignore
      }
    });
  }
};

// Global helper to release any stray MediaStreams across the window
const releaseGlobalMediaStreams = () => {
  if (window._activeCareBridgeCameraStream) {
    stopMediaStream(window._activeCareBridgeCameraStream);
    window._activeCareBridgeCameraStream = null;
  }
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
  const [previewUrl, setPreviewUrl] = useState(currentPhoto || null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorType, setErrorType] = useState(null); // "NotAllowedError" | "NotFoundError" | "NotReadableError" | "InsecureContext" | "Generic"
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    if (window._activeCareBridgeCameraStream) {
      stopMediaStream(window._activeCareBridgeCameraStream);
      window._activeCareBridgeCameraStream = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsStartingCamera(false);
  }, []);

  // Enumerate video input devices
  const enumerateCameras = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter((d) => d.kind === "videoinput");
        setAvailableDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn("Could not enumerate video devices:", err);
    }
  }, [selectedDeviceId]);

  // Start Camera with getUserMedia fallbacks
  const startCamera = useCallback(async (deviceIdToUse = null) => {
    setErrorMsg("");
    setErrorType(null);
    setIsStartingCamera(true);

    // Secure context check (HTTPS or localhost)
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]";
    if (!window.isSecureContext && !isLocalhost) {
      setErrorType("InsecureContext");
      setErrorMsg(
        "Camera access requires a secure connection (HTTPS) or localhost. Please load the application over HTTPS."
      );
      setIsStartingCamera(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorType("NotFoundError");
      setErrorMsg("Webcam API is not supported by your current browser. Please upload an image file instead.");
      setIsStartingCamera(false);
      return;
    }

    // Stop any existing stream on this modal or page first
    stopCamera();
    releaseGlobalMediaStreams();

    let stream = null;
    const targetDeviceId = deviceIdToUse || selectedDeviceId;

    // Fallback 1: Ideal HD facingMode user
    try {
      const constraints1 = targetDeviceId
        ? { video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } };
      stream = await navigator.mediaDevices.getUserMedia(constraints1);
    } catch (err1) {
      console.warn("Primary camera constraint failed, attempting fallback { video: true }:", err1);

      // If OverconstrainedError, retry with basic { video: true }
      try {
        const constraints2 = targetDeviceId
          ? { video: { deviceId: { exact: targetDeviceId } } }
          : { video: true };
        stream = await navigator.mediaDevices.getUserMedia(constraints2);
      } catch (err2) {
        console.error("Camera access failed on all getUserMedia attempts:", err2);
        setIsStartingCamera(false);

        const name = err2.name || err1.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setErrorType("NotAllowedError");
          setErrorMsg(
            "Camera permission was denied. Please click the camera/lock icon in your browser address bar to allow camera access, then click 'Retry Camera'."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setErrorType("NotFoundError");
          setErrorMsg("No camera device was detected on your computer. Please check your webcam connection or upload a photo.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setErrorType("NotReadableError");
          setErrorMsg("Camera is already in use by another application or browser tab. Please close any software using your webcam and click 'Retry Camera'.");
        } else if (name === "OverconstrainedError") {
          setErrorType("OverconstrainedError");
          setErrorMsg("Selected camera does not satisfy the resolution constraints. Try switching camera or clicking 'Retry'.");
        } else {
          setErrorType("Generic");
          setErrorMsg(`Unable to access camera: ${err2.message || "Could not start video source"}. Try switching to image upload.`);
        }
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      window._activeCareBridgeCameraStream = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) {
            console.warn("video.play() interrupted:", e);
          }
        };
      }
      setIsStreaming(true);
      setIsCapturing(false);
      setIsStartingCamera(false);
      enumerateCameras();
    }
  }, [selectedDeviceId, stopCamera, enumerateCameras]);

  // Auto clean up and reset when modal opens / closes
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentPhoto || null);
      setErrorMsg("");
      setErrorType(null);
      setActiveTab("upload");
      enumerateCameras();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentPhoto, stopCamera, enumerateCameras]);

  // Listen to popstate (route change) to guarantee camera tracks stop immediately
  useEffect(() => {
    const handleRouteChange = () => {
      stopCamera();
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [stopCamera]);

  // Tab switching
  const handleTabChange = (tab) => {
    setErrorMsg("");
    setErrorType(null);
    setActiveTab(tab);
    if (tab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Change camera device
  const handleDeviceChange = (e) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    if (isStreaming || activeTab === "camera") {
      startCamera(newId);
    }
  };

  // Capture photo from live video with 512x512 square crop and JPEG compression under 5MB
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;

      const cropSize = Math.min(vWidth, vHeight);
      const sx = (vWidth - cropSize) / 2;
      const sy = (vHeight - cropSize) / 2;

      const targetDim = Math.min(cropSize, 512);

      const canvas = document.createElement("canvas");
      canvas.width = targetDim;
      canvas.height = targetDim;
      const ctx = canvas.getContext("2d");

      // Draw mirrored cropped square
      ctx.save();
      ctx.translate(targetDim, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
      ctx.restore();

      // Encode as JPEG at 0.88 quality (well under 5MB, crisp 512x512)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      setPreviewUrl(dataUrl);
      setIsCapturing(true);
      stopCamera();
    } catch (err) {
      console.error("Capture snapshot failed:", err);
      setErrorMsg("Failed to capture snapshot from webcam.");
    }
  };

  // Retake photo
  const handleRetake = () => {
    setPreviewUrl(null);
    setIsCapturing(false);
    startCamera();
  };

  // File Upload with 5MB & image type validation
  const handleFileChange = (e) => {
    setErrorMsg("");
    setErrorType(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Unsupported file format. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 5 MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // Resize uploaded image to max 512x512 square for consistency
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = Math.min(minSide, maxDim);
        canvas.height = Math.min(minSide, maxDim);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, canvas.width, canvas.height);

        const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPreviewUrl(resizedDataUrl);
      };
      img.src = event.target?.result;
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Save photo
  const handleSave = () => {
    if (!previewUrl) {
      setErrorMsg("Please take a photo or select an image file to save.");
      return;
    }
    stopCamera();
    onSave(previewUrl);
    onClose();
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    stopCamera();
    onSave(null);
    onClose();
  };

  // Close modal and guarantee tracks stop
  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="photo-modal-backdrop" onClick={handleModalClose}>
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
            onClick={handleModalClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Informative Error Card with contextual hint & retry */}
        {errorMsg && (
          <div className="photo-modal-error">
            <div className="photo-error-icon">
              {errorType === "NotAllowedError" ? (
                <ShieldAlert size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
            </div>
            <div className="photo-error-content">
              <strong>{errorType === "NotAllowedError" ? "Camera Permission Required" : errorType === "NotReadableError" ? "Camera In Use" : "Camera Access Issue"}</strong>
              <p>{errorMsg}</p>
              <div className="photo-error-actions">
                <button
                  type="button"
                  className="photo-btn-inline retry"
                  onClick={() => startCamera()}
                >
                  <RefreshCw size={13} /> Retry Camera
                </button>
                <button
                  type="button"
                  className="photo-btn-inline switch"
                  onClick={() => handleTabChange("upload")}
                >
                  <Upload size={13} /> Switch to Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="photo-modal-tabs">
          <button
            type="button"
            className={`photo-tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => handleTabChange("upload")}
          >
            <Upload size={15} /> Upload Image File
          </button>
          <button
            type="button"
            className={`photo-tab-btn ${activeTab === "camera" ? "active" : ""}`}
            onClick={() => handleTabChange("camera")}
          >
            <Camera size={15} /> Take Photo with Camera
          </button>
        </div>

        {/* Camera Selector (if multiple cameras available) */}
        {activeTab === "camera" && availableDevices.length > 1 && (
          <div className="photo-camera-select-row">
            <label htmlFor="cam-select" className="camera-select-label">
              <Video size={13} /> Select Camera:
            </label>
            <select
              id="cam-select"
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="photo-camera-select"
            >
              {availableDevices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Body View */}
        <div className="photo-modal-body">
          {activeTab === "upload" && (
            <div className="upload-view-box">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="photo-preview-wrap">
                  <div className="photo-avatar-preview">
                    <img src={previewUrl} alt="Preview" />
                  </div>
                  <div className="photo-preview-actions">
                    <button
                      type="button"
                      className="photo-btn secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} /> Choose Different Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="photo-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="dropzone-icon">
                    <ImageIcon size={38} />
                  </div>
                  <strong>Click to select photo</strong>
                  <p>Supports JPG, PNG, WebP up to 5 MB</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "camera" && (
            <div className="camera-view-box">
              {isStreaming ? (
                <div className="camera-live-wrap">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video-feed"
                  />
                  {/* Circular Face Guide Reticle */}
                  <div className="camera-guideline-circle">
                    <div className="face-guide-pulse" />
                  </div>
                  <div className="camera-actions-row">
                    <button
                      type="button"
                      className="photo-btn primary capture-btn"
                      onClick={handleCapturePhoto}
                    >
                      <Camera size={16} /> Capture Photo
                    </button>
                  </div>
                </div>
              ) : previewUrl && isCapturing ? (
                <div className="photo-preview-wrap">
                  <div className="photo-avatar-preview">
                    <img src={previewUrl} alt="Captured preview" />
                  </div>
                  <div className="photo-preview-actions">
                    <button
                      type="button"
                      className="photo-btn secondary"
                      onClick={handleRetake}
                    >
                      <RotateCcw size={14} /> Retake Photo
                    </button>
                    <button
                      type="button"
                      className="photo-btn primary"
                      onClick={handleSave}
                    >
                      <Check size={14} /> Use Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="camera-offline-wrap">
                  <div className="camera-offline-icon-circle">
                    <Camera size={36} />
                  </div>
                  <h4>Initialize Video Camera</h4>
                  <p>Click below to start live video stream with your webcam</p>
                  <button
                    type="button"
                    className="photo-btn primary"
                    onClick={() => startCamera()}
                    disabled={isStartingCamera}
                  >
                    {isStartingCamera ? (
                      <>
                        <RefreshCw size={15} className="spinner-icon-inline" /> Connecting Camera...
                      </>
                    ) : (
                      <>
                        <Camera size={15} /> Turn On Camera
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="photo-modal-footer">
          {currentPhoto ? (
            <button
              type="button"
              className="photo-btn danger-link"
              onClick={handleRemovePhoto}
            >
              <Trash2 size={14} /> Remove Photo
            </button>
          ) : (
            <span />
          )}
          <div className="photo-footer-right">
            <button
              type="button"
              className="photo-btn secondary"
              onClick={handleModalClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="photo-btn primary"
              disabled={!previewUrl}
              onClick={handleSave}
            >
              <Check size={15} /> Save Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

