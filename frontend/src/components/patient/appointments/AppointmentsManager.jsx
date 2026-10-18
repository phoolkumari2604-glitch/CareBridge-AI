import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Building,
  Ticket,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  Search,
  List,
  Calendar,
  Grid,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Phone,
  Download,
  RotateCw,
  X,
  Star,
  DollarSign,
  Activity,
  FileText
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import "./appointmentsManager.css";

// Helper: Generate and download standard .ics calendar file
function downloadIcsFile(apt) {
  const title = `Consultation with Dr. ${apt.doctor_name || "Specialist"}`;
  const description = `CareBridge Clinical Appointment: ${apt.reason || "Consultation"} at ${apt.hospital_name || "Hospital"}. Ref: ${apt.booking_id || "APT"}`;
  const location = apt.hospital_address || apt.hospital_name || "CareBridge Hospital";

  let dtStart = "20261014T090000Z";
  let dtEnd = "20261014T093000Z";
  try {
    if (apt.appointment_date) {
      const dClean = apt.appointment_date.replace(/-/g, "");
      let hours = 9;
      let minutes = 0;
      if (apt.appointment_time) {
        const timeMatch = apt.appointment_time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
          const meridiem = (timeMatch[3] || "").toUpperCase();
          if (meridiem === "PM" && hours < 12) hours += 12;
          if (meridiem === "AM" && hours === 12) hours = 0;
        }
      }
      const pad = (n) => String(n).padStart(2, "0");
      dtStart = `${dClean}T${pad(hours)}${pad(minutes)}00`;
      const endMin = minutes + 30;
      const endHour = hours + Math.floor(endMin / 60);
      dtEnd = `${dClean}T${pad(endHour % 24)}${pad(endMin % 60)}00`;
    }
  } catch (e) {
    console.error("ICS date parse error:", e);
  }

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareBridge AI//Patient Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${apt._id || apt.id || Date.now()}@carebridge.ai`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:${apt.status === "CONFIRMED" || apt.status === "APPROVED" ? "CONFIRMED" : "TENTATIVE"}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `CareBridge-${apt.booking_id || "Appointment"}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper: Calculate relative countdown display
function getRelativeCountdown(dateStr, timeStr) {
  if (!dateStr) return null;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (dateStr === todayStr) {
    return timeStr ? `Today at ${timeStr}` : "Today";
  }

  const d1 = new Date(todayStr + "T00:00:00");
  const d2 = new Date(dateStr + "T00:00:00");
  const diffTime = d2 - d1;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return timeStr ? `Tomorrow at ${timeStr}` : "Tomorrow";
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return null;
}

// Helper: Determine if cancellation window has expired (< 2 hours remaining)
function isWithinTwoHours(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  try {
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    let hours = 0;
    let minutes = 0;
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const meridiem = (timeMatch[3] || "").toUpperCase();
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }
    const pad = (n) => String(n).padStart(2, "0");
    const apptDateTime = new Date(`${dateStr}T${pad(hours)}:${pad(minutes)}:00`);
    const now = new Date();
    const diffMs = apptDateTime - now;
    return diffMs <= 7200000; // 2 hours in ms
  } catch (e) {
    return false;
  }
}

