import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  Calendar,
  Heart,
  Clock,
  Ticket,
  AlertCircle,
  Loader2,
  Info,
  RefreshCw,
  Hospital,
  Mic,
  MicOff,
  Copy,
  Check,
  Trash2,
  Stethoscope,
  Camera,
  Paperclip,
  Image as ImageIcon,
  X,
  RotateCw,
  Maximize2,
  Download,
  AlertTriangle,
  PlusCircle,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./AIAssistant.css";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function AIAssistant() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [inlineError, setInlineError] = useState(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState(null);

  // Attached images state (up to 3)
  const [selectedImages, setSelectedImages] = useState([]); // [{ file, previewUrl, id, name, size }]
  const [lightboxImage, setLightboxImage] = useState(null); // { url, name }

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("environment"); // "user" | "environment"
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const initialWelcomeMessage = {
    id: "welcome",
    sender: "ai",
    text: "Hello! I am your CareBridge AI Health Assistant. You can ask me questions about your recorded vitals, active health alerts, or share a photo of your prescription, lab report, or symptoms (using 📎 or 📷) for plain-language clinical insights. How can I help you today?",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  const [messages, setMessages] = useState([initialWelcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversation history on startup
  const loadHistory = useCallback(async () => {
    if (!user?.patient_id) return;
    try {
      const history = await patientService.getAIHistory(user.patient_id);
      if (Array.isArray(history) && history.length > 0) {
        const formatted = history.map((item) => ({
          id: item.id || item._id || String(Math.random()),
          sender: (item.sender || "USER").toLowerCase(),
          text: item.message,
          attachments: item.attachments || [],
          time: item.created_at
            ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Past",
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.log("No previous conversation history found.");
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Web Speech API Voice Recognition Setup
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-US";

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic start error:", err);
      }
    }
  };

  // ==========================================
  // IMAGE ATTACHMENT & VALIDATION HANDLERS
  // ==========================================
  const validateAndAddFiles = (files) => {
    setInlineError(null);
    if (!files || files.length === 0) return;

    const currentCount = selectedImages.length;
    const incomingList = Array.from(files);

    if (currentCount + incomingList.length > MAX_IMAGES) {
      setInlineError(`You can attach a maximum of ${MAX_IMAGES} images at once.`);
      return;
    }

    const validNewImages = [];
    for (const file of incomingList) {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setInlineError(`File '${file.name}' is not supported. Please select PNG, JPG, or WEBP images.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setInlineError(`File '${file.name}' is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      validNewImages.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
      });
    }

    setSelectedImages((prev) => [...prev, ...validNewImages]);
  };

  const handleFileInputChange = (e) => {
    validateAndAddFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (idToRemove) => {
    setSelectedImages((prev) => {
      const target = prev.find((img) => img.id === idToRemove);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== idToRemove);
    });
  };

  // Drag & Drop Handling on chat area
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste (e.g. Ctrl+V screenshot)
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      validateAndAddFiles(e.clipboardData.files);
    }
  };

  // ==========================================
  // CAMERA CAPTURE LOGIC (getUserMedia)
  // ==========================================
  const startCamera = async (facing = cameraFacingMode) => {
    stopCamera();
    setCameraError(null);
    setCapturedPhotoUrl(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera start failure:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please enable camera access in your browser settings."
          : "Unable to access camera hardware. On mobile, you can use the file camera capture."
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const openCameraModal = () => {
    setIsCameraOpen(true);
    startCamera(cameraFacingMode);
  };

  const closeCameraModal = () => {
    stopCamera();
    setCapturedPhotoUrl(null);
    setCameraError(null);
    setIsCameraOpen(false);
  };

  const flipCamera = () => {
    const nextFacing = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhotoUrl(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPhotoUrl(null);
    startCamera(cameraFacingMode);
  };

  const useCapturedPhoto = () => {
    if (!capturedPhotoUrl) return;

    fetch(capturedPhotoUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        validateAndAddFiles([file]);
        closeCameraModal();
      })
      .catch((err) => {
        console.error("Error packaging captured photo:", err);
        setInlineError("Could not process captured photo.");
      });
  };

  // ==========================================
  // SEND MESSAGE & CHAT UPGRADES
  // ==========================================
  const handleSendMessage = async (textToSend, retryFiles = null) => {
    const textQuery = (textToSend !== undefined ? textToSend : message).trim();
    const imagesToUpload = retryFiles || selectedImages.map((item) => item.file);

    if (!textQuery && imagesToUpload.length === 0) return;
    if (loading) return;

    setInlineError(null);
    setLastFailedPrompt(null);

    const patientId = user?.patient_id || user?.id;

    // Create user message in chat immediately
    const userMsgId = Date.now();
    const userMessageAttachments = selectedImages.map((img) => ({
      file_url: img.previewUrl,
      filename: img.name,
      size_bytes: img.size,
    }));

    const userMsg = {
      id: userMsgId,
      sender: "user",
      text: textQuery || (imagesToUpload.length > 0 ? `[Shared ${imagesToUpload.length} Medical Image(s)]` : ""),
      attachments: userMessageAttachments,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setSelectedImages([]);
    setLoading(true);

    try {
      const res = await patientService.chatWithAI(patientId, textQuery, imagesToUpload);

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: res.response || "I have analyzed your query and clinical data.",
        disclaimer: res.disclaimer,
        attachments: res.attachments || [],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Assistant query failed:", err);
      setLastFailedPrompt({ text: textQuery, files: imagesToUpload });

      const errorDetail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "I encountered an issue communicating with the clinical analysis engine. Please try again.";

      const errorMsg = {
        id: Date.now() + 1,
        sender: "ai",
        isError: true,
        text: `⚠️ **Request Notice**: ${errorDetail}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryLast = () => {
    if (!lastFailedPrompt) return;
    handleSendMessage(lastFailedPrompt.text, lastFailedPrompt.files);
  };

  const handleStartNewChat = async () => {
    if (window.confirm("Start a new conversation? Your previous chat session will be cleared.")) {
      try {
        if (user?.patient_id) {
          await patientService.clearAIHistory(user.patient_id);
        }
      } catch (e) {
        console.warn("History clear warning:", e);
      }
      setMessages([initialWelcomeMessage]);
      setSelectedImages([]);
      setInlineError(null);
      setLastFailedPrompt(null);
    }
  };

  const copyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickQuestions = [
    "Explain my latest vital signs and health status",
    "What should I do if my blood pressure reads 140/90?",
    "How does the Digital OPD Pass and live queue work?",
    "How do I prepare for a routine blood test?",
  ];

  return (
    <div className="ai-assistant-page" onDragOver={handleDragOver} onDrop={handleDrop} onPaste={handlePaste}>
      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="ai-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <div className="ai-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="ai-lightbox-header">
              <span>{lightboxImage.name || "Medical Image Preview"}</span>
              <div className="lightbox-actions">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name || "medical_scan.jpg"}
                  target="_blank"
                  rel="noreferrer"
                  className="lightbox-action-btn"
                  title="Open full size / Download"
                >
                  <Download size={16} />
                </a>
                <button onClick={() => setLightboxImage(null)} className="lightbox-action-btn" title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            <img src={lightboxImage.url} alt={lightboxImage.name || "Enlarged view"} className="lightbox-img" />
          </div>
        </div>
      )}

      {/* CAMERA MODAL */}
      {isCameraOpen && (
        <div className="ai-camera-modal-backdrop">
          <div className="ai-camera-modal">
            <div className="camera-modal-header">
              <div className="camera-title">
                <Camera size={18} />
                <span>Take Photo of Medical Report or Symptom</span>
              </div>
              <button onClick={closeCameraModal} className="camera-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="camera-body">
              {cameraError ? (
                <div className="camera-error-box">
                  <AlertTriangle size={32} />
                  <p>{cameraError}</p>
                  <div className="camera-error-actions">
                    <button
                      type="button"
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="cam-fallback-btn"
                    >
                      <Camera size={15} /> Use Device Native Camera
                    </button>
                    <button type="button" onClick={() => startCamera(cameraFacingMode)} className="cam-retry-btn">
                      <RefreshCw size={15} /> Retry
                    </button>
                  </div>
                </div>
              ) : capturedPhotoUrl ? (
                <div className="camera-preview-container">
                  <img src={capturedPhotoUrl} alt="Captured preview" className="camera-captured-img" />
                </div>
              ) : (
                <div className="camera-video-container">
                  <video ref={videoRef} autoPlay playsInline muted className="camera-video-feed" />
                </div>
              )}
            </div>

            <div className="camera-modal-footer">
              {!capturedPhotoUrl && !cameraError && (
                <>
                  <button type="button" onClick={flipCamera} className="cam-tool-btn" title="Flip Camera">
                    <RotateCw size={16} />
                    <span>Flip</span>
                  </button>
                  <button type="button" onClick={takeSnapshot} className="cam-capture-btn" title="Capture Photo">
                    <div className="capture-inner" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="cam-tool-btn"
                    title="System File Camera"
                  >
                    <ImageIcon size={16} />
                    <span>Files</span>
                  </button>
                </>
              )}

              {capturedPhotoUrl && (
                <>
                  <button type="button" onClick={retakePhoto} className="cam-retake-btn">
                    <RotateCcw size={15} /> Retake
                  </button>
                  <button type="button" onClick={useCapturedPhoto} className="cam-use-btn">
                    <Check size={16} /> Use Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <section className="ai-assistant-heading">
        <div>
          <span className="ai-assistant-eyebrow">INTELLIGENT HEALTH COMPANION</span>
          <h1>CareBridge AI Assistant</h1>
          <p>
            Real-time multimodal clinical intelligence analyzing your vitals, health records, medical photos, and prescriptions.
          </p>
        </div>

        <div className="ai-header-controls">
          <button type="button" onClick={handleStartNewChat} className="ai-new-chat-btn" title="Start a fresh conversation">
            <PlusCircle size={15} />
            <span>New Chat</span>
          </button>

          <div className="ai-assistant-status">
            <span className="ai-status-dot"></span>
            Vision & Telemetry Synced
          </div>
        </div>
      </section>

      {/* MAIN LAYOUT */}
      <section className="ai-assistant-layout" ref={chatAreaRef}>
        {/* SIDEBAR */}
        <aside className="ai-assistant-sidebar">
          <div className="ai-profile-card">
            <div className="ai-profile-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>CareBridge AI</h3>
              <p>Clinical Intelligence & Vision</p>
            </div>
          </div>

          <div className="ai-capabilities">
            <h3>Assistant Capabilities</h3>

            <div className="ai-capability">
              <Camera size={16} />
              <div>
                <strong>Medical Vision Support</strong>
                <small>Explains lab test reports, prescriptions, and symptom photos</small>
              </div>
            </div>

            <div className="ai-capability">
              <Heart size={16} />
              <div>
                <strong>Vitals Analysis</strong>
                <small>Evaluates your blood pressure, heart rate, and oxygen levels</small>
              </div>
            </div>

            <div className="ai-capability">
              <Hospital size={16} />
              <div>
                <strong>Emergency Triage</strong>
                <small>Locates nearby trauma centers and ambulance hotlines</small>
              </div>
            </div>

            <div className="ai-capability">
              <Stethoscope size={16} />
              <div>
                <strong>Health Records Review</strong>
                <small>Explains clinical notes, prescriptions, and lab values</small>
              </div>
            </div>
          </div>

          <div className="ai-safety-card">
            <ShieldCheck size={18} />
            <div>
              <strong>Clinical Safety Notice</strong>
              <p>
                Responses are generated algorithmically for educational & triage guidance and do not replace formal diagnosis by a licensed physician. If you experience severe chest pain, shortness of breath, or bleeding, dial 102/112 immediately.
              </p>
            </div>
          </div>
        </aside>

        {/* CHAT CONTAINER */}
        <section className="ai-chat-container">
          <div className="ai-chat-header">
            <div className="ai-chat-avatar">
              <Bot size={20} />
            </div>
            <div>
              <h2>CareBridge Clinical Assistant</h2>
              <span>Connected to Patient Health Records &middot; User ID: #{String(user?.patient_id || "").slice(-6).toUpperCase()}</span>
            </div>
            <div className="ai-chat-online">
              <span></span>
              Active
            </div>
          </div>

          {/* MESSAGES LIST */}
          <div className="ai-chat-messages" role="log" aria-live="polite">
            <div className="ai-welcome-card">
              <div className="ai-welcome-icon">
                <Sparkles size={20} />
              </div>
              <h2>How can I assist your healthcare today?</h2>
              <p>
                Inquire about your recorded vitals, upload medical reports, or snap a photo of a prescription for instant plain-language clinical insights.
              </p>
            </div>

            {messages.map((item) => (
              <div key={item.id} className={`ai-message-row ${item.sender} ${item.isError ? "has-error" : ""}`}>
                {item.sender === "ai" && (
                  <div className="ai-message-avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div className="ai-message-content">
                  <div className="ai-message-bubble">
                    {/* Render Image Attachments in Bubble */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="bubble-attachment-grid">
                        {item.attachments.map((att, attIdx) => {
                          const imgUrl = att.file_url || att.previewUrl || att.url;
                          const imgName = att.filename || att.name || `Image ${attIdx + 1}`;
                          return (
                            <div
                              key={attIdx}
                              className="bubble-img-thumb"
                              onClick={() => setLightboxImage({ url: imgUrl, name: imgName })}
                              title="Click to view full image"
                            >
                              <img src={imgUrl} alt={imgName} />
                              <div className="thumb-zoom-overlay">
                                <Maximize2 size={14} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="bubble-text">{item.text}</p>

                    {item.disclaimer && (
                      <div className="ai-message-disclaimer">
                        <Info size={12} />
                        <span>{item.disclaimer}</span>
                      </div>
                    )}
                  </div>

                  <div className="ai-msg-meta">
                    <span className="ai-message-time">{item.time}</span>
                    <button
                      className="msg-copy-btn"
                      onClick={() => copyMessage(item.id, item.text)}
                      title="Copy message"
                    >
                      {copiedId === item.id ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {item.sender === "user" && (
                  <div className="user-message-avatar">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* TYPING INDICATOR */}
            {loading && (
              <div className="ai-message-row ai">
                <div className="ai-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="ai-message-content">
                  <div className="ai-message-bubble loading-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="typing-text">CareBridge AI is reviewing clinical telemetry & imaging...</span>
                  </div>
                </div>
              </div>
            )}

            {lastFailedPrompt && !loading && (
              <div className="ai-retry-row">
                <button type="button" onClick={handleRetryLast} className="ai-retry-button">
                  <RefreshCw size={14} />
                  <span>Retry Last Question</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTIONS */}
          <div className="ai-quick-section">
            <span>Suggested Inquiries</span>
            <div className="ai-quick-buttons">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT AREA */}
          <div className="ai-input-area">
            {/* Inline Error Notification */}
            {inlineError && (
              <div className="ai-inline-error-banner">
                <AlertCircle size={15} />
                <span>{inlineError}</span>
                <button type="button" onClick={() => setInlineError(null)}>
                  <X size={13} />
                </button>
              </div>
            )}

            {/* ATTACHMENT TRAY */}
            {selectedImages.length > 0 && (
              <div className="ai-attachment-tray">
                <div className="tray-heading">
                  <span>Attached Images ({selectedImages.length}/{MAX_IMAGES})</span>
                </div>
                <div className="tray-items">
                  {selectedImages.map((img) => (
                    <div key={img.id} className="tray-chip">
                      <img src={img.previewUrl} alt={img.name} className="tray-thumb" />
                      <div className="tray-info">
                        <span className="tray-filename">{img.name}</span>
                        <small className="tray-size">{(img.size / 1024).toFixed(0)} KB</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="remove-tray-btn"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="ai-input-wrapper"
            >
              {/* File Input (Paperclip) */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                onChange={handleFileInputChange}
              />

              {/* Native Mobile Camera Input Fallback */}
              <input
                type="file"
                ref={mobileCameraInputRef}
                style={{ display: "none" }}
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
              />

              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach medical scan, report, or prescription (Max 3, up to 5MB each)"
                disabled={selectedImages.length >= MAX_IMAGES}
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                className="camera-action-btn"
                onClick={openCameraModal}
                title="Open Camera to capture report or symptom"
                disabled={selectedImages.length >= MAX_IMAGES}
              >
                <Camera size={18} />
              </button>

              <button
                type="button"
                className={`mic-btn ${isListening ? "active-listening" : ""}`}
                onClick={toggleListening}
                title={isListening ? "Stop voice dictation" : "Start voice dictation"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening... Speak your health question..."
                    : selectedImages.length > 0
                    ? "Add a note or click send to analyze attached photo(s)..."
                    : "Ask about your vitals, alerts, appointments, or attach a photo..."
                }
                disabled={loading}
              />

              <button
                type="submit"
                className="ai-send-button"
                disabled={(!message.trim() && selectedImages.length === 0) || loading}
                aria-label="Send message"
              >
                {loading ? <Loader2 size={16} className="spinner-icon" /> : <Send size={16} />}
              </button>
            </form>

            <p className="ai-input-note">
              CareBridge AI provides automated algorithmic guidance. Images are stripped of metadata to protect privacy.
            </p>
          </div>
        </section>
      </section>
    </div>
  );
}

export default AIAssistant;
