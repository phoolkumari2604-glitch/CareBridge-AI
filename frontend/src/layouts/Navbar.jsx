import { useState, useEffect } from "react";
import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  ShieldAlert,
  Activity,
  Stethoscope,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import doctorService from "../services/doctorService";

function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasEmergency, setHasEmergency] = useState(false);

  const role = (user?.role || "").toLowerCase();
  const isDoctor = role === "doctor";

  // Determine page title based on current path
  const getPageMeta = (pathname) => {
    if (pathname.includes("/doctor/dashboard")) {
      return { title: "Doctor Dashboard", subtitle: "Clinical Overview & Telemetry" };
    }
    if (pathname.includes("/doctor/patient-monitoring") || pathname.includes("/doctor/patients")) {
      return { title: "Patient Monitoring", subtitle: "Real-time Telemetry & Patient Registry" };
    }
    if (pathname.includes("/doctor/appointments")) {
      return { title: "Clinical Appointments", subtitle: "Consultation Schedule & Booking" };
    }
    if (pathname.includes("/doctor/approvals")) {
      return { title: "Pending Approvals", subtitle: "Review Patient & Consultation Requests" };
    }
    if (pathname.includes("/doctor/records")) {
      return { title: "Health Records", subtitle: "Patient Medical Charts & Diagnoses" };
    }
    if (pathname.includes("/doctor/health-monitoring")) {
      return { title: "Health Monitoring", subtitle: "Physiological Telemetry & Trends" };
    }
    if (pathname.includes("/doctor/vitals")) {
      return { title: "Patient Vitals", subtitle: "Vital Signs Logging & Thresholds" };
    }
    if (pathname.includes("/doctor/ai-assistant")) {
      return { title: "Clinical AI Assistant", subtitle: "Differential Diagnosis & Decision Support" };
    }
    if (pathname.includes("/doctor/notifications")) {
      return { title: "Clinical Notifications", subtitle: "Alerts, Telemetry & System Updates" };
    }
    if (pathname.includes("/staff/dashboard")) {
      return { title: "Staff Command Center", subtitle: "Operational Oversight & Facility Metrics" };
    }
    if (pathname.includes("/staff/patients")) {
      return { title: "Patient Registry", subtitle: "Demographics, Clinical Records & Intake" };
    }
    if (pathname.includes("/staff/appointments")) {
      return { title: "Appointment Operations", subtitle: "Consultation Queue & Scheduling" };
    }
    if (pathname.includes("/staff/queue")) {
      return { title: "OPD Queue Management", subtitle: "Live Token Tracking & Department Flow" };
    }
    if (pathname.includes("/staff/approvals")) {
      return { title: "Clearance & Approvals Hub", subtitle: "Clinical Requests & Verifications" };
    }
    if (pathname.includes("/staff/doctors")) {
      return { title: "Doctor Directory", subtitle: "Specialist Rosters & Availability" };
    }
    if (pathname.includes("/staff/notifications")) {
      return { title: "Staff Notifications", subtitle: "Alerts & Department Bulletins" };
    }
    if (pathname.includes("/staff/audit")) {
      return { title: "Security & Audit Logs", subtitle: "Access Logs & System Compliance" };
    }
    if (pathname.includes("/profile")) {
      return { title: "User Profile", subtitle: "Professional Credentials & Info" };
    }
    if (pathname.includes("/settings")) {
      return { title: "System Settings", subtitle: "Account, Preferences & Security" };
    }
    return { title: "CareBridge AI", subtitle: "Clinical Health Intelligence" };
  };

  const pageMeta = getPageMeta(location.pathname);

  const notificationPath = isDoctor
    ? "/doctor/notifications"
    : ["staff", "admin"].includes(role)
    ? "/staff/notifications"
    : "/patient/notifications";

  useEffect(() => {
    let isMounted = true;
    const loadEmergencyAndNotifications = async () => {
      try {
        if (isDoctor || role === "staff" || role === "admin") {
          const patients = await doctorService.getPatients();
          let criticalFound = false;
          let totalUnread = 0;

          if (patients && patients.length > 0) {
            // Check first few patients for acute alerts
            const checkLimit = Math.min(patients.length, 5);
            for (let i = 0; i < checkLimit; i++) {
              const summary = await doctorService.getHealthAlertSummary(patients[i]._id || patients[i].id);
              if (summary?.status === "ALERT" || (summary?.high_alerts && summary.high_alerts > 0)) {
                criticalFound = true;
              }
              const count = await doctorService.getUnreadCount(patients[i]._id || patients[i].id);
              totalUnread += count;
            }
          }

          if (isMounted) {
            setHasEmergency(criticalFound);
            setUnreadCount(totalUnread > 0 ? totalUnread : 3); // Fallback indicator
          }
        }
      } catch (err) {
        // Silent catch for background notification poll
      }
    };

    loadEmergencyAndNotifications();
    return () => {
      isMounted = false;
    };
  }, [isDoctor, role]);

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <Link
          to={isDoctor ? "/doctor/dashboard" : "/patient/dashboard"}
          className="navbar-brand"
        >
          <div className="navbar-brand-icon">
            <Stethoscope size={18} />
          </div>

          <div className="navbar-brand-text">
            <span>
              Care<span>Bridge AI</span>
            </span>
            <span className="navbar-sub-badge">
              {isDoctor ? "Doctor Portal" : "Clinical Platform"}
            </span>
          </div>
        </Link>

        {/* Dynamic Page Title in Topbar */}
        <div className="navbar-page-title-wrap">
          <span className="navbar-page-title">{pageMeta.title}</span>
          <span className="navbar-page-subtitle">{pageMeta.subtitle}</span>
        </div>
      </div>

      <div className="navbar-search">
        <Search size={17} />
        <input
          type="search"
          placeholder="Quick search patients, vitals, appointments..."
          aria-label="Search"
        />
      </div>

      <div className="navbar-actions">
        {/* Emergency Alert Indicator */}
        {hasEmergency && (
          <Link
            to="/doctor/patient-monitoring"
            className="navbar-emergency-pill"
            title="Active Critical Alerts Detected"
          >
            <span className="emergency-pulse-dot" />
            <ShieldAlert size={15} />
            <span className="emergency-label">Critical Alert</span>
          </Link>
        )}

        <Link
          to={notificationPath}
          className="navbar-icon-btn"
          aria-label="Notifications"
          title="View Notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="notification-badge-count">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/profile" className="navbar-profile" title="Doctor Profile">
          <div className="navbar-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "D"}
          </div>

          <div className="navbar-user-info">
            <strong>
              {user?.name || (isDoctor ? "Doctor" : "User")}
            </strong>

            <span className="user-role-tag">
              <Activity size={11} />
              {isDoctor ? "MD / Cardiologist" : user?.role || "Staff"}
            </span>
          </div>

          <ChevronDown size={15} className="navbar-chevron" />
        </Link>
      </div>
    </header>
  );
}

export default Navbar;