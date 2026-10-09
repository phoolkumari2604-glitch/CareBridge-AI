import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Download,
  CheckCircle2,
  Lock,
  UserCheck,
  FileText,
  Clock,
  UserX,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Activity,
  Terminal,
  Calendar,
  Radio,
  ExternalLink,
} from "lucide-react";
import api from "../../services/api";
import "./AuditSecurity.css";

const ROLE_OPTIONS = ["All", "ADMIN", "STAFF", "DOCTOR", "PATIENT", "SYSTEM"];
const STATUS_OPTIONS = ["All", "SUCCESS", "FAILED", "SENSITIVE", "INFO"];
const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "24h", label: "Past 24 Hours" },
  { value: "7d", label: "Past 7 Days" },
  { value: "30d", label: "Past 30 Days" },
];

export default function AuditSecurity() {
  // Data State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_events: 0,
    events_24h: 0,
    failed_logins_24h: 0,
    unique_active_users: 0,
    engine_status: "ACTIVE",
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Auto-refresh (30s)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Side Drawer State
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        role: roleFilter !== "All" ? roleFilter : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        date_range: dateRange,
        critical_only: criticalOnly,
      };

      const res = await api.get("/audit-logs/", { params });
      const data = res.data || {};

      if (Array.isArray(data)) {
        setLogs(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      } else {
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
        if (data.stats) setStats(data.stats);
      }

      setLastUpdatedTime(new Date());
      setSecondsUntilRefresh(30);

      if (isRefresh) {
        showToast("Audit logs synchronized with database.", "info");
      }
    } catch (err) {
      console.error("Audit fetch error:", err);
      setError("Failed to retrieve audit log telemetry from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, roleFilter, statusFilter, dateRange, criticalOnly]);

  // Initial load
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // 30s Auto-Refresh Timer
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchAuditLogs(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchAuditLogs]);

  // Export CSV Action
  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        role: roleFilter !== "All" ? roleFilter : "",
        status: statusFilter !== "All" ? statusFilter : "",
        critical_only: criticalOnly ? "true" : "false",
      });

      const res = await api.get(`/audit-logs/export/csv?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `carebridge_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      showToast("Audit logs CSV downloaded successfully.", "success");
    } catch (err) {
      console.error("CSV export error:", err);
      showToast("Failed to generate CSV export file.", "error");
    } finally {
      setExportingCsv(false);
    }
  };

  // Row Click for Side Drawer
  const openDrawer = (log) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  // Status Badge Formatter
  const renderStatusBadge = (status) => {
    const st = (status || "SUCCESS").toUpperCase();
    switch (st) {
      case "FAILED":
      case "DENIED":
      case "ERROR":
        return <span className="audit-badge badge-failed"><AlertTriangle size={11} /> Failed</span>;
      case "SENSITIVE":
        return <span className="audit-badge badge-sensitive"><Lock size={11} /> Sensitive</span>;
      case "INFO":
        return <span className="audit-badge badge-info"><FileText size={11} /> Info</span>;
      default:
        return <span className="audit-badge badge-success"><CheckCircle2 size={11} /> Success</span>;
    }
  };

  // Role Badge Formatter
  const renderRoleBadge = (role) => {
    const r = (role || "STAFF").toUpperCase();
    return <span className={`audit-role-badge role-${r.toLowerCase()}`}>{r}</span>;
  };

  return (
    <div className="staff-audit-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`staff-audit-toast toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="staff-audit-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Shield size={14} />
            <span>SECURITY, COMPLIANCE & IMMUTABLE AUDIT LOGS</span>
          </div>
          <h1 className="hero-title">Security & Audit Logs</h1>
          <p className="hero-subtitle">
            Monitor real-time clinical access logs, administrative actions, credential verifications, and compliance audit trails with cryptographic hash verification.
          </p>

          <div className="hero-live-meta">
            <span className="live-dot" />
            <span>Live Telemetry Engine: <strong>{stats.engine_status || "ACTIVE"}</strong></span>
            <span className="meta-divider">•</span>
            <span>Next sync in: <strong>{secondsUntilRefresh}s</strong></span>
          </div>
        </div>

        <div className="hero-actions">
          <button
            className={`hero-btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchAuditLogs(true)}
            disabled={isRefreshing || loading}
            title="Refresh Audit Logs"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            className="hero-btn-export"
            onClick={handleExportCsv}
            disabled={exportingCsv || logs.length === 0}
            title="Export filtered records to CSV"
          >
            {exportingCsv ? <Loader2 size={16} className="spinner-loader" /> : <Download size={16} />}
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* 4 Responsive Stat Cards */}
      <section className="staff-audit-stats-grid">
        <div className="audit-stat-card card-teal">
          <div className="audit-stat-icon">
            <Activity size={22} />
          </div>
          <div className="audit-stat-body">
            <span className="audit-stat-label">Total Audit Events</span>
            <strong className="audit-stat-value">{stats.total_events || 0}</strong>
          </div>
        </div>

        <div className="audit-stat-card card-blue">
          <div className="audit-stat-icon">
            <Clock size={22} />
          </div>
          <div className="audit-stat-body">
            <span className="audit-stat-label">Events in Past 24h</span>
            <strong className="audit-stat-value">{stats.events_24h || 0}</strong>
          </div>
        </div>

        <div className="audit-stat-card card-red">
          <div className="audit-stat-icon">
            <UserX size={22} />
          </div>
          <div className="audit-stat-body">
            <span className="audit-stat-label">Failed Logins (24h)</span>
            <strong className="audit-stat-value">{stats.failed_logins_24h || 0}</strong>
          </div>
        </div>

        <div className="audit-stat-card card-purple">
          <div className="audit-stat-icon">
            <UserCheck size={22} />
          </div>
          <div className="audit-stat-body">
            <span className="audit-stat-label">Active Users (24h)</span>
            <strong className="audit-stat-value">{stats.unique_active_users || 0}</strong>
          </div>
        </div>
      </section>

      {/* Main Audit Logs Card */}
      <section className="staff-audit-main-card">
        {/* Toolbar */}
        <div className="audit-card-toolbar">
          <div className="audit-search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by action, user name, role, resource, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="audit-filters-group">
            {/* Critical Events Tab Toggle */}
            <button
              className={`btn-critical-toggle ${criticalOnly ? "active-critical" : ""}`}
              onClick={() => {
                setCriticalOnly(!criticalOnly);
                setCurrentPage(1);
              }}
            >
              <AlertTriangle size={14} />
              <span>Critical Events Only</span>
            </button>

            {/* Role Filter */}
            <div className="select-wrapper">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === "All" ? "All Roles" : r}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All Statuses" : s}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="select-wrapper">
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {DATE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="audit-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="audit-loading-state">
            <Loader2 size={36} className="spinner-loader" />
            <p>Retrieving immutable audit records from MongoDB...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="audit-empty-state">
            <div className="empty-icon-wrap">
              <Shield size={42} />
            </div>
            <h3>No audit records found</h3>
            <p>
              {search || roleFilter !== "All" || statusFilter !== "All" || criticalOnly
                ? "No audit events match your active search and filter criteria."
                : "No security audit events recorded in the system yet."}
            </p>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && logs.length > 0 && (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th className="th-actions">Inspect</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  return (
                    <tr
                      key={log._id || log.id}
                      className="audit-table-row"
                      onClick={() => openDrawer(log)}
                    >
                      <td className="td-event-id">
                        <span className="event-tag">{log.event_id || `#${(log._id || "").slice(-6).toUpperCase()}`}</span>
                      </td>

                      <td className="td-user">
                        <div className="user-meta">
                          <strong className="user-name">{log.user_name || "System"}</strong>
                          <span className="user-short-id">ID: {log.user_id ? String(log.user_id).slice(-6) : "SYS"}</span>
                        </div>
                      </td>

                      <td className="td-role">{renderRoleBadge(log.user_role)}</td>

                      <td className="td-action">
                        <span className="action-tag">{log.action}</span>
                      </td>

                      <td className="td-resource">
                        <span className="resource-text">{log.resource}</span>
                      </td>

                      <td className="td-ip">
                        <span className="ip-text">{log.ip_address}</span>
                      </td>

                      <td className="td-status">{renderStatusBadge(log.status)}</td>

                      <td className="td-time">
                        <span className="time-text" title={log.created_at || log.timestamp}>
                          {log.timestamp}
                        </span>
                      </td>

                      <td className="td-inspect">
                        <button
                          className="btn-inspect-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(log);
                          }}
                          title="Open Event Drawer"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Stacked Cards View (<640px) */}
        {!loading && logs.length > 0 && (
          <div className="audit-mobile-cards-grid">
            {logs.map((log) => (
              <div
                key={log._id || log.id}
                className="audit-mobile-card"
                onClick={() => openDrawer(log)}
              >
                <div className="mobile-card-top">
                  <span className="event-tag">{log.event_id || `#${(log._id || "").slice(-6).toUpperCase()}`}</span>
                  {renderStatusBadge(log.status)}
                </div>

                <div className="mobile-card-body">
                  <div className="mobile-row">
                    <strong>{log.user_name}</strong>
                    {renderRoleBadge(log.user_role)}
                  </div>

                  <div className="mobile-row">
                    <span className="action-tag">{log.action}</span>
                    <span className="resource-text">{log.resource}</span>
                  </div>

                  <div className="mobile-meta-line">
                    <span>IP: {log.ip_address}</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Card Footer & Pagination */}
        {!loading && logs.length > 0 && (
          <div className="audit-card-footer">
            <div className="footer-count">
              Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> audit events
            </div>

            <div className="audit-pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Prev
              </button>

              <span className="pagination-current">
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* SIDE DRAWER: EVENT INSPECTOR */}
      {/* ============================================================ */}
      {drawerOpen && selectedLog && (
        <div className="audit-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="audit-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-wrap">
                <Terminal size={18} className="drawer-icon" />
                <div>
                  <h3>Audit Event Dossier</h3>
                  <span className="drawer-event-id">{selectedLog.event_id}</span>
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Status & Action */}
              <div className="drawer-section">
                <label>Event Status & Action</label>
                <div className="drawer-status-line">
                  {renderStatusBadge(selectedLog.status)}
                  <span className="action-tag-large">{selectedLog.action}</span>
                </div>
              </div>

              {/* User Dossier */}
              <div className="drawer-section">
                <label>Initiating User</label>
                <div className="drawer-card-box">
                  <p><strong>Name:</strong> {selectedLog.user_name}</p>
                  <p><strong>Role:</strong> {selectedLog.user_role}</p>
                  <p><strong>User ID:</strong> <code>{selectedLog.user_id || "SYSTEM"}</code></p>
                </div>
              </div>

              {/* Network & Device Details */}
              <div className="drawer-section">
                <label>Network & Telemetry Context</label>
                <div className="drawer-card-box">
                  <p><strong>IP Address:</strong> <code>{selectedLog.ip_address}</code></p>
                  <p><strong>Timestamp:</strong> {selectedLog.timestamp}</p>
                  <p><strong>Resource Target:</strong> {selectedLog.resource} ({selectedLog.resource_id})</p>
                  <p><strong>User Agent:</strong> <small>{selectedLog.user_agent}</small></p>
                </div>
              </div>

              {/* Event Metadata JSON */}
              <div className="drawer-section">
                <label>Raw Payload & Metadata JSON</label>
                <pre className="drawer-json-viewer">
                  {JSON.stringify(selectedLog.metadata || selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn-drawer-close" onClick={() => setDrawerOpen(false)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}