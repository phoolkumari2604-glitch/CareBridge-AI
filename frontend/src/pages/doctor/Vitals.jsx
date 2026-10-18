import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Activity,
  Droplets,
  Thermometer,
  TrendingUp,
  Weight,
  Clock,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Phone,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Camera,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle,
  Award,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  FileText,
  Mail
} from "lucide-react";
import doctorService from "../../services/doctorService";
import patientService from "../../services/patientService";
import api from "../../services/api";
import PhotoEditModal from "../../components/common/PhotoEditModal";
import PatientDocumentsModal from "../../components/common/PatientDocumentsModal";
import "./Vitals.css";

/* Helper: relative time formatter */
function timeAgo(dateInput) {
  if (!dateInput) return "No timestamp";
  const d = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr${Math.floor(diffSec / 3600) === 1 ? "" : "s"} ago`;
  if (diffSec < 172800) return `Yesterday at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

/* Normal Range Checkers with Strict Clinical Critical Bounds */
const METRIC_RANGES = {
  hr: {
    label: "Heart Rate",
    unit: "bpm",
    classify: (v) => {
      if (v == null || v === "") return "normal";
      const val = Number(v);
      if (val < 45 || val > 125) return "critical";
      if (val < 60 || val > 100) return "warning";
      return "normal";
    },
    lo: 60,
    hi: 100,
  },
  bp: {
    label: "Blood Pressure",
    unit: "mmHg",
    classify: (sys, dia) => {
      if (sys == null || dia == null || sys === "" || dia === "") return "normal";
      const s = Number(sys);
      const d = Number(dia);
      // Diastolic higher than or equal to systolic is a severe abnormality
      if (s <= d) return "critical";
      if (s >= 160 || d >= 105 || s < 90 || d < 45) return "critical";
      if (s >= 130 || d >= 85 || s < 95 || d < 55) return "warning";
      return "normal";
    },
    lo: 90,
    hi: 120,
  },
  spo2: {
    label: "SpO₂ Oxygen",
    unit: "%",
    classify: (v) => {
      if (v == null || v === "") return "normal";
      const val = Number(v);
      if (val < 90) return "critical"; // e.g. 60% is Critical
      if (val < 95) return "warning";
      return "normal";
    },
    lo: 95,
    hi: 100,
  },
  temp: {
    label: "Temperature",
    unit: "°C",
    classify: (v) => {
      if (v == null || v === "") return "normal";
      const val = Number(v);
      if (val >= 38.6 || val < 34.5) return "critical"; // e.g. 45°C is Critical
      if (val >= 37.3 || val < 36.0) return "warning";
      return "normal";
    },
    lo: 36.1,
    hi: 37.2,
  },
  sugar: {
    label: "Blood Sugar",
    unit: "mg/dL",
    classify: (v) => {
      if (v == null || v === "") return "normal";
      const val = Number(v);
      if (val >= 250 || val < 55) return "critical"; // e.g. 44 mg/dL is Critical
      if (val >= 145 || val < 70) return "warning";
      return "normal";
    },
    lo: 70,
    hi: 140,
  },
  weight: {
    label: "Body Weight",
    unit: "kg",
    classify: () => "normal",
  },
};

function getRowStatus(r) {
  const hrStat = METRIC_RANGES.hr.classify(r.heart_rate);
  const bpStat = METRIC_RANGES.bp.classify(r.systolic_bp, r.diastolic_bp);
  const spo2Stat = METRIC_RANGES.spo2.classify(r.spo2);
  const tempStat = METRIC_RANGES.temp.classify(r.temperature);
  const sugarStat = METRIC_RANGES.sugar.classify(r.blood_sugar);
  if ([hrStat, bpStat, spo2Stat, tempStat, sugarStat].includes("critical")) return "critical";
  if ([hrStat, bpStat, spo2Stat, tempStat, sugarStat].includes("warning")) return "warning";
  return "normal";
}

/* Micro SVG Sparkline */
function Sparkline({ data = [], color = "#0284c7" }) {
  if (!data || data.length < 2) {
    return <div className="sparkline-placeholder">Telemetry stream baseline</div>;
  }
  const W = 110;
  const H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (W - 8) + 4;
      const y = H - 4 - ((val - min) / range) * (H - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="vitals-sparkline-svg" viewBox={`0 0 ${W} ${H}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={(W - 8) + 4}
          cy={H - 4 - ((data[data.length - 1] - min) / range) * (H - 8)}
          r="2.5"
          fill={color}
        />
      )}
    </svg>
  );
}

export default function Vitals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPid = searchParams.get("patientId") || "";

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPid);
  const [vitalsHistory, setVitalsHistory] = useState([]);

  // Modals & Drawers
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  const [isPatientPhotoModalOpen, setIsPatientPhotoModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Global search above cards
  const [globalPatientSearch, setGlobalPatientSearch] = useState("");

  // Voice SpeechRecognition state for Record Vitals modal
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");

  const [activeReading, setActiveReading] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Recording
  const [formData, setFormData] = useState({
    patient_id: "",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    spo2: "",
    temperature: "",
    blood_sugar: "",
    weight: "",
    notes: "",
  });

  // Patient Dropdown Search & z-index State
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const patientDropdownRef = useRef(null);

  // Table Filters, Search & Pagination
  const [searchFilter, setSearchFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("All"); // Today | 7 days | 30 days | All
  const [statusFilter, setStatusFilter] = useState("All"); // All | Normal | Warning | Critical
  const [sortField, setSortField] = useState("recorded_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Appointments for selected patient
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [aptSearch, setAptSearch] = useState("");
  const [aptLoading, setAptLoading] = useState(false);

  useEffect(() => {
    document.title = "Patient Vitals | CareBridge AI";
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // TTS Readout for vital cards
  const speakReading = useCallback((card) => {
    if (!window.speechSynthesis) {
      showToast("Speech synthesis not supported in this browser.");
      return;
    }
    if (isMuted) return;

    window.speechSynthesis.cancel();
    if (!card.value) {
      const u = new SpeechSynthesisUtterance(`${card.title}, no data recorded.`);
      window.speechSynthesis.speak(u);
      return;
    }

    let phrase = "";
    if (card.id === "hr") {
      phrase = `Heart rate, ${card.value} beats per minute, ${card.status || "normal"}.`;
    } else if (card.id === "bp") {
      const [s, d] = String(card.value).split("/");
      phrase = `Blood pressure, ${s} over ${d || ""} millimeters of mercury, ${card.status || "normal"}.`;
    } else if (card.id === "spo2") {
      phrase = `Blood oxygen, ${card.value} percent, ${card.status || "normal"}.`;
    } else if (card.id === "temp") {
      phrase = `Body temperature, ${card.value} degrees Celsius, ${card.status || "normal"}.`;
    } else if (card.id === "sugar") {
      phrase = `Blood sugar, ${card.value} milligrams per deciliter, ${card.status || "normal"}.`;
    } else if (card.id === "weight") {
      phrase = `Body weight, ${card.value} kilograms.`;
    } else {
      phrase = `${card.title}, ${card.value} ${card.unit}, ${card.status || "normal"}.`;
    }

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Voice Input for Record Vitals Form
  const handleVoiceInputVitals = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast("Speech recognition is not supported in this browser.");
      return;
    }
    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onstart = () => {
        setIsVoiceListening(true);
        setVoiceNotice("Listening... e.g. 'Blood pressure 120 over 80, pulse 72, oxygen 98, temp 36.8, sugar 95, weight 70'");
      };
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setIsVoiceListening(false);

        const lower = transcript.toLowerCase();
        const updates = {};

        // BP e.g. 120 over 80 or 120/80
        const bpMatch = lower.match(/(?:bp|blood pressure|pressure)?\s*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/);
        if (bpMatch) {
          updates.systolic_bp = bpMatch[1];
          updates.diastolic_bp = bpMatch[2];
        }

        // Heart rate
        const hrMatch = lower.match(/(?:heart rate|pulse|rate|bpm|hr)\s*(\d{2,3})/);
        if (hrMatch) updates.heart_rate = hrMatch[1];

        // SpO2
        const spo2Match = lower.match(/(?:spo2|oxygen|saturation|o2)\s*(\d{2,3})/);
        if (spo2Match) updates.spo2 = spo2Match[1];

        // Temp
        const tempMatch = lower.match(/(?:temp|temperature)\s*(\d{2}(?:\.\d)?)/);
        if (tempMatch) updates.temperature = tempMatch[1];

        // Sugar
        const sugarMatch = lower.match(/(?:sugar|glucose|blood sugar)\s*(\d{2,3})/);
        if (sugarMatch) updates.blood_sugar = sugarMatch[1];

        // Weight
        const weightMatch = lower.match(/(?:weight|mass|kg)\s*(\d{2,3}(?:\.\d)?)/);
        if (weightMatch) updates.weight = weightMatch[1];

        setFormData((prev) => ({ ...prev, ...updates }));
        setVoiceNotice(`Recognized: "${transcript}". Please confirm all values before saving.`);
      };
      rec.onerror = () => {
        setIsVoiceListening(false);
        setVoiceNotice("");
      };
      rec.onend = () => {
        setIsVoiceListening(false);
      };
      rec.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsVoiceListening(false);
    }
  }, [isVoiceListening]);

  // Click outside to close patient dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Patients
  const loadPatients = useCallback(async () => {
    try {
      const list = await doctorService.getPatients({ limit: 100 });
      const valid = (Array.isArray(list) ? list : []).map((p) => ({
        id: p._id || p.id,
        patient_code: p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6),
        name: p.name || "Patient Record",
        avatar: p.avatar || p.photo || p.profile_photo || null,
        photo: p.photo || p.avatar || p.profile_photo || null,
        age: p.age || 42,
        gender: p.gender || "Other",
        blood_group: p.blood_group || p.blood || "O+",
        phone: p.phone || "+91 98765 43210",
        email: p.email || "patient@carebridge.health",
        emergency_contact: p.emergency_contact || p.emergencyContact || "Anita Malhotra (+91 98710 66783)",
        allergies: Array.isArray(p.allergies) ? p.allergies : (p.allergies ? [p.allergies] : []),
        conditions: Array.isArray(p.medical_history) ? p.medical_history : (Array.isArray(p.conditions) ? p.conditions : []),
        clinical_status: p.clinical_status || p.status || "Active",
      }));
      setPatients(valid);

      if (valid.length > 0) {
        let initialId = valid[0].id;
        if (preselectedPid) {
          const match = valid.find((p) => p.id === preselectedPid || p.patient_code === preselectedPid);
          if (match) initialId = match.id;
        }
        setSelectedPatientId(initialId);
      }
    } catch (err) {
      console.warn("Failed to load patients for vitals:", err);
    } finally {
      setLoading(false);
    }
  }, [preselectedPid]);

  // 2. Fetch Vitals History with Client-side Deduplication
  const loadVitalsHistory = useCallback(async (targetPid) => {
    if (!targetPid) return;
    try {
      const raw = await doctorService.getPatientVitals(targetPid);
      const rows = Array.isArray(raw) ? raw : [];

      // Deduplicate rows with identical timestamp or readings within 10s
      const uniqueRows = [];
      const seen = new Set();
      for (const r of rows) {
        const timeSec = Math.floor(new Date(r.recorded_at || r.created_at || 0).getTime() / 10000);
        const signature = `${timeSec}-${r.heart_rate}-${r.systolic_bp}-${r.diastolic_bp}-${r.spo2}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          uniqueRows.push(r);
        }
      }

      setVitalsHistory(uniqueRows);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Failed to fetch vitals for patient:", err);
      setVitalsHistory([]);
    }
  }, []);

  // 3. Fetch Patient Appointments
  const loadAppointments = useCallback(async (targetPid) => {
    if (!targetPid) return;
    setAptLoading(true);
    try {
      const res = await doctorService.getAppointments();
      const all = Array.isArray(res) ? res : [];
      const currentPatient = patients.find((p) => p.id === targetPid);
      const pCode = currentPatient?.patient_code;

      const matched = all.filter((a) => {
        const aPid = String(a.patient_id || a.patient?._id || a.patient?.id || "");
        const aCode = String(a.patient_code || a.patient?.patient_code || "");
        return aPid === String(targetPid) || (pCode && aCode === String(pCode));
      });

      // Sort newest first
      matched.sort((a, b) => {
        const tA = new Date(a.appointment_date + " " + (a.appointment_time || "")).getTime() || new Date(a.created_at || 0).getTime();
        const tB = new Date(b.appointment_date + " " + (b.appointment_time || "")).getTime() || new Date(b.created_at || 0).getTime();
        return tB - tA;
      });

      setPatientAppointments(matched);
    } catch (e) {
      console.warn("Failed to load appointments:", e);
      setPatientAppointments([]);
    } finally {
      setAptLoading(false);
    }
  }, [patients]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      loadVitalsHistory(selectedPatientId);
      loadAppointments(selectedPatientId);
    }
  }, [selectedPatientId, loadVitalsHistory, loadAppointments]);

  // 30s Live Auto-Refresh Polling
  useEffect(() => {
    if (!selectedPatientId) return;
    const interval = setInterval(() => {
      loadVitalsHistory(selectedPatientId);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedPatientId, loadVitalsHistory]);

  const handleSyncVitals = async () => {
    if (!selectedPatientId) return;
    setSyncing(true);
    await loadVitalsHistory(selectedPatientId);
    await loadAppointments(selectedPatientId);
    setSyncing(false);
    showToast("Vitals telemetry synchronized");
  };

  const handlePatientSelectChange = (newPid) => {
    setSelectedPatientId(newPid);
    setIsPatientDropdownOpen(false);
    setCurrentPage(1);
    navigate(`/doctor/vitals?patientId=${newPid}`, { replace: true });
  };

  const activePatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  // Filtered patients for dropdown search
  const filteredPatientsList = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients;
    const q = patientSearchQuery.toLowerCase().trim();
    return patients.filter(
      (p) =>
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.patient_code || "").toLowerCase().includes(q) ||
        String(p.phone || "").toLowerCase().includes(q)
    );
  }, [patients, patientSearchQuery]);

  // Sorted Vitals chronologically (newest first)
  const sortedVitals = useMemo(() => {
    return [...vitalsHistory].sort((a, b) => {
      const tA = new Date(a.recorded_at || a.created_at || 0).getTime();
      const tB = new Date(b.recorded_at || b.created_at || 0).getTime();
      return tB - tA;
    });
  }, [vitalsHistory]);

  // Latest and Previous readings
  const latestVital = sortedVitals[0] || null;
  const previousVital = sortedVitals[1] || null;

  // Compute stats for 6 metric cards
  const metricCards = useMemo(() => {
    const historyChronological = [...sortedVitals].reverse();

    // HR
    const hrVal = latestVital?.heart_rate != null ? Number(latestVital.heart_rate) : null;
    const hrPrev = previousVital?.heart_rate != null ? Number(previousVital.heart_rate) : null;
    const hrDelta = hrVal != null && hrPrev != null ? hrVal - hrPrev : null;
    const hrStatus = hrVal != null ? METRIC_RANGES.hr.classify(hrVal) : null;
    const hrSpark = hrVal != null ? historyChronological.map((r) => Number(r.heart_rate) || 72).slice(-10) : [];

    // BP
    const sysVal = latestVital?.systolic_bp != null ? Number(latestVital.systolic_bp) : null;
    const diaVal = latestVital?.diastolic_bp != null ? Number(latestVital.diastolic_bp) : null;
    const sysPrev = previousVital?.systolic_bp != null ? Number(previousVital.systolic_bp) : null;
    const diaPrev = previousVital?.diastolic_bp != null ? Number(previousVital.diastolic_bp) : null;
    const bpStatus = sysVal != null && diaVal != null ? METRIC_RANGES.bp.classify(sysVal, diaVal) : null;
    const bpSpark = sysVal != null ? historyChronological.map((r) => Number(r.systolic_bp) || 120).slice(-10) : [];

    // SpO2
    const spo2Val = latestVital?.spo2 != null ? Number(latestVital.spo2) : null;
    const spo2Prev = previousVital?.spo2 != null ? Number(previousVital.spo2) : null;
    const spo2Delta = spo2Val != null && spo2Prev != null ? spo2Val - spo2Prev : null;
    const spo2Status = spo2Val != null ? METRIC_RANGES.spo2.classify(spo2Val) : null;
    const spo2Spark = spo2Val != null ? historyChronological.map((r) => Number(r.spo2) || 98).slice(-10) : [];

    // Temp
    const tempVal = latestVital?.temperature != null ? Number(latestVital.temperature) : null;
    const tempPrev = previousVital?.temperature != null ? Number(previousVital.temperature) : null;
    const tempDelta = tempVal != null && tempPrev != null ? +(tempVal - tempPrev).toFixed(1) : null;
    const tempStatus = tempVal != null ? METRIC_RANGES.temp.classify(tempVal) : null;
    const tempSpark = tempVal != null ? historyChronological.map((r) => Number(r.temperature) || 36.8).slice(-10) : [];

    // Blood Sugar
    const sugarVal = latestVital?.blood_sugar != null ? Number(latestVital.blood_sugar) : null;
    const sugarPrev = previousVital?.blood_sugar != null ? Number(previousVital.blood_sugar) : null;
    const sugarDelta = sugarVal != null && sugarPrev != null ? sugarVal - sugarPrev : null;
    const sugarStatus = sugarVal != null ? METRIC_RANGES.sugar.classify(sugarVal) : null;
    const sugarSpark = sugarVal != null ? historyChronological.map((r) => Number(r.blood_sugar) || 95).slice(-10) : [];

    // Weight
    const weightVal = latestVital?.weight != null ? Number(latestVital.weight) : null;
    const weightPrev = previousVital?.weight != null ? Number(previousVital.weight) : null;
    const weightDelta = weightVal != null && weightPrev != null ? +(weightVal - weightPrev).toFixed(1) : null;
    const weightSpark = weightVal != null ? historyChronological.filter((r) => r.weight != null).map((r) => Number(r.weight)).slice(-10) : [];

    return [
      {
        id: "hr",
        title: "Heart Rate",
        icon: HeartPulse,
        value: hrVal != null ? `${hrVal}` : null,
        unit: "BPM",
        status: hrStatus,
        prevText: hrPrev != null ? `Prev: ${hrPrev} BPM` : "No prior reading",
        deltaText: hrDelta != null ? `${hrDelta > 0 ? "▲ +" : "▼ "}${hrDelta} BPM` : null,
        deltaGood: hrDelta != null && Math.abs(hrVal - 75) <= Math.abs(hrPrev - 75),
        sparkline: hrSpark,
        color: "#ef4444",
        time: latestVital?.recorded_at || latestVital?.created_at,
        metricKey: "hr",
      },
      {
        id: "bp",
        title: "Blood Pressure",
        icon: Activity,
        value: sysVal != null && diaVal != null ? `${sysVal}/${diaVal}` : null,
        unit: "mmHg",
        status: bpStatus,
        prevText: sysPrev != null && diaPrev != null ? `Prev: ${sysPrev}/${diaPrev}` : "No prior reading",
        deltaText: sysPrev != null ? `${sysVal - sysPrev > 0 ? "▲ +" : "▼ "}${sysVal - sysPrev} mmHg` : null,
        deltaGood: sysVal != null && sysVal <= 125,
        sparkline: bpSpark,
        color: "#3b82f6",
        time: latestVital?.recorded_at || latestVital?.created_at,
        metricKey: "bp",
      },
      {
        id: "spo2",
        title: "Blood Oxygen (SpO₂)",
        icon: Droplets,
        value: spo2Val != null ? `${spo2Val}` : null,
        unit: "%",
        status: spo2Status,
        prevText: spo2Prev != null ? `Prev: ${spo2Prev}%` : "No prior reading",
        deltaText: spo2Delta != null ? `${spo2Delta > 0 ? "▲ +" : "▼ "}${spo2Delta}%` : null,
        deltaGood: spo2Delta != null && spo2Delta >= 0,
        sparkline: spo2Spark,
        color: "#06b6d4",
        time: latestVital?.recorded_at || latestVital?.created_at,
        metricKey: "spo2",
      },
      {
        id: "temp",
        title: "Body Temperature",
        icon: Thermometer,
        value: tempVal != null ? `${tempVal.toFixed(1)}` : null,
        unit: "°C",
        status: tempStatus,
        prevText: tempPrev != null ? `Prev: ${tempPrev.toFixed(1)}°C` : "No prior reading",
        deltaText: tempDelta != null ? `${tempDelta > 0 ? "▲ +" : "▼ "}${tempDelta}°C` : null,
        deltaGood: tempDelta != null && Math.abs(tempVal - 36.8) <= Math.abs(tempPrev - 36.8),
        sparkline: tempSpark,
        color: "#f59e0b",
        time: latestVital?.recorded_at || latestVital?.created_at,
        metricKey: "temp",
      },
      {
        id: "sugar",
        title: "Blood Sugar Level",
        icon: TrendingUp,
        value: sugarVal != null ? `${sugarVal}` : null,
        unit: "mg/dL",
        status: sugarStatus,
        prevText: sugarPrev != null ? `Prev: ${sugarPrev} mg/dL` : "No prior reading",
        deltaText: sugarDelta != null ? `${sugarDelta > 0 ? "▲ +" : "▼ "}${sugarDelta} mg/dL` : null,
        deltaGood: sugarDelta != null && Math.abs(sugarVal - 100) <= Math.abs(sugarPrev - 100),
        sparkline: sugarSpark,
        color: "#8b5cf6",
        time: latestVital?.recorded_at || latestVital?.created_at,
        metricKey: "sugar",
      },
      {
        id: "weight",
        title: "Body Weight & Mass",
        icon: Weight,
        value: weightVal != null ? `${weightVal.toFixed(1)}` : null,
        unit: "kg",
        status: weightVal != null ? "normal" : null,
        prevText: weightPrev != null ? `Prev: ${weightPrev.toFixed(1)} kg` : "No prior reading",
        deltaText: weightDelta != null ? `${weightDelta > 0 ? "▲ +" : "▼ "}${weightDelta} kg` : null,
        deltaGood: true,
        sparkline: weightSpark,
        color: "#10b981",
        time: latestVital?.recorded_at || latestVital?.created_at,
        metricKey: "weight",
      },
    ];
  }, [sortedVitals, latestVital, previousVital]);

  // Overall Status Checks
  const criticalCardCount = metricCards.filter((c) => c.status === "critical").length;
  const warningCardCount = metricCards.filter((c) => c.status === "warning").length;
  const isPatientCritical =
    criticalCardCount > 0 ||
    (latestVital && getRowStatus(latestVital) === "critical") ||
    activePatient?.clinical_status === "Critical" ||
    activePatient?.status === "Critical";

  // Filtered & Sorted Table Rows
  const filteredTableRows = useMemo(() => {
    let rows = [...sortedVitals];
    const now = Date.now();

    // 1. Range Filter
    if (rangeFilter === "Today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => new Date(r.recorded_at || r.created_at).getTime() >= startOfDay.getTime());
    } else if (rangeFilter === "7 days") {
      rows = rows.filter((r) => now - new Date(r.recorded_at || r.created_at).getTime() <= 7 * 86400000);
    } else if (rangeFilter === "30 days") {
      rows = rows.filter((r) => now - new Date(r.recorded_at || r.created_at).getTime() <= 30 * 86400000);
    }

    // 2. Status Filter
    if (statusFilter !== "All") {
      rows = rows.filter((r) => {
        const rowStat = getRowStatus(r);
        if (statusFilter === "Critical") return rowStat === "critical";
        if (statusFilter === "Warning") return rowStat === "warning";
        if (statusFilter === "Normal") return rowStat === "normal";
        return true;
      });
    }

    // 3. Search Filter across notes, staff, formatted dates, and all vital numbers
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      rows = rows.filter((r) => {
        const d = new Date(r.recorded_at || r.created_at);
        const dateStr = d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }).toLowerCase();
        const fullDateStr = d.toLocaleString().toLowerCase();
        const relTime = timeAgo(r.recorded_at || r.created_at).toLowerCase();
        const bpStr = `${r.systolic_bp}/${r.diastolic_bp}`;

        return (
          String(r.notes || "").toLowerCase().includes(q) ||
          String(r.recorded_by_name || "").toLowerCase().includes(q) ||
          dateStr.includes(q) ||
          fullDateStr.includes(q) ||
          relTime.includes(q) ||
          bpStr.includes(q) ||
          String(r.systolic_bp || "").includes(q) ||
          String(r.diastolic_bp || "").includes(q) ||
          String(r.heart_rate || "").includes(q) ||
          String(r.spo2 || "").includes(q) ||
          String(r.temperature || "").includes(q) ||
          String(r.blood_sugar || "").includes(q) ||
          String(r.weight || "").includes(q)
        );
      });
    }

    // 4. Sort
    rows.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (sortField === "recorded_at") {
        vA = new Date(a.recorded_at || a.created_at || 0).getTime();
        vB = new Date(b.recorded_at || b.created_at || 0).getTime();
      } else {
        vA = vA != null ? Number(vA) || vA : 0;
        vB = vB != null ? Number(vB) || vB : 0;
      }
      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });

    return rows;
  }, [sortedVitals, rangeFilter, statusFilter, searchFilter, sortField, sortAsc]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredTableRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTableRows.slice(start, start + rowsPerPage);
  }, [filteredTableRows, currentPage, rowsPerPage]);

  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Record Vital Submit with Strict Validations
  const handleSaveVital = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!selectedPatientId) {
      setModalError("Please select a patient chart first.");
      return;
    }

    const hr = Number(formData.heart_rate);
    const sbp = Number(formData.systolic_bp);
    const dbp = Number(formData.diastolic_bp);
    const spo2 = Number(formData.spo2);
    const temp = Number(formData.temperature);
    const bs = Number(formData.blood_sugar);
    const wt = formData.weight ? Number(formData.weight) : undefined;

    // Required check
    if (!formData.heart_rate || !formData.systolic_bp || !formData.diastolic_bp || !formData.spo2 || !formData.temperature || !formData.blood_sugar) {
      setModalError("Please fill in all required physiological vital fields.");
      return;
    }

    // Systolic must be strictly higher than diastolic
    if (sbp <= dbp) {
      setModalError(`Systolic BP (${sbp} mmHg) must be strictly higher than Diastolic BP (${dbp} mmHg).`);
      return;
    }

    // Realistic physiological bounds
    if (hr < 30 || hr > 250) {
      setModalError("Heart rate must be between 30 and 250 bpm.");
      return;
    }
    if (spo2 < 50 || spo2 > 100) {
      setModalError("Blood oxygen SpO₂ must be between 50% and 100%.");
      return;
    }
    if (sbp < 50 || sbp > 260 || dbp < 30 || dbp > 180) {
      setModalError("Blood pressure values are outside realistic physiological limits.");
      return;
    }
    if (temp < 30 || temp > 45) {
      setModalError("Body temperature must be between 30.0°C and 45.0°C.");
      return;
    }
    if (bs < 20 || bs > 600) {
      setModalError("Blood sugar must be between 20 and 600 mg/dL.");
      return;
    }

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();
    const tempId = `vital-${Date.now()}`;
    const newEntry = {
      _id: tempId,
      id: tempId,
      patient_id: selectedPatientId,
      patient_code: activePatient?.patient_code,
      patient_name: activePatient?.name,
      heart_rate: hr,
      systolic_bp: sbp,
      diastolic_bp: dbp,
      spo2: spo2,
      temperature: temp,
      blood_sugar: bs,
      weight: wt,
      notes: formData.notes || "",
      recorded_by_name: "Attending Doctor",
      recorded_at: nowIso,
      created_at: nowIso,
    };

    // Update state immediately without refresh
    setVitalsHistory((prev) => [newEntry, ...prev]);
    setIsRecordModalOpen(false);
    setFormData({
      patient_id: "",
      heart_rate: "",
      systolic_bp: "",
      diastolic_bp: "",
      spo2: "",
      temperature: "",
      blood_sugar: "",
      weight: "",
      notes: "",
    });
    showToast("Vital reading recorded successfully");

    try {
      await doctorService.recordVitals({
        patient_id: selectedPatientId,
        heart_rate: hr,
        systolic_bp: sbp,
        diastolic_bp: dbp,
        spo2: spo2,
        temperature: temp,
        blood_sugar: bs,
        weight: wt,
        notes: formData.notes || "",
      });
      await loadVitalsHistory(selectedPatientId);
    } catch (err) {
      console.warn("Backend record error:", err);
      if (err.response?.status === 409) {
        showToast("Notice: Duplicate reading prevented on server.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Vital Submit with Validations
  const handleUpdateVital = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!activeReading?._id && !activeReading?.id) return;
    const vId = activeReading._id || activeReading.id;

    const sbp = Number(activeReading.systolic_bp);
    const dbp = Number(activeReading.diastolic_bp);

    if (sbp <= dbp) {
      setModalError(`Systolic BP (${sbp} mmHg) must be strictly higher than Diastolic BP (${dbp} mmHg).`);
      return;
    }

    setIsSubmitting(true);
    // Instant local state update
    setVitalsHistory((prev) =>
      prev.map((r) => ((r._id || r.id) === vId ? { ...activeReading } : r))
    );
    setIsEditModalOpen(false);
    showToast("Vital reading updated successfully");

    try {
      await api.put(`/vitals/${vId}`, {
        heart_rate: Number(activeReading.heart_rate),
        systolic_bp: sbp,
        diastolic_bp: dbp,
        spo2: Number(activeReading.spo2),
        temperature: Number(activeReading.temperature),
        blood_sugar: Number(activeReading.blood_sugar),
        weight: activeReading.weight ? Number(activeReading.weight) : undefined,
        notes: activeReading.notes || "",
      });
      await loadVitalsHistory(selectedPatientId);
    } catch (err) {
      console.error("Update vital failed:", err);
      showToast("Failed to update vital reading on server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Vital Action
  const handleDeleteVital = async (vId) => {
    try {
      // Instant local removal
      setVitalsHistory((prev) => prev.filter((r) => (r._id || r.id) !== vId));
      setDeleteConfirmId(null);
      showToast("Vital reading deleted from chart");

      await api.delete(`/vitals/${vId}`);
      await loadVitalsHistory(selectedPatientId);
    } catch (err) {
      console.error("Delete vital failed:", err);
      showToast("Failed to delete vital record from server.");
    }
  };

  // Save Patient Photo
  const handleSavePatientPhoto = async (newPhotoUrl) => {
    if (!selectedPatientId) return;
    try {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatientId
            ? { ...p, avatar: newPhotoUrl, photo: newPhotoUrl }
            : p
        )
      );
      await patientService.updatePatientProfile(selectedPatientId, {
        avatar: newPhotoUrl,
        photo: newPhotoUrl,
      });
      showToast(newPhotoUrl ? "Patient photo updated successfully" : "Patient photo removed");
    } catch (err) {
      console.error("Failed to save patient photo:", err);
      showToast("Failed to save patient photo");
    }
  };

  // Filtered appointments for patient appointments drawer
  const filteredAppointmentsList = useMemo(() => {
    if (!aptSearch.trim()) return patientAppointments;
    const q = aptSearch.toLowerCase().trim();
    return patientAppointments.filter((a) => {
      const d = a.appointment_date || "";
      const t = a.appointment_time || "";
      const doc = a.doctor_name || "";
      const reason = a.reason || "";
      const status = a.status || a.approval_status || "";
      return (
        d.toLowerCase().includes(q) ||
        t.toLowerCase().includes(q) ||
        doc.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      );
    });
  }, [patientAppointments, aptSearch]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredTableRows.length) {
      showToast("No recordings to export");
      return;
    }
    const headers = [
      "Timestamp",
      "Heart Rate (BPM)",
      "BP Systolic (mmHg)",
      "BP Diastolic (mmHg)",
      "SpO2 (%)",
      "Temperature (°C)",
      "Blood Sugar (mg/dL)",
      "Weight (kg)",
      "Recorder",
      "Notes",
    ];
    const rowsData = filteredTableRows.map((r) => [
      `"${new Date(r.recorded_at || r.created_at).toLocaleString()}"`,
      r.heart_rate || "",
      r.systolic_bp || "",
      r.diastolic_bp || "",
      r.spo2 || "",
      r.temperature || "",
      r.blood_sugar || "",
      r.weight || "",
      `"${r.recorded_by_name || "Medical Staff"}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rowsData.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const pCode = activePatient?.patient_code || "patient";
    link.setAttribute(
      "download",
      `vitals-telemetry-${pCode}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Vitals telemetry CSV exported");
  };

  return (
    <div className="vitals-page-layout">
      {/* HEADER BAR */}
      <div className="vitals-header-card">
        <div className="vitals-header-info">
          <div className="vitals-eyebrow-tag">
            <span className="live-dot" /> LIVE TELEMETRY STREAM
          </div>
          <h1>Patient Physiological Vitals</h1>
          <p className="vitals-header-desc">
            Continuous calibrated telemetry stream · Last synced:{" "}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "Live Polling"}
          </p>
        </div>

        <div className="vitals-header-actions">
          <button
            className="vitals-btn secondary"
            onClick={handleSyncVitals}
            disabled={syncing}
            title="Synchronize real-time telemetry stream"
          >
            <RefreshCw size={15} className={syncing ? "spin-icon" : ""} />
            {syncing ? "Syncing…" : "Sync Vitals"}
          </button>

          <button
            className="vitals-btn secondary"
            onClick={() => navigate(`/doctor/health-monitoring?patientId=${selectedPatientId}`)}
            title="Launch 3D Cardiac & PulseView Telemetry"
          >
            <Activity size={15} /> View Telemetry Trends
          </button>

          <button className="vitals-btn primary" onClick={() => setIsRecordModalOpen(true)}>
            <Plus size={16} /> Record Vitals Now
          </button>
        </div>
      </div>

      {/* CRITICAL ALERT BANNER */}
      {isPatientCritical && (
        <div className="vitals-critical-alert-banner">
          <div className="critical-alert-icon-box">
            <ShieldAlert size={22} className="pulse-danger" />
          </div>
          <div className="critical-alert-body">
            <strong>CRITICAL TELEMETRY ALERT: Abnormal physiological readings detected for {activePatient?.name} (ID: {activePatient?.patient_code})</strong>
            <p>
              Immediate clinical review recommended. Out-of-bounds vitals flagged across active telemetry stream (SpO₂ &lt; 90%, Temp &ge; 38.6°C, or Blood Pressure inversion).
            </p>
          </div>
        </div>
      )}

      {/* PATIENT SELECTION & DEMOGRAPHICS CARD */}
      <div className="vitals-patient-card">
        {/* Custom Searchable Patient Dropdown */}
        <div className="vitals-patient-select-col" ref={patientDropdownRef}>
          <label id="patient-selector-label">
            <User size={16} className="text-primary" />
            <strong>Select Patient Chart:</strong>
          </label>

          <div className="custom-patient-selector-wrap">
            <button
              type="button"
              className="custom-patient-select-btn"
              onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={isPatientDropdownOpen}
            >
              <div className="selected-patient-preview">
                <strong>{activePatient?.name || "Select Patient"}</strong>
                <span className="p-id-tag">ID: {activePatient?.patient_code}</span>
              </div>
              <ChevronDown size={15} className={`dropdown-chevron ${isPatientDropdownOpen ? "open" : ""}`} />
            </button>

            {isPatientDropdownOpen && (
              <div className="custom-patient-dropdown-menu">
                <div className="dropdown-search-box">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, 6-digit ID, or phone..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {patientSearchQuery && (
                    <button type="button" className="clear-btn" onClick={() => setPatientSearchQuery("")}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="patient-options-list">
                  {filteredPatientsList.length === 0 ? (
                    <div className="no-patients-found">No patients match "{patientSearchQuery}"</div>
                  ) : (
                    filteredPatientsList.map((p) => {
                      const isSelected = p.id === selectedPatientId;
                      return (
                        <div
                          key={p.id}
                          className={`patient-option-item ${isSelected ? "selected" : ""}`}
                          onClick={() => handlePatientSelectChange(p.id)}
                        >
                          <div className="option-avatar">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} />
                            ) : (
                              <span>{p.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="option-info">
                            <strong>{p.name}</strong>
                            <span>ID: {p.patient_code} · {p.phone}</span>
                          </div>
                          {p.clinical_status === "Critical" && (
                            <span className="crit-badge">CRITICAL</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Profile Demographics Row */}
        {activePatient && (
          <div className="vitals-patient-profile-section">
            <div className="patient-avatar-box">
              <div className="patient-avatar-circle">
                {activePatient.avatar ? (
                  <img src={activePatient.avatar} alt={activePatient.name} />
                ) : (
                  <span>{activePatient.name.charAt(0).toUpperCase()}</span>
                )}
                <button
                  type="button"
                  className="patient-avatar-edit-btn"
                  onClick={() => setIsPatientPhotoModalOpen(true)}
                  title="Edit patient profile photo"
                >
                  <Camera size={13} />
                </button>
              </div>
            </div>

            <div className="vitals-demographics-row">
              <div className="demographic-chip">
                <span className="lbl">Patient Name</span>
                <strong>{activePatient.name}</strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Patient ID</span>
                <strong>#{activePatient.patient_code}</strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Age</span>
                <strong>{activePatient.age} yrs</strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Gender</span>
                <strong>{activePatient.gender}</strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Blood Group</span>
                <strong>{activePatient.blood_group}</strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Phone</span>
                <strong>
                  <Phone size={11} style={{ marginRight: 4 }} />
                  {activePatient.phone}
                </strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Email</span>
                <strong>
                  <Mail size={11} style={{ marginRight: 4 }} />
                  {activePatient.email}
                </strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Emergency</span>
                <strong>{activePatient.emergency_contact}</strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Allergies</span>
                <strong style={{ color: activePatient.allergies?.length ? "#f87171" : "inherit" }}>
                  {activePatient.allergies?.length ? activePatient.allergies.join(", ") : "NKDA"}
                </strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Conditions</span>
                <strong>
                  {activePatient.conditions?.length ? activePatient.conditions.join(", ") : "None reported"}
                </strong>
              </div>
              <div className="demographic-chip">
                <span className="lbl">Status</span>
                <span className={`patient-health-status-badge ${isPatientCritical ? "critical" : "stable"}`}>
                  {isPatientCritical ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
                  {isPatientCritical ? "Critical" : "Stable"}
                </span>
              </div>
            </div>

            <div className="patient-appointments-quick-btn">
              <button
                type="button"
                className="vitals-btn secondary"
                onClick={() => setIsDocumentsModalOpen(true)}
                title="Manage lab reports, prescriptions, scans"
                style={{ marginRight: 8 }}
              >
                <FileText size={14} /> Documents
              </button>
              <button
                type="button"
                className="vitals-btn secondary"
                onClick={() => setIsAppointmentsModalOpen(true)}
                title="View all consultation appointments for this patient"
              >
                <Calendar size={14} /> View Appointments ({patientAppointments.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK SEARCH BAR ABOVE CARDS */}
      <div className="vitals-quick-search-section">
        <div className="vitals-quick-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search patient by name, ID, or phone to switch charts (or filter vitals log)..."
            value={globalPatientSearch}
            onChange={(e) => {
              const val = e.target.value;
              setGlobalPatientSearch(val);
              setSearchFilter(val);
              setCurrentPage(1);
            }}
          />
          {globalPatientSearch && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setGlobalPatientSearch("");
                setSearchFilter("");
                setCurrentPage(1);
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {globalPatientSearch.trim() && (
          <div className="quick-search-dropdown-matches">
            {filteredPatientsList.length === 0 ? (
              <div className="no-matches-item">No results found for "{globalPatientSearch}"</div>
            ) : (
              filteredPatientsList.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className={`match-item ${p.id === selectedPatientId ? "active" : ""}`}
                  onClick={() => {
                    handlePatientSelectChange(p.id);
                    setGlobalPatientSearch("");
                    setSearchFilter("");
                  }}
                >
                  <span className="match-name">{p.name}</span>
                  <span className="match-sub">ID: #{p.patient_code} · {p.phone}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 6 METRIC CARDS HEADER & GRID */}
      <div className="vitals-cards-header-bar">
        <span className="vitals-cards-header-title">Live Calibrated Telemetry Metrics</span>
        <button
          type="button"
          className={`vitals-mute-btn ${isMuted ? "muted" : ""}`}
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
          }}
          title={isMuted ? "Unmute TTS audio readouts" : "Mute TTS audio readouts"}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{isMuted ? "Audio Muted" : "Mute Audio"}</span>
        </button>
      </div>

      <div className="vitals-cards-grid">
        {metricCards.map((card) => {
          const IconComp = card.icon;
          const isCritical = card.status === "critical";
          const isWarning = card.status === "warning";
          const isNormal = card.status === "normal";

          return (
            <div
              key={card.id}
              className={`vital-metric-card ${card.status || "no-data"} ${isCritical ? "pulse-critical" : ""}`}
              onClick={() =>
                navigate(
                  `/doctor/health-monitoring?patientId=${selectedPatientId}&metric=${card.metricKey}`
                )
              }
              title="Click to inspect detailed 3D curves in PulseView"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  navigate(
                    `/doctor/health-monitoring?patientId=${selectedPatientId}&metric=${card.metricKey}`
                  );
              }}
            >
              <div className="card-top-row">
                <div
                  className="card-icon-wrap"
                  style={{ background: `${card.color}15`, color: card.color }}
                >
                  <IconComp size={20} />
                </div>

                <div className="card-top-actions">
                  <button
                    type="button"
                    className="card-speaker-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakReading(card);
                    }}
                    title={`Read aloud ${card.title}`}
                  >
                    <Volume2 size={14} />
                  </button>

                  <div className="card-status-badge-wrap">
                    {isCritical ? (
                      <span className="badge-chip red">CRITICAL</span>
                    ) : isWarning ? (
                      <span className="badge-chip amber">WARNING</span>
                    ) : isNormal ? (
                      <span className="badge-chip green">NORMAL</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="card-body">
                <span className="metric-title">{card.title}</span>
                <div className="metric-value-row">
                  {card.value ? (
                    <>
                      <span className="metric-val">{card.value}</span>
                      <span className="metric-unit">{card.unit}</span>
                    </>
                  ) : (
                    <div className="card-no-data-wrap">
                      <span className="empty-val">No data</span>
                      <button
                        type="button"
                        className="card-record-cta-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRecordModalOpen(true);
                        }}
                      >
                        + Record vitals
                      </button>
                    </div>
                  )}
                </div>

                <div className="metric-delta-row">
                  {card.value && card.deltaText ? (
                    <span className={`delta-tag ${card.deltaGood ? "good" : "bad"}`}>
                      {card.deltaGood ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {card.deltaText}
                    </span>
                  ) : card.value ? (
                    <span className="delta-neutral">{card.prevText}</span>
                  ) : (
                    <span className="delta-neutral">No readings recorded</span>
                  )}
                  {card.time && <span className="time-subtext">{timeAgo(card.time)}</span>}
                </div>
              </div>

              <div className="card-sparkline-row">
                <Sparkline data={card.sparkline} color={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* RECORDED VITAL SIGNS STREAM SECTION */}
      <div className="vitals-stream-card">
        <div className="stream-header-row">
          <div>
            <div className="stream-title-row">
              <h2>Recorded Vital Signs Stream</h2>
              <span className="stream-count-badge">
                {filteredTableRows.length} recording{filteredTableRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="stream-subtext">
              Chronologically verified physiological sensor readings for active patient chart
            </p>
          </div>

          <div className="stream-actions-group">
            <button className="vitals-btn secondary" onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </button>
            <button className="vitals-btn primary" onClick={() => setIsRecordModalOpen(true)}>
              <Plus size={15} /> Record Vitals Now
            </button>
          </div>
        </div>

        {/* PATIENT INFO BAR ABOVE TABLE */}
        <div className="table-patient-info-strip">
          <div className="info-strip-item">
            <span className="lbl">Patient:</span>
            <strong>{activePatient?.name || "--"}</strong>
          </div>
          <div className="info-strip-divider" />
          <div className="info-strip-item">
            <span className="lbl">Patient ID:</span>
            <strong>#{activePatient?.patient_code || "--"}</strong>
          </div>
          <div className="info-strip-divider" />
          <div className="info-strip-item">
            <span className="lbl">Age:</span>
            <strong>{activePatient?.age || "--"} yrs</strong>
          </div>
          <div className="info-strip-divider" />
          <div className="info-strip-item">
            <span className="lbl">Gender:</span>
            <strong>{activePatient?.gender || "--"}</strong>
          </div>
          <div className="info-strip-divider" />
          <div className="info-strip-item">
            <span className="lbl">Blood Group:</span>
            <strong>{activePatient?.blood_group || "--"}</strong>
          </div>
          <div className="info-strip-divider" />
          <div className="info-strip-item">
            <span className="lbl">Status:</span>
            <span className={`info-strip-status ${isPatientCritical ? "critical" : "stable"}`}>
              {isPatientCritical ? "Critical Alert" : "Stable"}
            </span>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="stream-filters-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by notes, staff recorder, date, or vital number…"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchFilter && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchFilter("")}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-chips-wrap">
            <span className="filter-label">Range:</span>
            {["All", "Today", "7 days", "30 days"].map((rg) => (
              <button
                key={rg}
                type="button"
                className={`filter-chip ${rangeFilter === rg ? "active" : ""}`}
                onClick={() => {
                  setRangeFilter(rg);
                  setCurrentPage(1);
                }}
              >
                {rg}
              </button>
            ))}

            <span className="filter-label" style={{ marginLeft: 12 }}>
              Status:
            </span>
            {["All", "Normal", "Warning", "Critical"].map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-chip ${statusFilter === st ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE VIEW */}
        <div className="stream-table-container">
          <table className="stream-table">
            <thead>
              <tr>
                <th onClick={() => handleSortToggle("recorded_at")} className="sortable-th">
                  <div className="th-content">
                    <span>Recorded At</span>
                    {sortField === "recorded_at" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSortToggle("systolic_bp")} className="sortable-th">
                  <div className="th-content">
                    <span>Blood Pressure (mmHg)</span>
                    {sortField === "systolic_bp" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSortToggle("heart_rate")} className="sortable-th">
                  <div className="th-content">
                    <span>Heart Rate (bpm)</span>
                    {sortField === "heart_rate" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSortToggle("spo2")} className="sortable-th">
                  <div className="th-content">
                    <span>SpO₂ (%)</span>
                    {sortField === "spo2" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSortToggle("temperature")} className="sortable-th">
                  <div className="th-content">
                    <span>Temp (°C)</span>
                    {sortField === "temperature" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSortToggle("blood_sugar")} className="sortable-th">
                  <div className="th-content">
                    <span>Blood Sugar (mg/dL)</span>
                    {sortField === "blood_sugar" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSortToggle("weight")} className="sortable-th">
                  <div className="th-content">
                    <span>Weight (kg)</span>
                    {sortField === "weight" ? (
                      sortAsc ? <ArrowUp size={13} className="sort-active" /> : <ArrowDown size={13} className="sort-active" />
                    ) : (
                      <ArrowUpDown size={12} className="sort-idle" />
                    )}
                  </div>
                </th>
                <th>Recorded By</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="stream-empty-row">
                    <div className="empty-box">
                      <HeartPulse size={36} className="empty-icon" />
                      {vitalsHistory.length === 0 ? (
                        <>
                          <p>No vitals recorded yet</p>
                          <button
                            type="button"
                            className="vitals-btn primary"
                            onClick={() => setIsRecordModalOpen(true)}
                          >
                            <Plus size={15} /> Record Vitals Now
                          </button>
                        </>
                      ) : (
                        <>
                          <p>No recordings found</p>
                          <button
                            type="button"
                            className="vitals-btn secondary"
                            onClick={() => {
                              setSearchFilter("");
                              setGlobalPatientSearch("");
                              setRangeFilter("All");
                              setStatusFilter("All");
                            }}
                          >
                            Clear search
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => {
                  const hrStat = METRIC_RANGES.hr.classify(r.heart_rate);
                  const bpStat = METRIC_RANGES.bp.classify(r.systolic_bp, r.diastolic_bp);
                  const spo2Stat = METRIC_RANGES.spo2.classify(r.spo2);
                  const tempStat = METRIC_RANGES.temp.classify(r.temperature);
                  const sugarStat = METRIC_RANGES.sugar.classify(r.blood_sugar);
                  const rowStat = getRowStatus(r);
                  const isCrit = rowStat === "critical";
                  const isWarn = rowStat === "warning";
                  const rowId = r._id || r.id;

                  return (
                    <tr
                      key={rowId}
                      className={`stream-row ${isCrit ? "row-critical" : isWarn ? "row-warning" : ""}`}
                    >
                      <td>
                        <div className="time-cell">
                          <strong>
                            {new Date(r.recorded_at || r.created_at).toLocaleDateString([], {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                          <span>
                            {new Date(r.recorded_at || r.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {timeAgo(r.recorded_at || r.created_at)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className={`val-chip ${bpStat}`}>
                          {r.systolic_bp && r.diastolic_bp
                            ? `${r.systolic_bp}/${r.diastolic_bp}`
                            : "--"}
                          {bpStat === "critical" && " ⚠️"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${hrStat}`}>
                          {r.heart_rate != null ? `${r.heart_rate}` : "--"}
                          {hrStat === "critical" && " ⚠️"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${spo2Stat}`}>
                          {r.spo2 != null ? `${r.spo2}%` : "--"}
                          {spo2Stat === "critical" && " ⚠️"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${tempStat}`}>
                          {r.temperature != null
                            ? `${Number(r.temperature).toFixed(1)}°C`
                            : "--"}
                          {tempStat === "critical" && " ⚠️"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${sugarStat}`}>
                          {r.blood_sugar != null ? `${r.blood_sugar}` : "--"}
                          {sugarStat === "critical" && " ⚠️"}
                        </span>
                      </td>

                      <td>
                        <span className="neutral-chip">
                          {r.weight ? `${r.weight} kg` : "--"}
                        </span>
                      </td>

                      <td>
                        <span className="recorder-pill">{r.recorded_by_name || "Medical Staff"}</span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="table-row-actions">
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="View Vital Details"
                            onClick={() => {
                              setActiveReading(r);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Edit Reading"
                            onClick={() => {
                              setActiveReading({ ...r });
                              setModalError("");
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn delete"
                            title="Delete Reading"
                            onClick={() => setDeleteConfirmId(rowId)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {filteredTableRows.length > 0 && (
          <div className="stream-pagination-bar">
            <div className="rows-per-page">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="page-summary">
              Showing {(currentPage - 1) * rowsPerPage + 1}–
              {Math.min(currentPage * rowsPerPage, filteredTableRows.length)} of{" "}
              {filteredTableRows.length} recordings
            </div>

            <div className="pagination-buttons">
              <button
                type="button"
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECORD VITAL MODAL */}
      {isRecordModalOpen && (
        <div className="vitals-modal-backdrop" onClick={() => setIsRecordModalOpen(false)}>
          <div className="vitals-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vitals-modal-header">
              <div>
                <h3>Record New Physiological Vitals</h3>
                <p>
                  Telemetry calibration for {activePatient?.name} (ID: {activePatient?.patient_code})
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsRecordModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="modal-validation-error">
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* VOICE DICTATION OPTION */}
            <div className="vitals-voice-dictation-bar">
              <button
                type="button"
                className={`voice-mic-btn ${isVoiceListening ? "listening" : ""}`}
                onClick={handleVoiceInputVitals}
              >
                {isVoiceListening ? <MicOff size={15} /> : <Mic size={15} />}
                <span>{isVoiceListening ? "Listening... (Click to stop)" : "Dictate Vitals by Voice"}</span>
              </button>
              {voiceNotice && <div className="voice-dictation-notice">{voiceNotice}</div>}
            </div>

            <form onSubmit={handleSaveVital}>
              <div className="modal-inputs-grid">
                <div className="input-group">
                  <label>Heart Rate (bpm)*</label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    required
                    placeholder="e.g. 74"
                    value={formData.heart_rate}
                    onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Blood Oxygen SpO₂ (%)*</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    placeholder="e.g. 98"
                    value={formData.spo2}
                    onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Systolic BP (mmHg)*</label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    required
                    placeholder="e.g. 120"
                    value={formData.systolic_bp}
                    onChange={(e) => setFormData({ ...formData, systolic_bp: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Diastolic BP (mmHg)*</label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    required
                    placeholder="e.g. 80"
                    value={formData.diastolic_bp}
                    onChange={(e) => setFormData({ ...formData, diastolic_bp: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Temperature (°C)*</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    required
                    placeholder="e.g. 36.8"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Blood Sugar (mg/dL)*</label>
                  <input
                    type="number"
                    min="20"
                    max="600"
                    required
                    placeholder="e.g. 95"
                    value={formData.blood_sugar}
                    onChange={(e) => setFormData({ ...formData, blood_sugar: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Body Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="300"
                    placeholder="e.g. 72.5"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>

                <div className="input-group full-width">
                  <label>Clinical Notes &amp; Observations</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning baseline monitoring after 15 min seated rest"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="vitals-btn secondary"
                  onClick={() => setIsRecordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vitals-btn primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving Reading…" : "Save Vital Reading"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VITAL MODAL */}
      {isEditModalOpen && activeReading && (
        <div className="vitals-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="vitals-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vitals-modal-header">
              <div>
                <h3>Edit Recorded Vital Signs</h3>
                <p>
                  Reading timestamp:{" "}
                  {new Date(activeReading.recorded_at || activeReading.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="modal-validation-error">
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateVital}>
              <div className="modal-inputs-grid">
                <div className="input-group">
                  <label>Heart Rate (bpm)*</label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    required
                    value={activeReading.heart_rate || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, heart_rate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>SpO₂ Oxygen (%)*</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    value={activeReading.spo2 || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, spo2: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Systolic BP (mmHg)*</label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    required
                    value={activeReading.systolic_bp || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, systolic_bp: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Diastolic BP (mmHg)*</label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    required
                    value={activeReading.diastolic_bp || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, diastolic_bp: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Temperature (°C)*</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    required
                    value={activeReading.temperature || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, temperature: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Blood Sugar (mg/dL)*</label>
                  <input
                    type="number"
                    min="20"
                    max="600"
                    required
                    value={activeReading.blood_sugar || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, blood_sugar: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="300"
                    value={activeReading.weight || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, weight: e.target.value })}
                  />
                </div>

                <div className="input-group full-width">
                  <label>Clinical Notes</label>
                  <input
                    type="text"
                    value={activeReading.notes || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="vitals-btn secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vitals-btn primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {isDetailModalOpen && activeReading && (
        <div className="vitals-modal-backdrop" onClick={() => setIsDetailModalOpen(false)}>
          <div className="vitals-modal-card detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="vitals-modal-header">
              <div>
                <h3>Telemetry Record Inspection</h3>
                <p>
                  {new Date(activeReading.recorded_at || activeReading.created_at).toLocaleString()}{" "}
                  ({timeAgo(activeReading.recorded_at || activeReading.created_at)})
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsDetailModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="dt-lbl">Heart Rate</span>
                <strong className={METRIC_RANGES.hr.classify(activeReading.heart_rate)}>
                  {activeReading.heart_rate} bpm
                </strong>
              </div>
              <div className="detail-item">
                <span className="dt-lbl">Blood Pressure</span>
                <strong
                  className={METRIC_RANGES.bp.classify(
                    activeReading.systolic_bp,
                    activeReading.diastolic_bp
                  )}
                >
                  {activeReading.systolic_bp}/{activeReading.diastolic_bp} mmHg
                </strong>
              </div>
              <div className="detail-item">
                <span className="dt-lbl">Blood Oxygen (SpO₂)</span>
                <strong className={METRIC_RANGES.spo2.classify(activeReading.spo2)}>
                  {activeReading.spo2}%
                </strong>
              </div>
              <div className="detail-item">
                <span className="dt-lbl">Body Temperature</span>
                <strong className={METRIC_RANGES.temp.classify(activeReading.temperature)}>
                  {Number(activeReading.temperature).toFixed(1)}°C
                </strong>
              </div>
              <div className="detail-item">
                <span className="dt-lbl">Blood Sugar</span>
                <strong className={METRIC_RANGES.sugar.classify(activeReading.blood_sugar)}>
                  {activeReading.blood_sugar} mg/dL
                </strong>
              </div>
              <div className="detail-item">
                <span className="dt-lbl">Body Weight</span>
                <strong>{activeReading.weight ? `${activeReading.weight} kg` : "--"}</strong>
              </div>
              <div className="detail-item full-width">
                <span className="dt-lbl">Recorder Staff Member</span>
                <strong>{activeReading.recorded_by_name || "Medical Staff"}</strong>
              </div>
              <div className="detail-item full-width">
                <span className="dt-lbl">Clinical Notes &amp; Observations</span>
                <p className="detail-notes">
                  {activeReading.notes || "No additional clinical notes recorded."}
                </p>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="vitals-btn secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT APPOINTMENTS LIST MODAL */}
      {isAppointmentsModalOpen && (
        <div className="vitals-modal-backdrop" onClick={() => setIsAppointmentsModalOpen(false)}>
          <div className="vitals-modal-card apt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vitals-modal-header">
              <div>
                <h3>Appointments for {activePatient?.name}</h3>
                <p>Patient ID: #{activePatient?.patient_code} · Chronologically sorted (newest first)</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAppointmentsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="apt-modal-search-bar">
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter appointments by date, doctor, reason, status..."
                  value={aptSearch}
                  onChange={(e) => setAptSearch(e.target.value)}
                />
                {aptSearch && (
                  <button type="button" className="clear-search-btn" onClick={() => setAptSearch("")}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="apt-modal-list">
              {aptLoading ? (
                <div className="apt-loading-state">Loading appointments…</div>
              ) : filteredAppointmentsList.length === 0 ? (
                <div className="apt-empty-state">
                  <Calendar size={32} style={{ opacity: 0.4, margin: "0 auto 10px" }} />
                  <p>{aptSearch ? "No appointments found matching your search." : "No appointments booked for this patient yet."}</p>
                </div>
              ) : (
                filteredAppointmentsList.map((apt) => {
                  const stat = (apt.status || apt.approval_status || "PENDING").toUpperCase();
                  const bookedTime = apt.created_at
                    ? new Date(apt.created_at).toLocaleString([], {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Standard booking";

                  return (
                    <div key={apt._id || apt.id || apt.booking_id} className="apt-card-item">
                      <div className="apt-card-top">
                        <div className="apt-date-col">
                          <strong>{apt.appointment_date || "Date scheduled"}</strong>
                          <span>Slot: {apt.appointment_time || "Pending slot"}</span>
                        </div>
                        <span className={`apt-badge ${stat.toLowerCase()}`}>{stat}</span>
                      </div>

                      <div className="apt-card-details">
                        <div className="apt-detail-row">
                          <span className="lbl">Doctor:</span>
                          <strong>{apt.doctor_name || "Specialist Doctor"} ({apt.specialty || "Medicine"})</strong>
                        </div>
                        <div className="apt-detail-row">
                          <span className="lbl">Reason:</span>
                          <span>{apt.reason || "General Consultation"}</span>
                        </div>
                        <div className="apt-detail-row booked-time">
                          <span className="lbl">Booked On:</span>
                          <span className="text-muted">{bookedTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="vitals-btn secondary"
                onClick={() => setIsAppointmentsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT PHOTO EDIT MODAL */}
      <PhotoEditModal
        isOpen={isPatientPhotoModalOpen}
        onClose={() => setIsPatientPhotoModalOpen(false)}
        currentPhoto={activePatient?.avatar || activePatient?.photo}
        onSave={handleSavePatientPhoto}
        title={`Edit Photo for ${activePatient?.name || "Patient"}`}
        subtitle={`Patient ID #${activePatient?.patient_code} · Camera capture or upload (≤ 5MB)`}
      />

      {/* PATIENT DOCUMENTS MANAGEMENT MODAL */}
      <PatientDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        patient={activePatient}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="vitals-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="vitals-modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <Trash2 size={24} />
            </div>
            <h3>Delete Vital Reading?</h3>
            <p>
              Are you sure you want to remove this physiological telemetry record from the patient's
              chart? This action cannot be undone.
            </p>

            <div className="modal-footer-actions" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="vitals-btn secondary"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vitals-btn danger"
                onClick={() => handleDeleteVital(deleteConfirmId)}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && <div className="vitals-toast-banner">{toastMessage}</div>}
    </div>
  );
}