import React, { useMemo, useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import api from "../../services/api";
import "./AuditSecurity.css";

function AuditSecurity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [securityMode, setSecurityMode] = useState(true);

  const loadAuditLogs = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/audit-logs/");
      const logsList = Array.isArray(res.data) ? res.data : [];
      setLogs(logsList);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to retrieve security audit logs from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAuditLogs();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const user = (log.user_role || log.user || "System").toLowerCase();
      const action = (log.action || "").toLowerCase();
      const resource = (log.resource || log.details || "").toLowerCase();
      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        user.includes(query) ||
        action.includes(query) ||
        resource.includes(query);

      const status = log.status || "Success";
      const matchesStatus =
        statusFilter === "All" || status.toLowerCase() === statusFilter.toLowerCase();

      const role = log.user_role || log.role || "Admin";
      const matchesRole =
        roleFilter === "All" || role.toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [logs, search, statusFilter, roleFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setRoleFilter("All");
  };

  const exportLogs = () => {
    if (logs.length === 0) {
      alert("No logs available to export.");
      return;
    }

    const headers = ["ID", "User Role", "Action", "Resource", "Date/Time"];
    const rows = filteredLogs.map((log) => [
      log._id || log.id || "",
      log.user_role || log.role || "Staff",
      `"${(log.action || "").replace(/"/g, '""')}"`,
      `"${(log.resource || log.details || "").replace(/"/g, '""')}"`,
      log.created_at || "Recent",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `carebridge_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="audit-security-page">
      {/* Header */}
      <section className="audit-header">
        <div>
          <span className="audit-eyebrow">CAREBRIDGE AI — SECURITY & COMPLIANCE</span>
          <h1>Security & System Audit Logs</h1>
          <p>
            Surveillance of administrative events, patient data access, authentication attempts, and clearance actions.
          </p>
        </div>

        <div className="audit-actions">
          <button
            className={`refresh-btn-secondary ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh Audit Logs"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>

          <button className="export-btn" onClick={exportLogs}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="audit-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Security Status Cards */}
      <section className="security-cards-grid">
        <div className="security-card">
          <div className="card-top">
            <span className="card-title">Audit Engine Status</span>
            <span className="status-badge-active">ACTIVE</span>
          </div>
          <h3>Continuous Logging</h3>
          <p>All sensitive operations and data mutations are recorded.</p>
        </div>

        <div className="security-card">
          <div className="card-top">
            <span className="card-title">Access Control</span>
            <span className="status-badge-active">ENFORCED</span>
          </div>
          <h3>Role-Based Permissions</h3>
          <p>JWT authorization active across Patient, Doctor, and Staff tiers.</p>
        </div>

        <div className="security-card">
          <div className="card-top">
            <span className="card-title">Total Audit Entries</span>
            <span className="status-badge-active">{logs.length} RECORDS</span>
          </div>
          <h3>MongoDB Audit Store</h3>
          <p>Stored in carebridge_ai.audit_logs collection.</p>
        </div>
      </section>

      {/* Main Panel */}
      <section className="audit-panel">
        <div className="panel-header">
          <div>
            <h2>System Activity Stream</h2>
            <p>{filteredLogs.length} audit entries matching filters</p>
          </div>

          <div className="panel-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search action, user, resource..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
              <option value="Doctor">Doctor</option>
              <option value="Patient">Patient</option>
            </select>

            {(search || statusFilter !== "All" || roleFilter !== "All") && (
              <button className="clear-btn" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="audit-loading-box">
            <Loader2 size={32} className="spinner-icon" />
            <p>Loading security audit logs...</p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>User / Role</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => {
                  const logId = log._id || log.id;
                  const role = log.user_role || log.role || "Admin";
                  const status = log.status || "Success";

                  return (
                    <tr key={logId}>
                      <td>
                        <span className="log-id">#{String(logId).slice(-8).toUpperCase()}</span>
                      </td>

                      <td>
                        <div className="user-cell">
                          <strong>{log.user || (log.user_id ? `User #${String(log.user_id).slice(-6)}` : "Authenticated User")}</strong>
                          <span className="role-tag">{role}</span>
                        </div>
                      </td>

                      <td>
                        <strong>{log.action}</strong>
                      </td>

                      <td>
                        <span className="resource-tag">{log.resource || log.details || "API Resource"}</span>
                      </td>

                      <td>
                        <span className="time-text">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString()
                            : "Recent Event"}
                        </span>
                      </td>

                      <td>
                        <span className={`status-pill ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="empty-audit">
                <Shield size={38} className="text-muted" />
                <h3>No audit logs found</h3>
                <p>
                  {logs.length === 0
                    ? "No audit records logged yet."
                    : "No audit events match your current filter settings."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AuditSecurity;