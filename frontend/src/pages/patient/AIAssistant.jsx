import React, { useState, useEffect, useRef } from "react";
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
  Hospital
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./AIAssistant.css";

function AIAssistant() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am your CareBridge AI Health Assistant. I analyze your recorded vitals, medical records, appointments, and active alerts to provide informational support. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickQuestions = [
    "Explain my latest vital signs and alerts",
    "How can I book an appointment with a doctor?",
    "Tell me about nearby hospitals and emergency care",
    "What should I know about my Digital OPD Pass?",
  ];

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || message).trim();
    if (!query || loading) return;

    if (!user?.patient_id) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "user",
          text: query,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "I couldn't locate your patient ID. Please make sure your patient profile is registered in your account settings.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setMessage("");
      return;
    }

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/ai-assistant/chat", {
        patient_id: user.patient_id,
        message: query,
      });

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: res.data.response || "I processed your request, but received no specific response text.",
        disclaimer: res.data.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Assistant error:", err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: "I apologize, but I encountered an error communicating with the medical analysis server. Please check your network and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-page">
      {/* HEADER */}
      <section className="ai-assistant-heading">
        <div>
          <span className="ai-assistant-eyebrow">INTELLIGENT CLINICAL ASSISTANT</span>
          <h1>CareBridge AI Assistant</h1>
          <p>
            Real-time informational support analyzing your recorded vitals, medical records, and healthcare facilities.
          </p>
        </div>

        <div className="ai-assistant-status">
          <span className="ai-status-dot"></span>
          Assistant Online & Synced
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
              <p>Clinical Information Assistant</p>
            </div>
          </div>

          <div className="ai-capabilities">
            <h3>Assistant Capabilities</h3>

            <div className="ai-capability">
              <Heart size={16} />
              <div>
                <strong>Vitals Analysis</strong>
                <small>Checks your recorded vital signs against safe clinical thresholds</small>
              </div>
            </div>

            <div className="ai-capability">
              <Hospital size={16} />
              <div>
                <strong>Hospital Navigation</strong>
                <small>Find nearby healthcare facilities and emergency centers</small>
              </div>
            </div>

            <div className="ai-capability">
              <Calendar size={16} />
              <div>
                <strong>Appointment Guidance</strong>
                <small>Directions on doctor appointments and OPD pass management</small>
              </div>
            </div>

            <div className="ai-capability">
              <AlertCircle size={16} />
              <div>
                <strong>Emergency Detection</strong>
                <small>Recognizes critical emergencies and provides immediate guidance</small>
              </div>
            </div>
          </div>

          <div className="ai-safety-card">
            <ShieldCheck size={18} />
            <div>
              <strong>Clinical Safety Notice</strong>
              <p>
                Responses are generated for informational purposes based on your recorded data and do not replace professional medical diagnosis or urgent emergency care.
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
              <h2>CareBridge Assistant</h2>
              <span>Connected to Patient Health Records</span>
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
              <h2>How can I assist your health today?</h2>
              <p>
                Ask about your recorded vital signs, active health alerts, doctor appointments, or hospital services.
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
                    {item.text}
                    {item.disclaimer && (
                      <div className="ai-message-disclaimer">
                        <Info size={12} />
                        <span>{item.disclaimer}</span>
                      </div>
                    )}
                  </div>
                  <span className="ai-message-time">{item.time}</span>
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
                    <span>Analyzing health data & records...</span>
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="ai-input-wrapper"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about your vitals, alerts, appointments, or hospitals..."
                disabled={loading}
              />
              <button
                type="submit"
                className="ai-send-button"
                disabled={!message.trim() || loading}
                aria-label="Send message"
              >
                {loading ? <Loader2 size={16} className="spinner-icon" /> : <Send size={16} />}
              </button>
            </form>
            <p className="ai-input-note">
              CareBridge AI provides algorithmic informational analysis. Always consult healthcare professionals for medical decisions.
            </p>
          </div>
        </section>
      </section>
    </div>
  );
}

export default AIAssistant;
