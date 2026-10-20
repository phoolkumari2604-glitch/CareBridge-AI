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
  ChevronLeft,
  ChevronUp,
  Table,
  Upload,
  TrendingUp,
  Clock,
  Layers,
  ShieldAlert,
  User,
  UserCheck,
  Activity,
  Filter,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import { useAuth } from "../../context/AuthContext";
import BodyExplorer from "../../phase2-internal-organs";
import "./HealthRecords.css";

const ICD10_DATABASE = [
  { code: "I10", name: "Essential (primary) hypertension", label: "Essential (primary) hypertension", category: "Cardiovascular" },
  { code: "E11.9", name: "Type 2 diabetes mellitus without complications", label: "Type 2 diabetes mellitus without complications", category: "Endocrine" },
  { code: "J45.909", name: "Unspecified asthma, uncomplicated", label: "Unspecified asthma, uncomplicated", category: "Respiratory" },
  { code: "I48.0", name: "Paroxysmal atrial fibrillation", label: "Paroxysmal atrial fibrillation", category: "Cardiovascular" },
  { code: "N18.2", name: "Chronic kidney disease, stage 2 (mild)", label: "Chronic kidney disease, stage 2 (mild)", category: "Renal" },
  { code: "E03.9", name: "Hypothyroidism, unspecified", label: "Hypothyroidism, unspecified", category: "Endocrine" },
  { code: "K21.9", name: "Gastro-esophageal reflux disease without esophagitis", label: "Gastro-esophageal reflux disease without esophagitis", category: "Gastrointestinal" },
  { code: "M17.12", name: "Primary osteoarthritis of left knee", label: "Primary osteoarthritis of left knee", category: "Musculoskeletal" },
  { code: "J20.9", name: "Acute bronchitis, unspecified", label: "Acute bronchitis, unspecified", category: "Respiratory" },
  { code: "E78.5", name: "Hyperlipidemia, unspecified", label: "Hyperlipidemia, unspecified", category: "Metabolic" },
  { code: "K29.70", name: "Gastritis, unspecified, without bleeding", label: "Gastritis, unspecified, without bleeding", category: "Gastrointestinal" },
  { code: "R05.9", name: "Cough, unspecified", label: "Cough, unspecified", category: "Symptom" },
  { code: "J18.9", name: "Pneumonia, unspecified organism", label: "Pneumonia, unspecified organism", category: "Respiratory" },
  { code: "I25.10", name: "Atherosclerotic heart disease without angina", label: "Atherosclerotic heart disease without angina", category: "Cardiovascular" },
  { code: "N39.0", name: "Urinary tract infection, site not specified", label: "Urinary tract infection, site not specified", category: "Renal" },
  { code: "D64.9", name: "Anemia, unspecified", label: "Anemia, unspecified", category: "Hematology" },
  { code: "G43.909", name: "Migraine, unspecified, not intractable", label: "Migraine, unspecified, not intractable", category: "Neurology" },
  { code: "E55.9", name: "Vitamin D deficiency, unspecified", label: "Vitamin D deficiency, unspecified", category: "Metabolic" },
  { code: "J02.9", name: "Acute pharyngitis, unspecified", label: "Acute pharyngitis, unspecified", category: "Respiratory" },
  { code: "M54.50", name: "Low back pain, unspecified", label: "Low back pain, unspecified", category: "Musculoskeletal" }
];

const toDDMMYYYY = (isoStr) => {
  if (!isoStr) return "";
  const parts = String(isoStr).split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
  }
  return isoStr;
};

const toISODate = (dmyStr) => {
  if (!dmyStr) return "";
  const parts = String(dmyStr).trim().split(/[/.-]/);
  if (parts.length === 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    let y = parts[2];
    if (y.length === 2) y = `20${y}`;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1970 && year <= 2100) {
      return `${year}-${m}-${d}`;
    }
  }
  return "";
};

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

/**
 * Custom Styled Date-Range Picker
 * Dropdown calendar with start/end selection, dark mode support, mobile friendly,
 * clear dd/mm/yyyy format, and prevention of end date before start date.
 */
