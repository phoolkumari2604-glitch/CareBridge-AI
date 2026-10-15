import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Wind,
  FileText,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  CalendarDays,
  ShieldCheck,
  Plus,
  Clock,
  Stethoscope,
  Info,
  Loader2,
  CheckCircle2,
  X,
  Upload,
  Pill,
  Building,
  Eye,
  Weight,
  Trash2,
  Camera,
  Image as ImageIcon,
  RotateCw,
  RotateCcw,
  Check,
  Download,
  Maximize2,
  CheckSquare,
  Square,
  BarChart2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import AnatomicalHeart3D from "../../components/patient/AnatomicalHeart3D";
import InteractiveBodyMap from "../../components/patient/InteractiveBodyMap";
import "./Health.css";

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ==========================================
// VITAL STATUS & TREND CLINICAL CALCULATORS
// ==========================================
export function computeVitalStatus(key, val, secondaryVal) {
  if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
    return null;
  }
  const num = Number(val);

  switch (key) {
    case "heart_rate":
      if (num < 50 || num > 120) return { label: "Critical", level: "critical" };
      if (num < 60 || num > 100) return { label: "Elevated", level: "elevated" };
      return { label: "Normal", level: "normal" };

    case "blood_pressure": {
      const sbp = num;
      const dbp = secondaryVal != null ? Number(secondaryVal) : null;
      if (sbp >= 140 || (dbp != null && dbp >= 90) || sbp < 90 || (dbp != null && dbp < 60)) {
        return { label: "Critical", level: "critical" };
      }
      if (sbp >= 120 || (dbp != null && dbp >= 80)) {
        return { label: "Elevated", level: "elevated" };
      }
      return { label: "Normal", level: "normal" };
    }

    case "spo2":
      if (num < 90) return { label: "Critical", level: "critical" };
      if (num < 95) return { label: "Elevated", level: "elevated" };
      return { label: "Normal", level: "normal" };

    case "temperature": {
      const t = num > 50 ? (num - 32) * 5 / 9 : num;
      if (t > 38.0 || t < 35.5) return { label: "Critical", level: "critical" };
      if (t > 37.2 || t < 36.1) return { label: "Elevated", level: "elevated" };
      return { label: "Normal", level: "normal" };
    }

    case "blood_sugar":
      if (num >= 200 || num < 70) return { label: "Critical", level: "critical" };
      if (num > 140) return { label: "Elevated", level: "elevated" };
      return { label: "Normal", level: "normal" };

    default:
      return null;
  }
}

export function computeTrend(current, previous, unit) {
  if (current == null || previous == null) {
    if (current != null) return { text: "Baseline", direction: "neutral" };
    return { text: "No reading yet", direction: "none" };
  }
  const diff = Number((current - previous).toFixed(1));
  if (diff > 0) {
    return { text: `+${diff} ${unit}`, direction: "up", diff };
  }
  if (diff < 0) {
    return { text: `${diff} ${unit}`, direction: "down", diff };
  }
  return { text: `0 ${unit}`, direction: "stable", diff: 0 };
}

export function formatRecordedTime(isoString) {
  if (!isoString) return "No reading yet";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "No reading yet";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${timeStr}`;
  } catch {
    return "No reading yet";
  }
}

// Lightweight responsive SVG Sparkline
function Sparkline({ data, statusLevel = "normal", width = 84, height = 28 }) {
  if (!data || data.length < 2) {
    if (data && data.length === 1) {
      return (
        <svg width={width} height={height} className="sparkline-svg">
          <circle cx={width / 2} cy={height / 2} r="3" fill="currentColor" opacity="0.6" />
        </svg>
      );
    }
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * drawWidth;
    const y = height - padding - ((val - min) / range) * drawHeight;
    return { x, y };
  });

  const pathD = `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${height} L ${points[0].x.toFixed(1)},${height} Z`;

  let strokeColor = "#10b981"; // green / normal
  if (statusLevel === "elevated") strokeColor = "#f59e0b"; // amber
  if (statusLevel === "critical") strokeColor = "#ef4444"; // red

  return (
    <svg width={width} height={height} className={`sparkline-svg ${statusLevel}`}>
      <defs>
        <linearGradient id={`grad-${statusLevel}-${width}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${statusLevel}-${width})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={strokeColor} />
    </svg>
  );
}

