import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  User,
  Send,
  Square,
  Trash2,
  Copy,
  Check,
  Download,
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ShieldCheck,
  Lock,
  FileText,
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Stethoscope,
  Pill,
  ClipboardList,
  BookOpen,
  FileCheck,
  Database,
  Search,
  Upload,
  Layers,
  X,
  Zap,
  Flame,
  AlertCircle
} from "lucide-react";
import doctorService from "../../services/doctorService";
import api from "../../services/api";
import "./DoctorAIAssistant.css";

/* 5 Test & Clinical Query Presets */
const CLINICAL_PRESETS = [
  {
    id: "shock",
    label: "⚡ Electric shock injury",
    query: "i got electric shock",
    icon: Zap
  },
  {
    id: "chest",
    label: "🫀 Acute chest pain (2 hrs)",
    query: "chest pain 2 hours",
    icon: HeartPulse
  },
  {
    id: "fever",
    label: "🌡️ High fever (3 days)",
    query: "fever 3 days",
    icon: Thermometer
  },
  {
    id: "drugs",
    label: "💊 Amlodipine + Metformin interaction",
    query: "amlodipine + metformin interactions",
    icon: Pill
  },
  {
    id: "soap",
    label: "📋 Write SOAP Note",
    query: "write a SOAP note for this patient",
    icon: ClipboardList
  }
];

