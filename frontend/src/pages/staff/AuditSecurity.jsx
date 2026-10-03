import { useMemo, useState } from "react";
import "./AuditSecurity.css";

const initialLogs = [
  {
    id: 1,
    user: "Admin User",
    role: "Admin",
    action: "Approved doctor registration",
    resource: "Doctor #DR-1042",
    status: "Success",
    ip: "192.168.1.24",
    time: "2 min ago",
  },
  {
    id: 2,
    user: "Staff Member",
    role: "Staff",
    action: "Updated patient record",
    resource: "Patient #PT-2081",
    status: "Success",
    ip: "192.168.1.31",
    time: "8 min ago",
  },
  {
    id: 3,
    user: "Dr. Ananya",
    role: "Doctor",
    action: "Viewed health record",
    resource: "Patient #PT-1944",
    status: "Success",
    ip: "192.168.1.42",
    time: "14 min ago",
  },
  {
    id: 4,
    user: "Unknown User",
    role: "Unknown",
    action: "Failed login attempt",
    resource: "Admin Portal",
    status: "Failed",
    ip: "103.91.45.18",
    time: "21 min ago",
  },
  {
    id: 5,
    user: "Staff Member",
    role: "Staff",
    action: "Rejected appointment",
    resource: "Appointment #AP-7821",
    status: "Success",
    ip: "192.168.1.31",
    time: "32 min ago",
  },
  {
    id: 6,
    user: "Admin User",
    role: "Admin",
    action: "Changed access permissions",
    resource: "Staff Role",
    status: "Success",
    ip: "192.168.1.24",
    time: "48 min ago",
  },
];

function AuditSecurity() {
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [securityMode, setSecurityMode] = useState(true);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.resource.toLowerCase().includes(search.toLowerCase()) ||
        log.ip.includes(search);

      const matchesStatus =
        statusFilter === "All" || log.status === statusFilter;

      const matchesRole =
        roleFilter === "All" || log.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [logs, search, statusFilter, roleFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setRoleFilter("All");
  };

  const exportLogs = () => {
    const headers = [
      "User",
      "Role",
      "Action",
      "Resource",
      "Status",
      "IP Address",
      "Time",
    ];

    const rows = filteredLogs.map((log) => [
      log.user,
      log.role,
      log.action,
      log.resource,
      log.status,
      log.ip,
      log.time,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${value}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "carebridge-audit-logs.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const refreshLogs = () => {
    setLogs((current) => [...current]);
  };

  return (
    <main className="audit-page">
      <section className="audit-header">
        <div>
          <div className="audit-breadcrumb">
            Staff / Admin <span>›</span> Audit & Security
          </div>

          <h1>Audit & Security</h1>

          <p>
            Monitor system activity, access events, security events,
            and administrative actions.
          </p>
        </div>

        <div className="audit-header-actions">
          <button
            className="audit-secondary-btn"
            onClick={refreshLogs}
          >
            ↻ Refresh
          </button>

          <button
            className="audit-primary-btn"
            onClick={exportLogs}
          >
            ↓ Export Logs
          </button>
        </div>
      </section>

      <section className="security-banner">
        <div className="security-icon">🛡️</div>

        <div className="security-banner-content">
          <strong>Security monitoring is active</strong>
          <span>
            CareBridge AI is currently monitoring authentication,
            access, and administrative activity.
          </span>
        </div>

        <button
          className={`security-toggle ${
            securityMode ? "active" : ""
          }`}
          onClick={() => setSecurityMode(!securityMode)}
          aria-label="Toggle security monitoring"
        >
          <span />
          {securityMode ? "Active" : "Paused"}
        </button>
      </section>

      <section className="audit-stats">
        <div className="audit-stat-card">
          <div className="stat-icon blue">↗</div>
          <div>
            <span>Total Events</span>
            <strong>1,284</strong>
            <small>Last 24 hours</small>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Successful Actions</span>
            <strong>1,241</strong>
            <small>96.6% of events</small>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="stat-icon red">!</div>
          <div>
            <span>Security Events</span>
            <strong>18</strong>
            <small>Requires attention</small>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="stat-icon orange">◉</div>
          <div>
            <span>Active Sessions</span>
            <strong>42</strong>
            <small>Currently online</small>
          </div>
        </div>
      </section>

      <section className="security-grid">
        <div className="security-card">
          <div className="security-card-heading">
            <div>
              <h2>Access Control</h2>
              <p>Current platform access configuration</p>
            </div>

            <span className="status-pill enabled">
              Enabled
            </span>
          </div>

          <div className="access-list">
            <div className="access-row">
              <div className="access-symbol">👤</div>
              <div>
                <strong>Role Based Access</strong>
                <span>
                  Permissions are assigned according to user role.
                </span>
              </div>
              <b>ON</b>
            </div>

            <div className="access-row">
              <div className="access-symbol">🔐</div>
              <div>
                <strong>JWT Authentication</strong>
                <span>
                  Protected routes require authenticated sessions.
                </span>
              </div>
              <b>ON</b>
            </div>

            <div className="access-row">
              <div className="access-symbol">⏱️</div>
              <div>
                <strong>Session Monitoring</strong>
                <span>
                  Active sessions are monitored continuously.
                </span>
              </div>
              <b>ON</b>
            </div>
          </div>
        </div>

        <div className="security-card">
          <div className="security-card-heading">
            <div>
              <h2>Security Overview</h2>
              <p>Recent security indicators</p>
            </div>
          </div>

          <div className="security-overview">
            <div className="security-meter">
              <div className="meter-circle">
                <strong>94%</strong>
                <span>Secure</span>
              </div>
            </div>

            <div className="security-checks">
              <div>
                <span className="check-dot success" />
                <span>Authentication</span>
                <b>Healthy</b>
              </div>

              <div>
                <span className="check-dot success" />
                <span>Access Control</span>
                <b>Healthy</b>
              </div>

              <div>
                <span className="check-dot warning" />
                <span>Failed Logins</span>
                <b>3 detected</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="audit-panel">
        <div className="audit-panel-header">
          <div>
            <h2>Audit Logs</h2>
            <p>
              Track important activity across the CareBridge platform.
            </p>
          </div>

          <span className="event-count">
            {filteredLogs.length} events
          </span>
        </div>

        <div className="audit-filters">
          <div className="audit-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search user, action, resource or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Doctor">Doctor</option>
            <option value="Unknown">Unknown</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>

          <button
            className="clear-filter-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="audit-user">
                        <div className="user-avatar">
                          {log.user.charAt(0)}
                        </div>

                        <div>
                          <strong>{log.user}</strong>
                          <span>{log.role}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="action-text">
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <span className="resource-text">
                        {log.resource}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`log-status ${
                          log.status === "Success"
                            ? "success"
                            : "failed"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>

                    <td>
                      <code>{log.ip}</code>
                    </td>

                    <td>
                      <span className="log-time">
                        {log.time}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-audit"
                  >
                    <div>
                      <span>🔎</span>
                      <strong>No audit events found</strong>
                      <p>
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="audit-footer-grid">
        <div className="quick-security-card">
          <div className="quick-icon">🔒</div>

          <div>
            <h3>Security Policies</h3>
            <p>
              Manage authentication, session and access policies.
            </p>
          </div>

          <button>Manage →</button>
        </div>

        <div className="quick-security-card">
          <div className="quick-icon">📋</div>

          <div>
            <h3>Compliance Records</h3>
            <p>
              Review important system and administrative records.
            </p>
          </div>

          <button>View →</button>
        </div>
      </section>
    </main>
  );
}

export default AuditSecurity;