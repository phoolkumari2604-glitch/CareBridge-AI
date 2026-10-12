import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, RotateCcw, Check, AlertCircle, Trash2, Image as ImageIcon } from "lucide-react";
import "./PhotoEditModal.css";

export default function PhotoEditModal({
  isOpen,
  onClose,
  currentPhoto,
  onSave,
  title = "Edit Profile Photo",
  subtitle = "Take a new photo using your camera or upload an image file"
}) {
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "camera"
  const [previewUrl, setPreviewUrl] = useState(currentPhoto || null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentPhoto || null);
      setErrorMsg("");
      setActiveTab("upload");
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentPhoto]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const startCamera = async () => {
    setErrorMsg("");
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access is not supported by your browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
      setIsCapturing(false);
    } catch (err) {
      console.warn("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera access permission was denied. Please allow camera permissions in your browser or use image file upload.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera device was detected on your computer. Please upload an image file instead.");
      } else {
        setErrorMsg(`Unable to access camera: ${err.message || "Unknown error"}. Try uploading an image.`);
      }
      setIsStreaming(false);
    }
  };

  const handleTabChange = (tab) => {
    setErrorMsg("");
    setActiveTab(tab);
    if (tab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Center crop into square
      const sx = ((video.videoWidth || size) - size) / 2;
      const sy = ((video.videoHeight || size) - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewUrl(dataUrl);
      setIsCapturing(true);
      stopCamera();
    } catch (err) {
      setErrorMsg("Failed to capture snapshot from webcam.");
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setIsCapturing(false);
    startCamera();
  };

  const handleFileChange = (e) => {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file format
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Unsupported file format. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    // Max 5 MB check
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 5 MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!previewUrl) {
      setErrorMsg("Please take a photo or select an image file to save.");
      return;
    }
    stopCamera();
    onSave(previewUrl);
    onClose();
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    stopCamera();
    onSave(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="photo-modal-backdrop" onClick={onClose}>
      <div className="photo-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="photo-modal-header">
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="photo-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="photo-modal-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

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
                >
                  <div className="dropzone-icon">
                    <ImageIcon size={36} />
                  </div>
                  <strong>Click to select photo</strong>
                  <p>Accepts JPG, PNG, WebP up to 5 MB</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "camera" && (
            <div className="camera-view-box">
              {isStreaming ? (
                <div className="camera-live-wrap">
                  <video ref={videoRef} className="camera-video-feed" />
                  <div className="camera-guideline-circle" />
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
                  </div>
                </div>
              ) : (
                <div className="camera-offline-wrap">
                  <Camera size={40} className="camera-offline-icon" />
                  <p>Click below to initialize your web camera</p>
                  <button
                    type="button"
                    className="photo-btn primary"
                    onClick={startCamera}
                  >
                    <Camera size={15} /> Turn On Camera
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="photo-modal-footer">
          {currentPhoto ? (
            <button
              type="button"
              className="photo-btn danger-link"
              onClick={handleRemovePhoto}
            >
              <Trash2 size={14} /> Remove Photo
            </button>
          ) : <span />}
          <div className="photo-footer-right">
            <button type="button" className="photo-btn secondary" onClick={onClose}>
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
