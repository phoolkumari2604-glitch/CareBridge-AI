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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./AIAssistant.css";

function AIAssistant() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreview, setAttachedPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your CareBridge AI Health Assistant. I analyze your recorded vitals, medical records, appointments, and active alerts to provide clinical informational guidance. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

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
          id: item.id || String(Math.random()),
          sender: (item.sender || "USER").toLowerCase(),
          text: item.message,
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
      alert("Speech recognition is not supported in this browser.");
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

  const quickQuestions = [
    "Explain my latest vital signs and health status",
    "How do I book an appointment with a cardiologist?",
    "Find nearby 24/7 emergency hospitals",
    "How does the Digital OPD Pass work?",
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setAttachedPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setAttachedPreview(null);
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (textToSend) => {
    const textQuery = (textToSend || message).trim();
    if ((!textQuery && !attachedFile) || loading) return;

    let fullPrompt = textQuery;
    if (attachedFile) {
      fullPrompt = `[Attached Medical Document/Scan: ${attachedFile.name}]\n${textQuery || "Please analyze this medical scan/document in context with my health profile."}`;
    }

    if (!user?.patient_id) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "user",
          text: fullPrompt,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "I could not identify an active patient ID linked to this profile. Please ensure your patient profile is registered in Account Settings.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setMessage("");
      handleRemoveAttachment();
      return;
    }

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: fullPrompt,
      attachmentName: attachedFile?.name,
      attachmentPreview: attachedPreview,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    handleRemoveAttachment();
    setLoading(true);

    try {
      const res = await patientService.chatWithAI(user.patient_id, fullPrompt);

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: res.response || "I processed your request, but received no specific response text.",
        disclaimer: res.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Assistant error:", err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: "I apologize, but I encountered an error communicating with the clinical reasoning system. Please check your connection and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="ai-assistant-page">
      {/* HEADER */}
      <section className="ai-assistant-heading">
        <div>
          <span className="ai-assistant-eyebrow">INTELLIGENT HEALTH COMPANION</span>
          <h1>CareBridge AI Assistant</h1>
          <p>
            Real-time algorithmic support analyzing your monitored vitals, electronic medical records, and healthcare facilities.
          </p>
        </div>

        <div className="ai-assistant-status">
          <span className="ai-status-dot"></span>
          Assistant Online & Telemetry Synced
        </div>
      </section>

      {/* LAYOUT */}
      <section className="ai-assistant-layout">
        {/* SIDEBAR */}
        <aside className="ai-assistant-sidebar">
          <div className="ai-profile-card">
            <div className="ai-profile-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>CareBridge AI</h3>
              <p>Patient Medical Assistant</p>
            </div>
          </div>

          <div className="ai-capabilities">
            <h3>Assistant Capabilities</h3>

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
              <Calendar size={16} />
              <div>
                <strong>Appointment Scheduling</strong>
                <small>Guidance on doctor slots and Digital OPD passes</small>
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
                Responses are generated algorithmically for informational guidance and do not replace formal diagnosis by a licensed physician or emergency medical care.
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
          <div className="ai-chat-messages">
            <div className="ai-welcome-card">
              <div className="ai-welcome-icon">
                <Sparkles size={20} />
              </div>
              <h2>How can I assist your healthcare today?</h2>
              <p>
                Inquire about your recorded vitals, active health alerts, upcoming consultations, or hospital emergency services.
              </p>
            </div>

            {messages.map((item) => (
              <div key={item.id} className={`ai-message-row ${item.sender}`}>
                {item.sender === "ai" && (
                  <div className="ai-message-avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div className="ai-message-content">
                  <div className="ai-message-bubble">
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

            {loading && (
              <div className="ai-message-row ai">
                <div className="ai-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="ai-message-content">
                  <div className="ai-message-bubble loading-bubble">
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Analyzing clinical telemetry & database...</span>
                  </div>
                </div>
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
            {attachedFile && (
              <div className="ai-attachment-preview">
                <div className="preview-chip">
                  {attachedPreview ? (
                    <img src={attachedPreview} alt="attachment" className="preview-thumb" />
                  ) : (
                    <Paperclip size={14} />
                  )}
                  <span className="file-name">{attachedFile.name}</span>
                  <button type="button" onClick={handleRemoveAttachment} className="remove-att-btn">
                    <X size={13} />
                  </button>
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
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,.pdf,.docx,.txt"
                onChange={handleFileChange}
              />

              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach medical report or image"
              >
                <Paperclip size={18} />
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
                placeholder={isListening ? "Listening... Speak your health question..." : "Ask about your vitals, alerts, appointments, or upload report..."}
                disabled={loading}
              />

              <button
                type="submit"
                className="ai-send-button"
                disabled={(!message.trim() && !attachedFile) || loading}
                aria-label="Send message"
              >
                {loading ? <Loader2 size={16} className="spinner-icon" /> : <Send size={16} />}
              </button>
            </form>

            <p className="ai-input-note">
              CareBridge AI provides automated algorithmic guidance based on your recorded vitals and profile.
            </p>
          </div>
        </section>
      </section>
    </div>
  );
}

export default AIAssistant;