function DateRangePicker({ dateRange, onChange, onClear, activePreset }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    if (dateRange.from) {
      const d = new Date(dateRange.from);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [tempFrom, setTempFrom] = useState(dateRange.from || "");
  const [tempTo, setTempTo] = useState(dateRange.to || "");
  const [selectingPhase, setSelectingPhase] = useState("start");
  const [manualFromText, setManualFromText] = useState(toDDMMYYYY(dateRange.from));
  const [manualToText, setManualToText] = useState(toDDMMYYYY(dateRange.to));
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setTempFrom(dateRange.from || "");
    setTempTo(dateRange.to || "");
    setManualFromText(toDDMMYYYY(dateRange.from));
    setManualToText(toDDMMYYYY(dateRange.to));
    setValidationError("");
    if (dateRange.from) {
      const d = new Date(dateRange.from);
      if (!isNaN(d.getTime())) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDayClick = (dayNum) => {
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(dayNum).padStart(2, "0");
    const clickedISO = `${year}-${mStr}-${dStr}`;
    setValidationError("");

    if (selectingPhase === "start" || (tempFrom && tempTo)) {
      setTempFrom(clickedISO);
      setTempTo("");
      setManualFromText(toDDMMYYYY(clickedISO));
      setManualToText("");
      setSelectingPhase("end");
    } else {
      // Selecting end date: strictly prevent end date before start date
      if (clickedISO < tempFrom) {
        setValidationError("End date cannot be earlier than start date.");
        return;
      }
      setTempTo(clickedISO);
      setManualToText(toDDMMYYYY(clickedISO));
      setSelectingPhase("start");
    }
  };

  const handleManualFromInput = (e) => {
    const val = e.target.value;
    setManualFromText(val);
    setValidationError("");
    const iso = toISODate(val);
    if (iso) {
      setTempFrom(iso);
      if (tempTo && iso > tempTo) {
        setValidationError("Start date cannot be after end date.");
      }
    }
  };

  const handleManualToInput = (e) => {
    const val = e.target.value;
    setManualToText(val);
    setValidationError("");
    const iso = toISODate(val);
    if (iso) {
      if (tempFrom && iso < tempFrom) {
        setValidationError("End date cannot be earlier than start date.");
      } else {
        setTempTo(iso);
      }
    }
  };

  const handleApply = (e) => {
    e.stopPropagation();
    let finalFrom = tempFrom;
    let finalTo = tempTo;

    if (manualFromText && !finalFrom) {
      finalFrom = toISODate(manualFromText);
    }
    if (manualToText && !finalTo) {
      finalTo = toISODate(manualToText);
    }

    if (finalFrom && finalTo && finalTo < finalFrom) {
      setValidationError("End date cannot be earlier than start date.");
      return;
    }

    onChange({ from: finalFrom, to: finalTo });
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setTempFrom("");
    setTempTo("");
    setManualFromText("");
    setManualToText("");
    setValidationError("");
    onClear();
    setIsOpen(false);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  let displayLabel = "All Dates (dd/mm/yyyy)";
  if (dateRange.from && dateRange.to) {
    displayLabel = `${toDDMMYYYY(dateRange.from)} — ${toDDMMYYYY(dateRange.to)}`;
  } else if (dateRange.from) {
    displayLabel = `From ${toDDMMYYYY(dateRange.from)}`;
  } else if (dateRange.to) {
    displayLabel = `Up to ${toDDMMYYYY(dateRange.to)}`;
  }

  const hasSelectedRange = Boolean(dateRange.from || dateRange.to);

  return (
    <div className="date-range-picker-container" ref={containerRef}>
      <button
        type="button"
        className={`date-picker-trigger-btn ${isOpen ? "is-open" : ""} ${hasSelectedRange ? "has-range" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Select date range filter in dd/mm/yyyy"
      >
        <Calendar size={14} className="calendar-icon text-teal" aria-hidden="true" />
        <span className="trigger-display-text">{displayLabel}</span>
        {hasSelectedRange && (
          <span
            role="button"
            className="btn-trigger-clear"
            title="Clear date range filter"
            onClick={(e) => {
              e.stopPropagation();
              handleClear(e);
            }}
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown size={14} className={`chevron-indicator ${isOpen ? "rotate" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="date-picker-popover-card" role="dialog" aria-label="Date range calendar">
          <div className="picker-header-inputs">
            <div className="input-field-group">
              <label>From (dd/mm/yyyy)</label>
              <input
                type="text"
                placeholder="dd/mm/yyyy"
                value={manualFromText}
                onChange={handleManualFromInput}
                maxLength={10}
              />
            </div>
            <span className="inputs-sep">to</span>
            <div className="input-field-group">
              <label>To (dd/mm/yyyy)</label>
              <input
                type="text"
                placeholder="dd/mm/yyyy"
                value={manualToText}
                onChange={handleManualToInput}
                maxLength={10}
              />
            </div>
          </div>

          {validationError && (
            <div className="picker-error-banner" role="alert">
              <ShieldAlert size={14} />
              <span>{validationError}</span>
            </div>
          )}

          <div className="calendar-month-bar">
            <button
              type="button"
              className="btn-month-nav"
              onClick={prevMonth}
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <strong className="month-heading">
              {monthNames[month]} {year}
            </strong>
            <button
              type="button"
              className="btn-month-nav"
              onClick={nextMonth}
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-weekdays-row" aria-hidden="true">
            {dayHeaders.map((dh) => (
              <span key={dh} className="weekday-header">
                {dh}
              </span>
            ))}
          </div>

          <div className="calendar-days-grid" role="grid">
            {Array.from({ length: firstDayIndex }).map((_, padIdx) => (
              <span key={`pad-${padIdx}`} className="calendar-day-pad" aria-hidden="true" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mStr = String(month + 1).padStart(2, "0");
              const dStr = String(day).padStart(2, "0");
              const dayISO = `${year}-${mStr}-${dStr}`;

              const isStart = tempFrom === dayISO;
              const isEnd = tempTo === dayISO;
              const isInRange = tempFrom && tempTo && dayISO > tempFrom && dayISO < tempTo;
              const isBeforeStart = selectingPhase === "end" && tempFrom && dayISO < tempFrom;
              const isToday =
                `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` === dayISO;

              return (
                <button
                  key={day}
                  type="button"
                  className={`calendar-day-cell ${isStart ? "is-start" : ""} ${isEnd ? "is-end" : ""} ${isInRange ? "is-in-range" : ""} ${isToday ? "is-today" : ""} ${isBeforeStart ? "is-disabled-before" : ""}`}
                  onClick={() => handleDayClick(day)}
                  disabled={isBeforeStart}
                  title={isBeforeStart ? "End date cannot be earlier than start date" : toDDMMYYYY(dayISO)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="picker-popover-footer">
            <button type="button" className="btn-picker-clear" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="btn-picker-apply" onClick={handleApply}>
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HealthRecords() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPatient = searchParams.get("patient") || searchParams.get("patientId");
  const initialPatient = urlPatient || sessionStorage.getItem("carebridge_last_patient") || "all";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatient);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const comboboxRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ records: 0, consultations: 0, prescriptions: 0, diagnoses: 0, checkups: 0, icd10_mapped: 0 });
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date().toLocaleTimeString("en-GB"));

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: initialFrom, to: initialTo });
  // Default range is "All" (never hardcoded old date)
  const [activePreset, setActivePreset] = useState(initialFrom || initialTo ? null : "All");
  const [viewMode, setViewMode] = useState("table");
  const [uploadingFile, setUploadingFile] = useState(false);
  const searchInputRef = useRef(null);

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ICD-10 Search Combobox state inside modal
  const [icdSearchText, setIcdSearchText] = useState("");
  const [icdDropdownOpen, setIcdDropdownOpen] = useState(false);
  const icdComboboxRef = useRef(null);

  const [formData, setFormData] = useState({
    patient_id: "",
    record_type: "DIAGNOSIS",
    title: "",
    diagnosis: "",
    icd10_code: "",
    medications: [],
    notes: "",
    status: "final",
    is_abnormal: false,
    record_date: new Date().toISOString().split("T")[0],
    attachments: []
  });

  const doctorDisplayName = user?.name
    ? (user.name.startsWith("Dr.") ? user.name : `Dr. ${user.name}`)
    : "Dr. Ananya Sharma";

  // Click outside patient combobox
  useEffect(() => {
    function handleClickOutside(event) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setComboboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Click outside ICD combobox
  useEffect(() => {
    function handleIcdOutside(e) {
      if (icdComboboxRef.current && !icdComboboxRef.current.contains(e.target)) {
        setIcdDropdownOpen(false);
      }
    }
    if (icdDropdownOpen) {
      document.addEventListener("mousedown", handleIcdOutside);
    }
    return () => document.removeEventListener("mousedown", handleIcdOutside);
  }, [icdDropdownOpen]);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setComboboxOpen(false);
        setIcdDropdownOpen(false);
        if (searchQuery) setSearchQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  // Sync URL patient param
  useEffect(() => {
    const urlPid = searchParams.get("patient") || searchParams.get("patientId");
    if (urlPid && urlPid !== selectedPatientId) {
      setSelectedPatientId(urlPid);
      sessionStorage.setItem("carebridge_last_patient", urlPid);
    }
  }, [searchParams, selectedPatientId]);

  // Fetch real patients list
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

  // Fetch health records with active filters
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

  // Auto-sync polling every 30s
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

  // Preset Chips click handler
  const handlePresetSelect = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const format = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

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
    setCurrentPage(1);

    const newParams = new URLSearchParams(searchParams);
    if (fromStr) newParams.set("from", fromStr); else newParams.delete("from");
    if (toStr) newParams.set("to", toStr); else newParams.delete("to");
    setSearchParams(newParams);
  };

  // Manual date change from custom date-range picker: clears chip highlight!
  const handleDateRangeChange = ({ from, to }) => {
    setDateRange({ from, to });
    setActivePreset(null); // Clear chip highlight
    setCurrentPage(1);

    const newParams = new URLSearchParams(searchParams);
    if (from) newParams.set("from", from); else newParams.delete("from");
    if (to) newParams.set("to", to); else newParams.delete("to");
    setSearchParams(newParams);
  };

  const handleDateRangeClear = () => {
    handlePresetSelect("All");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    handleSelectPatient("all");
    handlePresetSelect("All");
    setCurrentPage(1);
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

  const filteredIcdList = useMemo(() => {
    const q = (icdSearchText || "").toLowerCase().trim();
    if (!q) return ICD10_DATABASE.slice(0, 10);
    return ICD10_DATABASE.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q)
    );
  }, [icdSearchText]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const res = await doctorService.uploadRecordAttachment(file);
      if (res && res.file_url) {
        const newAtt = {
          file_name: res.file_name || file.name,
          file_url: res.file_url,
          size_bytes: res.size_bytes || file.size
        };
        setFormData((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAtt],
          file_url: res.file_url,
          file_name: res.file_name || file.name
        }));
        setToastMessage({ text: `Attachment "${file.name}" uploaded successfully.` });
      }
    } catch (err) {
      alert("Failed to upload document: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingRecordId(null);
    setFormErrors({});
    setIcdSearchText("");
    setIcdDropdownOpen(false);

    const defaultPatient =
      selectedPatientId !== "all"
        ? selectedPatientId
        : (patients[0]?.patient_code || "");

    setFormData({
      patient_id: defaultPatient,
      record_type: "DIAGNOSIS",
      title: "",
      diagnosis: "",
      icd10_code: "",
      medications: [],
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
    const recId = rec._id || rec.id;
    setEditingRecordId(recId);
    setFormErrors({});
    setIcdSearchText(rec.icd10_code ? `${rec.icd10_code} - ${rec.diagnosis || ""}` : "");
    setIcdDropdownOpen(false);

    let mappedType = (rec.record_type || "DIAGNOSIS").toUpperCase();
    if (mappedType === "LAB") mappedType = "LAB_REPORT";
    if (mappedType === "SCAN") mappedType = "IMAGING";
    if (mappedType === "VISIT_NOTE") mappedType = "CONSULTATION";

    setFormData({
      patient_id: rec.patient_code || rec.patient_id || "",
      record_type: mappedType,
      title: rec.title || "",
      diagnosis: rec.diagnosis || "",
      icd10_code: rec.icd10_code || "",
      medications: Array.isArray(rec.medications) ? rec.medications : [],
      notes: rec.notes || rec.description || "",
      status: rec.status || "final",
      is_abnormal: Boolean(rec.is_abnormal),
      record_date: (rec.record_date || "").split("T")[0] || new Date().toISOString().split("T")[0],
      attachments: Array.isArray(rec.attachments) ? rec.attachments : []
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (rec) => {
    setModalMode("create");
    setEditingRecordId(null);
    setFormErrors({});
    setIcdSearchText(rec.icd10_code ? `${rec.icd10_code} - ${rec.diagnosis || ""}` : "");
    setIcdDropdownOpen(false);

    let mappedType = (rec.record_type || "DIAGNOSIS").toUpperCase();
    if (mappedType === "LAB") mappedType = "LAB_REPORT";
    if (mappedType === "SCAN") mappedType = "IMAGING";
    if (mappedType === "VISIT_NOTE") mappedType = "CONSULTATION";

    setFormData({
      patient_id: rec.patient_code || rec.patient_id,
      record_type: mappedType,
      title: `Copy of ${rec.title}`,
      diagnosis: rec.diagnosis || "",
      icd10_code: rec.icd10_code || "",
      medications: Array.isArray(rec.medications) ? rec.medications : [],
      notes: rec.notes || rec.description || "",
      status: "draft",
      is_abnormal: Boolean(rec.is_abnormal),
      record_date: new Date().toISOString().split("T")[0],
      attachments: Array.isArray(rec.attachments) ? rec.attachments : []
    });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (recId) => {
    if (!recId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this clinical health record? An audit entry will be recorded."
    );
    if (!confirmed) return;

    try {
      await doctorService.deleteHealthRecord(recId);
      setToastMessage({
        text: "Clinical health record deleted successfully.",
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
      setToastMessage({ text: "Clinical health record restored successfully.", canUndo: false });
      fetchRecords(true);
    } catch (err) {
      console.error("Failed to restore record:", err);
    }
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.patient_id) {
      errs.patient_id = "Please select a patient.";
    }
    if (!formData.title || !formData.title.trim()) {
      errs.title = "Record title is required.";
    }
    if (!formData.record_date) {
      errs.record_date = "Encounter date is required.";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanMeds = (formData.medications || []).filter((m) => m.name && m.name.trim());
      const payload = {
        ...formData,
        doctor_name: doctorDisplayName,
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
      fetchRecords(true); // Instant refresh of records and counters!
    } catch (err) {
      alert("Submission error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export strictly exporting the filtered records
  const handleExportCSV = () => {
    if (!records || records.length === 0) {
      setToastMessage({ text: "No filtered records to export." });
      return;
    }

    const headers = [
      "Record ID",
      "Encounter Date",
      "Patient Name",
      "Patient ID (6-digit)",
      "Record Type",
      "Title",
      "Diagnosis",
      "ICD-10 Code",
      "Medications",
      "Doctor",
      "Status",
      "Notes"
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = records.map((r) => {
      const medsStr = Array.isArray(r.medications)
        ? r.medications.map((m) => `${m.name} ${m.dose || ""} (${m.frequency || ""})`).join("; ")
        : "";
      return [
        escapeCSV(r._id || r.id),
        escapeCSV(r.record_date || r.recorded_at || ""),
        escapeCSV(r.patient_name || ""),
        escapeCSV(r.patient_code || ""),
        escapeCSV(r.record_type || ""),
        escapeCSV(r.title || ""),
        escapeCSV(r.diagnosis || ""),
        escapeCSV(r.icd10_code || ""),
        escapeCSV(medsStr),
        escapeCSV(r.doctor_name || ""),
        escapeCSV(r.status || ""),
        escapeCSV(r.notes || r.description || "")
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `CareBridge_Health_Records_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage({ text: `Exported ${records.length} filtered records to CSV.` });
  };

  // Helper renderers
  const renderRecordTypeBadge = (type) => {
    const t = (type || "").toUpperCase();
    const map = {
      CONSULTATION: { label: "Visit Note", cls: "badge-consultation", icon: Stethoscope },
      DIAGNOSIS: { label: "Diagnosis", cls: "badge-diagnosis", icon: Activity },
      PRESCRIPTION: { label: "Prescription", cls: "badge-prescription", icon: Pill },
      LAB_REPORT: { label: "Lab Report", cls: "badge-checkup", icon: FileText },
      LAB: { label: "Lab Report", cls: "badge-checkup", icon: FileText },
      IMAGING: { label: "Imaging", cls: "badge-checkup", icon: Layers },
      SCAN: { label: "Imaging", cls: "badge-checkup", icon: Layers },
      CHECKUP: { label: "Checkup", cls: "badge-checkup", icon: ShieldAlert }
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
    const t = (type || "").toUpperCase();
    if (t === "CONSULTATION" || t === "VISIT_NOTE") return <Stethoscope size={16} />;
    if (t === "DIAGNOSIS") return <Activity size={16} />;
    if (t === "PRESCRIPTION") return <Pill size={16} />;
    if (t === "IMAGING" || t === "SCAN") return <Layers size={16} />;
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

  const hasActiveFilters = Boolean(
    searchQuery.trim() || typeFilter !== "all" || dateRange.from || dateRange.to || selectedPatientId !== "all"
  );

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
              <strong className="meta-val">{currentPatientObj.primary_doctor || doctorDisplayName}</strong>
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

      {/* ── 3D Internal Organs & Problem Pins Visualizer (Doctor & Patient Shared) ── */}
      <section style={{ margin: "20px 0" }} aria-label="Interactive Organ Viewer and Clinical Problem Markers">
        <BodyExplorer
          vitals={currentPatientObj?.vitals || {}}
          alerts={currentPatientObj?.alerts || []}
          healthProfile={currentPatientObj}
          healthRecords={records}
          activePatientId={currentPatientObj?.patient_code || currentPatientObj?._id || currentPatientObj?.id || selectedPatientId}
        />
      </section>

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
            <span className="delta positive">Live Database</span>
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
            <span className="card-title">Visit Notes</span>
            <Stethoscope size={18} className="card-icon" aria-hidden="true" />
          </div>
          <div className="card-middle">
            <span className="stat-number">{stats.consultations}</span>
            <div className="sparkline-wrapper">
              <MiniSparkline data={[5, 6, 8, 7, 10, 11, stats.consultations || 14]} color="#0284c7" />
            </div>
          </div>
          <div className="card-foot">
            <span className="delta positive">Encounters</span>
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
            <span className="delta positive">ICD-10 mapped ({stats.icd10_mapped || stats.diagnoses})</span>
            <span className="period-tag">EHR Verified</span>
          </div>
        </div>
      </section>

      {/* ── Toolbar: Search, Filters, Styled Range Picker & View Toggle ── */}
      <section className="records-toolbar" aria-label="Filters and controls">
        <div className="toolbar-search-box">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search records by title, patient, diagnosis, ICD-10... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
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
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by record type"
            >
              <option value="all">All Types</option>
              <option value="diagnosis">Diagnoses</option>
              <option value="prescription">Prescriptions</option>
              <option value="lab_report">Lab Reports</option>
              <option value="imaging">Imaging</option>
              <option value="consultation">Visit Notes</option>
              <option value="checkup">Checkups</option>
            </select>
          </div>

          {/* Date Range Preset Selector Chips */}
          <div className="date-preset-pills" role="radiogroup" aria-label="Date range presets">
            {["Today", "7d", "30d", "This month", "This year", "All"].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-btn ${activePreset === preset ? "is-active active" : ""}`}
                onClick={() => handlePresetSelect(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom Styled Date Range Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onChange={handleDateRangeChange}
            onClear={handleDateRangeClear}
            activePreset={activePreset}
          />

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
              className={`toggle-btn ${viewMode === "table" ? "is-active active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table view"
              aria-checked={viewMode === "table"}
            >
              <Table size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "timeline" ? "is-active active" : ""}`}
              onClick={() => setViewMode("timeline")}
              title="Timeline view"
              aria-checked={viewMode === "timeline"}
            >
              <Clock size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Results Count and Reset Filters Bar ── */}
      <div className="records-summary-counter-bar">
        <div className="counter-left">
          <span className="results-count-text">
            Showing <strong>{records.length}</strong> {records.length === 1 ? "record" : "records"}
            {totalRecords > records.length ? ` of ${totalRecords} total` : ""}
            {selectedPatientId !== "all" && currentPatientObj ? ` for ${currentPatientObj.name} (#${currentPatientObj.patient_code})` : ""}
          </span>
          {typeFilter !== "all" && (
            <span className="filter-pill-tag">
              Type: {typeFilter}
              <button type="button" onClick={() => setTypeFilter("all")}>
                <X size={11} />
              </button>
            </span>
          )}
          {(dateRange.from || dateRange.to) && (
            <span className="filter-pill-tag">
              Date: {toDDMMYYYY(dateRange.from) || "Any"} — {toDDMMYYYY(dateRange.to) || "Any"}
              <button type="button" onClick={handleDateRangeClear}>
                <X size={11} />
              </button>
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn-reset-filters-inline" onClick={handleResetFilters}>
            <RefreshCw size={12} /> Reset filters
          </button>
        )}
      </div>

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
            <p>
              {hasActiveFilters
                ? "No records match the current filters or date range."
                : "No clinical health records found in registry."}
            </p>
            <div className="empty-state-actions">
              {hasActiveFilters && (
                <button type="button" className="btn-reset-filters" onClick={handleResetFilters}>
                  <RefreshCw size={14} /> Reset filters
                </button>
              )}
              <button type="button" className="btn-create-record" onClick={handleOpenCreateModal}>
                <Plus size={16} /> Create Record
              </button>
            </div>
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
                        <td className="doctor-cell">{r.doctor_name || doctorDisplayName}</td>
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
                                  <span>Author: {r.doctor_name || doctorDisplayName}</span>
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
                          aria-label="View record details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => handleOpenEditModal(r)}
                          title="Edit record"
                          aria-label="Edit record"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action delete"
                          onClick={() => handleDeleteRecord(recordId)}
                          title="Delete record"
                          aria-label="Delete record"
                        >
                          <Trash2 size={15} />
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
                      <span>Doctor: {r.doctor_name || doctorDisplayName}</span>
                      {renderStatusBadge(r.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination Bar ── */}
        {!loading && records.length > 0 && (
          <div className="records-pagination-bar">
            <div className="pagination-info">
              Showing <strong>{((currentPage - 1) * limit) + 1}</strong> - <strong>{Math.min(currentPage * limit, totalRecords)}</strong> of <strong>{totalRecords}</strong> clinical records
            </div>
            <div className="pagination-controls">
              <div className="page-size-select">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Records per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="page-buttons">
                <button
                  type="button"
                  className="btn-page-nav"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
                </span>
                <button
                  type="button"
                  className="btn-page-nav"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
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
                          <span>Dose: {m.dose || "—"}</span>
                          <span>Freq: {m.frequency || "—"}</span>
                          <span>Duration: {m.duration || "—"}</span>
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
                <h3>Attached Clinical Documents &amp; Lab Reports</h3>
                {drawerRecord.attachments && drawerRecord.attachments.length > 0 ? (
                  <div className="drawer-attachments-list">
                    {drawerRecord.attachments.map((att, attIdx) => {
                      const fileUrl = att.file_url || `/api/health-records/files/${att.file_name}`;
                      return (
                        <div key={attIdx} className="attachment-card">
                          <div className="attachment-info">
                            <FileText size={18} className="att-icon" />
                            <div>
                              <strong className="att-name">{att.file_name || "Clinical_Report.pdf"}</strong>
                              <span className="att-size">
                                {att.size_bytes ? `${Math.round(att.size_bytes / 1024)} KB` : "Document"}
                              </span>
                            </div>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-download-att"
                            download={att.file_name || "Clinical_Report.pdf"}
                          >
                            <Download size={14} /> Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : drawerRecord.file_url ? (
                  <div className="drawer-attachments-list">
                    <div className="attachment-card">
                      <div className="attachment-info">
                        <FileText size={18} className="att-icon" />
                        <div>
                          <strong className="att-name">{drawerRecord.file_name || "Clinical_Report.pdf"}</strong>
                          <span className="att-size">Document</span>
                        </div>
                      </div>
                      <a
                        href={drawerRecord.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-download-att"
                        download={drawerRecord.file_name || "Clinical_Report.pdf"}
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">No external documents attached to this record.</p>
                )}
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
                    <span>{drawerRecord.doctor_name || doctorDisplayName}</span>
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
                className="btn-delete-drawer"
                onClick={() => {
                  const recId = drawerRecord._id || drawerRecord.id;
                  setDrawerRecord(null);
                  handleDeleteRecord(recId);
                }}
              >
                <Trash2 size={16} /> Delete Record
              </button>
              <button
                type="button"
                className="btn-close-drawer-foot"
                onClick={() => setDrawerRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Create / Edit Modal ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-container modal-unified-layout"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="modal-title">
                  {modalMode === "edit" ? "Edit Clinical Health Record" : "Create Clinical Health Record"}
                </h2>
                <p className="modal-subtitle">
                  Authenticated clinical entry • Verified 6-digit patient chart • Instant database sync
                </p>
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

            <form onSubmit={handleSubmitModal}>
              <div className="modal-body modal-scrollable-body">
                {/* Row 1: Patient Selection & Record Type */}
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label htmlFor="form-patient-select">
                      Patient <span className="req">*</span>
                    </label>
                    <select
                      id="form-patient-select"
                      value={formData.patient_id}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, patient_id: e.target.value }));
                        if (formErrors.patient_id) setFormErrors((prev) => ({ ...prev, patient_id: null }));
                      }}
                    >
                      <option value="">-- Choose verified patient (6-digit ID) --</option>
                      {patients.map((p) => {
                        const code = String(p.patient_code || p.patient_id_code || "").padStart(6, "0");
                        return (
                          <option key={p._id || p.id} value={code}>
                            {p.name} (ID: #{code})
                          </option>
                        );
                      })}
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
                      <option value="DIAGNOSIS">Diagnosis</option>
                      <option value="PRESCRIPTION">Prescription/Rx</option>
                      <option value="LAB_REPORT">Lab</option>
                      <option value="IMAGING">Imaging</option>
                      <option value="CONSULTATION">Visit Note</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Title & Encounter Date */}
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label htmlFor="form-record-title">
                      Title <span className="req">*</span>
                    </label>
                    <input
                      id="form-record-title"
                      type="text"
                      placeholder="e.g. Essential Hypertension Clinical Evaluation"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, title: e.target.value }));
                        if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: null }));
                      }}
                    />
                    {formErrors.title && <p className="form-error-msg">{formErrors.title}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="form-record-date">
                      Encounter Date <span className="req">*</span>
                    </label>
                    <input
                      id="form-record-date"
                      type="date"
                      value={formData.record_date}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, record_date: e.target.value }));
                        if (formErrors.record_date) setFormErrors((prev) => ({ ...prev, record_date: null }));
                      }}
                    />
                    {formErrors.record_date && <p className="form-error-msg">{formErrors.record_date}</p>}
                  </div>
                </div>

                {/* Row 3: Supervising Doctor & Record Status */}
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label>Doctor (Auto-Assigned)</label>
                    <div className="doctor-badge-field">
                      <Stethoscope size={16} className="doctor-badge-icon" />
                      <span className="doctor-badge-name">{doctorDisplayName}</span>
                      <span className="doctor-auth-pill">Authenticated</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="form-status">Record Status</label>
                    <select
                      id="form-status"
                      value={formData.status}
                      onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="final">Final (Committed &amp; Verified)</option>
                      <option value="draft">Draft (Preliminary notes)</option>
                      <option value="amended">Amended (Correction applied)</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Searchable ICD-10 Code Classification */}
                <div className="form-group icd-combobox-group" ref={icdComboboxRef}>
                  <div className="label-with-clear">
                    <label htmlFor="modal-icd-search">
                      ICD-10 Code Classification <span className="helper-hint">(Searchable by code or condition)</span>
                    </label>
                    {formData.icd10_code && (
                      <button
                        type="button"
                        className="btn-clear-icd-link"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, icd10_code: "" }));
                          setIcdSearchText("");
                        }}
                      >
                        Clear ICD-10
                      </button>
                    )}
                  </div>
                  <div className="icd-input-wrapper">
                    <Search size={15} className="icd-search-icon" aria-hidden="true" />
                    <input
                      id="modal-icd-search"
                      type="text"
                      placeholder="Type ICD-10 code or condition (e.g. I10, diabetes, asthma)..."
                      value={icdSearchText}
                      onChange={(e) => {
                        setIcdSearchText(e.target.value);
                        setIcdDropdownOpen(true);
                      }}
                      onFocus={() => setIcdDropdownOpen(true)}
                      autoComplete="off"
                    />
                    {formData.icd10_code && (
                      <span className="selected-icd-chip">
                        <span className="chip-code">{formData.icd10_code}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, icd10_code: "" }));
                            setIcdSearchText("");
                          }}
                          aria-label="Remove code"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                  </div>

                  {icdDropdownOpen && (
                    <div className="icd-dropdown-menu" role="listbox">
                      {filteredIcdList.length === 0 ? (
                        <div className="icd-no-match">
                          <span>No predefined match for "{icdSearchText}"</span>
                          <button
                            type="button"
                            className="btn-use-custom-icd"
                            onClick={() => {
                              const codeVal = icdSearchText.trim().toUpperCase();
                              setFormData((prev) => ({ ...prev, icd10_code: codeVal }));
                              setIcdDropdownOpen(false);
                            }}
                          >
                            Set "{icdSearchText.trim().toUpperCase()}" as code
                          </button>
                        </div>
                      ) : (
                        filteredIcdList.map((item) => (
                          <div
                            key={item.code}
                            className={`icd-option-row ${formData.icd10_code === item.code ? "is-selected" : ""}`}
                            role="option"
                            aria-selected={formData.icd10_code === item.code}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                icd10_code: item.code,
                                diagnosis: prev.diagnosis ? prev.diagnosis : item.name,
                                title: prev.title ? prev.title : `${item.name} Assessment`
                              }));
                              setIcdSearchText(`${item.code} - ${item.name}`);
                              setIcdDropdownOpen(false);
                            }}
                          >
                            <span className="icd-code-badge">{item.code}</span>
                            <span className="icd-desc">{item.name}</span>
                            <span className="icd-cat">{item.category}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Row 5: Clinical Diagnosis / Impression */}
                <div className="form-group">
                  <label htmlFor="form-diagnosis">Clinical Diagnosis / Impression</label>
                  <input
                    id="form-diagnosis"
                    type="text"
                    placeholder="e.g. Essential Hypertension without chronic kidney disease"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  />
                </div>

                {/* Row 6: Clinical Notes & Observations */}
                <div className="form-group">
                  <label htmlFor="form-notes">Clinical Notes &amp; Observations</label>
                  <textarea
                    id="form-notes"
                    rows={3}
                    placeholder="Detail clinical observations, symptoms, physical findings, dietary advice, or follow-up instructions..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                {/* Row 7: Prescribed Medications (Dynamic Section) */}
                <div className="form-group meds-section-box">
                  <div className="meds-header-line">
                    <label>Prescribed Medications ({formData.medications?.length || 0})</label>
                    <button
                      type="button"
                      className="btn-add-med"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          medications: [
                            ...(prev.medications || []),
                            { name: "", dose: "", frequency: "Once daily (OD)", duration: "30 days", drug_class: "General" }
                          ]
                        }));
                      }}
                    >
                      <Plus size={14} /> Add Medication
                    </button>
                  </div>

                  {formData.medications && formData.medications.length > 0 ? (
                    <div className="meds-form-list">
                      {formData.medications.map((med, index) => (
                        <div key={index} className="med-row-card">
                          <div className="med-row-inputs">
                            <input
                              type="text"
                              placeholder="Drug name (e.g. Amlodipine)"
                              value={med.name}
                              onChange={(e) => {
                                const updated = [...formData.medications];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setFormData((prev) => ({ ...prev, medications: updated }));
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Dose (e.g. 5 mg)"
                              value={med.dose}
                              onChange={(e) => {
                                const updated = [...formData.medications];
                                updated[index] = { ...updated[index], dose: e.target.value };
                                setFormData((prev) => ({ ...prev, medications: updated }));
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Freq (e.g. OD)"
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
                            aria-label="Remove medication"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-meds-hint">No medications prescribed. Click "+ Add Medication" to add Rx regimens.</p>
                  )}
                </div>

                {/* Row 8: Clinical Document Attachments */}
                <div className="form-group">
                  <label>Clinical Document Attachments (PDF / Scans / Images)</label>
                  <div className="file-upload-box">
                    <label className="file-upload-label">
                      <Upload size={18} />
                      <span>{uploadingFile ? "Uploading document..." : "Click or drag to attach PDF, scan, or lab report"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        style={{ display: "none" }}
                      />
                    </label>
                    {formData.attachments && formData.attachments.length > 0 && (
                      <div className="modal-attachments-chips">
                        {formData.attachments.map((att, attI) => (
                          <div key={attI} className="modal-att-chip">
                            <FileText size={14} />
                            <span className="att-chip-name">{att.file_name}</span>
                            <span className="att-chip-size">
                              {att.size_bytes ? `${Math.round(att.size_bytes / 1024)} KB` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== attI)
                                }));
                              }}
                              aria-label="Remove attachment"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin mr-2" />
                      <span>Saving Record...</span>
                    </>
                  ) : modalMode === "edit" ? (
                    "Save Changes"
                  ) : (
                    "Create Record"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Undo Toast Notification ── */}
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
