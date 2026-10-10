import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  FileSpreadsheet
} from "lucide-react";
import doctorService from "../../services/doctorService";
import api from "../../services/api";
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

/* Normal Range Checkers */
const METRIC_RANGES = {
  hr: {
    label: "Heart Rate",
    unit: "bpm",
    classify: (v) => {
      if (v == null) return "normal";
      if (v < 45 || v > 125) return "critical";
      if (v < 60 || v > 100) return "warning";
      return "normal";
    },
    lo: 60,
    hi: 100,
  },
  bp: {
    label: "Blood Pressure",
    unit: "mmHg",
    classify: (sys, dia) => {
      if (sys == null) return "normal";
      if (sys >= 160 || dia >= 105 || sys < 80 || dia < 45) return "critical";
      if (sys >= 130 || dia >= 85 || sys < 90 || dia < 55) return "warning";
      return "normal";
    },
    lo: 90,
    hi: 120,
  },
  spo2: {
    label: "SpO₂ Oxygen",
    unit: "%",
    classify: (v) => {
      if (v == null) return "normal";
      if (v < 90) return "critical";
      if (v < 95) return "warning";
      return "normal";
    },
    lo: 95,
    hi: 100,
  },
  temp: {
    label: "Temperature",
    unit: "°C",
    classify: (v) => {
      if (v == null) return "normal";
      if (v >= 38.6 || v < 34.5) return "critical";
      if (v >= 37.4 || v < 36.0) return "warning";
      return "normal";
    },
    lo: 36.1,
    hi: 37.2,
  },
  sugar: {
    label: "Blood Sugar",
    unit: "mg/dL",
    classify: (v) => {
      if (v == null) return "normal";
      if (v >= 250 || v < 55) return "critical";
      if (v >= 145 || v < 70) return "warning";
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
  const [activeReading, setActiveReading] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
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

  // Table Filters & Pagination
  const [searchFilter, setSearchFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("All"); // Today | 7 days | 30 days | All
  const [statusFilter, setStatusFilter] = useState("All"); // All | Normal | Warning | Critical
  const [sortField, setSortField] = useState("recorded_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Patient Vitals | CareBridge AI";
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // 1. Fetch Patients
  const loadPatients = useCallback(async () => {
    try {
      const list = await doctorService.getPatients();
      const valid = (Array.isArray(list) ? list : []).map((p) => ({
        id: p._id || p.id,
        patient_code: p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6),
        name: p.name || "Patient Record",
        age: p.age || 42,
        gender: p.gender || "Other",
        blood_group: p.blood_group || p.blood || "O+",
        phone: p.phone || "+91 98765 43210",
      }));
      setPatients(valid);

      if (valid.length > 0) {
        let initialId = valid[0].id;
        if (preselectedPid) {
          const match = valid.find(p => p.id === preselectedPid || p.patient_code === preselectedPid);
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

  // 2. Fetch Vitals History
  const loadVitalsHistory = useCallback(async (targetPid) => {
    if (!targetPid) return;
    try {
      const raw = await doctorService.getPatientVitals(targetPid);
      const rows = Array.isArray(raw) ? raw : [];
      setVitalsHistory(rows);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Failed to fetch vitals for patient:", err);
      setVitalsHistory([]);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      loadVitalsHistory(selectedPatientId);
    }
  }, [selectedPatientId, loadVitalsHistory]);

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
    setSyncing(false);
    showToast("Vitals telemetry synchronized");
  };

  const handlePatientSelectChange = (newPid) => {
    setSelectedPatientId(newPid);
    setCurrentPage(1);
  };

  const activePatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

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
    const hrStatus = METRIC_RANGES.hr.classify(hrVal);
    const hrSpark = historyChronological.map((r) => Number(r.heart_rate) || 72).slice(-10);

    // BP
    const sysVal = latestVital?.systolic_bp != null ? Number(latestVital.systolic_bp) : null;
    const diaVal = latestVital?.diastolic_bp != null ? Number(latestVital.diastolic_bp) : null;
    const sysPrev = previousVital?.systolic_bp != null ? Number(previousVital.systolic_bp) : null;
    const diaPrev = previousVital?.diastolic_bp != null ? Number(previousVital.diastolic_bp) : null;
    const bpStatus = METRIC_RANGES.bp.classify(sysVal, diaVal);
    const bpSpark = historyChronological.map((r) => Number(r.systolic_bp) || 120).slice(-10);

    // SpO2
    const spo2Val = latestVital?.spo2 != null ? Number(latestVital.spo2) : null;
    const spo2Prev = previousVital?.spo2 != null ? Number(previousVital.spo2) : null;
    const spo2Delta = spo2Val != null && spo2Prev != null ? spo2Val - spo2Prev : null;
    const spo2Status = METRIC_RANGES.spo2.classify(spo2Val);
    const spo2Spark = historyChronological.map((r) => Number(r.spo2) || 98).slice(-10);

    // Temp
    const tempVal = latestVital?.temperature != null ? Number(latestVital.temperature) : null;
    const tempPrev = previousVital?.temperature != null ? Number(previousVital.temperature) : null;
    const tempDelta = tempVal != null && tempPrev != null ? +(tempVal - tempPrev).toFixed(1) : null;
    const tempStatus = METRIC_RANGES.temp.classify(tempVal);
    const tempSpark = historyChronological.map((r) => Number(r.temperature) || 36.8).slice(-10);

    // Blood Sugar
    const sugarVal = latestVital?.blood_sugar != null ? Number(latestVital.blood_sugar) : null;
    const sugarPrev = previousVital?.blood_sugar != null ? Number(previousVital.blood_sugar) : null;
    const sugarDelta = sugarVal != null && sugarPrev != null ? sugarVal - sugarPrev : null;
    const sugarStatus = METRIC_RANGES.sugar.classify(sugarVal);
    const sugarSpark = historyChronological.map((r) => Number(r.blood_sugar) || 95).slice(-10);

    // Weight
    const weightVal = latestVital?.weight != null ? Number(latestVital.weight) : null;
    const weightPrev = previousVital?.weight != null ? Number(previousVital.weight) : null;
    const weightDelta = weightVal != null && weightPrev != null ? +(weightVal - weightPrev).toFixed(1) : null;
    const weightSpark = historyChronological.filter(r => r.weight != null).map(r => Number(r.weight)).slice(-10);

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
        time: latestVital?.recorded_at,
        metricKey: "hr"
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
        time: latestVital?.recorded_at,
        metricKey: "bp"
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
        time: latestVital?.recorded_at,
        metricKey: "spo2"
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
        time: latestVital?.recorded_at,
        metricKey: "temp"
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
        time: latestVital?.recorded_at,
        metricKey: "sugar"
      },
      {
        id: "weight",
        title: "Body Weight & Mass",
        icon: Weight,
        value: weightVal != null ? `${weightVal.toFixed(1)}` : "72.4",
        unit: "kg",
        status: "normal",
        prevText: weightPrev != null ? `Prev: ${weightPrev.toFixed(1)} kg` : "Standard baseline",
        deltaText: weightDelta != null ? `${weightDelta > 0 ? "▲ +" : "▼ "}${weightDelta} kg` : null,
        deltaGood: true,
        sparkline: weightSpark.length > 0 ? weightSpark : [72.0, 72.2, 72.4],
        color: "#10b981",
        time: latestVital?.recorded_at,
        metricKey: "weight"
      },
    ];
  }, [sortedVitals, latestVital, previousVital]);

  // Overall Status
  const criticalCardCount = metricCards.filter((c) => c.status === "critical").length;
  const warningCardCount = metricCards.filter((c) => c.status === "warning").length;

  // Filtered & Sorted Table Rows
  const filteredTableRows = useMemo(() => {
    let rows = [...sortedVitals];
    const now = Date.now();

    // Range Filter
    if (rangeFilter === "Today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => new Date(r.recorded_at || r.created_at).getTime() >= startOfDay.getTime());
    } else if (rangeFilter === "7 days") {
      rows = rows.filter((r) => now - new Date(r.recorded_at || r.created_at).getTime() <= 7 * 86400000);
    } else if (rangeFilter === "30 days") {
      rows = rows.filter((r) => now - new Date(r.recorded_at || r.created_at).getTime() <= 30 * 86400000);
    }

    // Status Filter
    if (statusFilter !== "All") {
      rows = rows.filter((r) => {
        const hrStat = METRIC_RANGES.hr.classify(r.heart_rate);
        const bpStat = METRIC_RANGES.bp.classify(r.systolic_bp, r.diastolic_bp);
        const spo2Stat = METRIC_RANGES.spo2.classify(r.spo2);
        const tempStat = METRIC_RANGES.temp.classify(r.temperature);
        const sugarStat = METRIC_RANGES.sugar.classify(r.blood_sugar);
        const isCrit = [hrStat, bpStat, spo2Stat, tempStat, sugarStat].includes("critical");
        const isWarn = [hrStat, bpStat, spo2Stat, tempStat, sugarStat].includes("warning");

        if (statusFilter === "Critical") return isCrit;
        if (statusFilter === "Warning") return isWarn && !isCrit;
        if (statusFilter === "Normal") return !isCrit && !isWarn;
        return true;
      });
    }

    // Search Filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.notes || "").toLowerCase().includes(q) ||
          String(r.recorded_by_name || "").toLowerCase().includes(q) ||
          String(r.heart_rate || "").includes(q) ||
          String(r.systolic_bp || "").includes(q) ||
          String(r.spo2 || "").includes(q)
      );
    }

    // Sort
    rows.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (sortField === "recorded_at") {
        vA = new Date(a.recorded_at || a.created_at || 0).getTime();
        vB = new Date(b.recorded_at || b.created_at || 0).getTime();
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

  // Record Vital Submit
  const handleSaveVital = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    try {
      await doctorService.recordVitals({
        patient_id: selectedPatientId,
        heart_rate: formData.heart_rate ? Number(formData.heart_rate) : undefined,
        systolic_bp: formData.systolic_bp ? Number(formData.systolic_bp) : undefined,
        diastolic_bp: formData.diastolic_bp ? Number(formData.diastolic_bp) : undefined,
        spo2: formData.spo2 ? Number(formData.spo2) : undefined,
        temperature: formData.temperature ? Number(formData.temperature) : undefined,
        blood_sugar: formData.blood_sugar ? Number(formData.blood_sugar) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        notes: formData.notes || "",
      });
      await loadVitalsHistory(selectedPatientId);
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
    } catch (err) {
      console.error("Save vitals failed:", err);
      showToast("Failed to save vital signs. Check values.");
    }
  };

  // Edit Vital Submit
  const handleUpdateVital = async (e) => {
    e.preventDefault();
    if (!activeReading?._id && !activeReading?.id) return;
    const vId = activeReading._id || activeReading.id;
    try {
      await api.put(`/vitals/${vId}`, {
        heart_rate: Number(activeReading.heart_rate),
        systolic_bp: Number(activeReading.systolic_bp),
        diastolic_bp: Number(activeReading.diastolic_bp),
        spo2: Number(activeReading.spo2),
        temperature: Number(activeReading.temperature),
        blood_sugar: Number(activeReading.blood_sugar),
        weight: activeReading.weight ? Number(activeReading.weight) : undefined,
        notes: activeReading.notes || "",
      });
      await loadVitalsHistory(selectedPatientId);
      setIsEditModalOpen(false);
      showToast("Vital reading updated successfully");
    } catch (err) {
      console.error("Update vital failed:", err);
      showToast("Failed to update vital reading.");
    }
  };

  // Delete Vital Action
  const handleDeleteVital = async (vId) => {
    try {
      await api.delete(`/vitals/${vId}`);
      await loadVitalsHistory(selectedPatientId);
      setDeleteConfirmId(null);
      showToast("Vital reading deleted from chart");
    } catch (err) {
      console.error("Delete vital failed:", err);
      showToast("Failed to delete vital record.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredTableRows.length) {
      showToast("No recordings to export");
      return;
    }
    const headers = ["Timestamp", "Heart Rate (BPM)", "BP Systolic (mmHg)", "BP Diastolic (mmHg)", "SpO2 (%)", "Temperature (°C)", "Blood Sugar (mg/dL)", "Weight (kg)", "Recorder", "Notes"];
    const rowsData = filteredTableRows.map((r) => [
      `"${new Date(r.recorded_at || r.created_at).toLocaleString()}"`,
      r.heart_rate || "",
      r.systolic_bp || "",
      r.diastolic_bp || "",
      r.spo2 || "",
      r.temperature || "",
      r.blood_sugar || "",
      r.weight || "",
      `"${r.recorded_by_name || 'Medical Staff'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rowsData.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const pCode = activePatient?.patient_code || "patient";
    link.setAttribute("download", `vitals-telemetry-${pCode}-${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="live-dot" /> LIVE TELEMETRY
          </div>
          <h1>Patient Physiological Vitals</h1>
          <p className="vitals-header-desc">
            Continuous calibrated telemetry stream · Last synced:{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Live Polling"}
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

          <button
            className="vitals-btn primary"
            onClick={() => setIsRecordModalOpen(true)}
          >
            <Plus size={16} /> Record New Vitals
          </button>
        </div>
      </div>

      {/* PATIENT SELECTION & DEMOGRAPHICS BAR */}
      <div className="vitals-patient-card">
        <div className="vitals-patient-select-col">
          <label htmlFor="patient-selector">
            <User size={16} className="text-primary" />
            <strong>Select Patient Chart:</strong>
          </label>
          <select
            id="patient-selector"
            className="patient-select-input"
            value={selectedPatientId}
            onChange={(e) => handlePatientSelectChange(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (ID: {p.patient_code})
              </option>
            ))}
          </select>
        </div>

        {activePatient && (
          <div className="vitals-demographics-row">
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
          </div>
        )}

        <div className="vitals-overall-status">
          {criticalCardCount > 0 ? (
            <span className="status-chip critical-pill">
              <ShieldAlert size={14} /> Critical Telemetry ({criticalCardCount})
            </span>
          ) : warningCardCount > 0 ? (
            <span className="status-chip warning-pill">
              <AlertTriangle size={14} /> Needs Attention ({warningCardCount})
            </span>
          ) : (
            <span className="status-chip stable-pill">
              <CheckCircle2 size={14} /> All Telemetry Normal
            </span>
          )}
        </div>
      </div>

      {/* 6 METRIC CARDS GRID */}
      <div className="vitals-cards-grid">
        {metricCards.map((card) => {
          const IconComp = card.icon;
          const isCritical = card.status === "critical";
          const isWarning = card.status === "warning";

          return (
            <div
              key={card.id}
              className={`vital-metric-card ${card.status} ${isCritical ? "pulse-critical" : ""}`}
              onClick={() =>
                navigate(
                  `/doctor/health-monitoring?patientId=${selectedPatientId}&metric=${card.metricKey}`
                )
              }
              title="Click to inspect detailed 3D curves in PulseView"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  navigate(`/doctor/health-monitoring?patientId=${selectedPatientId}&metric=${card.metricKey}`);
              }}
            >
              <div className="card-top-row">
                <div className="card-icon-wrap" style={{ background: `${card.color}15`, color: card.color }}>
                  <IconComp size={20} />
                </div>

                <div className="card-status-badge-wrap">
                  {isCritical ? (
                    <span className="badge-chip red">CRITICAL</span>
                  ) : isWarning ? (
                    <span className="badge-chip amber">WARNING</span>
                  ) : (
                    <span className="badge-chip green">NORMAL</span>
                  )}
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
                    <span className="empty-val">No readings</span>
                  )}
                </div>

                <div className="metric-delta-row">
                  {card.deltaText ? (
                    <span className={`delta-tag ${card.deltaGood ? "good" : "bad"}`}>
                      {card.deltaGood ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {card.deltaText}
                    </span>
                  ) : (
                    <span className="delta-neutral">{card.prevText}</span>
                  )}
                  <span className="time-subtext">{timeAgo(card.time)}</span>
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

        {/* CONTROLS & FILTER BAR */}
        <div className="stream-filters-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by notes, staff recorder, or vital numbers…"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchFilter && (
              <button className="clear-search-btn" onClick={() => setSearchFilter("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-chips-wrap">
            <span className="filter-label">Range:</span>
            {["All", "Today", "7 days", "30 days"].map((rg) => (
              <button
                key={rg}
                className={`filter-chip ${rangeFilter === rg ? "active" : ""}`}
                onClick={() => {
                  setRangeFilter(rg);
                  setCurrentPage(1);
                }}
              >
                {rg}
              </button>
            ))}

            <span className="filter-label" style={{ marginLeft: 12 }}>Status:</span>
            {["All", "Normal", "Warning", "Critical"].map((st) => (
              <button
                key={st}
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
                  Recorded At <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSortToggle("systolic_bp")} className="sortable-th">
                  Blood Pressure (mmHg) <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSortToggle("heart_rate")} className="sortable-th">
                  Heart Rate (bpm) <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSortToggle("spo2")} className="sortable-th">
                  SpO₂ (%) <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSortToggle("temperature")} className="sortable-th">
                  Temp (°C) <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSortToggle("blood_sugar")} className="sortable-th">
                  Blood Sugar (mg/dL) <ArrowUpDown size={12} />
                </th>
                <th>Weight (kg)</th>
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
                      <p>No recorded vital signs found matching filter criteria.</p>
                      <button className="vitals-btn primary" onClick={() => setIsRecordModalOpen(true)}>
                        <Plus size={15} /> Record Vitals Now
                      </button>
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
                  const isCrit = [hrStat, bpStat, spo2Stat, tempStat, sugarStat].includes("critical");
                  const isWarn = [hrStat, bpStat, spo2Stat, tempStat, sugarStat].includes("warning");
                  const rowId = r._id || r.id;

                  return (
                    <tr
                      key={rowId}
                      className={`stream-row ${isCrit ? "row-critical" : isWarn ? "row-warning" : ""}`}
                    >
                      <td>
                        <div className="time-cell">
                          <strong>{new Date(r.recorded_at || r.created_at).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}</strong>
                          <span>{new Date(r.recorded_at || r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {timeAgo(r.recorded_at || r.created_at)}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`val-chip ${bpStat}`}>
                          {r.systolic_bp && r.diastolic_bp ? `${r.systolic_bp}/${r.diastolic_bp}` : "--"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${hrStat}`}>
                          {r.heart_rate != null ? `${r.heart_rate}` : "--"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${spo2Stat}`}>
                          {r.spo2 != null ? `${r.spo2}%` : "--"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${tempStat}`}>
                          {r.temperature != null ? `${Number(r.temperature).toFixed(1)}°C` : "--"}
                        </span>
                      </td>

                      <td>
                        <span className={`val-chip ${sugarStat}`}>
                          {r.blood_sugar != null ? `${r.blood_sugar}` : "--"}
                        </span>
                      </td>

                      <td>
                        <span className="neutral-chip">{r.weight ? `${r.weight} kg` : "--"}</span>
                      </td>

                      <td>
                        <span className="recorder-pill">{r.recorded_by_name || "Medical Staff"}</span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="table-row-actions">
                          <button
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
                            className="action-icon-btn"
                            title="Edit Reading"
                            onClick={() => {
                              setActiveReading({ ...r });
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
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
                <p>Telemetry calibration for {activePatient?.name} (ID: {activePatient?.patient_code})</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsRecordModalOpen(false)}>
                <X size={18} />
              </button>
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
                    max="160"
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
                <button type="submit" className="vitals-btn primary">
                  Save Vital Reading
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
                <p>Reading timestamp: {new Date(activeReading.recorded_at || activeReading.created_at).toLocaleString()}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateVital}>
              <div className="modal-inputs-grid">
                <div className="input-group">
                  <label>Heart Rate (bpm)</label>
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
                  <label>SpO₂ Oxygen (%)</label>
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
                  <label>Systolic BP (mmHg)</label>
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
                  <label>Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="30"
                    max="160"
                    required
                    value={activeReading.diastolic_bp || ""}
                    onChange={(e) => setActiveReading({ ...activeReading, diastolic_bp: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Temperature (°C)</label>
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
                  <label>Blood Sugar (mg/dL)</label>
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
                <button type="submit" className="vitals-btn primary">
                  Save Changes
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
                <p>{new Date(activeReading.recorded_at || activeReading.created_at).toLocaleString()} ({timeAgo(activeReading.recorded_at || activeReading.created_at)})</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDetailModalOpen(false)}>
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
                <strong className={METRIC_RANGES.bp.classify(activeReading.systolic_bp, activeReading.diastolic_bp)}>
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
                <p className="detail-notes">{activeReading.notes || "No additional clinical notes recorded."}</p>
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

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="vitals-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="vitals-modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <Trash2 size={24} />
            </div>
            <h3>Delete Vital Reading?</h3>
            <p>Are you sure you want to remove this physiological telemetry record from the patient's chart? This action cannot be undone.</p>

            <div className="modal-footer-actions" style={{ justifyContent: "center" }}>
              <button className="vitals-btn secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
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