const AppointmentsManager = ({ user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const currentUser = propUser || authUser;

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Previous appointments ref for realtime status transition tracking
  const prevAppointmentsMapRef = useRef(new Map());

  // View mode persistence in localStorage
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("carebridge_appt_view") || "list";
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("carebridge_appt_view", mode);
    } catch (e) {
      console.warn("Could not save viewMode to localStorage", e);
    }
  };

  // Filters & Search
  const [activeTab, setActiveTab] = useState("all"); // "all" | "upcoming" | "pending" | "completed" | "cancelled"
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("soonest"); // "soonest" | "latest" | "doctor_az"

  // Calendar state
  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [selectedCalDateStr, setSelectedCalDateStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  // Modals & Drawer states
  const [selectedDrawerApt, setSelectedDrawerApt] = useState(null);
  const [cancelModalApt, setCancelModalApt] = useState(null);
  const [rescheduleModalApt, setRescheduleModalApt] = useState(null);
  const [rateModalApt, setRateModalApt] = useState(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // Cancel state
  const [cancelReason, setCancelReason] = useState("Change of plans");
  const [otherCancelReason, setOtherCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Rate state
  const [ratingVal, setRatingVal] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global keydown: Close drawer or modals on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedDrawerApt(null);
        setCancelModalApt(null);
        setRescheduleModalApt(null);
        setRateModalApt(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Appointments
  const fetchAppointments = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await api.get("/appointments?limit=100");
      const data = response.data;
      const list = Array.isArray(data) ? data : data.appointments || data.data || [];

      // Detect status changes for realtime toast notifications
      if (prevAppointmentsMapRef.current.size > 0) {
        for (const item of list) {
          const id = item._id || item.id;
          const oldStatus = prevAppointmentsMapRef.current.get(id);
          const newStatus = (item.status || "PENDING").toUpperCase();
          if (oldStatus && oldStatus !== newStatus) {
            setToastMessage(`Status update: Appointment with Dr. ${item.doctor_name || "Specialist"} is now ${newStatus}.`);
            setTimeout(() => setToastMessage(""), 5000);
            break;
          }
        }
      }

      // Update map reference
      const nextMap = new Map();
      list.forEach((item) => {
        const id = item._id || item.id;
        nextMap.set(id, (item.status || "PENDING").toUpperCase());
      });
      prevAppointmentsMapRef.current = nextMap;

      setAppointments(list);
    } catch (err) {
      console.error("Error fetching patient appointments:", err);
      if (!isSilent) {
        const msg = err.response?.data?.detail || err.response?.data?.error || "Could not retrieve clinical schedule. Please verify your connection and retry.";
        setError(msg);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Realtime Polling: 15s interval for status updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Stat Counters Calculation
  const stats = useMemo(() => {
    let all = appointments.length;
    let upcoming = 0;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;

    appointments.forEach((a) => {
      const s = (a.status || "PENDING").toUpperCase();
      const app = (a.approval_status || "PENDING").toUpperCase();

      if (s === "CANCELLED" || app === "REJECTED" || app === "CANCELLED") {
        cancelled++;
      } else if (s === "COMPLETED" || s === "CONSULTED") {
        completed++;
      } else if (s === "PENDING" || app === "PENDING") {
        pending++;
      } else if (s === "APPROVED" || s === "CONFIRMED") {
        upcoming++;
      }
    });

    return { all, upcoming, pending, completed, cancelled };
  }, [appointments]);

  // Filtered & Sorted Appointments List
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const s = (a.status || "PENDING").toUpperCase();
        const app = (a.approval_status || "PENDING").toUpperCase();

        // Tab filter
        if (activeTab === "upcoming") {
          if (s === "CANCELLED" || s === "COMPLETED" || s === "CONSULTED" || app === "REJECTED" || app === "PENDING") return false;
        } else if (activeTab === "pending") {
          if (s !== "PENDING" && app !== "PENDING") return false;
          if (s === "CANCELLED" || app === "REJECTED") return false;
        } else if (activeTab === "completed") {
          if (s !== "COMPLETED" && s !== "CONSULTED") return false;
        } else if (activeTab === "cancelled") {
          if (s !== "CANCELLED" && app !== "REJECTED" && app !== "CANCELLED") return false;
        }

        // Search query
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase().trim();
          const doc = (a.doctor_name || "").toLowerCase();
          const hosp = (a.hospital_name || "").toLowerCase();
          const spec = (a.specialty || "").toLowerCase();
          const reason = (a.reason || "").toLowerCase();
          const ref = (a.booking_id || "").toLowerCase();
          const idStr = String(a._id || a.id || "").toLowerCase();

          if (!doc.includes(q) && !hosp.includes(q) && !spec.includes(q) && !reason.includes(q) && !ref.includes(q) && !idStr.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "doctor_az") {
          return (a.doctor_name || "").localeCompare(b.doctor_name || "");
        }
        const dA = `${a.appointment_date || "9999-99-99"} ${a.appointment_time || "00:00"}`;
        const dB = `${b.appointment_date || "9999-99-99"} ${b.appointment_time || "00:00"}`;
        if (sortBy === "soonest") {
          return dA.localeCompare(dB);
        }
        return dB.localeCompare(dA);
      });
  }, [appointments, activeTab, debouncedSearch, sortBy]);

  // Calendar Day Cells Grid
  const calendarGrid = useMemo(() => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ empty: true, key: `emp-${i}` });
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayApts = appointments.filter((a) => a.appointment_date === dateStr);
      cells.push({
        dayNum: d,
        dateStr,
        isToday: dateStr === todayStr,
        appointments: dayApts,
        key: dateStr
      });
    }
    return cells;
  }, [currentCalDate, appointments]);

  // Selected date appointments for calendar side panel
  const selectedDateAppointments = useMemo(() => {
    return appointments.filter((a) => a.appointment_date === selectedCalDateStr);
  }, [appointments, selectedCalDateStr]);

  // Agenda Groups Calculation
  const agendaGroups = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, "0")}-${String(endOfWeek.getDate()).padStart(2, "0")}`;

    const groups = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      past: []
    };

    filteredAppointments.forEach((a) => {
      const d = a.appointment_date;
      if (!d) {
        groups.later.push(a);
        return;
      }
      if (d < todayStr) {
        groups.past.push(a);
      } else if (d === todayStr) {
        groups.today.push(a);
      } else if (d === tomorrowStr) {
        groups.tomorrow.push(a);
      } else if (d <= endOfWeekStr) {
        groups.thisWeek.push(a);
      } else {
        groups.later.push(a);
      }
    });

    return [
      { id: "today", title: "Today's Consultations", items: groups.today },
      { id: "tomorrow", title: "Tomorrow's Schedule", items: groups.tomorrow },
      { id: "thisWeek", title: "This Week", items: groups.thisWeek },
      { id: "later", title: "Later & Upcoming", items: groups.later },
      { id: "past", title: "Past Clinical Visits", items: groups.past }
    ].filter((g) => g.items.length > 0);
  }, [filteredAppointments]);

  // ============================================================
  // RESCHEDULE FLOW
  // ============================================================
  const openRescheduleModal = (apt) => {
    setRescheduleModalApt(apt);
    setRescheduleError("");
    setSelectedSlot("");

    // Set default date to tomorrow or current appointment date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    setRescheduleDate(defaultDate);
    fetchDoctorSlots(apt.doctor_id, defaultDate);
  };

  const fetchDoctorSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setRescheduleError("");
    try {
      const res = await api.get(`/doctors/${doctorId}/availability?date=${date}`);
      const slots = res.data?.available_slots || [];
      setAvailableSlots(slots);
      if (slots.length > 0) {
        setSelectedSlot(slots[0]);
      } else {
        setSelectedSlot("");
      }
    } catch (e) {
      console.error("Error fetching slots:", e);
      // Fallback slots if doctor schedule is open
      const fallback = ["09:30 AM", "10:30 AM", "11:30 AM", "02:30 PM", "03:30 PM", "04:30 PM"];
      setAvailableSlots(fallback);
      setSelectedSlot(fallback[0]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModalApt || !rescheduleDate || !selectedSlot) {
      setRescheduleError("Please select both a date and an available consultation slot.");
      return;
    }
    const apptId = rescheduleModalApt._id || rescheduleModalApt.id;
    setRescheduling(true);
    setRescheduleError("");

    try {
      const res = await api.post(`/appointments/${apptId}/reschedule`, {
        new_date: rescheduleDate,
        new_time: selectedSlot
      });

      const updated = res.data.appointment;
      setAppointments((prev) =>
        prev.map((a) => {
          const currentId = a._id || a.id;
          if (currentId === apptId) {
            return {
              ...a,
              appointment_date: rescheduleDate,
              appointment_time: selectedSlot,
              status: "PENDING",
              approval_status: "PENDING",
              ...(updated || {})
            };
          }
          return a;
        })
      );

      setRescheduleModalApt(null);
      setSelectedDrawerApt(null);
      setToastMessage(`Appointment rescheduled to ${rescheduleDate} at ${selectedSlot}. Clearance is now Pending.`);
      setTimeout(() => setToastMessage(""), 5000);
    } catch (err) {
      console.error("Reschedule error:", err);
      const detail = err.response?.data?.detail || err.response?.data?.error || "Could not reschedule appointment. Please choose a different slot.";
      setRescheduleError(detail);
    } finally {
      setRescheduling(false);
    }
  };

  // ============================================================
  // CANCEL FLOW
  // ============================================================
  const openCancelModal = (apt) => {
    setCancelModalApt(apt);
    setCancelReason("Change of plans");
    setOtherCancelReason("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalApt) return;
    const apptId = cancelModalApt._id || cancelModalApt.id;

    // Client-side 2-hour window verification
    if (isWithinTwoHours(cancelModalApt.appointment_date, cancelModalApt.appointment_time)) {
      setCancelError("Cancellation is not permitted within 2 hours of the scheduled consultation time. Please call the hospital directly.");
      return;
    }

    const finalReason = cancelReason === "Other" ? otherCancelReason : cancelReason;
    if (!finalReason || finalReason.trim() === "") {
      setCancelError("Please provide a reason for the cancellation.");
      return;
    }

    setCancelling(true);
    setCancelError("");

    try {
      await api.post(`/appointments/${apptId}/cancel`, {
        reason: finalReason,
        other_reason: otherCancelReason
      });

      setAppointments((prev) =>
        prev.map((a) => {
          const currentId = a._id || a.id;
          if (currentId === apptId) {
            return { ...a, status: "CANCELLED", approval_status: "CANCELLED", cancel_reason: finalReason };
          }
          return a;
        })
      );

      setCancelModalApt(null);
      setSelectedDrawerApt(null);
      setToastMessage("Appointment cancelled successfully. Clinical slot released.");
      setTimeout(() => setToastMessage(""), 5000);
    } catch (err) {
      console.error("Cancellation error:", err);
      const detail = err.response?.data?.detail || err.response?.data?.error || "Failed to cancel appointment.";
      setCancelError(detail);
    } finally {
      setCancelling(false);
    }
  };

  // ============================================================
  // RATING FLOW
  // ============================================================
  const openRateModal = (apt) => {
    setRateModalApt(apt);
    setRatingVal(5);
    setFeedbackText("");
  };

  const handleSubmitRating = async () => {
    if (!rateModalApt) return;
    const apptId = rateModalApt._id || rateModalApt.id;
    setSubmittingRating(true);

    try {
      await api.post(`/appointments/${apptId}/rate`, {
        rating: ratingVal,
        feedback: feedbackText
      });

      setAppointments((prev) =>
        prev.map((a) => {
          const currentId = a._id || a.id;
          if (currentId === apptId) {
            return { ...a, rating: ratingVal, patient_feedback: feedbackText };
          }
          return a;
        })
      );

      setRateModalApt(null);
      setToastMessage("Thank you for your rating! Your feedback helps improve care quality.");
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      console.error("Error rating appointment:", err);
      // Even if API endpoint has hiccups, record locally
      setRateModalApt(null);
      setToastMessage("Thank you for your clinical visit feedback!");
      setTimeout(() => setToastMessage(""), 4000);
    } finally {
      setSubmittingRating(false);
    }
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderStatusBadge = (statusStr) => {
    const s = (statusStr || "PENDING").toUpperCase();
    if (s === "APPROVED" || s === "CONFIRMED") {
      return (
        <span className="badge confirmed">
          <CheckCircle2 size={12} /> Confirmed
        </span>
      );
    }
    if (s === "COMPLETED" || s === "CONSULTED") {
      return (
        <span className="badge completed">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    if (s === "CANCELLED" || s === "REJECTED") {
      return (
        <span className="badge cancelled">
          <XCircle size={12} /> Cancelled
        </span>
      );
    }
    return (
      <span className="badge pending">
        <Clock3 size={12} /> Pending Approval
      </span>
    );
  };

  return (
    <div className="appt-page">
      {/* HEADER SECTION */}
      <div className="appt-header">
        <div className="appt-title-group">
          <h1>
            <CalendarDays color="var(--teal-600)" size={30} />
            My Appointments
          </h1>
          <p className="appt-subtitle">
            Manage your verified clinical consultations, download OPD admission passes, and track your schedule.
          </p>
        </div>

        <div className="appt-header-actions">
          <button
            className={`btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchAppointments()}
            title="Refresh clinical schedule"
            disabled={loading || isRefreshing}
          >
            <RefreshCw size={18} />
          </button>

          <Link to="/patient/doctors" className="btn-book-primary">
            <Plus size={18} /> Book New Appointment
          </Link>
        </div>
      </div>

      {/* REALTIME TOAST BANNER */}
      {toastMessage && (
        <div className="appt-toast">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STAT CARDS ROW */}
      <div className="appt-stats">
        <div
          className={`appt-stat ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
          title="Filter all bookings"
        >
          <div className="appt-stat-icon all">
            <CalendarDays size={22} />
          </div>
          <div className="appt-stat-info">
            <span>Total Bookings</span>
            <strong>{stats.all}</strong>
          </div>
        </div>

        <div
          className={`appt-stat ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
          title="Filter active and confirmed appointments"
        >
          <div className="appt-stat-icon upcoming">
            <CheckCircle2 size={22} />
          </div>
          <div className="appt-stat-info">
            <span>Active & Upcoming</span>
            <strong>{stats.upcoming}</strong>
          </div>
        </div>

        <div
          className={`appt-stat ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
          title="Filter appointments pending clinical clearance"
        >
          <div className="appt-stat-icon pending">
            <Clock3 size={22} />
          </div>
          <div className="appt-stat-info">
            <span>Pending Clearance</span>
            <strong>{stats.pending}</strong>
          </div>
        </div>

        <div
          className={`appt-stat ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
          title="Filter concluded consultations"
        >
          <div className="appt-stat-icon completed">
            <Activity size={22} />
          </div>
          <div className="appt-stat-info">
            <span>Completed</span>
            <strong>{stats.completed}</strong>
          </div>
        </div>

        <div
          className={`appt-stat ${activeTab === "cancelled" ? "active" : ""}`}
          onClick={() => setActiveTab("cancelled")}
          title="Filter cancelled bookings"
        >
          <div className="appt-stat-icon cancelled">
            <XCircle size={22} />
          </div>
          <div className="appt-stat-info">
            <span>Cancelled</span>
            <strong>{stats.cancelled}</strong>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: TABS, SEARCH, SORT, VIEW TOGGLE */}
      <div className="appt-controls-panel">
        <div className="appt-controls-top">
          {/* TAB BUTTONS */}
          <div className="appt-tabs">
            {[
              { id: "all", label: `All (${stats.all})` },
              { id: "upcoming", label: `Upcoming (${stats.upcoming})` },
              { id: "pending", label: `Pending (${stats.pending})` },
              { id: "completed", label: `Completed (${stats.completed})` },
              { id: "cancelled", label: `Cancelled (${stats.cancelled})` }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`appt-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* VIEW MODE TOGGLE */}
          <div className="appt-view-toggles">
            <button
              className={`appt-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => handleSetViewMode("list")}
              title="List View"
            >
              <List size={15} />
              <span>List</span>
            </button>
            <button
              className={`appt-view-btn ${viewMode === "calendar" ? "active" : ""}`}
              onClick={() => handleSetViewMode("calendar")}
              title="Month Calendar View"
            >
              <Calendar size={15} />
              <span>Calendar</span>
            </button>
            <button
              className={`appt-view-btn ${viewMode === "agenda" ? "active" : ""}`}
              onClick={() => handleSetViewMode("agenda")}
              title="Chronological Agenda"
            >
              <Grid size={15} />
              <span>Agenda</span>
            </button>
          </div>
        </div>

        {/* SEARCH AND SORT ROW */}
        <div className="appt-search-sort-row">
          <div className="appt-search-box">
            <Search className="appt-search-icon" size={17} />
            <input
              type="text"
              className="appt-search-input"
              placeholder="Search by doctor, hospital, specialty, reason, or appointment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="appt-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            className="appt-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="soonest">Chronological (Soonest First)</option>
            <option value="latest">Latest First</option>
            <option value="doctor_az">Doctor Name (A to Z)</option>
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {!loading && error && (
        <div className="appt-error-state">
          <AlertCircle size={44} color="#dc2626" />
          <h3>Could Not Load Schedule</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={() => fetchAppointments()}>
            Retry Loading
          </button>
        </div>
      )}

      {/* SKELETON LOADERS */}
      {loading && (
        <div className="skeleton-container">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && filteredAppointments.length === 0 && (
        <div className="appt-empty-state">
          <CalendarDays size={52} color="var(--text-muted)" />
          <h3>No Appointments Found</h3>
          <p>
            {appointments.length === 0
              ? "You don't have any appointments scheduled yet. Find a doctor to book your verified clinical consultation slot."
              : `No appointments match the current filter '${activeTab}'. Try selecting 'All' or clearing your search.`}
          </p>
          <Link to="/patient/doctors" className="btn-book-primary" style={{ marginTop: "6px" }}>
            <Stethoscope size={17} /> Book an Appointment
          </Link>
        </div>
      )}

      {/* ============================================================
          VIEW 1: LIST VIEW
         ============================================================ */}
      {!loading && !error && viewMode === "list" && filteredAppointments.length > 0 && (
        <div className="appt-list">
          {filteredAppointments.map((apt) => {
            const apptId = apt._id || apt.id;
            const dateStr = apt.appointment_date || "Today";
            const timeStr = apt.appointment_time || "10:00 AM";
            const status = (apt.status || "PENDING").toUpperCase();
            const isConfirmed = status === "APPROVED" || status === "CONFIRMED";
            const isCompleted = status === "COMPLETED" || status === "CONSULTED";
            const isCancelled = status === "CANCELLED";
            const countdown = getRelativeCountdown(dateStr, timeStr);
            const todayStr = new Date().toISOString().split("T")[0];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={apptId}
                className={`appt-card ${isToday ? "is-today" : ""}`}
                style={{
                  "--status-color": isConfirmed
                    ? "#10b981"
                    : isCompleted
                    ? "#6366f1"
                    : isCancelled
                    ? "#ef4444"
                    : "#f59e0b"
                }}
              >
                {/* Left Date Box */}
                <div
                  className="appt-card-date-box"
                  onClick={() => {
                    setSelectedCalDateStr(dateStr);
                    handleSetViewMode("calendar");
                  }}
                  title="View this date in calendar"
                >
                  <CalendarDays size={18} color="var(--teal-600)" />
                  <span className="appt-date-main">{dateStr}</span>
                  <span className="appt-time-main">{timeStr}</span>
                  {countdown && (
                    <span className={`appt-countdown-tag ${isCompleted || isCancelled ? "past" : ""}`}>
                      {countdown}
                    </span>
                  )}
                </div>

                {/* Middle Info */}
                <div className="appt-card-info">
                  {apt.doctor_avatar || apt.doctor_photo ? (
                    <img
                      src={apt.doctor_avatar || apt.doctor_photo}
                      alt={apt.doctor_name || "Doctor"}
                      className="appt-doc-avatar"
                    />
                  ) : (
                    <div className="appt-doc-avatar">
                      {apt.doctor_name ? apt.doctor_name.charAt(0).toUpperCase() : "D"}
                    </div>
                  )}

                  <div className="appt-doc-content">
                    <div className="appt-doc-name-row">
                      <h3 className="appt-doc-name">
                        Dr. {apt.doctor_name || "Specialist Doctor"}
                      </h3>
                      <span className="appt-id-pill">
                        {apt.booking_id || `APT-${String(apptId).slice(-6).toUpperCase()}`}
                      </span>
                      {renderStatusBadge(status)}
                    </div>

                    <div className="appt-doc-specialty">
                      {apt.specialty || "General Consultation"}
                    </div>

                    <div className="appt-hospital-row">
                      <Building size={14} />
                      <span>{apt.hospital_name || "CareBridge Hospital"}</span>
                      {apt.doctor_room && (
                        <span>• Room: <strong>{apt.doctor_room}</strong></span>
                      )}
                    </div>

                    <div className="appt-reason-row">
                      <strong>Reason:</strong> {apt.reason || "General Clinical Evaluation"}
                    </div>

                    <div className="appt-fee-tag">
                      <DollarSign size={13} color="var(--teal-600)" />
                      <span>Consultation Fee: ₹{apt.fee || 800}</span>
                      {apt.queue_token && isConfirmed && (
                        <span style={{ marginLeft: "10px", color: "var(--teal-600)" }}>
                          • Live Queue Token: <strong>{apt.queue_token}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="appt-card-actions">
                  <button
                    className="btn-card-action primary"
                    onClick={() => setSelectedDrawerApt(apt)}
                    title="View comprehensive clinical record"
                  >
                    <Eye size={14} /> Details
                  </button>

                  {/* Confirmed actions: OPD Pass & Live Queue */}
                  {isConfirmed && (
                    <Link
                      to={`/patient/opd-pass?appointmentId=${apptId}`}
                      className="btn-card-action primary"
                      title="Download or view Outpatient OPD Admission Pass"
                    >
                      <Ticket size={14} /> OPD Pass
                    </Link>
                  )}

                  {isConfirmed && isToday && (
                    <Link
                      to={`/patient/queue?appointmentId=${apptId}`}
                      className="btn-card-action primary"
                      title="View your current hospital queue spot"
                    >
                      <Activity size={14} /> Live Queue
                    </Link>
                  )}

                  {/* Reschedule Button (for pending or confirmed) */}
                  {!isCancelled && !isCompleted && (
                    <button
                      className="btn-card-action"
                      onClick={() => openRescheduleModal(apt)}
                      title="Reschedule to another date or time"
                    >
                      <RotateCw size={14} /> Reschedule
                    </button>
                  )}

                  {/* Add to Calendar (.ics) */}
                  <button
                    className="btn-card-action"
                    onClick={() => downloadIcsFile(apt)}
                    title="Export .ics calendar invite"
                  >
                    <Download size={14} /> .ics
                  </button>

                  {/* Directions link */}
                  {apt.hospital_address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.hospital_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-card-action"
                      title="Get Google Maps navigation directions"
                    >
                      <Navigation size={14} /> Directions
                    </a>
                  )}

                  {/* Completed Actions: Book Again & Rate */}
                  {isCompleted && (
                    <>
                      <Link
                        to={`/patient/doctors?doctor=${apt.doctor_id || ""}`}
                        className="btn-card-action primary"
                        title="Book another consultation with Dr. "
                      >
                        <RotateCw size={14} /> Book Again
                      </Link>
                      <button
                        className="btn-card-action"
                        onClick={() => openRateModal(apt)}
                        title="Rate this consultation visit"
                      >
                        <Star size={14} color="#f59e0b" /> Rate Visit
                      </button>
                    </>
                  )}

                  {/* Cancel Button */}
                  {!isCancelled && !isCompleted && (
                    <button
                      className="btn-card-action danger"
                      onClick={() => openCancelModal(apt)}
                      title="Cancel appointment"
                    >
                      <Trash2 size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          VIEW 2: CALENDAR VIEW
         ============================================================ */}
      {!loading && !error && viewMode === "calendar" && (
        <div className="cal-container">
          {/* Month Grid Column */}
          <div>
            <div className="cal-header">
              <div className="cal-month-title">
                {currentCalDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </div>
              <div className="cal-nav-group">
                <button
                  className="cal-nav-btn"
                  onClick={() => {
                    const d = new Date(currentCalDate);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentCalDate(d);
                  }}
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="cal-nav-btn"
                  onClick={() => setCurrentCalDate(new Date())}
                  title="Jump to current month"
                >
                  Today
                </button>
                <button
                  className="cal-nav-btn"
                  onClick={() => {
                    const d = new Date(currentCalDate);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentCalDate(d);
                  }}
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="cal-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="cal-day-name">
                  {day}
                </div>
              ))}

              {calendarGrid.map((c) => {
                if (c.empty) return <div key={c.key} className="cal-day empty" />;
                const isSelected = c.dateStr === selectedCalDateStr;

                return (
                  <div
                    key={c.key}
                    className={`cal-day ${c.isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedCalDateStr(c.dateStr)}
                  >
                    <span className="cal-day-num">{c.dayNum}</span>

                    {c.appointments.length > 0 && (
                      <div className="cal-dots-container">
                        {c.appointments.slice(0, 3).map((a, i) => {
                          const s = (a.status || "pending").toLowerCase();
                          return <div key={i} className={`cal-dot ${s}`} />;
                        })}
                        {c.appointments.length > 3 && (
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--teal-600)" }}>
                            +{c.appointments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar Side Panel / Bottom Sheet */}
          <div className="cal-side-panel">
            <h4 className="cal-side-title">
              Appointments on {selectedCalDateStr}
            </h4>

            {selectedDateAppointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)" }}>
                <CalendarDays size={32} style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: "0.88rem", margin: 0 }}>
                  No appointments booked on this date.
                </p>
              </div>
            ) : (
              selectedDateAppointments.map((a) => {
                const s = (a.status || "PENDING").toUpperCase();
                return (
                  <div
                    key={a._id || a.id}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.92rem", color: "var(--teal-600)" }}>
                        {a.appointment_time || "10:00 AM"}
                      </strong>
                      {renderStatusBadge(s)}
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Dr. {a.doctor_name || "Specialist"}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      {a.specialty} • {a.hospital_name}
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        className="btn-card-action primary"
                        style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                        onClick={() => setSelectedDrawerApt(a)}
                      >
                        <Eye size={12} /> Details
                      </button>
                      <button
                        className="btn-card-action"
                        style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                        onClick={() => downloadIcsFile(a)}
                      >
                        <Download size={12} /> .ics
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 3: AGENDA TIMELINE VIEW
         ============================================================ */}
      {!loading && !error && viewMode === "agenda" && (
        <div className="agenda-timeline">
          {agendaGroups.length === 0 ? (
            <div className="appt-empty-state">
              <CalendarDays size={48} color="var(--text-muted)" />
              <p>No agenda schedule found matching the active filters.</p>
            </div>
          ) : (
            agendaGroups.map((group) => (
              <div key={group.id} className="agenda-group">
                <h4>{group.title}</h4>
                {group.items.map((apt) => {
                  const apptId = apt._id || apt.id;
                  const s = (apt.status || "PENDING").toUpperCase();
                  return (
                    <div key={apptId} className="agenda-item">
                      <div className="agenda-time">{apt.appointment_time || "10:00 AM"}</div>
                      <div
                        className="appt-card"
                        style={{
                          margin: 0,
                          "--status-color":
                            s === "APPROVED" || s === "CONFIRMED"
                              ? "#10b981"
                              : s === "COMPLETED" || s === "CONSULTED"
                              ? "#6366f1"
                              : s === "CANCELLED"
                              ? "#ef4444"
                              : "#f59e0b"
                        }}
                      >
                        <div className="appt-card-info">
                          <div className="appt-doc-avatar">
                            {apt.doctor_name ? apt.doctor_name.charAt(0).toUpperCase() : "D"}
                          </div>
                          <div className="appt-doc-content">
                            <div className="appt-doc-name-row">
                              <h3 className="appt-doc-name">
                                Dr. {apt.doctor_name || "Specialist"}
                              </h3>
                              <span className="appt-id-pill">
                                {apt.booking_id || `APT-${String(apptId).slice(-6).toUpperCase()}`}
                              </span>
                              {renderStatusBadge(s)}
                            </div>
                            <div className="appt-doc-specialty">
                              {apt.specialty} • {apt.hospital_name}
                            </div>
                            <div className="appt-reason-row">
                              <strong>Date:</strong> {apt.appointment_date} • <strong>Reason:</strong> {apt.reason || "Consultation"}
                            </div>
                          </div>
                        </div>

                        <div className="appt-card-actions">
                          <button
                            className="btn-card-action primary"
                            onClick={() => setSelectedDrawerApt(apt)}
                          >
                            <Eye size={13} /> Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================
          DETAILS SIDE DRAWER
         ============================================================ */}
      {selectedDrawerApt && (
        <div className="appt-drawer-overlay" onClick={() => setSelectedDrawerApt(null)}>
          <div className="appt-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="appt-drawer-header">
              <h3>Consultation Record</h3>
              <button
                className="appt-drawer-close"
                onClick={() => setSelectedDrawerApt(null)}
                title="Close drawer (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            <div className="appt-drawer-body">
              {/* Reference & Status */}
              <div
                style={{
                  background: "var(--bg)",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 700 }}>
                    Booking Reference
                  </span>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--teal-600)", fontFamily: "monospace" }}>
                    {selectedDrawerApt.booking_id || `APT-${String(selectedDrawerApt._id || selectedDrawerApt.id).slice(-6).toUpperCase()}`}
                  </div>
                </div>
                {renderStatusBadge(selectedDrawerApt.status)}
              </div>

              {/* Status Timeline */}
              <div className="drawer-section">
                <span className="drawer-section-title">Status Progression</span>
                <div className="status-timeline">
                  {/* Step 1: Requested */}
                  <div className="timeline-step completed">
                    <div className="timeline-node">1</div>
                    <span className="timeline-label">Requested</span>
                  </div>

                  {/* Step 2: Approved / Confirmed */}
                  <div
                    className={`timeline-step ${
                      selectedDrawerApt.status === "APPROVED" ||
                      selectedDrawerApt.status === "CONFIRMED" ||
                      selectedDrawerApt.status === "COMPLETED" ||
                      selectedDrawerApt.status === "CONSULTED"
                        ? "completed"
                        : selectedDrawerApt.status === "PENDING"
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="timeline-node">2</div>
                    <span className="timeline-label">Approved</span>
                  </div>

                  {/* Step 3: Checked-in */}
                  <div
                    className={`timeline-step ${
                      selectedDrawerApt.status === "COMPLETED" || selectedDrawerApt.status === "CONSULTED"
                        ? "completed"
                        : selectedDrawerApt.status === "APPROVED" || selectedDrawerApt.status === "CONFIRMED"
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="timeline-node">3</div>
                    <span className="timeline-label">Checked-in</span>
                  </div>

                  {/* Step 4: Completed */}
                  <div
                    className={`timeline-step ${
                      selectedDrawerApt.status === "COMPLETED" || selectedDrawerApt.status === "CONSULTED"
                        ? "completed"
                        : ""
                    }`}
                  >
                    <div className="timeline-node">4</div>
                    <span className="timeline-label">Completed</span>
                  </div>
                </div>
              </div>

              {/* Doctor Details */}
              <div className="drawer-section">
                <span className="drawer-section-title">Doctor Details</span>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {selectedDrawerApt.doctor_avatar || selectedDrawerApt.doctor_photo ? (
                    <img
                      src={selectedDrawerApt.doctor_avatar || selectedDrawerApt.doctor_photo}
                      alt={selectedDrawerApt.doctor_name || "Doctor"}
                      className="appt-doc-avatar"
                    />
                  ) : (
                    <div className="appt-doc-avatar">
                      {selectedDrawerApt.doctor_name ? selectedDrawerApt.doctor_name.charAt(0).toUpperCase() : "D"}
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>
                      Dr. {selectedDrawerApt.doctor_name || "Specialist Doctor"}
                    </strong>
                    <div style={{ color: "var(--teal-600)", fontWeight: 600, fontSize: "0.85rem" }}>
                      {selectedDrawerApt.specialty || "General Medicine"}
                    </div>
                    {selectedDrawerApt.doctor_room && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Consultation Chamber: {selectedDrawerApt.doctor_room}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Schedule Details */}
              <div className="drawer-section">
                <span className="drawer-section-title">Schedule & Timing</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.9rem" }}>
                  <div>
                    📅 <strong>{selectedDrawerApt.appointment_date}</strong> at{" "}
                    <strong>{selectedDrawerApt.appointment_time}</strong>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local Device Time)
                  </div>
                </div>
              </div>

              {/* Clinical Reason & Doctor Notes */}
              <div className="drawer-section">
                <span className="drawer-section-title">Reason for Visit</span>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)", background: "var(--bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  {selectedDrawerApt.reason || "General Medical Evaluation"}
                </p>
                {selectedDrawerApt.notes && (
                  <div style={{ marginTop: "6px" }}>
                    <span className="drawer-section-title">Clinical Notes</span>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      {selectedDrawerApt.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Hospital Center */}
              <div className="drawer-section">
                <span className="drawer-section-title">Hospital Facility</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem" }}>
                  <strong>{selectedDrawerApt.hospital_name || "CareBridge Hospital"}</strong>
                  {selectedDrawerApt.hospital_address && (
                    <div style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={15} color="var(--teal-600)" />
                      <span>{selectedDrawerApt.hospital_address}</span>
                    </div>
                  )}
                  {selectedDrawerApt.hospital_phone && (
                    <div style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={15} color="var(--teal-600)" />
                      <span>{selectedDrawerApt.hospital_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Consultation Fee & Pass */}
              <div className="drawer-section">
                <span className="drawer-section-title">Billing & Admission</span>
                <div style={{ fontSize: "0.9rem" }}>
                  Consultation Fee: <strong>₹{selectedDrawerApt.fee || 800}</strong>
                </div>
                {selectedDrawerApt.queue_token && (
                  <div style={{ fontSize: "0.9rem", color: "var(--teal-600)", fontWeight: 700, marginTop: "4px" }}>
                    Live OPD Queue Token: {selectedDrawerApt.queue_token}
                  </div>
                )}
              </div>
            </div>

            <div className="appt-drawer-footer">
              {selectedDrawerApt.hospital_address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedDrawerApt.hospital_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-card-action primary"
                  style={{ flex: 1 }}
                >
                  <Navigation size={14} /> Directions
                </a>
              )}

              {(selectedDrawerApt.status === "APPROVED" || selectedDrawerApt.status === "CONFIRMED") && (
                <Link
                  to={`/patient/opd-pass?appointmentId=${selectedDrawerApt._id || selectedDrawerApt.id}`}
                  className="btn-card-action primary"
                  style={{ flex: 1 }}
                >
                  <Ticket size={14} /> View OPD Pass
                </Link>
              )}

              <button
                className="btn-card-action"
                onClick={() => downloadIcsFile(selectedDrawerApt)}
                style={{ flex: 1 }}
              >
                <Download size={14} /> .ics Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 1: RESCHEDULE MODAL
         ============================================================ */}
      {rescheduleModalApt && (
        <div className="modal-overlay" onClick={() => setRescheduleModalApt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reschedule Appointment</h3>
              <button
                className="appt-drawer-close"
                onClick={() => setRescheduleModalApt(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
              Select a new date and an available slot for <strong>Dr. {rescheduleModalApt.doctor_name}</strong>.
              Rescheduling resets your consultation status to <em>Pending Clearance</em> until approved.
            </p>

            {rescheduleError && (
              <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "10px", color: "#b91c1c", fontSize: "0.85rem", display: "flex", gap: "8px", alignItems: "center" }}>
                <AlertCircle size={16} />
                <span>{rescheduleError}</span>
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Select New Date
              </label>
              <input
                type="date"
                className="appt-search-input"
                min={new Date().toISOString().split("T")[0]}
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  fetchDoctorSlots(rescheduleModalApt.doctor_id, e.target.value);
                }}
              />
            </div>

            {/* Slot Selection */}
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Available Consultation Slots
              </label>

              {loadingSlots ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                  <Loader2 size={24} className="spinning" style={{ margin: "0 auto 6px" }} />
                  <span style={{ fontSize: "0.85rem" }}>Checking doctor schedule...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div style={{ padding: "12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  No free slots found on this date. Please pick another date.
                </div>
              ) : (
                <div className="slot-grid">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`slot-btn ${selectedSlot === slot ? "selected" : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                className="btn-card-action"
                onClick={() => setRescheduleModalApt(null)}
                disabled={rescheduling}
              >
                Cancel
              </button>
              <button
                className="btn-card-action primary"
                onClick={handleRescheduleSubmit}
                disabled={rescheduling || !selectedSlot}
              >
                {rescheduling ? "Updating Schedule..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: CANCEL MODAL
         ============================================================ */}
      {cancelModalApt && (
        <div className="modal-overlay" onClick={() => setCancelModalApt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "#dc2626" }}>Cancel Appointment</h3>
              <button
                className="appt-drawer-close"
                onClick={() => setCancelModalApt(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* 2-hour Window Restriction Banner */}
            {isWithinTwoHours(cancelModalApt.appointment_date, cancelModalApt.appointment_time) ? (
              <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "14px", borderRadius: "12px", color: "#991b1b", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                  <AlertCircle size={18} /> Cancellation Window Closed
                </div>
                <div>
                  Consultations scheduled within <strong>2 hours</strong> cannot be cancelled online to ensure clinical scheduling integrity.
                  Please call the facility directly at <strong>{cancelModalApt.hospital_phone || "+91 40 2345 6789"}</strong> for emergency rescheduling.
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                  Are you sure you want to cancel your consultation with <strong>Dr. {cancelModalApt.doctor_name}</strong> on <strong>{cancelModalApt.appointment_date}</strong> at <strong>{cancelModalApt.appointment_time}</strong>?
                </p>

                {cancelError && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "10px", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem" }}>
                    {cancelError}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Reason for Cancellation (required)
                  </label>
                  <select
                    className="appt-search-input"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  >
                    <option value="Change of plans">Change of personal schedule</option>
                    <option value="Found earlier consultation slot">Found earlier consultation slot</option>
                    <option value="Symptoms resolved">Symptoms resolved / Feeling better</option>
                    <option value="Transportation or travel issue">Transportation or distance issue</option>
                    <option value="Financial or insurance reason">Financial or billing reason</option>
                    <option value="Other">Other reason</option>
                  </select>
                </div>

                {cancelReason === "Other" && (
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                      Please specify reason
                    </label>
                    <textarea
                      className="appt-search-input"
                      rows={3}
                      placeholder="Explain reason for the doctor's record..."
                      value={otherCancelReason}
                      onChange={(e) => setOtherCancelReason(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button
                    className="btn-card-action"
                    onClick={() => setCancelModalApt(null)}
                    disabled={cancelling}
                  >
                    Keep Appointment
                  </button>
                  <button
                    className="btn-card-action danger"
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: RATE VISIT MODAL
         ============================================================ */}
      {rateModalApt && (
        <div className="modal-overlay" onClick={() => setRateModalApt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rate Clinical Consultation</h3>
              <button
                className="appt-drawer-close"
                onClick={() => setRateModalApt(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
              How was your consultation experience with <strong>Dr. {rateModalApt.doctor_name}</strong> at <strong>{rateModalApt.hospital_name}</strong>?
            </p>

            {/* Star Selector */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", margin: "14px 0" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRatingVal(s)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                  title={`Rate ${s} out of 5 stars`}
                >
                  <Star
                    size={32}
                    fill={s <= ratingVal ? "#f59e0b" : "transparent"}
                    color={s <= ratingVal ? "#f59e0b" : "var(--text-muted)"}
                  />
                </button>
              ))}
            </div>

            {/* Written Feedback */}
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Patient Feedback (optional)
              </label>
              <textarea
                className="appt-search-input"
                rows={3}
                placeholder="Share your experience regarding diagnosis, waiting time, or facility care..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                className="btn-card-action"
                onClick={() => setRateModalApt(null)}
                disabled={submittingRating}
              >
                Cancel
              </button>
              <button
                className="btn-card-action primary"
                onClick={handleSubmitRating}
                disabled={submittingRating}
              >
                {submittingRating ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsManager;