export default function DoctorAIAssistant() {
  const [searchParams] = useSearchParams();
  const preselectedPid = searchParams.get("patientId") || "";

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPid);
  const [patientVitals, setPatientVitals] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "### 👋 Welcome to CareBridge MedAI Clinical Decision Support\n" +
        "I am connected to your live patient electronic health records and the **CareBridge Approved Clinical Protocols Knowledge Base**.\n\n" +
        "You can type short symptoms, events, or questions (e.g. *'i got electric shock'*, *'chest pain 2 hours'*, *'fever 3 days'*), and I will provide an evidence-based clinical assessment with urgent red flags, ICD-10 differentials, workup recommendations, and management plans.",
      hasProtocol: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(true);

  // Knowledge Base Management Modal
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [kbConditions, setKbConditions] = useState([]);
  const [kbDrugs, setKbDrugs] = useState([]);
  const [kbUnmatched, setKbUnmatched] = useState([]);
  const [kbActiveTab, setKbActiveTab] = useState("conditions"); // conditions | drugs | unmatched | new
  const [kbSearch, setKbSearch] = useState("");
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbAliases, setNewKbAliases] = useState("");
  const [newKbIcd10, setNewKbIcd10] = useState("");
  const [newKbSummary, setNewKbSummary] = useState("");
  const [newKbRedFlags, setNewKbRedFlags] = useState("");
  const [newKbWorkup, setNewKbWorkup] = useState("");
  const [newKbManagement, setNewKbManagement] = useState("");
  const [newKbDisposition, setNewKbDisposition] = useState("");
  const [isSavingKb, setIsSavingKb] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    document.title = "PulseView MedAI Assistant & Knowledge Base | CareBridge AI";
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // 1. Load Patients
  const loadPatients = useCallback(async () => {
    try {
      const list = await doctorService.getPatients();
      const valid = (Array.isArray(list) ? list : []).map((p) => ({
        id: p._id || p.id,
        patient_code: p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6),
        name: p.name || "Patient",
        age: p.age || 45,
        gender: p.gender || "Other",
        blood_group: p.blood_group || p.blood || "O+",
        phone: p.phone || "",
      }));
      setPatients(valid);

      if (valid.length > 0) {
        let initialId = valid[0].id;
        if (preselectedPid) {
          const matched = valid.find(
            (p) => String(p.id) === String(preselectedPid) || String(p.patient_code) === String(preselectedPid)
          );
          if (matched) initialId = matched.id;
        }
        setSelectedPatientId(initialId);
      }
    } catch (e) {
      console.warn("Patients fetch failed:", e);
    }
  }, [preselectedPid]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // 2. Load Patient Vitals & Records
  const loadPatientDetails = useCallback(async (pid) => {
    if (!pid) return;
    try {
      const [vitalsRes, recordsRes] = await Promise.all([
        doctorService.getLatestVitals(pid),
        doctorService.getHealthRecords(pid),
      ]);
      setPatientVitals(vitalsRes);
      setPatientRecords(Array.isArray(recordsRes) ? recordsRes : []);
    } catch (e) {
      console.warn("Details fetch error:", e);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId, loadPatientDetails]);

  // Selected Patient Object
  const currentPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0] || null;
  }, [patients, selectedPatientId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Load Knowledge Base Data
  const loadKbData = useCallback(async () => {
    try {
      const [conds, drugs, unmatched] = await Promise.all([
        doctorService.getKbConditions(),
        doctorService.getKbDrugs(),
        doctorService.getUnmatchedQueries(),
      ]);
      setKbConditions(conds);
      setKbDrugs(drugs);
      setKbUnmatched(unmatched);
    } catch (e) {
      console.warn("KB data fetch error:", e);
    }
  }, []);

  useEffect(() => {
    if (kbModalOpen) {
      loadKbData();
    }
  }, [kbModalOpen, loadKbData]);

  // -------------------------------------------------------------
  // SEND MESSAGE WITH SSE STREAMING & ERROR LOGGING
  // -------------------------------------------------------------
  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === "string" ? customText.trim() : input.trim();
    if (!textToSend || busy) return;

    const userMsgId = `usr-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    const userMsg = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Add empty assistant response to stream into
    const aiMsg = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      hasProtocol: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setBusy(true);

    abortControllerRef.current = new AbortController();

    const token = localStorage.getItem("access_token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
    const chatEndpoint = `${baseUrl.replace(/\/$/, "")}/ai-assistant/chat/stream`;

    try {
      const response = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          message: textToSend,
          patient_id: selectedPatientId,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errDetail = `AI provider error (${response.status})`;
        if (response.status === 401) errDetail = "Not logged in or session expired";
        else if (response.status === 404) errDetail = "Backend endpoint not reachable";
        else if (response.status >= 500) errDetail = "AI Service temporary error";

        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch (_) {}

        throw new Error(errDetail);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "protocol_card" || parsed.type === "drug_interaction" || parsed.type === "content") {
                accumulated += parsed.delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulated, hasProtocol: parsed.type === "protocol_card" || m.hasProtocol } : m))
                );
              }
            } catch (e) {
              // Raw text chunk fallback
              accumulated += dataStr;
              setMessages((prev) =>
                prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulated } : m))
              );
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + "\n\n*(Response stopped by user)*" } : m))
        );
      } else {
        console.error("AI Assistant Error:", err);
        const errorReason = err.message || "Backend not reachable. Please ensure server is running.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: `⚠️ **Clinical Decision Support Notice**\n\n${errorReason}\n\n*Please verify connection to http://127.0.0.1:5000 and ensure valid authorization.*`,
                }
              : m
          )
        );
      }
    } finally {
      setBusy(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopyText = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    showToast("Assessment copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveToChart = async (text) => {
    if (!selectedPatientId) {
      alert("Please select a patient first.");
      return;
    }

    try {
      await doctorService.createHealthRecord({
        patient_id: selectedPatientId,
        record_type: "AI_CLINICAL_NOTE",
        title: `CareBridge MedAI Consultation Note (${new Date().toLocaleDateString()})`,
        diagnosis: "Clinical Decision Support Assessment",
        treatment: "Follow-up per CareBridge Protocol Guidelines",
        notes: text,
      });
      showToast("Note attached to patient's electronic medical chart");
    } catch (e) {
      alert("Failed to save note to chart: " + e.message);
    }
  };

  // Voice Dictation via Web Speech API
  const handleToggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
      showToast("Voice transcribed successfully");
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Add KB Protocol Handler
  const handleSaveNewKbCondition = async () => {
    if (!newKbTitle.trim()) {
      alert("Title is required");
      return;
    }

    setIsSavingKb(true);
    try {
      await doctorService.addKbCondition({
        title: newKbTitle,
        aliases: newKbAliases.split(",").map((s) => s.trim()).filter(Boolean),
        icd10: newKbIcd10.split(",").map((s) => s.trim()).filter(Boolean),
        summary: newKbSummary,
        red_flags: newKbRedFlags.split("\n").map((s) => s.trim()).filter(Boolean),
        workup: newKbWorkup.split("\n").map((s) => s.trim()).filter(Boolean),
        management: newKbManagement.split("\n").map((s) => s.trim()).filter(Boolean),
        disposition: newKbDisposition,
        status: "approved",
      });
      showToast("New protocol approved and added to knowledge base!");
      setNewKbTitle("");
      setNewKbAliases("");
      setNewKbIcd10("");
      setNewKbSummary("");
      setNewKbRedFlags("");
      setNewKbWorkup("");
      setNewKbManagement("");
      setNewKbDisposition("");
      setKbActiveTab("conditions");
      loadKbData();
    } catch (e) {
      alert("Failed to save protocol: " + e.message);
    } finally {
      setIsSavingKb(false);
    }
  };

  // Filter KB Conditions
  const filteredKbConditions = useMemo(() => {
    if (!kbSearch.trim()) return kbConditions;
    const q = kbSearch.toLowerCase();
    return kbConditions.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        (c.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
  }, [kbConditions, kbSearch]);

  return (
    <div className="doctor-ai-assistant-container">
      {/* 1. LEFT PANEL: PRESET QUERIES & PATIENT SELECTOR */}
      <aside className="ai-left-panel">
        <div className="left-panel-header">
          <div className="ai-brand-badge">
            <Sparkles size={16} />
            <span>CareBridge MedAI</span>
          </div>
          <h2>Clinical Triage</h2>
          <p>Evidence-based decision support with instant approved protocol cards</p>
        </div>

        {/* Patient Selector */}
        <div className="patient-selector-box">
          <label>Active Clinical Patient:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="patient-select-input"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (ID: {p.patient_code})
              </option>
            ))}
          </select>
        </div>

        {/* 5 Test & Clinical Preset Actions */}
        <div className="template-cards-list">
          <span className="template-group-title">Fast Clinical Queries</span>
          {CLINICAL_PRESETS.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                className="template-action-card"
                onClick={() => handleSendMessage(item.query)}
                disabled={busy}
              >
                <div className="template-icon-wrap">
                  <IconComp size={16} />
                </div>
                <div className="template-text-wrap">
                  <strong>{item.label}</strong>
                  <span>"{item.query}"</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Knowledge Base Button */}
        <div className="kb-manage-footer">
          <button className="kb-open-btn" onClick={() => setKbModalOpen(true)}>
            <Database size={15} />
            <span>Knowledge Base Manager ({kbConditions.length})</span>
          </button>
        </div>
      </aside>

      {/* 2. CENTER PANEL: CHAT STREAM & MARKDOWN CARDS */}
      <main className="ai-center-panel">
        {/* Top Chat Bar */}
        <header className="chat-top-bar">
          <div className="chat-patient-summary">
            <div className="doctor-avatar-circle">
              <Bot size={18} />
            </div>
            <div>
              <h3>MedAI Clinical Assistant</h3>
              <span className="live-status-tag">
                <span className="live-pulsing-dot" /> Telemetry & Protocol Grounded
              </span>
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className="chat-action-btn"
              onClick={() => {
                setMessages([]);
                showToast("Chat history cleared");
              }}
              title="Clear Chat History"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="chat-messages-container">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";

            return (
              <div key={msg.id || index} className={`chat-message-row ${isUser ? "user" : "assistant"}`}>
                <div className="chat-avatar-wrap">
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className="chat-bubble">
                  <div className="bubble-header-row">
                    <span className="sender-tag">
                      {isUser ? "Dr. Physician" : "CareBridge MedAI"}
                    </span>
                    <span className="time-tag">{msg.timestamp}</span>
                  </div>

                  {/* Markdown Rendered Content */}
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Action Bar for AI Messages */}
                  {!isUser && msg.content && !busy && (
                    <div className="bubble-actions-row">
                      <button
                        className="bubble-action-btn"
                        onClick={() => handleCopyText(msg.content, index)}
                        title="Copy to Clipboard"
                      >
                        {copiedIndex === index ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedIndex === index ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        className="bubble-action-btn save-chart-btn"
                        onClick={() => handleSaveToChart(msg.content)}
                        title="Save to Electronic Chart"
                      >
                        <FileText size={13} />
                        <span>Save Note to Chart</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {busy && (
            <div className="typing-indicator-row">
              <Bot size={18} className="pulse-icon" />
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="typing-label">Grounding clinical assessment...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <div className="input-field-wrapper">
            <textarea
              rows={2}
              placeholder="Enter symptoms, findings, or clinical questions (e.g. 'i got electric shock', 'chest pain 2 hours')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={busy}
            />

            <div className="input-buttons-row">
              <button
                className={`mic-btn ${isListening ? "listening" : ""}`}
                onClick={handleToggleVoice}
                title="Voice Dictation"
                type="button"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {busy ? (
                <button className="stop-btn" onClick={handleStopGeneration} type="button">
                  <Square size={14} /> Stop
                </button>
              ) : (
                <button
                  className="send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim()}
                  type="button"
                >
                  <Send size={15} /> Send
                </button>
              )}
            </div>
          </div>
          <span className="disclaimer-note">
            ⚠️ Clinical decision support is meant to assist, not replace, certified clinician bedside judgment.
          </span>
        </div>
      </main>

      {/* 3. RIGHT PANEL: PATIENT CONTEXT SNAPSHOT */}
      <aside className={`ai-right-panel ${snapshotOpen ? "open" : "collapsed"}`}>
        <div className="snapshot-header" onClick={() => setSnapshotOpen(!snapshotOpen)}>
          <div className="snapshot-title">
            <Activity size={17} />
            <h3>Patient EHR Context</h3>
          </div>
          <button className="collapse-btn">
            {snapshotOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {snapshotOpen && (
          <div className="snapshot-content-scroll">
            {/* Demographic Card */}
            <div className="patient-demographics-card">
              <div className="patient-main-avatar">
                {currentPatient?.name?.slice(0, 2).toUpperCase() || "PT"}
              </div>
              <div className="demographics-text">
                <strong>{currentPatient?.name || "Patient Record"}</strong>
                <span>ID: #{currentPatient?.patient_code || "100001"}</span>
                <span className="demographics-meta">
                  {currentPatient?.age}y · {currentPatient?.gender} · Blood: {currentPatient?.blood_group}
                </span>
              </div>
            </div>

            {/* Live Vitals Snapshot */}
            <div className="snapshot-section-title">
              <HeartPulse size={14} />
              <span>Real-Time Telemetry Baseline</span>
            </div>

            <div className="snapshot-vitals-grid">
              <div className="v-card">
                <span className="v-label">Heart Rate</span>
                <strong className="v-val text-red">
                  {patientVitals?.heart_rate || 76} <small>bpm</small>
                </strong>
              </div>

              <div className="v-card">
                <span className="v-label">Blood Pressure</span>
                <strong className="v-val text-blue">
                  {patientVitals?.systolic_bp || 124}/{patientVitals?.diastolic_bp || 82} <small>mmHg</small>
                </strong>
              </div>

              <div className="v-card">
                <span className="v-label">SpO₂</span>
                <strong className="v-val text-teal">
                  {patientVitals?.spo2 || 98} <small>%</small>
                </strong>
              </div>

              <div className="v-card">
                <span className="v-label">Core Temp</span>
                <strong className="v-val text-amber">
                  {patientVitals?.temperature || 36.8} <small>°C</small>
                </strong>
              </div>
            </div>

            {/* Recent Medical Records */}
            <div className="snapshot-section-title">
              <ClipboardList size={14} />
              <span>Recent Diagnostic History</span>
            </div>

            <div className="snapshot-records-list">
              {patientRecords.length === 0 ? (
                <p className="empty-records-text">No prior diagnoses recorded.</p>
              ) : (
                patientRecords.slice(0, 3).map((rec, i) => (
                  <div key={rec._id || i} className="snapshot-record-item">
                    <span className="rec-date">{new Date(rec.created_at).toLocaleDateString()}</span>
                    <strong>{rec.diagnosis || rec.title || "Consultation"}</strong>
                    <p>{rec.treatment || rec.notes || "Standard clinical care plan."}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>

      {/* =========================================================
          4. KNOWLEDGE BASE MANAGER MODAL
          ========================================================= */}
      {kbModalOpen && (
        <div className="modal-overlay" onClick={() => setKbModalOpen(false)}>
          <div className="modal-box kb-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Database size={20} className="modal-icon-blue" />
                <h3>CareBridge Clinical Knowledge Base Manager</h3>
              </div>
              <button className="modal-close" onClick={() => setKbModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="kb-tabs-bar">
              <button
                className={`kb-tab ${kbActiveTab === "conditions" ? "active" : ""}`}
                onClick={() => setKbActiveTab("conditions")}
              >
                Approved Protocols ({kbConditions.length})
              </button>
              <button
                className={`kb-tab ${kbActiveTab === "drugs" ? "active" : ""}`}
                onClick={() => setKbActiveTab("drugs")}
              >
                Drug Interactions ({kbDrugs.length})
              </button>
              <button
                className={`kb-tab ${kbActiveTab === "unmatched" ? "active" : ""}`}
                onClick={() => setKbActiveTab("unmatched")}
              >
                Unmatched Queries ({kbUnmatched.length})
              </button>
              <button
                className={`kb-tab new-btn ${kbActiveTab === "new" ? "active" : ""}`}
                onClick={() => setKbActiveTab("new")}
              >
                <Plus size={14} /> Add Protocol
              </button>
            </div>

            <div className="modal-body kb-modal-body">
              {/* 1. Conditions Tab */}
              {kbActiveTab === "conditions" && (
                <div>
                  <div className="kb-search-bar">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search title, symptom aliases, or ICD-10..."
                      value={kbSearch}
                      onChange={(e) => setKbSearch(e.target.value)}
                    />
                  </div>

                  <div className="kb-conditions-list">
                    {filteredKbConditions.map((c) => (
                      <div key={c._id || c.slug} className="kb-cond-card">
                        <div className="kb-cond-header">
                          <div>
                            <strong>{c.title}</strong>
                            <span className="kb-slug">slug: {c.slug}</span>
                          </div>
                          <span className={`kb-status-badge ${c.status || "approved"}`}>
                            {(c.status || "approved").toUpperCase()}
                          </span>
                        </div>
                        <p className="kb-summary">{c.summary}</p>
                        <div className="kb-aliases-tags">
                          <span>Aliases:</span>
                          {(c.aliases || []).map((a, idx) => (
                            <span key={idx} className="alias-tag">{a}</span>
                          ))}
                        </div>
                        <div className="kb-reviewer-tag">
                          <span>Reviewed by: <strong>{c.reviewed_by || "Clinical Board"}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Drug Interactions Tab */}
              {kbActiveTab === "drugs" && (
                <div className="kb-drugs-list">
                  <table className="kb-drugs-table">
                    <thead>
                      <tr>
                        <th>Drug Pair</th>
                        <th>Severity</th>
                        <th>Mechanism & Effect</th>
                        <th>Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kbDrugs.map((d, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{d.drug_a?.toUpperCase()} + {d.drug_b?.toUpperCase()}</strong>
                          </td>
                          <td>
                            <span className={`drug-sev-badge ${d.severity}`}>
                              {d.severity?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <p><strong>Mechanism:</strong> {d.mechanism}</p>
                            <p><strong>Effect:</strong> {d.effect}</p>
                          </td>
                          <td>{d.management}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. Unmatched Queries Log */}
              {kbActiveTab === "unmatched" && (
                <div className="unmatched-list">
                  <p className="unmatched-desc">
                    These queries had no direct KB protocol match and can be converted into new clinical guidelines.
                  </p>
                  {kbUnmatched.length === 0 ? (
                    <p className="empty-records-text">No unmatched queries logged.</p>
                  ) : (
                    kbUnmatched.map((u, i) => (
                      <div key={i} className="unmatched-item">
                        <span>"{u.query}"</span>
                        <small>{new Date(u.created_at).toLocaleString()}</small>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. Add New Protocol Form */}
              {kbActiveTab === "new" && (
                <div className="kb-new-form">
                  <div className="form-group">
                    <label>Protocol Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Acute Pancreatitis Triage"
                      value={newKbTitle}
                      onChange={(e) => setNewKbTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Aliases / Common Symptoms (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. epigastric pain, pancreatitis, amylase elevation"
                      value={newKbAliases}
                      onChange={(e) => setNewKbAliases(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>ICD-10 Codes (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. K85.9"
                      value={newKbIcd10}
                      onChange={(e) => setNewKbIcd10(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Clinical Summary</label>
                    <textarea
                      rows={2}
                      placeholder="Brief overview of condition and early assessment..."
                      value={newKbSummary}
                      onChange={(e) => setNewKbSummary(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Urgent Red Flags (one per line)</label>
                    <textarea
                      rows={3}
                      placeholder="- Shock / Hypotension&#10;- Cullen / Grey Turner signs"
                      value={newKbRedFlags}
                      onChange={(e) => setNewKbRedFlags(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Workup & Investigations (one per line)</label>
                    <textarea
                      rows={3}
                      placeholder="- Serum Lipase & Amylase (>3x ULN)&#10;- Abdominal Ultrasound / CECT"
                      value={newKbWorkup}
                      onChange={(e) => setNewKbWorkup(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Management Guidelines (one per line)</label>
                    <textarea
                      rows={3}
                      placeholder="- Aggressive IV hydration (Ringer's Lactate)&#10;- Analgesia per pain ladder"
                      value={newKbManagement}
                      onChange={(e) => setNewKbManagement(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Disposition / Admission Criteria</label>
                    <input
                      type="text"
                      placeholder="Admit to HDU/ICU for severe pancreatitis (BISAP >= 3)..."
                      value={newKbDisposition}
                      onChange={(e) => setNewKbDisposition(e.target.value)}
                    />
                  </div>

                  <button
                    className="action-btn-primary"
                    onClick={handleSaveNewKbCondition}
                    disabled={isSavingKb}
                  >
                    {isSavingKb ? "Saving..." : "Approve & Save Protocol"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="ai-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
