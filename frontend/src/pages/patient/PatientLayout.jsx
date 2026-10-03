import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  ListOrdered,
  HeartPulse,
  Bot,
  Bell,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

function PatientLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    {
      label: "Dashboard",
      path: "/patient/dashboard",
      icon: LayoutDashboard,
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
      icon: ListOrdered,
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

  return (
    <div className="patient-layout">

      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <div className="patient-brand">
          <div className="patient-brand-icon">C</div>
          <span>CareBridge <b>AI</b></span>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`patient-sidebar ${mobileOpen ? "open" : ""}`}>

        <div className="sidebar-brand">
          <div className="patient-brand-icon">C</div>

          <div>
            <strong>CareBridge</strong>
            <span>AI</span>
          </div>
        </div>

        <div className="sidebar-label">
          PATIENT PORTAL
        </div>

        <nav className="patient-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `patient-nav-link ${
                    isActive ? "active" : ""
                  }`
                }
                onClick={() => setMobileOpen(false)}
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
            className="patient-nav-link"
            onClick={() => setMobileOpen(false)}
          >
            <UserCircle size={19} />
            <span>Profile</span>
          </NavLink>

          <button
            className="patient-logout"
            onClick={logout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>

        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MAIN */}
      <main className="patient-main">

        <header className="patient-topbar">
          <div>
            <p className="topbar-kicker">
              PATIENT PORTAL
            </p>

            <h2>
              Welcome back,{" "}
              {user?.name?.split(" ")[0] || "Patient"}
            </h2>
          </div>

          <div className="topbar-user">
            <div className="topbar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            <div className="topbar-user-info">
              <strong>
                {user?.name || "Patient"}
              </strong>
              <span>Patient</span>
            </div>
          </div>
        </header>

        <section className="patient-content">
          <Outlet />
        </section>

      </main>

    </div>
  );
}

export default PatientLayout;