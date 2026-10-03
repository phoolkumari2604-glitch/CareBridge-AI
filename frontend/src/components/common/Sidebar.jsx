import {
  LayoutDashboard,
  CalendarDays,
  Hospital,
  Stethoscope,
  Ticket,
  Clock3,
  HeartPulse,
  Bot,
  Bell,
  Settings,
  UserCircle,
  LogOut,
  X,
  Activity,
  ClipboardCheck,
  FileText
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Sidebar({ open, isOpen, onClose }) {
  const { user, role, logout } = useAuth();
  const isSidebarOpen = open || isOpen;
  const currentRole = (user?.role || role || "").toLowerCase();

  const patientItems = [
    {
      label: "Dashboard",
      path: "/patient/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Hospitals",
      path: "/patient/hospitals",
      icon: Hospital,
    },
    {
      label: "Doctors",
      path: "/patient/doctors",
      icon: Stethoscope,
    },
    {
      label: "Appointments",
      path: "/patient/appointments",
      icon: CalendarDays,
    },
    {
      label: "OPD Pass",
      path: "/patient/opd-pass",
      icon: Ticket,
    },
    {
      label: "Live Queue",
      path: "/patient/queue",
      icon: Clock3,
    },
    {
      label: "Health",
      path: "/patient/health",
      icon: HeartPulse,
    },
    {
      label: "AI Assistant",
      path: "/patient/ai-assistant",
      icon: Bot,
    },
    {
      label: "Notifications",
      path: "/patient/notifications",
      icon: Bell,
    },
  ];

  const doctorItems = [
    {
      label: "Dashboard",
      path: "/doctor/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Patient Monitoring",
      path: "/doctor/vitals",
      icon: Activity,
    },
    {
      label: "Appointments",
      path: "/doctor/appointments",
      icon: CalendarDays,
    },
    {
      label: "Approvals",
      path: "/doctor/approvals",
      icon: ClipboardCheck,
    },
    {
      label: "Health Records",
      path: "/doctor/records",
      icon: FileText,
    },
    {
      label: "AI Assistant",
      path: "/doctor/ai-assistant",
      icon: Bot,
    },
    {
      label: "Notifications",
      path: "/doctor/notifications",
      icon: Bell,
    },
  ];

  const staffItems = [
    {
      label: "Dashboard",
      path: "/staff/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Patients",
      path: "/staff/patients",
      icon: UserCircle,
    },
    {
      label: "Appointments",
      path: "/staff/appointments",
      icon: CalendarDays,
    },
    {
      label: "Queue",
      path: "/staff/queue",
      icon: Clock3,
    },
    {
      label: "Approvals",
      path: "/staff/approvals",
      icon: Bell,
    },
    {
      label: "Doctors",
      path: "/staff/doctors",
      icon: Stethoscope,
    },
    {
      label: "Hospitals",
      path: "/staff/hospitals",
      icon: Hospital,
    },
    {
      label: "Audit & Security",
      path: "/staff/audit",
      icon: Settings,
    },
  ];

  const items =
    currentRole === "doctor"
      ? doctorItems
      : ["staff", "admin", "staff_admin"].includes(currentRole)
      ? staffItems
      : patientItems;

  return (
    <>
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`app-sidebar ${
          isSidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-mobile-header">
          <strong>CareBridge AI</strong>
          <button
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={22} />
          </button>
        </div>

        <div className="sidebar-section-title">
          {currentRole.toUpperCase()} MENU
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/profile"
            className="sidebar-link"
            onClick={onClose}
          >
            <UserCircle size={19} />
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/settings"
            className="sidebar-link"
            onClick={onClose}
          >
            <Settings size={19} />
            <span>Settings</span>
          </NavLink>

          <button
            className="sidebar-link logout-link"
            onClick={logout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;