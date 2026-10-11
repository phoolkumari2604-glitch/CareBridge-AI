import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Share2,
  Download,
  ExternalLink,
  RotateCw,
  X
} from "lucide-react";
import BookAppointmentModal from "../BookAppointmentModal";
import CancelAppointmentModal from "../CancelAppointmentModal";
import "./appointmentsManager.css";

// Helper to generate and download ICS file
function downloadIcsFile(apt) {
  const title = `Consultation with Dr. ${apt.doctor_name || "Doctor"}`;
  const description = `CareBridge Clinical Appointment: ${apt.reason || "Consultation"} at ${apt.hospital_name || "Hospital"}`;
  const location = apt.hospital_address || apt.hospital_name || "CareBridge Hospital";
  
  // Parse date and time (e.g., "2026-10-12" and "02:00 PM")
  let dtStart = "20261012T090000Z";
  try {
    const dParts = (apt.appointment_date || "").split("-");
    if (dParts.length === 3) {
      dtStart = `${dParts[0]}${dParts[1]}${dParts[2]}T090000Z`;
    }
  } catch (e) {
    console.error(e);
  }

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareBridge AI//Appointments//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtStart}`,
    `STATUS:CONFIRMED`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `Appointment-${apt.booking_id || "APT"}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const AppointmentsManager = ({ user }) => {
  const navigate = useNavigate();

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Filters & Views
  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar" | "agenda"
  const [activeTab, setActiveTab] = useState("all"); // "all" | "upcoming" | "pending" | "completed" | "cancelled"
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("soonest");

  // Calendar month state
  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [selectedCalDateStr, setSelectedCalDateStr] = useState(new Date().toISOString().split("T")[0]);

  // Drawer & Modals
  const [selectedDrawerApt, setSelectedDrawerApt] = useState(null);
  const [bookingModalDoctor, setBookingModalDoctor] = useState(null);
  const [cancelModalApt, setCancelModalApt] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Debounce search 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async (isSilent = false) => {
    if (!user) return;
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("/api/appointments?limit=100", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data.appointments || data.data || [];
        setAppointments(rawList);
      } else {
        setError("Could not retrieve appointments. Please retry.");
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Network error fetching appointments");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // 30s live polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Status counter computation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
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
      } else if (s === "COMPLETED") {
        completed++;
      } else if (s === "PENDING" || app === "PENDING") {
        pending++;
      } else if (s === "APPROVED" || s === "CONFIRMED") {
        upcoming++;
      }
    });

    return { all, upcoming, pending, completed, cancelled };
  }, [appointments]);

  // Filtered and sorted appointments
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const s = (a.status || "PENDING").toUpperCase();
        const app = (a.approval_status || "PENDING").toUpperCase();

        // Tab filter
        if (activeTab === "upcoming") {
          if (s === "CANCELLED" || s === "COMPLETED" || app === "REJECTED" || app === "PENDING") return false;
        } else if (activeTab === "pending") {
          if (s !== "PENDING" && app !== "PENDING") return false;
          if (s === "CANCELLED" || app === "REJECTED") return false;
        } else if (activeTab === "completed") {
          if (s !== "COMPLETED") return false;
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

          if (!doc.includes(q) && !hosp.includes(q) && !spec.includes(q) && !reason.includes(q) && !ref.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dA = `${a.appointment_date || ""} ${a.appointment_time || ""}`;
        const dB = `${b.appointment_date || ""} ${b.appointment_time || ""}`;
        if (sortBy === "soonest") return dA.localeCompare(dB);
        return dB.localeCompare(dA);
      });
  }, [appointments, activeTab, debouncedSearch, sortBy]);

  // Relative countdown calculator
  const getRelativeCountdown = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr === todayStr) return `Today at ${timeStr || "consultation slot"}`;
    
    const target = new Date(dateStr);
    const now = new Date(todayStr);
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return `Tomorrow at ${timeStr || ""}`;
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return null;
  };

  // Calendar days grid generator
  const calendarGrid = useMemo(() => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ empty: true, key: `emp-${i}` });
    }

    const todayStr = new Date().toISOString().split("T")[0];

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

  // Selected date appointments for side panel
  const selectedDateAppointments = useMemo(() => {
    return appointments.filter((a) => a.appointment_date === selectedCalDateStr);
  }, [appointments, selectedCalDateStr]);

  // Cancel flow execution
  const handleConfirmCancel = async ({ reason, other_reason }) => {
    if (!cancelModalApt) return;
    const apptId = cancelModalApt._id || cancelModalApt.id;
    setCancelLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`/api/appointments/${apptId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, other_reason })
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === apptId || a.id === apptId ? { ...a, status: "CANCELLED", approval_status: "CANCELLED" } : a))
        );
        setCancelModalApt(null);
        setSelectedDrawerApt(null);
        setToastMessage("Appointment cancelled successfully. Slot has been released.");
        setTimeout(() => setToastMessage(""), 4000);
      } else {
        alert(data.detail || data.error || "Failed to cancel");
      }
    } catch (e) {
      console.error(e);
      alert("Network error cancelling appointment");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="appointments-manager">
      {/* HEADER */}
      <div className="am-header">
        <div className="am-title-group">
          <h1>
            <CalendarDays className="text-primary" size={28} />
            My Appointments
          </h1>
          <p className="am-subtitle">
            Manage your verified clinical consultations, download admission passes, and inspect live schedule queues.
          </p>
        </div>

        <div className="am-header-actions">
          <button
            className="am-btn-refresh"
            onClick={() => fetchAppointments()}
            title="Refresh appointments"
          >
            <RefreshCw size={17} className={isRefreshing ? "spinner-icon" : ""} />
          </button>

          <button
            className="am-btn-book"
            onClick={() => {
              // Open modal with first available doctor or fallback
              setBookingModalDoctor({
                name: "CareBridge Specialist",
                specialty: "General Medicine",
                hospital_name: "CareBridge Partner Hospital"
              });
            }}
          >
            <Plus size={17} /> Book New Appointment
          </button>
        </div>
      </div>

      {/* IN-APP TOAST */}
      {toastMessage && (
        <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STAT CARDS ROW */}
      <div className="am-stats-row">
        <div
          className={`am-stat-card ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <div className="am-stat-icon-wrap all"><CalendarDays size={20} /></div>
          <div className="am-stat-info">
            <span>Total Bookings</span>
            <strong>{stats.all}</strong>
          </div>
        </div>

        <div
          className={`am-stat-card ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          <div className="am-stat-icon-wrap upcoming"><CheckCircle2 size={20} /></div>
          <div className="am-stat-info">
            <span>Active & Upcoming</span>
            <strong>{stats.upcoming}</strong>
          </div>
        </div>

        <div
          className={`am-stat-card ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <div className="am-stat-icon-wrap pending"><Clock3 size={20} /></div>
          <div className="am-stat-info">
            <span>Pending Clearance</span>
            <strong>{stats.pending}</strong>
          </div>
        </div>

        <div
          className={`am-stat-card ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <div className="am-stat-icon-wrap completed"><CheckCircle2 size={20} /></div>
          <div className="am-stat-info">
            <span>Completed Consults</span>
            <strong>{stats.completed}</strong>
          </div>
        </div>

        <div
          className={`am-stat-card ${activeTab === "cancelled" ? "active" : ""}`}
          onClick={() => setActiveTab("cancelled")}
        >
          <div className="am-stat-icon-wrap cancelled"><XCircle size={20} /></div>
          <div className="am-stat-info">
            <span>Cancelled / Revoked</span>
            <strong>{stats.cancelled}</strong>
          </div>
        </div>
      </div>

      {/* CONTROLS CARD: TABS, SEARCH, AND VIEW TOGGLES */}
      <div className="am-controls-card">
        <div className="am-tabs-bar">
          <div className="am-tabs-group">
            {[
              { id: "all", label: `All (${stats.all})` },
              { id: "upcoming", label: `Upcoming (${stats.upcoming})` },
              { id: "pending", label: `Pending Approval (${stats.pending})` },
              { id: "completed", label: `Completed (${stats.completed})` },
              { id: "cancelled", label: `Cancelled (${stats.cancelled})` },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`am-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="am-view-toggles">
            <button
              className={`am-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <List size={14} /> List
            </button>
            <button
              className={`am-view-btn ${viewMode === "calendar" ? "active" : ""}`}
              onClick={() => setViewMode("calendar")}
              title="Month Calendar View"
            >
              <Calendar size={14} /> Calendar
            </button>
            <button
              className={`am-view-btn ${viewMode === "agenda" ? "active" : ""}`}
              onClick={() => setViewMode("agenda")}
              title="Agenda Timeline"
            >
              <Grid size={14} /> Agenda
            </button>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="am-filter-row">
          <div className="am-search-input-wrap">
            <Search className="am-search-icon" size={17} />
            <input
              type="text"
              className="am-search-input"
              placeholder="Search appointments by doctor, hospital, specialty, reason, or appointment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="am-clear-btn" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <select
            className="am-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="soonest">Chronological (Soonest First)</option>
            <option value="latest">Latest First</option>
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "1rem", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#b91c1c" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchAppointments()} className="am-action-btn">Retry</button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "2rem 0", alignItems: "center" }}>
          <Loader2 size={32} className="spinner-icon text-primary" />
          <span style={{ color: "var(--text-secondary, #64748b)" }}>Loading clinical schedule...</span>
        </div>
      )}

      {/* VIEW MODE 1: LIST VIEW */}
      {!loading && !error && viewMode === "list" && (
        <div className="am-list-container">
          {filteredAppointments.length === 0 ? (
            <div className="am-empty-state">
              <CalendarDays size={44} color="#94a3b8" />
              <h3 style={{ margin: "0.75rem 0 0.35rem 0", color: "var(--text-primary, #0f172a)" }}>No Appointments Found</h3>
              <p style={{ color: "var(--text-secondary, #64748b)", margin: "0 0 1rem 0" }}>
                {appointments.length === 0
                  ? "You have no appointments booked yet. Find a doctor and schedule a consultation slot."
                  : `No appointments match the active '${activeTab}' filter.`}
              </p>
              <Link to="/patient/doctors" className="am-btn-book" style={{ display: "inline-flex", margin: "0 auto" }}>
                <Stethoscope size={16} /> Find a Doctor
              </Link>
            </div>
          ) : (
            filteredAppointments.map((apt) => {
              const apptId = apt._id || apt.id;
              const dateStr = apt.appointment_date || "Today";
              const timeStr = apt.appointment_time || "10:00 AM";
              const status = (apt.status || "PENDING").toUpperCase();
              const isToday = dateStr === new Date().toISOString().split("T")[0];
              const countdown = getRelativeCountdown(dateStr, timeStr);
              const isConfirmed = status === "APPROVED" || status === "CONFIRMED";
              const isCancelled = status === "CANCELLED";

              return (
                <div
                  key={apptId}
                  className={`am-appointment-card ${isToday ? "today-highlight" : ""}`}
                >
                  {/* Left Date Box */}
                  <div
                    className="am-card-date-box"
                    onClick={() => {
                      setSelectedCalDateStr(dateStr);
                      setViewMode("calendar");
                    }}
                    title="View this date in calendar"
                  >
                    <CalendarDays size={18} className="text-primary" />
                    <strong>{dateStr}</strong>
                    <span>{timeStr}</span>
                    {countdown && <div className="am-card-countdown">{countdown}</div>}
                  </div>

                  {/* Doctor Info */}
                  <div className="am-card-doc-col">
                    <div className="am-doc-avatar">
                      {apt.doctor_name ? apt.doctor_name.charAt(0).toUpperCase() : "D"}
                    </div>
                    <div className="am-doc-details">
                      <h3>Dr. {apt.doctor_name || "Specialist Doctor"}</h3>
                      <span className="am-doc-spec">{apt.specialty || "Medical Consultation"}</span>
                      <div className="am-doc-hospital">
                        <Building size={13} />
                        <span>{apt.hospital_name || "CareBridge Hospital"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Reason & Badges */}
                  <div className="am-card-reason-col">
                    <div className="am-appt-ref-pill">{apt.booking_id || `APT-${String(apptId).slice(-6).toUpperCase()}`}</div>
                    <p className="am-reason-text" title={apt.reason}>
                      <strong>Reason:</strong> {apt.reason || "General Consultation"}
                    </p>
                    <span className={`am-status-badge ${status.toLowerCase()}`}>
                      {isConfirmed ? (
                        <><CheckCircle2 size={13} /> Confirmed / Approved</>
                      ) : isCancelled ? (
                        <><XCircle size={13} /> Cancelled</>
                      ) : (
                        <><Clock3 size={13} /> Pending Approval</>
                      )}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="am-card-actions-col">
                    <button
                      className="am-action-btn"
                      onClick={() => setSelectedDrawerApt(apt)}
                      title="Inspect full appointment details"
                    >
                      <Eye size={14} /> Details
                    </button>

                    {/* Reschedule Button */}
                    {!isCancelled && (
                      <button
                        className="am-action-btn"
                        onClick={() => {
                          setBookingModalDoctor({
                            _id: apt.doctor_id,
                            id: apt.doctor_id,
                            name: apt.doctor_name,
                            specialty: apt.specialty,
                            hospital_name: apt.hospital_name
                          });
                        }}
                        title="Reschedule appointment"
                      >
                        <RotateCw size={14} /> Reschedule
                      </button>
                    )}

                    {/* Confirmed Day Actions */}
                    {isConfirmed && (
                      <Link
                        to={`/patient/opd-pass?appointmentId=${apptId}`}
                        className="am-action-btn primary"
                        title="View Outpatient Admission Pass"
                      >
                        <Ticket size={14} /> View Pass
                      </Link>
                    )}

                    {isConfirmed && isToday && (
                      <Link
                        to={`/patient/queue?appointmentId=${apptId}`}
                        className="am-action-btn primary"
                        title="Join Live Hospital Queue"
                      >
                        Live Queue
                      </Link>
                    )}

                    {/* Add to Calendar */}
                    <button
                      className="am-action-btn"
                      onClick={() => downloadIcsFile(apt)}
                      title="Add to Google / Apple Calendar (.ics)"
                    >
                      <Download size={14} /> .ics
                    </button>

                    {/* Cancel button */}
                    {!isCancelled && status !== "COMPLETED" && (
                      <button
                        className="am-action-btn danger"
                        onClick={() => setCancelModalApt(apt)}
                        title="Cancel appointment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: MONTHLY CALENDAR GRID */}
      {!loading && !error && viewMode === "calendar" && (
        <div className="am-calendar-wrap">
          {/* Calendar Grid side */}
          <div>
            <div className="am-cal-header">
              <div className="am-cal-month-title">
                {currentCalDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </div>
              <div className="am-cal-nav">
                <button
                  className="am-action-btn"
                  onClick={() => {
                    const d = new Date(currentCalDate);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentCalDate(d);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="am-action-btn"
                  onClick={() => setCurrentCalDate(new Date())}
                >
                  Today
                </button>
                <button
                  className="am-action-btn"
                  onClick={() => {
                    const d = new Date(currentCalDate);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentCalDate(d);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="am-cal-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="am-cal-day-label">{day}</div>
              ))}

              {calendarGrid.map((c) => {
                if (c.empty) return <div key={c.key} className="am-cal-cell muted"></div>;
                const isSelected = c.dateStr === selectedCalDateStr;

                return (
                  <div
                    key={c.key}
                    className={`am-cal-cell ${c.isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedCalDateStr(c.dateStr)}
                  >
                    <span className="am-cal-date-num">{c.dayNum}</span>
                    {c.appointments.length > 0 && (
                      <div className="am-cal-dots">
                        {c.appointments.map((a, i) => {
                          const s = (a.status || "PENDING").toLowerCase();
                          return <div key={i} className={`am-cal-dot ${s}`} />;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Panel for selected date */}
          <div className="am-cal-side-panel">
            <h4 className="am-cal-side-title">
              Appointments on {selectedCalDateStr}
            </h4>

            {selectedDateAppointments.length === 0 ? (
              <p style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.85rem", fontStyle: "italic" }}>
                No appointments booked on this date.
              </p>
            ) : (
              selectedDateAppointments.map((a) => (
                <div
                  key={a._id || a.id}
                  style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "8px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "0.9rem" }}>{a.appointment_time}</strong>
                    <span className={`am-status-badge ${(a.status || "pending").toLowerCase()}`}>
                      {a.status || "PENDING"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary, #0f172a)" }}>
                    Dr. {a.doctor_name} ({a.specialty})
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)" }}>
                    {a.hospital_name}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                    <button
                      className="am-action-btn"
                      style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => setSelectedDrawerApt(a)}
                    >
                      View Details
                    </button>
                    <button
                      className="am-action-btn"
                      style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => downloadIcsFile(a)}
                    >
                      .ics
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: AGENDA TIMELINE */}
      {!loading && !error && viewMode === "agenda" && (
        <div className="am-agenda-container">
          {filteredAppointments.length === 0 ? (
            <div className="am-empty-state">
              <CalendarDays size={40} color="#94a3b8" />
              <p>No agenda items found matching current filters.</p>
            </div>
          ) : (
            filteredAppointments.map((a) => (
              <div key={a._id || a.id} className="am-agenda-group">
                <h4>{a.appointment_date}</h4>
                <div
                  className="am-appointment-card"
                  style={{ background: "var(--surface, #ffffff)" }}
                >
                  <div className="am-card-date-box">
                    <Clock3 size={16} />
                    <span>{a.appointment_time}</span>
                  </div>
                  <div className="am-card-doc-col">
                    <div className="am-doc-avatar">{a.doctor_name?.charAt(0) || "D"}</div>
                    <div className="am-doc-details">
                      <h3>Dr. {a.doctor_name}</h3>
                      <span className="am-doc-spec">{a.specialty} • {a.hospital_name}</span>
                    </div>
                  </div>
                  <div className="am-card-reason-col">
                    <p className="am-reason-text">{a.reason}</p>
                    <span className={`am-status-badge ${(a.status || "pending").toLowerCase()}`}>
                      {a.status || "PENDING"}
                    </span>
                  </div>
                  <div className="am-card-actions-col">
                    <button className="am-action-btn" onClick={() => setSelectedDrawerApt(a)}>
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DETAILS SIDE DRAWER */}
      {selectedDrawerApt && (
        <div className="am-drawer-overlay" onClick={() => setSelectedDrawerApt(null)}>
          <div className="am-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="am-drawer-header">
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                Consultation Record
              </h3>
              <button
                className="am-action-btn"
                onClick={() => setSelectedDrawerApt(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="am-drawer-body">
              <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "1rem", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary, #64748b)", fontWeight: 700 }}>
                  Booking Reference
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary, #0284c7)" }}>
                  {selectedDrawerApt.booking_id || "APT-REF"}
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary, #0f172a)" }}>Doctor Information</h4>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <div className="am-doc-avatar">{selectedDrawerApt.doctor_name?.charAt(0) || "D"}</div>
                  <div>
                    <strong style={{ display: "block" }}>Dr. {selectedDrawerApt.doctor_name}</strong>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)" }}>{selectedDrawerApt.specialty}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary, #0f172a)" }}>Hospital Center</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
                  <strong>{selectedDrawerApt.hospital_name || "CareBridge Hospital"}</strong>
                  <span style={{ color: "var(--text-secondary, #64748b)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MapPin size={14} /> {selectedDrawerApt.hospital_address || "Facility Address"}
                  </span>
                  <span style={{ color: "var(--text-secondary, #64748b)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Phone size={14} /> {selectedDrawerApt.hospital_phone || "+91 40 2345 6789"}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary, #0f172a)" }}>Schedule</h4>
                <div style={{ fontSize: "0.9rem", color: "var(--text-primary, #0f172a)" }}>
                  📅 <strong>{selectedDrawerApt.appointment_date}</strong> at <strong>{selectedDrawerApt.appointment_time}</strong>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary, #0f172a)" }}>Reason for Consultation</h4>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary, #475569)" }}>
                  {selectedDrawerApt.reason || "General Medical Evaluation"}
                </p>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-primary, #0f172a)" }}>Status Workflow</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span style={{ fontSize: "0.85rem" }}>Appointment Requested & Logged</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {selectedDrawerApt.status === "APPROVED" || selectedDrawerApt.status === "CONFIRMED" || selectedDrawerApt.status === "COMPLETED" ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <Clock3 size={16} color="#f59e0b" />
                    )}
                    <span style={{ fontSize: "0.85rem" }}>Clinical Clearance & Confirmation</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {selectedDrawerApt.status === "COMPLETED" ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <Clock3 size={16} color="#94a3b8" />
                    )}
                    <span style={{ fontSize: "0.85rem" }}>Consultation Attended & Concluded</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="am-drawer-footer">
              {selectedDrawerApt.hospital_address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedDrawerApt.hospital_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="am-action-btn primary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Navigation size={14} /> Directions
                </a>
              )}
              {selectedDrawerApt.hospital_phone && (
                <a
                  href={`tel:${selectedDrawerApt.hospital_phone}`}
                  className="am-action-btn"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Phone size={14} /> Call Hospital
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BOOKING / RESCHEDULE MODAL */}
      {bookingModalDoctor && (
        <BookAppointmentModal
          doctor={bookingModalDoctor}
          user={user}
          onClose={() => setBookingModalDoctor(null)}
          onBookingSuccess={() => {
            fetchAppointments();
            setToastMessage("Appointment scheduled successfully!");
            setTimeout(() => setToastMessage(""), 4000);
          }}
        />
      )}

      {/* MODAL 2: CANCEL CONFIRMATION MODAL */}
      {cancelModalApt && (
        <CancelAppointmentModal
          appointment={cancelModalApt}
          doctorName={cancelModalApt.doctor_name}
          onClose={() => setCancelModalApt(null)}
          onConfirmCancel={handleConfirmCancel}
          loading={cancelLoading}
        />
      )}
    </div>
  );
};

export default AppointmentsManager;
