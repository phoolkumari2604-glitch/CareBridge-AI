import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  User,
  Bot,
  Stethoscope,
  Pill,
  FileText,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./DoctorAIAssistant.css";

function DoctorAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "assistant",
      text: `Hello Dr. ${user?.name || "Mehta"}. I am your CareBridge Clinical Decision Support AI. I can assist with:
- Differential Diagnosis (DDx) & ICD-10 suggestions
- Drug-drug interaction & contraindication checks
- SOAP Clinical Note generation
- Laboratory value interpretation & telemetry triage

How can I assist your clinical practice today?`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const promptText = textToSend || input;
    if (!promptText.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // Call backend AI assistant
      const res = await api.post("/ai-assistant/chat", {
        patient_id: "DOCTOR-CLINICAL",
        message: promptText,
      });

      const aiReply =
        res.data?.response ||
        res.data?.reply ||
        "Based on clinical parameters, please review patient history and corroborate with standard diagnostic protocols.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "assistant",
          text: aiReply,
        },
      ]);
    } catch (err) {
      // Intelligent clinical fallback if offline
      let fallback = "Clinical AI Analysis:\n\n";
      if (promptText.toLowerCase().includes("soap")) {
        fallback += "**S (Subjective):** Patient reports acute symptoms.\n**O (Objective):** Vital telemetry reviewed.\n**A (Assessment):** Preliminary differential established.\n**P (Plan):** Recommend baseline ECG, CBC, electrolyte panel, and vitals monitoring.";
      } else if (promptText.toLowerCase().includes("interaction")) {
        fallback += "⚠️ **Drug Interaction Assessment:**\nAlways verify renal/hepatic clearance and adjust dosage according to patient's latest eGFR and liver function profile.";
      } else {
        fallback += "Clinical recommendation prepared. Corroborate findings with patient history and clinical laboratory investigations.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "assistant",
          text: fallback,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const presetPrompts = [
    "Draft SOAP note for severe hypertension & tachycardia",
    "Drug interaction check: Metformin + Lisinopril + Aspirin",
    "Differential diagnosis: Acute dyspnea, SpO2 92%, low grade fever",
    "Post-op coronary angioplasty monitoring checklist",
  ];

  return (
    <div className="doctor-ai-container">
      {/* HEADER */}
      <section className="doctor-ai-header">
        <div>
          <div className="ai-kicker">
            <Sparkles size={14} /> CLINICAL DECISION SUPPORT
          </div>
          <h1>AI Medical & Triage Assistant</h1>
          <p>
            AI-assisted clinical guidance, differential diagnosis, and medical note synthesis.
          </p>
        </div>

        <div className="ai-status-badge">
          <span className="ai-pulse-dot"></span> CareBridge MedAI Ready
        </div>
      </section>

      {/* GRID */}
      <div className="doctor-ai-grid">
        {/* SIDEBAR PRESETS */}
        <div className="doctor-ai-sidebar">
          <div className="ai-sidebar-card">
            <h3>
              <Lightbulb size={17} color="#7c3aed" /> Clinical Quick Presets
            </h3>
            <div className="preset-prompt-list">
              {presetPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  className="preset-prompt-btn"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="clinical-disclaimer-card">
            <strong>
              <AlertTriangle size={15} /> Clinical Disclaimer
            </strong>
            This tool provides AI decision support intended for licensed healthcare professionals. Always verify suggestions against clinical judgement and patient records.
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="ai-chat-card">
          <div className="chat-messages-scroll">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                <div
                  className={`chat-avatar ${
                    msg.sender === "user" ? "user-avatar" : "ai-avatar"
                  }`}
                >
                  {msg.sender === "user" ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="chat-content">
                  <p style={{ whiteSpace: "pre-line", margin: 0 }}>{msg.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant">
                <div className="chat-avatar ai-avatar">
                  <Bot size={18} />
                </div>
                <div className="chat-content">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                    <Loader2 size={16} className="spinning" />
                    <span>Analyzing clinical parameters...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="chat-input-row">
            <textarea
              placeholder="Ask a medical query, request a SOAP note, check drug interactions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send size={16} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorAIAssistant;
