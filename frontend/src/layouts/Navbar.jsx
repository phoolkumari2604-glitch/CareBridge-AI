import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  UserCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const notificationPath =
    user?.role?.toLowerCase() === "doctor"
      ? "/doctor/notifications"
      : user?.role?.toLowerCase() === "staff" || user?.role?.toLowerCase() === "admin"
      ? "/staff/notifications"
      : "/patient/notifications";

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

        <Link to="/patient/dashboard" className="navbar-brand">
          <div className="navbar-brand-icon">
            C
          </div>

          <span>
            Care<span>Bridge AI</span>
          </span>
        </Link>
      </div>

      <div className="navbar-search">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search healthcare services, doctors, records..."
          aria-label="Search"
        />
      </div>

      <div className="navbar-actions">
        <Link
          to={notificationPath}
          className="navbar-icon-btn"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="notification-dot" />
        </Link>

        <Link to="/profile" className="navbar-profile">
          <div className="navbar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="navbar-user-info">
            <strong>
              {user?.name || "User"}
            </strong>

            <span>
              {user?.role || "Patient"}
            </span>
          </div>

          <ChevronDown size={17} className="navbar-chevron" />
        </Link>
      </div>
    </header>
  );
}

export default Navbar;