// Interactive SVG curve for the detail history panel
function DetailHistoryChart({ history, cfg, height = 160 }) {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(a.recorded_at || a.created_at) - new Date(b.recorded_at || b.created_at)
  );

  const values = sorted.map((item) => cfg.extractValue(item)).filter((v) => typeof v === "number");
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const paddingX = 40;
  const paddingY = 24;
  const width = 640;
  const drawWidth = width - paddingX * 2;
  const drawHeight = height - paddingY * 2;
  const range = max - min || 1;

  const points = sorted.map((item, idx) => {
    const val = cfg.extractValue(item);
    const x = values.length === 1 ? width / 2 : paddingX + (idx / (values.length - 1)) * drawWidth;
    const y = height - paddingY - ((val - min) / range) * drawHeight;
    return { x, y, val, date: new Date(item.recorded_at || item.created_at) };
  });

  const pathD = `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${height - paddingY} L ${points[0].x.toFixed(1)},${height - paddingY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="detail-chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="detailChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
      <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
      <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(148,163,184,0.15)" />

      {points.length > 1 && <path d={areaD} fill="url(#detailChartGrad)" />}
      {points.length > 1 && <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {points.map((p, i) => (
        <g key={i} className="chart-point-group">
          <circle cx={p.x} cy={p.y} r={points.length < 15 ? 4 : 2.5} fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
          {points.length <= 10 && (
            <text x={p.x} y={p.y - 8} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">
              {p.val}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Health() {
  const { user } = useAuth();
  const patientId = user?.patient_id || user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vitals, setVitals] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [healthProfile, setHealthProfile] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);

  // Detail History Panel State (Clickable Vital Cards)
  const [selectedVitalKey, setSelectedVitalKey] = useState(null);
  const [detailTimeframe, setDetailTimeframe] = useState("7d"); // "24h", "7d", "30d"

  // Log Vitals Form Modal State
  const [logVitalsModal, setLogVitalsModal] = useState(false);
  const [logVitalsLoading, setLogVitalsLoading] = useState(false);
  const [logVitalsError, setLogVitalsError] = useState(null);
  const [logVitalsForm, setLogVitalsForm] = useState({
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    spo2: "",
    temperature: "",
    blood_sugar: "",
    notes: "",
  });

  // Record Viewer Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Upload Form Modal
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Multi-file upload state in form
  const [recordFiles, setRecordFiles] = useState([]); // [{ file, id, name, size, previewUrl, type }]
  const filePickerRef = useRef(null);
  const mobileCameraRef = useRef(null);

  // Delete & Multi-select State
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [recordToDelete, setRecordToDelete] = useState(null); // single delete confirmation
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  // Camera in Add Record Form
  const [isRecordCameraOpen, setIsRecordCameraOpen] = useState(false);
  const [recordFacingMode, setRecordFacingMode] = useState("environment");
  const [capturedRecordPhoto, setCapturedRecordPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Form Fields
  const [newRecord, setNewRecord] = useState({
    title: "",
    record_type: "LAB_REPORT",
    diagnosis: "",
    description: "",
    medications: "",
    doctor_name: "",
    hospital_name: "CareBridge Medical Center",
    record_date: new Date().toISOString().split("T")[0],
  });

  const fetchHealthData = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        vitalsListRes,
        latestVitalRes,
        profileRes,
        recordsRes,
        alertsRes,
        summaryRes,
      ] = await Promise.allSettled([
        patientService.getVitals(patientId),
        patientService.getLatestVital(patientId),
        patientService.getHealthProfile(patientId),
        patientService.getHealthRecords(patientId),
        patientService.getHealthAlerts(patientId),
        patientService.getAlertSummary(patientId),
      ]);

      let history = [];
      if (vitalsListRes.status === "fulfilled" && Array.isArray(vitalsListRes.value)) {
        history = vitalsListRes.value;
        setVitalsHistory(history);
      }

      if (latestVitalRes.status === "fulfilled" && latestVitalRes.value && Object.keys(latestVitalRes.value).length > 0) {
        setVitals(latestVitalRes.value);
      } else if (history.length > 0) {
        setVitals(history[0]);
      } else {
        setVitals(null);
      }

      if (profileRes.status === "fulfilled") {
        setHealthProfile(profileRes.value);
      }
      if (recordsRes.status === "fulfilled") {
        setHealthRecords(Array.isArray(recordsRes.value) ? recordsRes.value : []);
      }
      if (alertsRes.status === "fulfilled") {
        setAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      }
      if (summaryRes.status === "fulfilled") {
        setAlertSummary(summaryRes.value);
      }
    } catch (err) {
      console.error("Failed to load health telemetry:", err);
      setError("Unable to retrieve physiological telemetry records.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // ==========================================
  // MULTI-FILE UPLOAD HANDLERS
  // ==========================================
  const handleFilesSelected = (files) => {
    setUploadError(null);
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    if (recordFiles.length + incoming.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} attachments allowed per health record.`);
      return;
    }

    const validatedList = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File '${file.name}' exceeds 10 MB limit.`);
        return;
      }
      const isImg = file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : null;

      validatedList.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
      });
    }

    setRecordFiles((prev) => [...prev, ...validatedList]);
  };

  const removeRecordFile = (idToRemove) => {
    setRecordFiles((prev) => {
      const target = prev.find((f) => f.id === idToRemove);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== idToRemove);
    });
  };

  // Drag and Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // ==========================================
  // CAMERA CAPTURE IN RECORD FORM
  // ==========================================
  const startCamera = async (facing = recordFacingMode) => {
    stopCamera();
    setCameraError(null);
    setCapturedRecordPhoto(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in browser settings."
          : "Unable to access camera. On mobile devices, file camera fallback is enabled."
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
    setIsRecordCameraOpen(true);
    startCamera(recordFacingMode);
  };

  const closeCameraModal = () => {
    stopCamera();
    setCapturedRecordPhoto(null);
    setCameraError(null);
    setIsRecordCameraOpen(false);
  };

  const flipCamera = () => {
    const next = recordFacingMode === "user" ? "environment" : "user";
    setRecordFacingMode(next);
    startCamera(next);
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
    setCapturedRecordPhoto(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedRecordPhoto(null);
    startCamera(recordFacingMode);
  };

  const addPhotoToRecord = () => {
    if (!capturedRecordPhoto) return;

    fetch(capturedRecordPhoto)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `medical_scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        handleFilesSelected([file]);
        closeCameraModal();
      })
      .catch((err) => {
        console.error("Error attaching captured photo:", err);
      });
  };

  // ==========================================
  // CREATE / SAVE RECORD
  // ==========================================
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!newRecord.title.trim()) {
      setUploadError("Please enter a record title.");
      return;
    }

    try {
      setUploadLoading(true);
      setUploadProgress(20);
      setUploadError(null);

      const formData = new FormData();
      formData.append("patient_id", patientId);
      formData.append("title", newRecord.title.trim());
      formData.append("record_type", newRecord.record_type);
      formData.append("diagnosis", newRecord.diagnosis.trim());
      formData.append("description", newRecord.description.trim());
      formData.append("notes", newRecord.description.trim());
      formData.append("doctor_name", newRecord.doctor_name.trim() || "Consulting Specialist");
      formData.append("hospital_name", newRecord.hospital_name.trim());
      formData.append("record_date", newRecord.record_date);

      const meds = newRecord.medications
        ? newRecord.medications.split(",").map((m) => m.trim()).filter(Boolean)
        : [];
      meds.forEach((m) => formData.append("medications", m));

      // Append all attached files
      recordFiles.forEach((rf) => {
        formData.append("files", rf.file);
      });

      setUploadProgress(60);
      const res = await patientService.createHealthRecord(formData);
      setUploadProgress(100);

      const created = res.record || res.item || {
        _id: res.record_id,
        ...newRecord,
        medications: meds,
        attachments: recordFiles.map((rf) => ({
          file_name: rf.name,
          file_url: rf.previewUrl,
          size_bytes: rf.size,
        })),
        created_at: new Date().toISOString(),
      };

      setHealthRecords((prev) => [created, ...prev]);
      showToast("Health record and attached documents saved successfully.");

      // Reset
      setUploadModal(false);
      setRecordFiles([]);
      setNewRecord({
        title: "",
        record_type: "LAB_REPORT",
        diagnosis: "",
        description: "",
        medications: "",
        doctor_name: "",
        hospital_name: "CareBridge Medical Center",
        record_date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Failed to upload record:", err);
      setUploadError(err.response?.data?.detail || "Failed to save health record. Please try again.");
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  // ==========================================
  // DELETE & MULTI-SELECT HANDLERS
  // ==========================================
  const handleDeleteSingle = async () => {
    if (!recordToDelete) return;
    const rId = recordToDelete._id || recordToDelete.id;

    try {
      await patientService.deleteHealthRecord(rId);
      setHealthRecords((prev) => prev.filter((r) => (r._id || r.id) !== rId));
      setSelectedRecordIds((prev) => prev.filter((id) => id !== rId));
      showToast("Health record and attached files permanently deleted.");
      setRecordToDelete(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err.response?.data?.detail || "Failed to delete record.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecordIds.length === 0) return;

    try {
      await patientService.deleteHealthRecordsBatch(selectedRecordIds);
      setHealthRecords((prev) => prev.filter((r) => !selectedRecordIds.includes(r._id || r.id)));
      showToast(`Successfully deleted ${selectedRecordIds.length} health record(s).`);
      setSelectedRecordIds([]);
      setBatchDeleteConfirm(false);
    } catch (err) {
      console.error("Batch delete failed:", err);
      alert("Failed to delete selected records.");
    }
  };

  const toggleSelectRecord = (id) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecordIds.length === healthRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(healthRecords.map((r) => r._id || r.id));
    }
  };

  // Status computation
  const isAlert = alertSummary?.status === "ALERT" || alerts.some((a) => (a.severity || "").toUpperCase() === "CRITICAL");

  // Real readings extraction
  const latestVital = vitalsHistory.length > 0 ? vitalsHistory[0] : vitals;
  const prevVital = vitalsHistory.length > 1 ? vitalsHistory[1] : null;

  // Real Database-driven Vitals Array (No mock fallbacks, dynamic badges)
  const vitalsList = [
    {
      key: "heart_rate",
      label: "Heart Rate",
      value: latestVital?.heart_rate != null ? `${latestVital.heart_rate}` : "--",
      unit: "BPM",
      recordedTime: latestVital?.recorded_at ? formatRecordedTime(latestVital.recorded_at) : "No reading yet",
      status: latestVital?.heart_rate != null ? computeVitalStatus("heart_rate", latestVital.heart_rate) : null,
      trend: computeTrend(latestVital?.heart_rate, prevVital?.heart_rate, "BPM"),
      sparklineData: vitalsHistory.slice(0, 10).reverse().map((v) => v.heart_rate).filter((v) => v != null),
      icon: HeartPulse,
      className: "hr-card",
    },
    {
      key: "blood_pressure",
      label: "Blood Pressure",
      value:
        latestVital?.systolic_bp != null && latestVital?.diastolic_bp != null
          ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}`
          : latestVital?.systolic_bp != null
          ? `${latestVital.systolic_bp}`
          : "--",
      unit: "mmHg",
      recordedTime: latestVital?.recorded_at ? formatRecordedTime(latestVital.recorded_at) : "No reading yet",
      status:
        latestVital?.systolic_bp != null
          ? computeVitalStatus("blood_pressure", latestVital.systolic_bp, latestVital?.diastolic_bp)
          : null,
      trend: computeTrend(latestVital?.systolic_bp, prevVital?.systolic_bp, "mmHg"),
      sparklineData: vitalsHistory.slice(0, 10).reverse().map((v) => v.systolic_bp).filter((v) => v != null),
      icon: Activity,
      className: "bp-card",
    },
    {
      key: "spo2",
      label: "Blood Oxygen (SpO2)",
      value: latestVital?.spo2 != null ? `${latestVital.spo2}` : "--",
      unit: "%",
      recordedTime: latestVital?.recorded_at ? formatRecordedTime(latestVital.recorded_at) : "No reading yet",
      status: latestVital?.spo2 != null ? computeVitalStatus("spo2", latestVital.spo2) : null,
      trend: computeTrend(latestVital?.spo2, prevVital?.spo2, "%"),
      sparklineData: vitalsHistory.slice(0, 10).reverse().map((v) => v.spo2).filter((v) => v != null),
      icon: Wind,
      className: "spo2-card",
    },
    {
      key: "temperature",
      label: "Body Temperature",
      value: latestVital?.temperature != null ? `${latestVital.temperature}` : "--",
      unit: "°C",
      recordedTime: latestVital?.recorded_at ? formatRecordedTime(latestVital.recorded_at) : "No reading yet",
      status: latestVital?.temperature != null ? computeVitalStatus("temperature", latestVital.temperature) : null,
      trend: computeTrend(latestVital?.temperature, prevVital?.temperature, "°C"),
      sparklineData: vitalsHistory.slice(0, 10).reverse().map((v) => v.temperature).filter((v) => v != null),
      icon: Thermometer,
      className: "temp-card",
    },
    {
      key: "blood_sugar",
      label: "Blood Glucose",
      value: latestVital?.blood_sugar != null ? `${latestVital.blood_sugar}` : "--",
      unit: "mg/dL",
      recordedTime: latestVital?.recorded_at ? formatRecordedTime(latestVital.recorded_at) : "No reading yet",
      status: latestVital?.blood_sugar != null ? computeVitalStatus("blood_sugar", latestVital.blood_sugar) : null,
      trend: computeTrend(latestVital?.blood_sugar, prevVital?.blood_sugar, "mg/dL"),
      sparklineData: vitalsHistory.slice(0, 10).reverse().map((v) => v.blood_sugar).filter((v) => v != null),
      icon: Droplets,
      className: "sugar-card",
    },
  ];

  // Vital Details modal configuration
  const vitalDetailsConfig = {
    heart_rate: {
      title: "Heart Rate Telemetry",
      unit: "BPM",
      icon: HeartPulse,
      description: "Continuous pulse and cardiac electrical frequency monitoring.",
      safeRange: "60–100 BPM",
      extractValue: (v) => v.heart_rate,
      formatVal: (val) => `${val} BPM`,
      getStatus: (val) => computeVitalStatus("heart_rate", val),
    },
    blood_pressure: {
      title: "Blood Pressure Hemodynamics",
      unit: "mmHg",
      icon: Activity,
      description: "Arterial vascular pressure measurements (Systolic / Diastolic).",
      safeRange: "< 120/80 mmHg",
      extractValue: (v) => v.systolic_bp,
      formatVal: (val, v) => (v?.diastolic_bp != null ? `${val}/${v.diastolic_bp} mmHg` : `${val} mmHg`),
      getStatus: (val, v) => computeVitalStatus("blood_pressure", val, v?.diastolic_bp),
    },
    spo2: {
      title: "Blood Oxygen (SpO₂)",
      unit: "%",
      icon: Wind,
      description: "Peripheral blood oxygenation and capillary hemoglobin saturation.",
      safeRange: "95–100%",
      extractValue: (v) => v.spo2,
      formatVal: (val) => `${val}%`,
      getStatus: (val) => computeVitalStatus("spo2", val),
    },
    temperature: {
      title: "Core Body Temperature",
      unit: "°C",
      icon: Thermometer,
      description: "Core physiological thermal homeostasis tracking.",
      safeRange: "36.1–37.2 °C",
      extractValue: (v) => v.temperature,
      formatVal: (val) => `${val} °C`,
      getStatus: (val) => computeVitalStatus("temperature", val),
    },
    blood_sugar: {
      title: "Blood Glucose Concentration",
      unit: "mg/dL",
      icon: Droplets,
      description: "Serum glucose levels (fasting and postprandial glycemic index).",
      safeRange: "70–140 mg/dL",
      extractValue: (v) => v.blood_sugar,
      formatVal: (val) => `${val} mg/dL`,
      getStatus: (val) => computeVitalStatus("blood_sugar", val),
    },
  };

  // Filtered History for Active Detail Modal
  const activeDetailHistory = useMemo(() => {
    if (!selectedVitalKey) return [];
    const cfg = vitalDetailsConfig[selectedVitalKey];
    if (!cfg) return [];

    const now = new Date();
    const cutoff = new Date(now);
    if (detailTimeframe === "24h") {
      cutoff.setHours(cutoff.getHours() - 24);
    } else if (detailTimeframe === "7d") {
      cutoff.setDate(cutoff.getDate() - 7);
    } else {
      cutoff.setDate(cutoff.getDate() - 30);
    }

    return vitalsHistory.filter((v) => {
      const recDate = new Date(v.recorded_at || v.created_at);
      return recDate >= cutoff && cfg.extractValue(v) != null;
    });
  }, [selectedVitalKey, vitalsHistory, detailTimeframe]);

  // Summary Metrics for the Detail Panel
  const activeDetailMetrics = useMemo(() => {
    if (!selectedVitalKey || activeDetailHistory.length === 0) return null;
    const cfg = vitalDetailsConfig[selectedVitalKey];
    const vals = activeDetailHistory.map((v) => cfg.extractValue(v)).filter((v) => typeof v === "number");
    if (vals.length === 0) return null;

    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;

    return { max, min, avg, count: vals.length };
  }, [selectedVitalKey, activeDetailHistory]);

  // Log Vitals Modal Handlers
  const openLogVitalsModal = (focusVitalKey = null) => {
    setLogVitalsError(null);
    setLogVitalsForm({
      heart_rate: "",
      systolic_bp: "",
      diastolic_bp: "",
      spo2: "",
      temperature: "",
      blood_sugar: "",
      notes: focusVitalKey ? `Routine check for ${vitalDetailsConfig[focusVitalKey]?.title || "telemetry"}` : "",
    });
    setLogVitalsModal(true);
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    setLogVitalsError(null);

    const { heart_rate, systolic_bp, diastolic_bp, spo2, temperature, blood_sugar, notes } = logVitalsForm;

    const hasAny = [heart_rate, systolic_bp, diastolic_bp, spo2, temperature, blood_sugar].some(
      (v) => v !== "" && v !== null && v !== undefined
    );
    if (!hasAny) {
      setLogVitalsError("Please enter at least one physiological vital measurement.");
      return;
    }

    // Range Validations
    if (heart_rate !== "") {
      const hr = Number(heart_rate);
      if (isNaN(hr) || hr < 20 || hr > 260) {
        setLogVitalsError("Heart rate must be between 20 and 260 BPM.");
        return;
      }
    }

    if (systolic_bp !== "") {
      const sbp = Number(systolic_bp);
      if (isNaN(sbp) || sbp < 40 || sbp > 320) {
        setLogVitalsError("Systolic BP must be between 40 and 320 mmHg.");
        return;
      }
    }

    if (diastolic_bp !== "") {
      const dbp = Number(diastolic_bp);
      if (isNaN(dbp) || dbp < 20 || dbp > 220) {
        setLogVitalsError("Diastolic BP must be between 20 and 220 mmHg.");
        return;
      }
    }

    if (systolic_bp !== "" && diastolic_bp !== "") {
      if (Number(systolic_bp) <= Number(diastolic_bp)) {
        setLogVitalsError(
          `Systolic pressure (${systolic_bp} mmHg) must be higher than diastolic pressure (${diastolic_bp} mmHg).`
        );
        return;
      }
    }

    if (spo2 !== "") {
      const s = Number(spo2);
      if (isNaN(s) || s < 40 || s > 100) {
        setLogVitalsError("Blood Oxygen (SpO₂) must be between 40% and 100%.");
        return;
      }
    }

    if (temperature !== "") {
      const t = Number(temperature);
      if (isNaN(t) || t < 28.0 || t > 46.0) {
        setLogVitalsError("Body Temperature must be between 28.0°C and 46.0°C.");
        return;
      }
    }

    if (blood_sugar !== "") {
      const bs = Number(blood_sugar);
      if (isNaN(bs) || bs < 10 || bs > 700) {
        setLogVitalsError("Blood Glucose must be between 10 and 700 mg/dL.");
        return;
      }
    }

    try {
      setLogVitalsLoading(true);
      const payload = {
        patient_id: patientId,
        recorded_at: new Date().toISOString(),
        notes: notes.trim(),
      };
      if (heart_rate !== "") payload.heart_rate = Number(heart_rate);
      if (systolic_bp !== "") payload.systolic_bp = Number(systolic_bp);
      if (diastolic_bp !== "") payload.diastolic_bp = Number(diastolic_bp);
      if (spo2 !== "") payload.spo2 = Number(spo2);
      if (temperature !== "") payload.temperature = Number(temperature);
      if (blood_sugar !== "") payload.blood_sugar = Number(blood_sugar);

      const res = await patientService.logVitals(payload);

      // Instantly update local state with returned vital
      const savedVital = res.vital || { ...payload, created_at: new Date().toISOString() };
      setVitals(savedVital);
      setVitalsHistory((prev) => [savedVital, ...prev]);

      // Re-fetch alerts and summary to reflect safety thresholds
      const [alertsRes, summaryRes] = await Promise.allSettled([
        patientService.getHealthAlerts(patientId),
        patientService.getAlertSummary(patientId),
      ]);
      if (alertsRes.status === "fulfilled") {
        setAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      }
      if (summaryRes.status === "fulfilled") {
        setAlertSummary(summaryRes.value);
      }

      setLogVitalsModal(false);
      showToast(
        res.alerts_count > 0
          ? `Vitals recorded. ${res.alerts_count} abnormal physiological parameter(s) flagged and clinical team notified.`
          : "Vital signs recorded successfully. Physiological cards updated."
      );
    } catch (err) {
      console.error("Failed to log vitals:", err);
      setLogVitalsError(err.response?.data?.detail || "Failed to record vital signs. Please try again.");
    } finally {
      setLogVitalsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="health-loading">
        <Loader2 size={36} className="spinner-icon" />
        <p>Retrieving real-time physiological telemetry and health records...</p>
      </div>
    );
  }

  return (
    <div className="health-page">
      {/* VITAL DETAIL & HISTORICAL TRAJECTORY PANEL */}
      {selectedVitalKey && vitalDetailsConfig[selectedVitalKey] && (() => {
        const cfg = vitalDetailsConfig[selectedVitalKey];
        const Icon = cfg.icon;
        const curVitalItem = vitalsList.find((v) => v.key === selectedVitalKey);

        return (
          <div className="health-modal-backdrop" onClick={() => setSelectedVitalKey(null)}>
            <div className="health-modal-card vital-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="health-modal-header">
                <div className="modal-title">
                  <div className="detail-header-icon" style={{ color: cfg.color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <span className="detail-modal-title">{cfg.title}</span>
                    <span className="detail-modal-sub">{cfg.description}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVitalKey(null)}
                  className="modal-close-btn"
                  aria-label="Close detail panel"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CURRENT STAT & TIMEFRAME SELECTOR */}
              <div className="vital-detail-top-strip">
                <div className="detail-current-reading">
                  <span className="reading-kicker">LATEST READING</span>
                  <div className="detail-value-wrap">
                    <span className="detail-large-num">{curVitalItem?.value || "--"}</span>
                    <span className="detail-unit">{cfg.unit}</span>
                    {curVitalItem?.status && (
                      <span className={`vital-status-pill ${curVitalItem.status.level}`}>
                        {curVitalItem.status.label}
                      </span>
                    )}
                  </div>
                  <span className="detail-recorded-at">
                    <Clock size={12} /> {curVitalItem?.recordedTime}
                  </span>
                </div>

                <div className="detail-timeframe-box">
                  <span className="reading-kicker">TIMEFRAME</span>
                  <div className="timeframe-buttons">
                    {["24h", "7d", "30d"].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        className={`tf-btn ${detailTimeframe === tf ? "active" : ""}`}
                        onClick={() => setDetailTimeframe(tf)}
                      >
                        {tf === "24h" ? "24 Hours" : tf === "7d" ? "7 Days" : "30 Days"}
                      </button>
                    ))}
                  </div>
                  <span className="safe-range-hint">Safe Range: <strong>{cfg.safeRange}</strong></span>
                </div>
              </div>

              {/* TIMEFRAME METRICS */}
              {activeDetailMetrics && (
                <div className="detail-metrics-row">
                  <div className="metric-pill">
                    <span className="metric-label">Peak</span>
                    <strong className="metric-val">{cfg.formatVal(activeDetailMetrics.max)}</strong>
                  </div>
                  <div className="metric-pill">
                    <span className="metric-label">Lowest</span>
                    <strong className="metric-val">{cfg.formatVal(activeDetailMetrics.min)}</strong>
                  </div>
                  <div className="metric-pill">
                    <span className="metric-label">Average</span>
                    <strong className="metric-val">{cfg.formatVal(activeDetailMetrics.avg)}</strong>
                  </div>
                  <div className="metric-pill">
                    <span className="metric-label">Readings</span>
                    <strong className="metric-val">{activeDetailMetrics.count}</strong>
                  </div>
                </div>
              )}

              {/* DETAILED SVG CURVE */}
              <div className="detail-chart-wrapper">
                <div className="detail-chart-header">
                  <span className="chart-title">
                    Historical Trajectory ({detailTimeframe === "24h" ? "Last 24 Hours" : detailTimeframe === "7d" ? "Last 7 Days" : "Last 30 Days"})
                  </span>
                </div>
                {activeDetailHistory.length > 0 ? (
                  <div className="detail-svg-container">
                    <DetailHistoryChart history={activeDetailHistory} cfg={cfg} />
                  </div>
                ) : (
                  <div className="chart-empty-state">
                    <Info size={18} />
                    <span>No readings recorded in the selected {detailTimeframe === "24h" ? "24 hours" : detailTimeframe === "7d" ? "7 days" : "30 days"}.</span>
                  </div>
                )}
              </div>

              {/* READINGS TABLE */}
              <div className="detail-readings-table-wrap">
                <span className="readings-table-title">Telemetry Recordings</span>
                {activeDetailHistory.length === 0 ? (
                  <p className="no-table-records">No historical records available for this interval.</p>
                ) : (
                  <div className="detail-table-scroll">
                    <table className="detail-readings-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Recorded Value</th>
                          <th>Status</th>
                          <th>Provider / Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDetailHistory.map((item, idx) => {
                          const val = cfg.extractValue(item);
                          const status = cfg.getStatus(val, item);
                          return (
                            <tr key={item._id || item.id || idx}>
                              <td>
                                {new Date(item.recorded_at || item.created_at).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td className="table-val-cell">{cfg.formatVal(val, item)}</td>
                              <td>
                                {status ? (
                                  <span className={`vital-status-pill ${status.level}`}>
                                    {status.label}
                                  </span>
                                ) : (
                                  <span className="vital-status-pill neutral">Recorded</span>
                                )}
                              </td>
                              <td className="table-notes-cell">
                                {item.notes || item.recorded_by_name || "Continuous Telemetry"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="vital-detail-footer">
                <button
                  type="button"
                  onClick={() => {
                    const k = selectedVitalKey;
                    setSelectedVitalKey(null);
                    openLogVitalsModal(k);
                  }}
                  className="btn-log-reading"
                >
                  <Plus size={15} /> Log Reading
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVitalKey(null)}
                  className="btn-cancel"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LOG VITALS FORM MODAL */}
      {logVitalsModal && (
        <div className="health-modal-backdrop" onClick={() => setLogVitalsModal(false)}>
          <div className="health-modal-card log-vitals-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <HeartPulse size={20} className="text-teal" />
                <div>
                  <span className="log-vitals-heading">Log Physiological Vitals</span>
                  <span className="log-vitals-sub">Record current readings. Safety thresholds are evaluated instantly.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogVitalsModal(false)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="log-vitals-form">
              {logVitalsError && (
                <div className="upload-error-banner">
                  <AlertCircle size={16} />
                  <span>{logVitalsError}</span>
                </div>
              )}

              <div className="log-vitals-grid">
                <div className="form-group">
                  <label>Heart Rate</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="e.g. 74"
                      min="20"
                      max="260"
                      value={logVitalsForm.heart_rate}
                      onChange={(e) => setLogVitalsForm({ ...logVitalsForm, heart_rate: e.target.value })}
                    />
                    <span className="unit-badge">BPM</span>
                  </div>
                  <span className="input-hint">Safe: 60–100 BPM</span>
                </div>

                <div className="form-group">
                  <label>Systolic BP</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="e.g. 120"
                      min="40"
                      max="320"
                      value={logVitalsForm.systolic_bp}
                      onChange={(e) => setLogVitalsForm({ ...logVitalsForm, systolic_bp: e.target.value })}
                    />
                    <span className="unit-badge">mmHg</span>
                  </div>
                  <span className="input-hint">Safe: 90–120 mmHg</span>
                </div>

                <div className="form-group">
                  <label>Diastolic BP</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      min="20"
                      max="220"
                      value={logVitalsForm.diastolic_bp}
                      onChange={(e) => setLogVitalsForm({ ...logVitalsForm, diastolic_bp: e.target.value })}
                    />
                    <span className="unit-badge">mmHg</span>
                  </div>
                  <span className="input-hint">Safe: 60–80 mmHg</span>
                </div>

                <div className="form-group">
                  <label>Blood Oxygen (SpO₂)</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="e.g. 98"
                      min="40"
                      max="100"
                      step="0.1"
                      value={logVitalsForm.spo2}
                      onChange={(e) => setLogVitalsForm({ ...logVitalsForm, spo2: e.target.value })}
                    />
                    <span className="unit-badge">%</span>
                  </div>
                  <span className="input-hint">Safe: 95–100%</span>
                </div>

                <div className="form-group">
                  <label>Body Temperature</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="e.g. 36.8"
                      min="28.0"
                      max="46.0"
                      step="0.1"
                      value={logVitalsForm.temperature}
                      onChange={(e) => setLogVitalsForm({ ...logVitalsForm, temperature: e.target.value })}
                    />
                    <span className="unit-badge">°C</span>
                  </div>
                  <span className="input-hint">Safe: 36.1–37.2 °C</span>
                </div>

                <div className="form-group">
                  <label>Blood Glucose</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="e.g. 95"
                      min="10"
                      max="700"
                      value={logVitalsForm.blood_sugar}
                      onChange={(e) => setLogVitalsForm({ ...logVitalsForm, blood_sugar: e.target.value })}
                    />
                    <span className="unit-badge">mg/dL</span>
                  </div>
                  <span className="input-hint">Safe: 70–140 mg/dL</span>
                </div>
              </div>

              <div className="form-group">
                <label>Clinical Notes / Context</label>
                <input
                  type="text"
                  placeholder="e.g. Resting morning reading, post-meal check, routine screening"
                  value={logVitalsForm.notes}
                  onChange={(e) => setLogVitalsForm({ ...logVitalsForm, notes: e.target.value })}
                />
              </div>

              <div className="safety-alert-notice">
                <AlertTriangle size={15} />
                <span>Values outside configured safe thresholds automatically raise alerts and alert the attending doctor.</span>
              </div>

              <div className="health-modal-actions">
                <button type="button" onClick={() => setLogVitalsModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={logVitalsLoading} className="btn-save-record">
                  {logVitalsLoading ? <Loader2 size={16} className="spinner-icon" /> : <Check size={16} />}
                  <span>{logVitalsLoading ? "Validating & Recording..." : "Save Vitals"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SINGLE RECORD MODAL */}
      {recordToDelete && (
        <div className="health-modal-backdrop" onClick={() => setRecordToDelete(null)}>
          <div className="health-modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon red">
              <Trash2 size={24} />
            </div>
            <h3>Delete Health Record?</h3>
            <p>
              Are you sure you want to delete <strong>"{recordToDelete.title}"</strong>? All associated files and clinical attachments will be permanently removed from secure storage.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setRecordToDelete(null)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleDeleteSingle} className="btn-danger-confirm">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {batchDeleteConfirm && (
        <div className="health-modal-backdrop" onClick={() => setBatchDeleteConfirm(false)}>
          <div className="health-modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon red">
              <Trash2 size={24} />
            </div>
            <h3>Delete {selectedRecordIds.length} Selected Records?</h3>
            <p>
              This action cannot be undone. All selected records and attached files will be permanently purged.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setBatchDeleteConfirm(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleBatchDelete} className="btn-danger-confirm">
                Delete {selectedRecordIds.length} Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD DETAIL & ATTACHMENT VIEWER MODAL */}
      {selectedRecord && (
        <div className="health-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="health-modal-card record-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <FileText size={18} />
                <span>{selectedRecord.title}</span>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="record-detail-body">
              <div className="record-meta-grid">
                <div>
                  <span>Record Type:</span>
                  <strong>{selectedRecord.record_type || "Consultation"}</strong>
                </div>
                <div>
                  <span>Date:</span>
                  <strong>{selectedRecord.record_date || new Date(selectedRecord.created_at).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span>Doctor:</span>
                  <strong>{selectedRecord.doctor_name || "Consulting Specialist"}</strong>
                </div>
                <div>
                  <span>Facility:</span>
                  <strong>{selectedRecord.hospital_name || "CareBridge Medical"}</strong>
                </div>
              </div>

              {selectedRecord.diagnosis && (
                <div className="record-section-box">
                  <span>Clinical Diagnosis:</span>
                  <p>{selectedRecord.diagnosis}</p>
                </div>
              )}

              {selectedRecord.description && (
                <div className="record-section-box">
                  <span>Clinical Observations & Notes:</span>
                  <p>{selectedRecord.description}</p>
                </div>
              )}

              {/* ATTACHMENTS VIEWER */}
              {((selectedRecord.attachments && selectedRecord.attachments.length > 0) || selectedRecord.file_url) && (
                <div className="record-attachments-section">
                  <span>Attached Medical Scans & Documents:</span>
                  <div className="record-att-grid">
                    {selectedRecord.attachments?.map((att, idx) => {
                      const isImg = att.file_url?.match(/\.(jpg|jpeg|png|webp)/i);
                      return (
                        <div key={idx} className="att-viewer-card">
                          {isImg ? (
                            <img src={att.file_url} alt={att.file_name} className="att-preview-img" />
                          ) : (
                            <div className="att-pdf-placeholder">
                              <FileText size={28} />
                              <small>PDF / Document</small>
                            </div>
                          )}
                          <div className="att-info-strip">
                            <span className="att-name">{att.file_name}</span>
                            <a
                              href={att.file_url}
                              download={att.file_name}
                              target="_blank"
                              rel="noreferrer"
                              className="att-dl-btn"
                              title="Download file"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })}

                    {/* Legacy single file */}
                    {!selectedRecord.attachments?.length && selectedRecord.file_url && (
                      <div className="att-viewer-card">
                        <div className="att-pdf-placeholder">
                          <FileText size={28} />
                          <small>Document</small>
                        </div>
                        <div className="att-info-strip">
                          <span className="att-name">{selectedRecord.file_name || "medical_record.pdf"}</span>
                          <a href={selectedRecord.file_url} download target="_blank" rel="noreferrer" className="att-dl-btn">
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL (RECORD FORM) */}
      {isRecordCameraOpen && (
        <div className="health-modal-backdrop">
          <div className="health-modal-card camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <Camera size={18} />
                <span>Capture Medical Document or Symptom</span>
              </div>
              <button onClick={closeCameraModal} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="camera-viewport">
              {cameraError ? (
                <div className="camera-error-box">
                  <AlertTriangle size={32} />
                  <p>{cameraError}</p>
                  <button onClick={() => mobileCameraRef.current?.click()} className="btn-fallback-cam">
                    <Camera size={14} /> Use Device Camera
                  </button>
                </div>
              ) : capturedRecordPhoto ? (
                <img src={capturedRecordPhoto} alt="Captured photo" className="camera-preview-img" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="camera-video-feed" />
              )}
            </div>

            <div className="camera-footer">
              {!capturedRecordPhoto && !cameraError && (
                <>
                  <button type="button" onClick={flipCamera} className="cam-tool-btn">
                    <RotateCw size={15} /> Flip
                  </button>
                  <button type="button" onClick={takeSnapshot} className="cam-capture-btn">
                    <div className="capture-inner" />
                  </button>
                  <button type="button" onClick={() => mobileCameraRef.current?.click()} className="cam-tool-btn">
                    <ImageIcon size={15} /> Files
                  </button>
                </>
              )}

              {capturedRecordPhoto && (
                <>
                  <button type="button" onClick={retakePhoto} className="btn-cancel">
                    <RotateCcw size={14} /> Retake
                  </button>
                  <button type="button" onClick={addPhotoToRecord} className="btn-save-record">
                    <Check size={14} /> Add to Record
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD HEALTH RECORD MODAL */}
      {uploadModal && (
        <div className="health-modal-backdrop" onClick={() => setUploadModal(false)}>
          <div className="health-modal-card add-record-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <Plus size={18} />
                <span>Add Medical Health Record</span>
              </div>
              <button onClick={() => setUploadModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="add-record-form" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
              {uploadError && (
                <div className="upload-error-banner">
                  <AlertCircle size={15} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Record Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Comprehensive Lipid Panel & Blood Count"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Record Category</label>
                  <select
                    value={newRecord.record_type}
                    onChange={(e) => setNewRecord({ ...newRecord, record_type: e.target.value })}
                  >
                    <option value="LAB_REPORT">Lab Report</option>
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="SCAN">Scan / Radiology / Imaging</option>
                    <option value="CONSULTATION">Consultation Note</option>
                    <option value="CHECKUP">Routine Checkup Report</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Consulting Doctor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Priya Sharma"
                    value={newRecord.doctor_name}
                    onChange={(e) => setNewRecord({ ...newRecord, doctor_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hospital / Clinic Facility</label>
                  <input
                    type="text"
                    placeholder="e.g. CareBridge Medical Center"
                    value={newRecord.hospital_name}
                    onChange={(e) => setNewRecord({ ...newRecord, hospital_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Diagnosis / Clinical Impression</label>
                  <input
                    type="text"
                    placeholder="e.g. Stage 1 Essential Hypertension"
                    value={newRecord.diagnosis}
                    onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Record Date</label>
                  <input
                    type="date"
                    value={newRecord.record_date}
                    onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes & Clinical Findings</label>
                <textarea
                  rows="2"
                  placeholder="Physician notes, lab values, observations, follow-up instructions..."
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                />
              </div>

              {/* ATTACHMENT DROPZONE & CAMERA BUTTON */}
              <div className="form-attachments-zone">
                <label>Attached Documents & Scans (Max {MAX_FILES} files, up to 10 MB each)</label>

                <input
                  type="file"
                  ref={filePickerRef}
                  style={{ display: "none" }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                <input
                  type="file"
                  ref={mobileCameraRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                <div className="dropzone-buttons-row">
                  <button
                    type="button"
                    onClick={() => filePickerRef.current?.click()}
                    className="dz-action-btn"
                  >
                    <Upload size={15} /> Select Files (PDF, PNG, JPG)
                  </button>

                  <button
                    type="button"
                    onClick={openCameraModal}
                    className="dz-action-btn camera"
                  >
                    <Camera size={15} /> Take Photo of Document
                  </button>
                </div>

                {/* ATTACHED FILES LIST */}
                {recordFiles.length > 0 && (
                  <div className="attached-files-list">
                    {recordFiles.map((rf) => (
                      <div key={rf.id} className="attached-file-chip">
                        {rf.previewUrl ? (
                          <img src={rf.previewUrl} alt={rf.name} className="rf-thumb" />
                        ) : (
                          <FileText size={20} className="rf-icon" />
                        )}
                        <div className="rf-details">
                          <span className="rf-name">{rf.name}</span>
                          <small className="rf-size">{(rf.size / (1024 * 1024)).toFixed(2)} MB</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecordFile(rf.id)}
                          className="rf-remove-btn"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploadProgress > 0 && (
                <div className="upload-progress-bar-wrap">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <div className="health-modal-actions">
                <button type="button" onClick={() => setUploadModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={uploadLoading} className="btn-save-record">
                  {uploadLoading ? <Loader2 size={16} className="spinner-icon" /> : <Check size={16} />}
                  <span>{uploadLoading ? "Uploading & Encrypting..." : "Save Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAGE HEADER - WCAG AA HIGH CONTRAST */}
      <div className="health-header">
        <div>
          <span className="health-kicker">CLINICAL TELEMETRY & DOSSIER</span>
          <h1 className="health-main-title">My Health Application</h1>
          <p className="health-main-subtitle">
            Continuous physiological vital-signs telemetry, 3D biomechanical cardiac models, and encrypted EHR records.
          </p>
        </div>

        <div className="health-header-actions">
          <button className="health-add-btn" onClick={() => setUploadModal(true)}>
            <Plus size={16} />
            <span>Add Record</span>
          </button>

          <Link to="/patient/ai-assistant" className="health-assistant-btn">
            <Activity size={16} />
            <span>Consult AI</span>
          </Link>
        </div>
      </div>

      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="health-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* OVERALL HEALTH STATUS CARD */}
      <section className={`health-status-card ${isAlert ? "alert-mode" : ""}`}>
        <div className="health-status-icon">
          {isAlert ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
        </div>

        <div className="health-status-content">
          <span>CLINICAL TRIAGE STATUS</span>
          <h2>{isAlert ? "Attention Recommended" : "Vitals are Stable & Normal"}</h2>
          <p>
            {alertSummary?.message ||
              (isAlert
                ? "Some recorded parameters fall outside standard physiological thresholds. Review active alerts below."
                : "All recent vital sign measurements are within configured safe healthcare parameters.")}
          </p>
        </div>

        <div className="health-status-date">
          <CalendarDays size={15} />
          {vitals?.recorded_at
            ? `Synced ${new Date(vitals.recorded_at).toLocaleDateString()}`
            : "Telemetry Active"}
        </div>
      </section>

      {/* 3D ANATOMICAL HEART VISUALIZATION */}
      <AnatomicalHeart3D
        heartRate={vitals?.heart_rate || 72}
        isAbnormal={vitals?.heart_rate ? vitals.heart_rate > 100 || vitals.heart_rate < 55 : false}
        status={alertSummary?.status || "NORMAL"}
      />

      {/* INTERACTIVE BODY MAP */}
      <InteractiveBodyMap vitals={vitals} healthProfile={healthProfile} alerts={alerts} />

      {/* VITALS GRID */}
      <section className="health-section">
        <div className="health-section-heading">
          <div>
            <span className="heading-kicker">PHYSIOLOGICAL TELEMETRY</span>
            <h2 className="heading-title">Latest Recorded Vitals</h2>
          </div>
          <div className="vitals-header-right">
            {vitals?.recorded_at && (
              <span className="last-sync-tag">
                <Clock size={13} />
                <span>{formatRecordedTime(vitals.recorded_at)}</span>
              </span>
            )}
            <button
              type="button"
              className="health-log-vitals-btn"
              onClick={() => openLogVitalsModal()}
              title="Record new physiological vitals"
            >
              <Plus size={14} />
              <span>Log Vitals</span>
            </button>
          </div>
        </div>

        <div className="vitals-grid">
          {vitalsList.map((vital) => {
            const Icon = vital.icon;
            const isAbnormal = vital.status?.level === "critical" || vital.status?.level === "elevated";

            return (
              <div
                className={`vital-card ${vital.className} ${vital.status ? `status-${vital.status.level}` : "no-reading"} ${
                  isAbnormal ? "vital-alert" : ""
                }`}
                key={vital.key}
                onClick={() => setSelectedVitalKey(vital.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedVitalKey(vital.key);
                  }
                }}
                title={`Click to view ${vital.label} detailed history and log readings`}
              >
                <div className="vital-top">
                  <div className="vital-icon">
                    <Icon size={18} />
                  </div>
                  {vital.status && (
                    <span className={`vital-status-pill ${vital.status.level}`}>
                      {vital.status.label}
                    </span>
                  )}
                </div>

                <span className="vital-label">{vital.label}</span>
                <span className="vital-time">
                  <Clock size={11} /> {vital.recordedTime}
                </span>

                <div className="vital-value">
                  {vital.value}
                  <small>{vital.unit}</small>
                </div>

                <div className="vital-trend-row">
                  <div className="vital-trend">
                    {vital.trend.direction === "up" && <TrendingUp size={13} className="trend-arrow up" />}
                    {vital.trend.direction === "down" && <TrendingDown size={13} className="trend-arrow down" />}
                    {vital.trend.direction === "stable" && <Minus size={13} className="trend-arrow stable" />}
                    <span className={`trend-text ${vital.trend.direction}`}>{vital.trend.text}</span>
                  </div>

                  {vital.sparklineData && vital.sparklineData.length > 0 && (
                    <div className="vital-sparkline-wrap">
                      <Sparkline data={vital.sparklineData} statusLevel={vital.status?.level || "normal"} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RECORDS & ALERTS SECTION */}
      <div className="health-content-grid">
        {/* RECORDS CARD WITH MULTI-SELECT & DELETE */}
        <section className="records-card">
          <div className="health-section-heading">
            <div>
              <span className="heading-kicker">CLINICAL DOSSIER</span>
              <h2 className="heading-title">Medical Health Records</h2>
            </div>
            <div className="records-header-actions">
              <span className="count-pill">{healthRecords.length} Records</span>
              <button className="small-add-record-btn" onClick={() => setUploadModal(true)}>
                <Plus size={14} /> Add Record
              </button>
            </div>
          </div>

          {/* BATCH ACTION TOOLBAR */}
          {healthRecords.length > 0 && (
            <div className="records-bulk-toolbar">
              <button type="button" onClick={toggleSelectAll} className="bulk-select-all-btn">
                {selectedRecordIds.length === healthRecords.length ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} />
                )}
                <span>
                  {selectedRecordIds.length === healthRecords.length ? "Deselect All" : "Select All"}
                </span>
              </button>

              {selectedRecordIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBatchDeleteConfirm(true)}
                  className="bulk-delete-btn"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedRecordIds.length})</span>
                </button>
              )}
            </div>
          )}

          {healthRecords.length === 0 ? (
            <div className="empty-inner-state">
              <FileText size={36} />
              <p>No electronic health records uploaded yet.</p>
              <button className="upload-first-btn" onClick={() => setUploadModal(true)}>
                <Upload size={14} /> Upload First Record
              </button>
            </div>
          ) : (
            <div className="records-list">
              {healthRecords.map((rec) => {
                const rId = rec._id || rec.id;
                const isSelected = selectedRecordIds.includes(rId);

                return (
                  <div key={rId} className={`record-item ${isSelected ? "selected" : ""}`}>
                    <div className="record-item-select">
                      <button
                        type="button"
                        onClick={() => toggleSelectRecord(rId)}
                        className="item-checkbox-btn"
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </div>

                    <div className="record-item-icon">
                      <FileText size={18} />
                    </div>

                    <div className="record-item-body">
                      <div className="record-item-header">
                        <span className="record-type-badge">{rec.record_type}</span>
                        <span className="record-date">
                          {rec.record_date || new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h4>{rec.title}</h4>

                      {rec.diagnosis && (
                        <p className="record-diagnosis">
                          <strong>Diagnosis:</strong> {rec.diagnosis}
                        </p>
                      )}

                      <div className="record-meta-row">
                        <span className="record-meta-chip">
                          <Stethoscope size={12} />
                          {rec.doctor_name || "Specialist"}
                        </span>
                        <span className="record-meta-chip">
                          <Building size={12} />
                          {rec.hospital_name || "CareBridge Medical"}
                        </span>
                        {rec.attachments && rec.attachments.length > 0 && (
                          <span className="record-meta-chip att-count">
                            <ImageIcon size={12} />
                            {rec.attachments.length} attachment(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="record-item-actions">
                      <button
                        className="record-action-icon-btn view"
                        onClick={() => setSelectedRecord(rec)}
                        title="View Record & Attachments"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="record-action-icon-btn delete"
                        onClick={() => setRecordToDelete(rec)}
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ALERTS CARD */}
        <section className="alerts-card">
          <div className="health-section-heading">
            <div>
              <span className="heading-kicker">SAFETY THRESHOLDS</span>
              <h2 className="heading-title">Active Health Alerts</h2>
            </div>
            <span className="count-pill red">{alerts.length} Alerts</span>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-inner-state">
              <CheckCircle2 size={36} className="text-green" />
              <p>No active physiological alerts. All measured parameters are within configured safe bounds.</p>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div key={alert.id || alert._id} className="alert-item">
                  <div className="alert-item-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="alert-item-body">
                    <div className="alert-item-top">
                      <span className="alert-type-badge">{alert.alert_type}</span>
                      <span className="alert-severity-badge">{alert.severity}</span>
                    </div>
                    <p>{alert.message}</p>
                    <span className="alert-time">
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Active"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Health;