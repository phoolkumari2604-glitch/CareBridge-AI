import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  FileText,
  Calendar,
  Eye,
  Plus,
  Pill,
  Stethoscope,
  HeartPulse,
  Loader2,
  RefreshCw,
  X,
  CheckCircle2,
  Trash2,
  Printer,
  Edit3,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  ShieldAlert,
  User,
  UserCheck
} from "lucide-react";
import doctorService from "../../services/doctorService";
import { useAuth } from "../../context/AuthContext";
import "./HealthRecords.css";

const ICD10_SUGGESTIONS = [
  { code: "I10", label: "Essential (primary) hypertension" },
  { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
  { code: "J45.909", label: "Unspecified asthma, uncomplicated" },
  { code: "I48.0", label: "Paroxysmal atrial fibrillation" },
  { code: "N18.2", label: "Chronic kidney disease, stage 2 (mild)" },
  { code: "E03.9", label: "Hypothyroidism, unspecified" },
  { code: "K21.9", label: "Gastro-esophageal reflux disease without esophagitis" },
  { code: "M17.12", label: "Primary osteoarthritis of left knee" }
];

const DRUG_SUGGESTIONS = [
  { name: "Telmisartan", dose: "40 mg", freq: "OD", class: "Antihypertensive (ARB)" },
  { name: "Amlodipine Besylate", dose: "5 mg", freq: "OD", class: "Calcium Channel Blocker" },
  { name: "Metformin Hydrochloride", dose: "500 mg", freq: "BD", class: "Antidiabetic (Biguanide)" },
  { name: "Atorvastatin", dose: "10 mg", freq: "HS", class: "Lipid-lowering Statin" },
  { name: "Budesonide / Formoterol", dose: "200/6 mcg", freq: "BD", class: "Inhaler / Corticosteroid" },
  { name: "Levothyroxine Sodium", dose: "50 mcg", freq: "OD", class: "Thyroid Hormone" },
  { name: "Pantoprazole", dose: "40 mg", freq: "OD", class: "Proton Pump Inhibitor (PPI)" },
  { name: "Metoprolol Succinate ER", dose: "25 mg", freq: "OD", class: "Beta Blocker" },
  { name: "Apixaban", dose: "5 mg", freq: "BD", class: "Oral Anticoagulant" }
];

function MiniSparkline({ data = [], color = "#0d9488" }) {
  if (!data || data.length < 2) return null;
  const W = 80;
  const H = 26;
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

  const lastVal = data[data.length - 1];
  const lastX = W - 4;
  const lastY = H - 4 - ((lastVal - min) / range) * (H - 8);

  return (
    <svg className="hr-card-sparkline" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

export default function HealthRecords() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPatient = searchParams.get("patient") || sessionStorage.getItem("carebridge_last_patient") || "all";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatient);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const comboboxRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ records: 0, consultations: 0, prescriptions: 0, diagnoses: 0, checkups: 0 });
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date().toLocaleTimeString("en-GB"));
  const [newRecordsAvailable, setNewRecordsAvailable] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: initialFrom, to: initialTo });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(initialFrom ? "Custom" : "30d");
  const [viewMode, setViewMode] = useState("table");
  const searchInputRef = useRef(null);

  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [modalMode, setModalMode] = useState("create");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: "",
    record_type: "CONSULTATION",
    title: "",
    diagnosis: "",
    icd10_code: "",
    medications: [
      { name: "Telmisartan", dose: "40 mg", frequency: "Once daily (OD)", duration: "30 days", drug_class: "Antihypertensive" }
    ],
    notes: "",
    status: "final",
    is_abnormal: false,
    record_date: new Date().toISOString().split("T")[0],
    attachments: []
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setComboboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setComboboxOpen(false);
        setDatePickerOpen(false);
        if (searchQuery) setSearchQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const fetchPatients = useCallback(async () => {
    try {
      const data = await doctorService.getPatients({ limit: 100 });
      const valid = (Array.isArray(data) ? data : (data?.patients || [])).filter(
        (p) => !p.is_test && (p.name || "").toLowerCase() !== "string"
      );
      setPatients(valid);
    } catch (err) {
      console.error("Failed to load patients roster:", err);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const currentPatientObj = useMemo(() => {
    if (selectedPatientId === "all") return null;
    return patients.find(
      (p) => String(p.patient_code) === String(selectedPatientId) || String(p._id) === String(selectedPatientId)
    );
  }, [patients, selectedPatientId]);

  const fetchRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = {
        patient: selectedPatientId !== "all" ? selectedPatientId : "",
        type: typeFilter !== "all" ? typeFilter : "",
        from: dateRange.from,
        to: dateRange.to,
        q: searchQuery.trim(),
        page: currentPage,
        limit: limit
      };

      const data = await doctorService.getHealthRecordsSummary(params);
      const items = data.items || data.records || [];
      setRecords(items);
      setTotalRecords(data.total || items.length);
      setTotalPages(data.total_pages || Math.ceil((data.total || items.length) / limit) || 1);
      if (data.stats) {
        setStats(data.stats);
      }
      setLastSyncedTime(new Date().toLocaleTimeString("en-GB"));
      setNewRecordsAvailable(false);
    } catch (err) {
      console.error("Failed to fetch health records:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPatientId, typeFilter, dateRange, searchQuery, currentPage, limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecords(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const handleSelectPatient = (pId) => {
    setSelectedPatientId(pId);
    sessionStorage.setItem("carebridge_last_patient", pId);
    setComboboxOpen(false);
    setCurrentPage(1);

    const newParams = new URLSearchParams(searchParams);
    if (pId === "all") {
      newParams.delete("patient");
    } else {
      newParams.set("patient", pId);
    }
    setSearchParams(newParams);
  };

  const handlePresetSelect = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const format = (d) => d.toISOString().split("T")[0];

    let fromStr = "";
    let toStr = format(today);

    if (preset === "Today") {
      fromStr = toStr;
    } else if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      fromStr = format(d);
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      fromStr = format(d);
    } else if (preset === "This month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      fromStr = format(d);
    } else if (preset === "This year") {
      const d = new Date(today.getFullYear(), 0, 1);
      fromStr = format(d);
    } else if (preset === "All") {
      fromStr = "";
      toStr = "";
    }

    setDateRange({ from: fromStr, to: toStr });
    setDatePickerOpen(false);
    setCurrentPage(1);

    const newParams = new URLSearchParams(searchParams);
    if (fromStr) newParams.set("from", fromStr); else newParams.delete("from");
    if (toStr) newParams.set("to", toStr); else newParams.delete("to");
    setSearchParams(newParams);
  };

  const filteredPatients = useMemo(() => {
    const q = patientSearch.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const code = String(p.patient_code || "");
      const phone = (p.phone || "").replace(/\D/g, "");
      const email = (p.email || "").toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q.replace(/\D/g, "")) || email.includes(q);
    });
  }, [patients, patientSearch]);

  const patientGroups = useMemo(() => {
    const critical = filteredPatients.filter((p) => p.status === "Critical" || p.triage_level === "critical");
    const recent = filteredPatients.slice(0, 5);
    return { recent, critical, all: filteredPatients };
  }, [filteredPatients]);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setModalStep(1);
    setFormErrors({});
    setFormData({
      patient_id: currentPatientObj?.patient_code || (patients[0]?.patient_code || ""),
      record_type: "CONSULTATION",
      title: "",
      diagnosis: "",
      icd10_code: "",
      medications: [
        { name: "Telmisartan", dose: "40 mg", frequency: "Once daily (OD)", duration: "30 days", drug_class: "Antihypertensive" }
      ],
      notes: "",
      status: "final",
      is_abnormal: false,
      record_date: new Date().toISOString().split("T")[0],
      attachments: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec) => {
    setModalMode("edit");
    setEditingRecordId(rec._id || rec.id);
    setModalStep(1);
    setFormErrors({});
    setFormData({
      patient_id: rec.patient_code || rec.patient_id,
      record_type: rec.record_type || "CONSULTATION",
      title: rec.title || "",
      diagnosis: rec.diagnosis || "",
      icd10_code: rec.icd10_code || "",
      medications: Array.isArray(rec.medications) && rec.medications.length > 0
        ? rec.medications
        : [{ name: "", dose: "", frequency: "Once daily (OD)", duration: "30 days", drug_class: "General" }],
      notes: rec.notes || rec.description || "",
      status: rec.status || "final",
      is_abnormal: Boolean(rec.is_abnormal),
      record_date: new Date().toISOString().split("T")[0],
      attachments: rec.attachments || []
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (rec) => {
    setModalMode("create");
    setModalStep(1);
    setFormErrors({});
    setFormData({
      patient_id: rec.patient_code || rec.patient_id,
      record_type: rec.record_type || "CONSULTATION",
      title: `Copy of ${rec.title}`,
      diagnosis: rec.diagnosis || "",
      icd10_code: rec.icd10_code || "",
      medications: Array.isArray(rec.medications) ? rec.medications : [],
      notes: rec.notes || rec.description || "",
      status: "draft",
      is_abnormal: Boolean(rec.is_abnormal),
      record_date: new Date().toISOString().split("T")[0],
      attachments: rec.attachments || []
    });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (recId) => {
    if (!window.confirm("Are you sure you want to delete this clinical health record?")) return;
    try {
      await doctorService.deleteHealthRecord(recId);
      setToastMessage({
        text: "Health record deleted successfully.",
        canUndo: true,
        recId: recId
      });
      fetchRecords(true);
    } catch (err) {
      alert("Failed to delete record: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUndoDelete = async (recId) => {
    try {
      await doctorService.restoreHealthRecord(recId);
      setToastMessage({ text: "Health record restored.", canUndo: false });
      fetchRecords(true);
    } catch (err) {
      console.error("Failed to restore record:", err);
    }
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.patient_id) errs.patient_id = "Please select a patient chart.";
      if (!formData.title.trim()) errs.title = "Record title is required.";
    } else if (step === 2) {
      if (!formData.diagnosis.trim()) errs.diagnosis = "Clinical diagnosis is required.";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(modalStep)) {
      setModalStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setModalStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!validateStep(modalStep)) return;

    setIsSubmitting(true);
    try {
      const cleanMeds = formData.medications.filter((m) => m.name && m.name.trim());
      const payload = {
        ...formData,
        medications: cleanMeds
      };

      if (modalMode === "create") {
        await doctorService.createHealthRecord(payload);
        setToastMessage({ text: "Clinical health record created successfully!" });
      } else {
        await doctorService.updateHealthRecord(editingRecordId, payload);
        setToastMessage({ text: "Clinical health record updated successfully!" });
      }

      setIsModalOpen(false);
      fetchRecords(true);
    } catch (err) {
      alert("Submission error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const rows = records.map((r) => ({
      ID: r._id || r.id,
      Patient: r.patient_name,
      PatientCode: r.patient_code,
      Type: r.record_type,
      Title: r.title,
      Diagnosis: r.diagnosis,
      ICD10: r.icd10_code,
      Date: r.record_date,
      Status: r.status
    }));

    if (rows.length === 0) {
      alert("No records to export.");
      return;
    }

    const header = Object.keys(rows[0]).join(",");
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows.map((row) => Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CareBridge_Health_Records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Helper renderers
  const renderRecordTypeBadge = (type) => {
    const t = (type || "").toLowerCase();
    const map = {
      consultation: { label: "Consultation", cls: "badge-consultation", icon: Stethoscope },
      diagnosis: { label: "Diagnosis", cls: "badge-diagnosis", icon: Activity },
      prescription: { label: "Prescription", cls: "badge-prescription", icon: Pill },
      checkup: { label: "Checkup", cls: "badge-checkup", icon: ShieldAlert }
    };
    const conf = map[t] || { label: type || "Record", cls: "badge-consultation", icon: FileText };
    const IconComp = conf.icon;
    return (
      <span className={`record-type-badge ${conf.cls}`}>
        <IconComp size={12} className="mr-1" />
        {conf.label}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "final") return <span className="status-badge status-final">Final</span>;
    if (s === "draft") return <span className="status-badge status-draft">Draft</span>;
    if (s === "amended") return <span className="status-badge status-amended">Amended</span>;
    return <span className="status-badge">{status || "Active"}</span>;
  };

  const renderTypeIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "consultation") return <Stethoscope size={16} />;
    if (t === "diagnosis") return <Activity size={16} />;
    if (t === "prescription") return <Pill size={16} />;
    return <FileText size={16} />;
  };

  const formatDateIST = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // ── Render ──
  return (
    <div className="health-records-container" role="main" aria-label="Clinical Health Records Portal">
      {/* ── Top Header Bar ── */}
      <header className="records-header">
        <div className="header-text-block">
          <div className="title-row">
            <h1>Clinical Health Records &amp; Charts</h1>
            <span className="live-status-pill" title="Live stream synchronized">
              <span className="live-dot" aria-hidden="true" />
              Live Sync
            </span>
          </div>
          <p className="subtitle">
            Authenticated clinical audit portal • Verified 6-digit patients • Real-time ICD-10 charting
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-sync-refresh"
            onClick={() => fetchRecords(true)}
            disabled={loading}
            title="Refresh records cache"
            aria-label="Refresh records cache"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} aria-hidden="true" />
            <span>Sync</span>
          </button>
          <button
            type="button"
            className="btn-create-record"
            onClick={handleOpenCreateModal}
            aria-label="Create new clinical health record"
          >
            <Plus size={16} aria-hidden="true" />
            <span>New Health Record</span>
          </button>
        </div>
      </header>

      {/* ── Accessible Patient Combobox ── */}
      <section className="combobox-section" aria-labelledby="patient-select-label">
        <label id="patient-select-label" className="section-label">
          Active Patient Selection
        </label>
        <div className="combobox-wrapper" ref={comboboxRef}>
          <div
            className={`combobox-input-box ${comboboxOpen ? "is-focused" : ""}`}
            onClick={() => setComboboxOpen(true)}
          >
            <User size={18} className="box-icon" aria-hidden="true" />
            <input
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={comboboxOpen}
              aria-controls="patient-listbox"
              placeholder="Search by patient name, 6-digit ID, or condition..."
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                setComboboxOpen(true);
              }}
              onFocus={() => setComboboxOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setComboboxOpen(false);
              }}
            />
            {currentPatientObj && (
              <span className="selected-patient-badge">
                {currentPatientObj.name} (#{currentPatientObj.patient_code})
              </span>
            )}
            <ChevronDown size={18} className="chevron-icon" aria-hidden="true" />
          </div>

          {comboboxOpen && (
            <div id="patient-listbox" className="combobox-popover" role="listbox">
              <div
                className={`combobox-option ${selectedPatientId === "all" ? "active" : ""}`}
                role="option"
                aria-selected={selectedPatientId === "all"}
                onClick={() => handleSelectPatient("all")}
              >
                <div className="option-info">
                  <strong>All Clinic Patients</strong>
                  <span className="opt-sub">Aggregated view across all active records</span>
                </div>
              </div>

              {patientGroups.critical.length > 0 && (
                <div className="opt-group">
                  <div className="group-heading critical">High Risk / Critical Attention</div>
                  {patientGroups.critical.map((p) => (
                    <div
                      key={p._id || p.id}
                      className={`combobox-option ${String(selectedPatientId) === String(p.patient_code || p._id) ? "active" : ""}`}
                      role="option"
                      aria-selected={String(selectedPatientId) === String(p.patient_code || p._id)}
                      onClick={() => handleSelectPatient(p.patient_code || p._id)}
                    >
                      <div className="option-info">
                        <div className="opt-title-line">
                          <strong>{p.name}</strong>
                          <span className="badge-critical">Critical</span>
                        </div>
                        <span className="opt-sub">
                          ID: #{p.patient_code || String(p.id).padStart(6, "0")} • {p.age || 45}y • Last: {p.last_visit || "Recent"}
                        </span>
                      </div>
                      <span className="record-count-chip">{p.records_count || 1} recs</span>
                    </div>
                  ))}
                </div>
              )}

              {patientGroups.recent.length > 0 && (
                <div className="opt-group">
                  <div className="group-heading">Recently Updated</div>
                  {patientGroups.recent.map((p) => (
                    <div
                      key={p._id || p.id}
                      className={`combobox-option ${String(selectedPatientId) === String(p.patient_code || p._id) ? "active" : ""}`}
                      role="option"
                      aria-selected={String(selectedPatientId) === String(p.patient_code || p._id)}
                      onClick={() => handleSelectPatient(p.patient_code || p._id)}
                    >
                      <div className="option-info">
                        <strong>{p.name}</strong>
                        <span className="opt-sub">
                          ID: #{p.patient_code || String(p.id).padStart(6, "0")} • {p.gender || "M"} • Last: {p.last_visit || "Recent"}
                        </span>
                      </div>
                      <span className="record-count-chip">{p.records_count || 1} recs</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="opt-group">
                <div className="group-heading">All Patients</div>
                {patientGroups.all.map((p) => (
                  <div
                    key={p._id || p.id}
                    className={`combobox-option ${String(selectedPatientId) === String(p.patient_code || p._id) ? "active" : ""}`}
                    role="option"
                    aria-selected={String(selectedPatientId) === String(p.patient_code || p._id)}
                    onClick={() => handleSelectPatient(p.patient_code || p._id)}
                  >
                    <div className="option-info">
                      <strong>{p.name}</strong>
                      <span className="opt-sub">
                        ID: #{p.patient_code || String(p.id).padStart(6, "0")} • {p.condition || "General"}
                      </span>
                    </div>
                    <span className="record-count-chip">{p.records_count || 1} recs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Active Patient Clinical Summary Strip ── */}
      {currentPatientObj && (
        <section className="patient-summary-strip" aria-label="Patient Context">
          <div className="patient-avatar-badge">
            <UserCheck size={24} aria-hidden="true" />
          </div>
          <div className="patient-meta-grid">
            <div className="meta-cell">
              <span className="meta-lbl">Patient Name</span>
              <strong className="meta-val">{currentPatientObj.name}</strong>
            </div>
            <div className="meta-cell">
              <span className="meta-lbl">Unique 6-Digit ID</span>
              <strong className="meta-val code-font">
                #{currentPatientObj.patient_code || String(currentPatientObj.id).padStart(6, "0")}
              </strong>
            </div>
            <div className="meta-cell">
              <span className="meta-lbl">Demographics</span>
              <strong className="meta-val">
                {currentPatientObj.age || "—"} yrs • {currentPatientObj.gender || "—"} • {currentPatientObj.blood_group || "B+"}
              </strong>
            </div>
            <div className="meta-cell">
              <span className="meta-lbl">Known Allergies</span>
              <strong className="meta-val highlight-warn">
                {Array.isArray(currentPatientObj.allergies) && currentPatientObj.allergies.length > 0
                  ? currentPatientObj.allergies.join(", ")
                  : "None reported"}
              </strong>
            </div>
            <div className="meta-cell">
              <span className="meta-lbl">Primary Doctor</span>
              <strong className="meta-val">{currentPatientObj.primary_doctor || "Dr. Ananya Sharma"}</strong>
            </div>
          </div>
          <button
            type="button"
            className="btn-clear-patient"
            onClick={() => handleSelectPatient("all")}
            title="Reset to all patients"
          >
            Clear Patient Filter
          </button>
        </section>
      )}

      {/* ── 4 Reactive Stat Cards ── */}
      <section className="stat-cards-grid" aria-label="Clinical Metrics Overview">
        <div
          className={`stat-card ${typeFilter === "all" ? "stat-card--selected" : ""}`}
          onClick={() => setTypeFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div className="card-top">
            <span className="card-title">Total Records</span>
            <FileText size={18} className="card-icon" aria-hidden="true" />
          </div>
          <div className="card-middle">
            <span className="stat-number">{stats.records || totalRecords}</span>
            <div className="sparkline-wrapper">
              <MiniSparkline data={[12, 14, 18, 15, 22, 26, stats.records || totalRecords || 28]} color="#0d9488" />
            </div>
          </div>
          <div className="card-foot">
            <span className="delta positive">↑ 12% vs last month</span>
            <span className="period-tag">IST Real-time</span>
          </div>
        </div>

        <div
          className={`stat-card ${typeFilter === "consultation" ? "stat-card--selected" : ""}`}
          onClick={() => setTypeFilter("consultation")}
          role="button"
          tabIndex={0}
        >
          <div className="card-top">
            <span className="card-title">Consultations</span>
            <Stethoscope size={18} className="card-icon" aria-hidden="true" />
          </div>
          <div className="card-middle">
            <span className="stat-number">{stats.consultations}</span>
            <div className="sparkline-wrapper">
              <MiniSparkline data={[5, 6, 8, 7, 10, 11, stats.consultations || 14]} color="#0284c7" />
            </div>
          </div>
          <div className="card-foot">
            <span className="delta positive">↑ 8% vs last month</span>
            <span className="period-tag">OPD visits</span>
          </div>
        </div>

        <div
          className={`stat-card ${typeFilter === "prescription" ? "stat-card--selected" : ""}`}
          onClick={() => setTypeFilter("prescription")}
          role="button"
          tabIndex={0}
        >
          <div className="card-top">
            <span className="card-title">Prescriptions</span>
            <Pill size={18} className="card-icon" aria-hidden="true" />
          </div>
          <div className="card-middle">
            <span className="stat-number">{stats.prescriptions}</span>
            <div className="sparkline-wrapper">
              <MiniSparkline data={[4, 5, 7, 6, 9, 8, stats.prescriptions || 12]} color="#8b5cf6" />
            </div>
          </div>
          <div className="card-foot">
            <span className="delta neutral">Active Rx regimens</span>
            <span className="period-tag">Medications</span>
          </div>
        </div>

        <div
          className={`stat-card ${typeFilter === "diagnosis" ? "stat-card--selected" : ""}`}
          onClick={() => setTypeFilter("diagnosis")}
          role="button"
          tabIndex={0}
        >
          <div className="card-top">
            <span className="card-title">Diagnoses &amp; Labs</span>
            <Activity size={18} className="card-icon" aria-hidden="true" />
          </div>
          <div className="card-middle">
            <span className="stat-number">{stats.diagnoses}</span>
            <div className="sparkline-wrapper">
              <MiniSparkline data={[3, 4, 6, 5, 7, 8, stats.diagnoses || 9]} color="#f59e0b" />
            </div>
          </div>
          <div className="card-foot">
            <span className="delta positive">ICD-10 mapped</span>
            <span className="period-tag">EHR Verified</span>
          </div>
        </div>
      </section>

      {/* ── Toolbar: Search, Filters, Range Picker & View Toggle ── */}
      <section className="records-toolbar" aria-label="Filters and controls">
        <div className="toolbar-search-box">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search records or use type:rx, doctor:sharma, date:2026-03 (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search input"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar-filters-group">
          {/* Type Select */}
          <div className="filter-select-wrapper">
            <Filter size={15} className="filter-icon" aria-hidden="true" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by record type"
            >
              <option value="all">All Types</option>
              <option value="consultation">Consultations</option>
              <option value="diagnosis">Diagnoses</option>
              <option value="prescription">Prescriptions</option>
              <option value="checkup">Checkups</option>
            </select>
          </div>

          {/* Date Range Preset Selector */}
          <div className="date-preset-pills" role="radiogroup" aria-label="Date range presets">
            {["Today", "7d", "30d", "This month", "This year", "All"].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-btn ${activePreset === preset ? "is-active" : ""}`}
                onClick={() => handlePresetSelect(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="custom-date-inputs">
            <Calendar size={14} aria-hidden="true" />
            <input
              type="date"
              aria-label="From date"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, from: e.target.value }));
                setActivePreset("Custom");
              }}
            />
            <span>to</span>
            <input
              type="date"
              aria-label="To date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, to: e.target.value }));
                setActivePreset("Custom");
              }}
            />
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportCSV}
            title="Export filtered records as CSV"
          >
            <Download size={15} aria-hidden="true" />
            <span>CSV</span>
          </button>

          {/* View Toggle */}
          <div className="view-toggle" role="radiogroup" aria-label="View layout switcher">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "table" ? "is-active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table view"
              aria-checked={viewMode === "table"}
            >
              <Table size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "timeline" ? "is-active" : ""}`}
              onClick={() => setViewMode("timeline")}
              title="Timeline view"
              aria-checked={viewMode === "timeline"}
            >
              <Clock size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Records Content Area ── */}
      <section className="records-main-content">
        {loading ? (
          <div className="loading-state-card">
            <RefreshCw size={32} className="spin text-teal" />
            <p>Retrieving authenticated clinical records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state-card">
            <FileText size={48} className="empty-icon" />
            <h3>No clinical health records found</h3>
            <p>Try adjusting your search query, type filter, or date range.</p>
            <button type="button" className="btn-create-record" onClick={handleOpenCreateModal}>
              <Plus size={16} /> Create Record
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* TABLE VIEW */
          <div className="table-wrapper">
            <table className="clinical-records-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>Date &amp; Time</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Title &amp; Diagnosis</th>
                  <th>ICD-10</th>
                  <th>Medications</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const isExpanded = expandedRowId === (r._id || r.id);
                  const recordId = r._id || r.id;
                  return (
                    <React.Fragment key={recordId}>
                      <tr className={isExpanded ? "row-expanded" : ""}>
                        <td>
                          <button
                            type="button"
                            className="btn-row-expand"
                            onClick={() => setExpandedRowId(isExpanded ? null : recordId)}
                            aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="date-cell">
                          <span className="primary-date">{formatDateIST(r.record_date || r.recorded_at)}</span>
                          <span className="sub-time">
                            {r.record_date && r.record_date.includes("T")
                              ? r.record_date.split("T")[1]?.slice(0, 5)
                              : "10:30"}{" "}
                            IST
                          </span>
                        </td>
                        <td className="patient-cell">
                          <strong>{r.patient_name || "Patient"}</strong>
                          <span className="patient-code-tag">
                            #{r.patient_code || String(r.patient_id).padStart(6, "0")}
                          </span>
                        </td>
                        <td>{renderRecordTypeBadge(r.record_type)}</td>
                        <td className="title-cell">
                          <div className="rec-title">{r.title}</div>
                          {r.diagnosis && <div className="rec-diag">{r.diagnosis}</div>}
                        </td>
                        <td>
                          {r.icd10_code ? (
                            <span className="icd-badge">{r.icd10_code}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {r.medications && r.medications.length > 0 ? (
                            <span className="meds-count-badge">
                              <Pill size={12} /> {r.medications.length} meds
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="doctor-cell">{r.doctor_name || "Dr. Ananya Sharma"}</td>
                        <td>{renderStatusBadge(r.status)}</td>
                        <td style={{ textAlign: "right" }}>
                          <div className="row-actions-group">
                            <button
                              type="button"
                              className="btn-icon-action"
                              title="View Details"
                              onClick={() => setDrawerRecord(r)}
                              aria-label="View record details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              title="Duplicate Record"
                              onClick={() => handleDuplicate(r)}
                              aria-label="Duplicate record"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              title="Edit Record"
                              onClick={() => handleOpenEditModal(r)}
                              aria-label="Edit record"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action delete"
                              title="Delete Record"
                              onClick={() => handleDeleteRecord(recordId)}
                              aria-label="Delete record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Accordion Row */}
                      {isExpanded && (
                        <tr className="accordion-detail-row">
                          <td colSpan={10}>
                            <div className="accordion-content-inner">
                              <div className="acc-column">
                                <h4>Clinical Notes &amp; Observations</h4>
                                <p className="notes-text">{r.notes || r.description || "No additional observations noted."}</p>
                              </div>
                              <div className="acc-column">
                                <h4>Prescribed Regimens ({r.medications?.length || 0})</h4>
                                {r.medications && r.medications.length > 0 ? (
                                  <ul className="acc-meds-list">
                                    {r.medications.map((m, idx) => (
                                      <li key={idx}>
                                        <strong>{m.name}</strong> • {m.dose} • {m.frequency} ({m.duration})
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-muted">No medications prescribed in this session.</p>
                                )}
                              </div>
                              <div className="acc-column attachments-col">
                                <h4>Audit Trail &amp; Meta</h4>
                                <div className="audit-meta-line">
                                  <span>Author: {r.doctor_name || "Dr. Ananya Sharma"}</span>
                                  <span>Created: {formatDateIST(r.created_at)}</span>
                                  <span>Status: {r.status || "final"}</span>
                                </div>
                                <button
                                  type="button"
                                  className="btn-open-drawer"
                                  onClick={() => setDrawerRecord(r)}
                                >
                                  Open in Side Drawer <ChevronRight size={14} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* TIMELINE VIEW */
          <div className="timeline-view-wrapper">
            <div className="timeline-spine"></div>
            {records.map((r) => {
              const recordId = r._id || r.id;
              return (
                <div key={recordId} className="timeline-item">
                  <div className="timeline-node">{renderTypeIcon(r.record_type)}</div>
                  <div className="timeline-card">
                    <div className="card-header-line">
                      <div className="type-and-date">
                        {renderRecordTypeBadge(r.record_type)}
                        <span className="timeline-date">{formatDateIST(r.record_date || r.recorded_at)}</span>
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => setDrawerRecord(r)}
                          title="Open in side drawer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => handleOpenEditModal(r)}
                          title="Edit record"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </div>
                    <h3 className="timeline-title">{r.title}</h3>
                    <div className="timeline-patient-line">
                      <span>
                        Patient: <strong>{r.patient_name}</strong> (
                        #{r.patient_code || String(r.patient_id).padStart(6, "0")})
                      </span>
                      {r.icd10_code && <span className="icd-badge">{r.icd10_code}</span>}
                    </div>
                    {r.diagnosis && <p className="timeline-diagnosis">Diagnosis: {r.diagnosis}</p>}
                    {r.medications && r.medications.length > 0 && (
                      <div className="timeline-meds">
                        {r.medications.map((m, idx) => (
                          <span key={idx} className="timeline-med-pill">
                            {m.name} ({m.dose})
                          </span>
                        ))}
                      </div>
                    )}
                    {r.notes && <p className="timeline-notes">{r.notes}</p>}
                    <div className="timeline-footer">
                      <span>Doctor: {r.doctor_name || "Dr. Ananya Sharma"}</span>
                      {renderStatusBadge(r.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Slide-Over Side Drawer ── */}
      {drawerRecord && (
        <div className="drawer-overlay" onClick={() => setDrawerRecord(null)}>
          <div
            className="drawer-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-record-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div className="drawer-title-group">
                <span className="drawer-pretitle">Clinical Record Audit</span>
                <h2 id="drawer-record-title">{drawerRecord.title}</h2>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setDrawerRecord(null)}
                aria-label="Close record drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-summary-box">
                <div className="summary-field">
                  <span className="lbl">Patient</span>
                  <strong>{drawerRecord.patient_name}</strong>
                  <span className="sub-id">
                    #{drawerRecord.patient_code || String(drawerRecord.patient_id).padStart(6, "0")}
                  </span>
                </div>
                <div className="summary-field">
                  <span className="lbl">Type</span>
                  {renderRecordTypeBadge(drawerRecord.record_type)}
                </div>
                <div className="summary-field">
                  <span className="lbl">Date</span>
                  <strong>{formatDateIST(drawerRecord.record_date || drawerRecord.recorded_at)}</strong>
                </div>
                <div className="summary-field">
                  <span className="lbl">Status</span>
                  {renderStatusBadge(drawerRecord.status)}
                </div>
              </div>

              <div className="drawer-section">
                <h3>Primary Diagnosis &amp; ICD-10</h3>
                <p className="diag-text">{drawerRecord.diagnosis || "No primary diagnosis recorded."}</p>
                {drawerRecord.icd10_code && (
                  <div className="icd-detail-box">
                    <span className="icd-tag">{drawerRecord.icd10_code}</span>
                    <span className="icd-name">
                      {ICD10_DATABASE.find((c) => c.code === drawerRecord.icd10_code)?.name ||
                        "Standard Clinical Classification"}
                    </span>
                  </div>
                )}
              </div>

              <div className="drawer-section">
                <h3>Prescribed Medications ({drawerRecord.medications?.length || 0})</h3>
                {drawerRecord.medications && drawerRecord.medications.length > 0 ? (
                  <div className="drawer-meds-cards">
                    {drawerRecord.medications.map((m, idx) => (
                      <div key={idx} className="med-detail-card">
                        <div className="med-head">
                          <Pill size={16} className="med-icon" />
                          <strong>{m.name}</strong>
                        </div>
                        <div className="med-specs">
                          <span>Dose: {m.dose}</span>
                          <span>Freq: {m.frequency}</span>
                          <span>Duration: {m.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No prescriptions included.</p>
                )}
              </div>

              <div className="drawer-section">
                <h3>Clinical Notes &amp; Observations</h3>
                <p className="notes-box">{drawerRecord.notes || drawerRecord.description || "None recorded."}</p>
              </div>

              <div className="drawer-section">
                <h3>Audit Trail &amp; Metadata</h3>
                <div className="audit-trail-grid">
                  <div>
                    <span className="lbl">Record ID:</span>
                    <code>{drawerRecord._id || drawerRecord.id}</code>
                  </div>
                  <div>
                    <span className="lbl">Supervising Doctor:</span>
                    <span>{drawerRecord.doctor_name || "Dr. Ananya Sharma"}</span>
                  </div>
                  <div>
                    <span className="lbl">System Created:</span>
                    <span>{formatDateIST(drawerRecord.created_at)}</span>
                  </div>
                  <div>
                    <span className="lbl">Last Updated:</span>
                    <span>{formatDateIST(drawerRecord.updated_at || drawerRecord.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn-edit-drawer"
                onClick={() => {
                  const rec = drawerRecord;
                  setDrawerRecord(null);
                  handleOpenEditModal(rec);
                }}
              >
                <Edit3 size={16} /> Edit Record
              </button>
              <button
                type="button"
                className="btn-close-drawer-foot"
                onClick={() => setDrawerRecord(null)}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-Step Create / Edit Modal ── */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div
            className="modal-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="modal-title">{modalMode === "edit" ? "Edit Clinical Health Record" : "Create Clinical Health Record"}</h2>
                <span className="step-counter">
                  Step {modalStep} of 4:{" "}
                  {modalStep === 1
                    ? "Patient & Record Type"
                    : modalStep === 2
                    ? "Diagnosis & ICD-10"
                    : modalStep === 3
                    ? "Medications & Regimens"
                    : "Notes & Final Review"}
                </span>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Wizard Progress */}
            <div className="stepper-progress-bar">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`step-bubble ${modalStep === step ? "is-current" : modalStep > step ? "is-complete" : ""}`}
                >
                  <span className="bubble-num">{modalStep > step ? "✓" : step}</span>
                  <span className="bubble-lbl">
                    {step === 1 ? "Patient" : step === 2 ? "Diagnosis" : step === 3 ? "Rx" : "Finalize"}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmitModal}>
              <div className="modal-body">
                {/* STEP 1: PATIENT & RECORD TYPE */}
                {modalStep === 1 && (
                  <div className="step-form-content">
                    <div className="form-group">
                      <label htmlFor="form-patient-select">
                        Select Patient <span className="req">*</span>
                      </label>
                      <select
                        id="form-patient-select"
                        value={formData.patient_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, patient_id: e.target.value }))}
                      >
                        <option value="">-- Choose verified patient --</option>
                        {patients.map((p) => (
                          <option key={p._id || p.id} value={p.patient_code || p._id}>
                            {p.name} (#{p.patient_code || String(p.id).padStart(6, "0")}) - {p.gender}, {p.age}y
                          </option>
                        ))}
                      </select>
                      {formErrors.patient_id && <p className="form-error-msg">{formErrors.patient_id}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="form-record-type">
                        Record Type <span className="req">*</span>
                      </label>
                      <select
                        id="form-record-type"
                        value={formData.record_type}
                        onChange={(e) => setFormData((prev) => ({ ...prev, record_type: e.target.value }))}
                      >
                        <option value="CONSULTATION">Consultation (OPD Visit)</option>
                        <option value="DIAGNOSIS">Diagnosis &amp; Lab Findings</option>
                        <option value="PRESCRIPTION">Prescription Regimen</option>
                        <option value="CHECKUP">Routine Checkup / Screening</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="form-record-title">
                        Record Title / Summary <span className="req">*</span>
                      </label>
                      <input
                        id="form-record-title"
                        type="text"
                        placeholder="e.g. Hypertension Follow-up & Medication Review"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      />
                      {formErrors.title && <p className="form-error-msg">{formErrors.title}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="form-record-date">Date of Encounter</label>
                      <input
                        id="form-record-date"
                        type="date"
                        value={formData.record_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, record_date: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: DIAGNOSIS & ICD-10 */}
                {modalStep === 2 && (
                  <div className="step-form-content">
                    <div className="form-group">
                      <label htmlFor="form-diagnosis">Clinical Diagnosis / Impression <span className="req">*</span></label>
                      <textarea
                        id="form-diagnosis"
                        rows={3}
                        placeholder="Detail clinical findings, symptoms, and examination impressions..."
                        value={formData.diagnosis}
                        onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                      />
                      {formErrors.diagnosis && <p className="form-error-msg">{formErrors.diagnosis}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="form-icd10">ICD-10 Code Classification</label>
                      <select
                        id="form-icd10"
                        value={formData.icd10_code}
                        onChange={(e) => setFormData((prev) => ({ ...prev, icd10_code: e.target.value }))}
                      >
                        <option value="">-- Optional / Select ICD-10 --</option>
                        {ICD10_DATABASE.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 3: MEDICATIONS & REGIMENS */}
                {modalStep === 3 && (
                  <div className="step-form-content">
                    <div className="meds-header-line">
                      <label>Prescribed Medications ({formData.medications?.length || 0})</label>
                      <button
                        type="button"
                        className="btn-add-med"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            medications: [
                              ...prev.medications,
                              { name: "", dose: "", frequency: "Once daily (OD)", duration: "30 days", drug_class: "General" }
                            ]
                          }))
                        }
                      >
                        <Plus size={14} /> Add Medication
                      </button>
                    </div>

                    {(!formData.medications || formData.medications.length === 0) ? (
                      <p className="no-meds-msg">No medications added yet. Click "+ Add Medication" to prescribe.</p>
                    ) : (
                      <div className="meds-form-list">
                        {formData.medications.map((med, index) => (
                          <div key={index} className="med-row-card">
                            <div className="med-row-inputs">
                              <input
                                type="text"
                                placeholder="Medication Name (e.g. Telmisartan)"
                                value={med.name}
                                onChange={(e) => {
                                  const updated = [...formData.medications];
                                  updated[index] = { ...updated[index], name: e.target.value };
                                  setFormData((prev) => ({ ...prev, medications: updated }));
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Dose (e.g. 40 mg)"
                                value={med.dose}
                                onChange={(e) => {
                                  const updated = [...formData.medications];
                                  updated[index] = { ...updated[index], dose: e.target.value };
                                  setFormData((prev) => ({ ...prev, medications: updated }));
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Frequency (e.g. OD)"
                                value={med.frequency}
                                onChange={(e) => {
                                  const updated = [...formData.medications];
                                  updated[index] = { ...updated[index], frequency: e.target.value };
                                  setFormData((prev) => ({ ...prev, medications: updated }));
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Duration (e.g. 30 days)"
                                value={med.duration}
                                onChange={(e) => {
                                  const updated = [...formData.medications];
                                  updated[index] = { ...updated[index], duration: e.target.value };
                                  setFormData((prev) => ({ ...prev, medications: updated }));
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="btn-remove-med"
                              onClick={() => {
                                const updated = formData.medications.filter((_, i) => i !== index);
                                setFormData((prev) => ({ ...prev, medications: updated }));
                              }}
                              title="Remove medication"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: NOTES & FINALIZE */}
                {modalStep === 4 && (
                  <div className="step-form-content">
                    <div className="form-group">
                      <label htmlFor="form-notes">Doctor Notes &amp; Recommendations</label>
                      <textarea
                        id="form-notes"
                        rows={4}
                        placeholder="Special instructions, dietary restrictions, next review date..."
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="form-status">Record Status</label>
                      <select
                        id="form-status"
                        value={formData.status}
                        onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="final">Final (Verified &amp; Committed)</option>
                        <option value="draft">Draft (Preliminary notes)</option>
                        <option value="amended">Amended (Correction applied)</option>
                      </select>
                    </div>

                    <div className="final-review-summary">
                      <h4>Record Summary Before Submission</h4>
                      <p>
                        <strong>Patient:</strong>{" "}
                        {patients.find((p) => String(p.patient_code || p._id) === String(formData.patient_id))?.name || formData.patient_id}
                      </p>
                      <p>
                        <strong>Type:</strong> {formData.record_type}
                      </p>
                      <p>
                        <strong>Title:</strong> {formData.title}
                      </p>
                      <p>
                        <strong>Diagnosis:</strong> {formData.diagnosis}
                      </p>
                      <p>
                        <strong>ICD-10:</strong> {formData.icd10_code || "None"}
                      </p>
                      <p>
                        <strong>Prescriptions:</strong> {formData.medications?.filter((m) => m.name)?.length || 0} items
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {modalStep > 1 && (
                  <button
                    type="button"
                    className="btn-modal-back"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                )}

                {modalStep < 4 ? (
                  <button
                    type="button"
                    className="btn-modal-next"
                    onClick={handleNextStep}
                  >
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-modal-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Committing..." : modalMode === "edit" ? "Save Changes" : "Commit Record"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Undo Toast ── */}
      {toastMessage && (
        <div className="toast-notification" role="status" aria-live="polite">
          <span>{toastMessage.text}</span>
          {toastMessage.canUndo && toastMessage.recId && (
            <button
              type="button"
              className="toast-undo-btn"
              onClick={() => handleUndoDelete(toastMessage.recId)}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss toast notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
