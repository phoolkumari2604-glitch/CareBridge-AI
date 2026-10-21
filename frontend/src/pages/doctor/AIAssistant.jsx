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
  AlertCircle,
  Paperclip,
  Camera,
  RotateCcw,
  FlipHorizontal,
  Eye,
  File
} from "lucide-react";
import doctorService from "../../services/doctorService";
import api from "../../services/api";
import CameraModal from "../../components/common/CameraModal";
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
  const [reviewQueue, setReviewQueue] = useState([]);
  const [kbActiveTab, setKbActiveTab] = useState("conditions"); // conditions | drugs | unmatched | review_queue | new
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

  // Attachment & File Upload State
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const fileInputRef = useRef(null);

  // Camera Capture Modal State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("user"); // "user" | "environment"
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    document.title = "PulseView MedAI Assistant & Knowledge Base | CareBridge AI";
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Camera lifecycle handlers
  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing = "user") => {
    setCameraError("");
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access requires HTTPS or is not supported by your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        try {
          await cameraVideoRef.current.play();
        } catch (_) {}
      }
    } catch (err) {
      console.warn("Camera start error:", err.name);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera permissions in your browser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera hardware detected on this machine.");
      } else {
        setCameraError("Unable to open camera: " + (err.message || "Unknown error"));
      }
    }
  }, [stopCameraStream]);

  useEffect(() => {
    if (isCameraModalOpen && !capturedPhoto) {
      startCamera(cameraFacingMode);
    } else if (!isCameraModalOpen) {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraModalOpen, cameraFacingMode, capturedPhoto, startCamera, stopCameraStream]);

  const handleCapturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera(cameraFacingMode);
  };

  const handleUsePhoto = () => {
    if (!capturedPhoto) return;
    const newAtt = {
      id: `cam-${Date.now()}`,
      name: `clinical-photo-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.jpg`,
      size: Math.round((capturedPhoto.length * 3) / 4),
      type: "image/jpeg",
      dataUrl: capturedPhoto,
      progress: 100,
    };
    setAttachments((prev) => [...prev, newAtt].slice(0, 5));
    setCapturedPhoto(null);
    setIsCameraModalOpen(false);
    stopCameraStream();
    showToast("Captured clinical photo attached");
  };

  const handleFlipCamera = () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    if (!capturedPhoto) {
      startCamera(nextMode);
    }
  };

  // File Upload Handlers (Max 10 MB per file, max 5 files, no console logging of file contents)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  const handleFilesSelected = (fileList) => {
    if (!fileList || !fileList.length) return;
    const filesArray = Array.from(fileList);

    if (attachments.length + filesArray.length > 5) {
      showToast("Maximum 5 attachments allowed. Only first eligible files will be added.");
    }

    const availableSlots = 5 - attachments.length;
    const filesToProcess = filesArray.slice(0, Math.max(0, availableSlots));

    filesToProcess.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`"${file.name}" exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }

      const isAllowed =
        ALLOWED_MIME.includes(file.type) ||
        file.name.toLowerCase().endsWith(".pdf") ||
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg") ||
        file.name.toLowerCase().endsWith(".png") ||
        file.name.toLowerCase().endsWith(".webp");

      if (!isAllowed) {
        showToast(`"${file.name}" has an unsupported format. Accept images (JPG, PNG, WebP) and PDFs.`);
        return;
      }

      const reader = new FileReader();
      const attId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      reader.onload = (e) => {
        const dataUrl = e.target.result;
        // Never log file contents to console for patient confidentiality
        const newAtt = {
          id: attId,
          name: file.name,
          size: file.size,
          type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          dataUrl,
          progress: 100,
        };
        setAttachments((prev) => [...prev, newAtt].slice(0, 5));
        showToast(`Attached "${file.name}"`);
      };

      reader.onerror = () => {
        showToast(`Failed to read "${file.name}".`);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageSelected = (fileOrFiles) => {
    if (!fileOrFiles) return;
    if (fileOrFiles.target && fileOrFiles.target.files) {
      handleFilesSelected(fileOrFiles.target.files);
      return;
    }
    const filesArray = fileOrFiles instanceof File
      ? [fileOrFiles]
      : Array.isArray(fileOrFiles)
      ? fileOrFiles
      : fileOrFiles instanceof FileList
      ? Array.from(fileOrFiles)
      : [fileOrFiles];
    handleFilesSelected(filesArray);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveAttachmentToChart = async (att) => {
    if (!selectedPatientId) {
      showToast("Please select a patient chart first.");
      return;
    }
    try {
      await doctorService.createHealthRecord({
        patient_id: selectedPatientId,
        record_type: "LAB_REPORT",
        title: att.name || "Medical Attachment",
        diagnosis: "MedAI Diagnostic Attachment",
        treatment: "Archived in Electronic Health Record",
        notes: `Clinical file attached during MedAI triage consultation on ${new Date().toLocaleDateString()}`,
        file_url: att.dataUrl,
        attachments: [att],
      });
      showToast(`Saved "${att.name}" to patient chart`);
      loadPatientDetails(selectedPatientId);
    } catch (err) {
      console.error("Save attachment error:", err);
      showToast("Failed to save attachment to chart.");
    }
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
      const [conds, drugs, unmatched, queueRes] = await Promise.all([
        doctorService.getKbConditions(),
        doctorService.getKbDrugs(),
        doctorService.getUnmatchedQueries(),
        doctorService.getReviewQueue(),
      ]);
      setKbConditions(conds);
      setKbDrugs(drugs);
      setKbUnmatched(unmatched);
      setReviewQueue(queueRes?.queue || []);
    } catch (e) {
      console.warn("KB data fetch error:", e);
    }
  }, []);

  const handleApproveQueueEntry = async (entryId) => {
    try {
      await doctorService.approveKbEntry(entryId);
      showToast(`Protocol ${entryId} approved successfully!`);
      const q = await doctorService.getReviewQueue();
      setReviewQueue(q?.queue || []);
      const conds = await doctorService.getKbConditions();
      setKbConditions(conds);
    } catch (e) {
      showToast("Failed to approve protocol entry", "error");
    }
  };

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
    if ((!textToSend && attachments.length === 0) || busy) return;

    const currentAttachments = [...attachments];
    const userMsgId = `usr-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    const userMsg = {
      id: userMsgId,
      role: "user",
      content: textToSend || "(Clinical file attached for assessment)",
      attachments: currentAttachments,
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
    setAttachments([]);
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
          message: textToSend || "Please clinically assess the attached medical documents or images for this patient.",
          patient_id: selectedPatientId,
          attachments: currentAttachments.map((a) => ({
            name: a.name,
            type: a.type,
            size: a.size,
            dataUrl: a.dataUrl,
          })),
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
      <main
        className={`ai-center-panel ${isDragging ? "dragging-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
      >
        {isDragging && (
          <div className="chat-drop-overlay">
            <Upload size={36} className="bounce-icon" />
            <h3>Drop clinical documents or images here</h3>
            <p>Accepts JPG, PNG, WebP, and PDF (Max 10 MB each, up to 5 files)</p>
          </div>
        )}

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

                  {/* Attached Files in User Message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="chat-bubble-attachments-grid">
                      {msg.attachments.map((att, attIdx) => (
                        <div key={att.id || attIdx} className="message-attachment-card">
                          {att.type?.startsWith("image/") ? (
                            <div className="msg-att-img-wrap" onClick={() => setPreviewModalFile(att)}>
                              <img src={att.dataUrl} alt={att.name} className="msg-att-img" />
                            </div>
                          ) : (
                            <div className="msg-att-pdf-wrap" onClick={() => setPreviewModalFile(att)}>
                              <FileText size={24} className="pdf-icon" />
                              <div className="pdf-meta">
                                <span className="pdf-name">{att.name}</span>
                                <span className="pdf-size">{(att.size / 1024).toFixed(0)} KB</span>
                              </div>
                            </div>
                          )}
                          <div className="msg-att-actions-strip">
                            <button
                              type="button"
                              className="att-action-btn"
                              onClick={() => setPreviewModalFile(att)}
                              title="Full-size Preview"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              type="button"
                              className="att-action-btn chart-btn"
                              onClick={() => handleSaveAttachmentToChart(att)}
                              title="Save attachment to patient chart"
                            >
                              <FileText size={12} /> Save to Chart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
            {/* Attachment preview chips tray */}
            {attachments.length > 0 && (
              <div className="input-attachments-tray">
                {attachments.map((att) => (
                  <div key={att.id} className="input-att-chip">
                    {att.type?.startsWith("image/") ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="chip-thumb"
                        onClick={() => setPreviewModalFile(att)}
                      />
                    ) : (
                      <div className="chip-pdf-box" onClick={() => setPreviewModalFile(att)}>
                        <FileText size={15} />
                      </div>
                    )}
                    <div className="chip-info" onClick={() => setPreviewModalFile(att)}>
                      <span className="chip-filename" title={att.name}>{att.name}</span>
                      <span className="chip-filesize">{(att.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(att.id);
                      }}
                      title="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              rows={2}
              placeholder="Enter symptoms, findings, or clinical questions (or attach wound/rash photo, ECG, lab report)..."
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
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) handleImageSelected(e.target.files);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Images or PDFs (max 10MB each, up to 5 files)"
                disabled={busy}
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                className="camera-btn"
                onClick={() => setCameraOpen(true)}
                title="Capture Medical Photo with Camera"
                disabled={busy}
              >
                <Camera size={16} />
              </button>

              <button
                className={`mic-btn ${isListening ? "listening" : ""}`}
                onClick={handleToggleVoice}
                title={isListening ? "Listening... (Click to stop)" : "Voice Dictation"}
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
                  disabled={!input.trim() && attachments.length === 0}
                  type="button"
                >
                  <Send size={15} /> Send
                </button>
              )}
            </div>
          </div>

          <div className="chat-footer-notes">
            <span className="privacy-note">
              🔒 <strong>Privacy Notice:</strong> Do not upload data you are not authorized to share. Files are evaluated strictly for decision support.
            </span>
            <span className="disclaimer-note">
              ⚠️ AI suggestions assist clinicians and do not replace certified clinician bedside judgment.
            </span>
          </div>
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

      {/* CAMERA MODAL */}
      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleImageSelected}
      />

      {/* CAMERA CAPTURE MODAL */}
      {isCameraModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsCameraModalOpen(false);
            stopCameraStream();
          }}
        >
          <div className="modal-box camera-capture-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Camera size={20} className="modal-icon-blue" />
                <h3>Capture Medical Photo / Clinical Document</h3>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setIsCameraModalOpen(false);
                  stopCameraStream();
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="camera-modal-body">
              {cameraError ? (
                <div className="camera-error-banner">
                  <AlertCircle size={24} className="text-red" />
                  <strong>Camera Error</strong>
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    className="action-btn-primary"
                    onClick={() => startCamera(cameraFacingMode)}
                  >
                    Retry Camera
                  </button>
                </div>
              ) : capturedPhoto ? (
                <div className="captured-preview-box">
                  <img src={capturedPhoto} alt="Captured" className="captured-image-preview" />
                </div>
              ) : (
                <div className="camera-live-feed-box">
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video-elem"
                  />
                  <div className="camera-overlay-crosshair">
                    <div className="crosshair-corner tl" />
                    <div className="crosshair-corner tr" />
                    <div className="crosshair-corner bl" />
                    <div className="crosshair-corner br" />
                  </div>
                </div>
              )}
            </div>

            <div className="camera-modal-footer">
              {!capturedPhoto && !cameraError && (
                <>
                  <button
                    type="button"
                    className="camera-switch-btn"
                    onClick={handleFlipCamera}
                    title="Switch Front / Back Camera"
                  >
                    <FlipHorizontal size={16} /> Switch Camera
                  </button>
                  <button
                    type="button"
                    className="camera-shutter-btn"
                    onClick={handleCapturePhoto}
                  >
                    <Camera size={16} /> Capture Photo
                  </button>
                </>
              )}

              {capturedPhoto && (
                <div className="captured-action-buttons">
                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={handleRetakePhoto}
                  >
                    <RotateCcw size={15} /> Retake
                  </button>
                  <button
                    type="button"
                    className="action-btn-primary"
                    onClick={handleUsePhoto}
                  >
                    <Check size={15} /> Use Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL-SIZE ATTACHMENT PREVIEW MODAL */}
      {previewModalFile && (
        <div className="modal-overlay" onClick={() => setPreviewModalFile(null)}>
          <div className="modal-box full-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                {previewModalFile.type?.startsWith("image/") ? (
                  <Eye size={20} className="modal-icon-blue" />
                ) : (
                  <FileText size={20} className="modal-icon-blue" />
                )}
                <div>
                  <h3>{previewModalFile.name}</h3>
                  <span className="modal-subtitle">
                    {(previewModalFile.size / 1024).toFixed(0)} KB · {previewModalFile.type}
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setPreviewModalFile(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="full-preview-body">
              {previewModalFile.type?.startsWith("image/") ? (
                <img
                  src={previewModalFile.dataUrl}
                  alt={previewModalFile.name}
                  className="full-preview-image"
                />
              ) : (
                <div className="full-preview-pdf-container">
                  <iframe
                    src={previewModalFile.dataUrl}
                    title={previewModalFile.name}
                    className="pdf-preview-frame"
                  />
                </div>
              )}
            </div>

            <div className="full-preview-footer">
              <button
                type="button"
                className="action-btn-secondary"
                onClick={() => handleSaveAttachmentToChart(previewModalFile)}
              >
                <FileText size={15} /> Save to Patient Chart
              </button>
              <a
                href={previewModalFile.dataUrl}
                download={previewModalFile.name}
                className="action-btn-primary"
              >
                <Download size={15} /> Download File
              </a>
            </div>
          </div>
        </div>
      )}

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
                className={`kb-tab ${kbActiveTab === "review_queue" ? "active" : ""}`}
                onClick={() => setKbActiveTab("review_queue")}
                style={{ position: "relative" }}
              >
                Review Queue ({reviewQueue.length})
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

              {/* 4. Peer-Review Queue Tab */}
              {kbActiveTab === "review_queue" && (
                <div className="kb-review-queue-list">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                      Entries awaiting senior physician sign-off before official deployment.
                    </p>
                    <button
                      type="button"
                      className="refresh-btn"
                      onClick={loadKbData}
                      style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", borderRadius: "6px", cursor: "pointer" }}
                    >
                      <RefreshCw size={12} /> Refresh Queue
                    </button>
                  </div>

                  {reviewQueue.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      <CheckCircle2 size={32} style={{ color: "#34d399", marginBottom: "8px" }} />
                      <p>All knowledge base entries are peer-reviewed and approved!</p>
                    </div>
                  ) : (
                    <div className="kb-conditions-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                      {reviewQueue.map((item) => (
                        <div key={item.id} className="kb-cond-card" style={{ borderLeft: "3px solid #f59e0b", marginBottom: "10px", padding: "12px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px" }}>
                          <div className="kb-cond-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong>{item.topic}</strong>
                              <span className="kb-slug" style={{ marginLeft: "8px", fontSize: "11px", color: "#64748b" }}>ID: {item.id}</span>
                              <span style={{ fontSize: "11px", color: "#38bdf8", marginLeft: "8px" }}>[{item.category}]</span>
                            </div>
                            <span className="kb-status-badge draft" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>
                              DRAFT
                            </span>
                          </div>

                          <div style={{ marginTop: "8px", fontSize: "13px", color: "#cbd5e1" }}>
                            <strong>Clinical Assessment / Guidance:</strong>
                            <p style={{ margin: "4px 0", color: "#94a3b8" }}>
                              {item.doctor_answer?.assessment || item.summary || (Array.isArray(item.patient_answer) ? item.patient_answer[0] : item.patient_answer)}
                            </p>
                          </div>

                          <div className="kb-aliases-tags" style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
                            <span>Source: </span>
                            <span style={{ color: "#93c5fd" }}>{item.source}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                            <button
                              type="button"
                              className="approve-btn"
                              onClick={() => handleApproveQueueEntry(item.id)}
                              style={{
                                background: "#10b981",
                                color: "#ffffff",
                                border: "none",
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Approve Entry
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Add New Protocol Form */}
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
