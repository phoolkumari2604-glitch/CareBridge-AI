import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Shield,
  Activity,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Lock,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Clock,
  ShieldCheck,
  Stethoscope,
  Building,
  User,
  Eye,
  LogOut,
  X
} from "lucide-react";
import authAPI from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users Table
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 15 });

  // Notifications / Feedback
  const [toast, setToast] = useState(null);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "DOCTOR",
    phone: "",
    department: "",
    specialization: ""
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await authAPI.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        role: roleFilter,
        status: statusFilter,
        page,
        limit: 15
      };
      const data = await authAPI.getAdminUsers(params);
      setUsers(data.users || []);
      setPagination(data.pagination || { total: 0, pages: 1, limit: 15 });
    } catch (err) {
      console.error("Failed to load users:", err);
      showToast(err.response?.data?.detail || "Failed to load user directory", "error");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Handle User Status Toggle
  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "inactive" ? "active" : "inactive";
    try {
      setActionLoadingId(userId);
      await authAPI.updateUserStatus(userId, newStatus);
      showToast(`User status updated to ${newStatus}`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update status", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Admin Reset Password
  const handleResetPassword = async (userId, userEmail) => {
    if (!window.confirm(`Send a secure password reset link to ${userEmail}?`)) return;
    try {
      setActionLoadingId(userId);
      await authAPI.adminResetPassword(userId);
      showToast(`Password reset link dispatched to ${userEmail}`);
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to dispatch reset link", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${userEmail}? This action cannot be undone.`)) return;
    try {
      setActionLoadingId(userId);
      await authAPI.deleteUser(userId);
      showToast(`User ${userEmail} deleted permanently`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to delete user", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Single User Invite
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.name) {
      showToast("Name and email are required", "error");
      return;
    }

    try {
      setInviteLoading(true);
      await authAPI.inviteUser(inviteForm);
      showToast(`Invitation sent successfully to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({
        name: "",
        email: "",
        role: "DOCTOR",
        phone: "",
        department: "",
        specialization: ""
      });
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to send invitation", "error");
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Bulk CSV Import
  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      showToast("Please provide CSV content", "error");
      return;
    }

    try {
      setBulkLoading(true);
      // Parse CSV text
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        showToast("CSV must contain a header and at least one row", "error");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const parsedUsers = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c) => c.trim());
        if (row.length < 2) continue;

        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx] || "";
        });

        if (obj.email) {
          parsedUsers.push(obj);
        }
      }

      if (parsedUsers.length === 0) {
        showToast("No valid rows found in CSV", "error");
        return;
      }

      const res = await authAPI.bulkImportUsers(parsedUsers);
      showToast(`Imported ${res.importedCount} users successfully! (${res.skippedCount} skipped)`);
      setShowBulkModal(false);
      setCsvContent("");
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to process bulk import", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <div className="admin-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="admin-navbar">
        <div className="admin-navbar-left">
          <Link to="/admin" className="admin-nav-logo">
            <div className="admin-logo-badge">C</div>
            <div>
              <span className="admin-nav-title">CareBridge AI</span>
              <span className="admin-nav-badge">System Administration</span>
            </div>
          </Link>
        </div>

        <div className="admin-navbar-right">
          <div className="admin-user-pill">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span>{user?.name || "Primary Administrator"}</span>
            <span className="admin-role-tag">SUPER ADMIN</span>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="admin-logout-btn"
            title="Sign Out"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* HEADER & QUICK ACTIONS */}
        <div className="admin-header-row">
          <div>
            <h1 className="admin-page-heading">User Directory & RBAC Security</h1>
            <p className="admin-page-sub">
              Manage clinical staff, doctors, and patient accounts. Configure access controls and audit logs.
            </p>
          </div>

          <div className="admin-actions-group">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="admin-btn-secondary"
            >
              <FileSpreadsheet size={16} />
              <span>Bulk CSV Import</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="admin-btn-primary"
            >
              <UserPlus size={16} />
              <span>Invite Staff / Doctor</span>
            </button>
          </div>
        </div>

        {/* METRICS & STATS GRID */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon text-cyan-400 bg-cyan-950/40">
              <Users size={22} />
            </div>
            <div>
              <span className="admin-stat-label">Total Accounts</span>
              <span className="admin-stat-val">{statsLoading ? "..." : stats?.totalUsers || 0}</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon text-emerald-400 bg-emerald-950/40">
              <Stethoscope size={22} />
            </div>
            <div>
              <span className="admin-stat-label">Doctors</span>
              <span className="admin-stat-val">{statsLoading ? "..." : stats?.doctorsCount || 0}</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon text-blue-400 bg-blue-950/40">
              <Building size={22} />
            </div>
            <div>
              <span className="admin-stat-label">Clinical Staff</span>
              <span className="admin-stat-val">{statsLoading ? "..." : stats?.staffCount || 0}</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon text-amber-400 bg-amber-950/40">
              <Clock size={22} />
            </div>
            <div>
              <span className="admin-stat-label">Pending Invites</span>
              <span className="admin-stat-val">{statsLoading ? "..." : stats?.pendingInvites || 0}</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon text-purple-400 bg-purple-950/40">
              <Activity size={22} />
            </div>
            <div>
              <span className="admin-stat-label">24h Logins</span>
              <span className="admin-stat-val">{statsLoading ? "..." : stats?.recentLogins24h || 0}</span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="admin-filter-bar">
          <div className="admin-search-wrap">
            <Search size={18} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, phone or staff ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="admin-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="admin-clear-search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="admin-filter-controls">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="admin-select"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admins</option>
              <option value="DOCTOR">Doctors</option>
              <option value="STAFF">Staff</option>
              <option value="PATIENT">Patients</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="admin-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="invited">Invited / Pending</option>
            </select>

            <button
              type="button"
              onClick={() => {
                fetchUsers();
                fetchStats();
              }}
              className="admin-refresh-btn"
              title="Refresh Registry"
            >
              <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            </button>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>ID / Phone</th>
                <th>Security & 2FA</th>
                <th>Last Login</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="admin-loading-row">
                    <RefreshCw size={24} className="spin-icon mx-auto text-cyan-400 mb-2" />
                    <span>Loading directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty-row">
                    <Users size={36} className="mx-auto text-slate-500 mb-2" />
                    <p className="font-semibold text-slate-300">No matching accounts found</p>
                    <p className="text-xs text-slate-500">Try adjusting your search or filter parameters</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isPrimaryAdmin = u.is_primary_admin;
                  const isActionLoading = actionLoadingId === u._id;

                  return (
                    <tr key={u._id} className={u.status === "inactive" ? "row-inactive" : ""}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">
                            {(u.name || u.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="admin-user-name">
                              {u.name || "Unnamed User"}
                              {isPrimaryAdmin && (
                                <span className="admin-primary-tag">Primary</span>
                              )}
                            </span>
                            <span className="admin-user-email">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-role-badge role-${(u.role || "PATIENT").toLowerCase()}`}>
                          {u.role || "PATIENT"}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-status-badge status-${u.status || "active"}`}>
                          <span className="status-dot"></span>
                          {u.status === "invited" ? "Invite Sent" : (u.status || "Active")}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs">
                          {u.staffId && (
                            <div className="font-mono text-cyan-400">ID: #{u.staffId}</div>
                          )}
                          <div className="text-slate-400">{u.phone || "—"}</div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs">
                          {u.emailVerified ? (
                            <span className="text-emerald-400 flex items-center gap-1" title="Email Verified">
                              <CheckCircle2 size={13} /> Verified
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1" title="Unverified Email">
                              <AlertTriangle size={13} /> Unverified
                            </span>
                          )}
                          {u.role === "ADMIN" && (
                            <span className="ml-2 text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              2FA OTP
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-400">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="admin-row-actions">
                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u._id, u.status)}
                              disabled={isActionLoading}
                              className={`action-btn ${u.status === "inactive" ? "btn-activate" : "btn-deactivate"}`}
                              title={u.status === "inactive" ? "Activate User" : "Deactivate User"}
                            >
                              <Power size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleResetPassword(u._id, u.email)}
                            disabled={isActionLoading}
                            className="action-btn btn-reset"
                            title="Send Password Reset Link"
                          >
                            <Mail size={14} />
                          </button>

                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u._id, u.email)}
                              disabled={isActionLoading}
                              className="action-btn btn-delete"
                              title="Delete Account Permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="admin-pagination-row">
          <span className="text-xs text-slate-400">
            Showing <strong>{users.length}</strong> of <strong>{pagination.total}</strong> accounts (Page {page} of {pagination.pages})
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="admin-page-btn"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="admin-page-btn"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div className="flex items-center gap-2">
                <UserPlus size={20} className="text-cyan-400" />
                <h3 className="font-bold text-white text-lg">Invite Healthcare Professional</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="admin-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="admin-modal-body">
              <p className="text-xs text-slate-300 mb-4">
                An activation link with a secure onboarding token will be dispatched to the professional's email address.
              </p>

              <div className="admin-form-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="Dr. Rajesh Kumar"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-field">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="dr.rajesh@hospital.org"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="admin-form-field">
                  <label>Role *</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    <option value="DOCTOR">Doctor (Specialist)</option>
                    <option value="STAFF">Clinical Staff</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div className="admin-form-field">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {inviteForm.role === "DOCTOR" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="admin-form-field">
                    <label>Department</label>
                    <input
                      type="text"
                      placeholder="Cardiology"
                      value={inviteForm.department}
                      onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-field">
                    <label>Specialization</label>
                    <input
                      type="text"
                      placeholder="Interventional Cardiologist"
                      value={inviteForm.specialization}
                      onChange={(e) => setInviteForm({ ...inviteForm, specialization: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="admin-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="admin-btn-primary"
                >
                  {inviteLoading ? "Sending Invitation..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {showBulkModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card max-w-xl">
            <div className="admin-modal-header">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-cyan-400" />
                <h3 className="font-bold text-white text-lg">Bulk CSV Import (Staff & Doctors)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="admin-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="admin-modal-body">
              <p className="text-xs text-slate-300 mb-3">
                Upload or paste a CSV file containing staff and doctor profiles. Standard headers: <code className="text-cyan-400">name,email,role,phone,department,specialization</code>.
              </p>

              <div className="mb-4">
                <label className="admin-file-drop">
                  <Upload size={24} className="text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-300">Click to upload .csv file</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="admin-form-field">
                <label>CSV Content</label>
                <textarea
                  rows="6"
                  placeholder="name,email,role,phone,department,specialization
Dr. Ananya Roy,ananya.roy@carebridge.ai,DOCTOR,+91 9876543211,Cardiology,Electrophysiologist
Nurse Priya Sharma,priya.sharma@carebridge.ai,STAFF,+91 9876543212,ICU,Critical Care"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="admin-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="admin-btn-primary"
                >
                  {bulkLoading ? "Importing Accounts..." : "Execute Bulk Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
