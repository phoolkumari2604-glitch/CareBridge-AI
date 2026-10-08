import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Loader2,
  RefreshCw,
  X,
  Plus,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./PatientMonitoring.css";

function PatientMonitoring() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all"); // all, critical, attention, stable

  const [patients, setPatients] = useState([]);
  const [vitalsMap, setVitalsMap] = useState({});
  const [alertsMap, setAlertsMap] = useState({});

  // Selected patient for details drawer / modal
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientVitalsHistory, setSelectedPatientVitalsHistory] = useState([]);
  const [selectedPatientRecords, setSelectedPatientRecords] = useState([]);
  const [loadingPatientDetails, setLoadingPatientDetails] = useState(false);

  const loadPatientsData = useCallback(async () => {
    try {
      setError(null);
      const data = await doctorService.getPatients();
      const patientList = Array.isArray(data) ? data : [];
      setPatients(patientList);

      const vitalsTemp = {};
      const alertsTemp = {};

      if (patientList.length > 0) {
        await Promise.all(
          patientList.map(async (pat) => {
            const pid = pat._id || pat.id;
            try {
              const [vital, alertSummary] = await Promise.all([
                doctorService.getLatestVitals(pid),
                doctorService.getHealthAlertSummary(pid),
              ]);
              if (vital) vitalsTemp[pid] = vital;
              if (alertSummary) alertsTemp[pid] = alertSummary;
            } catch (e) {
              // Ignore single patient error
            }
          })
        );
      }

      setVitalsMap(vitalsTemp);
      setAlertsMap(alertsTemp);
    } catch (err) {
      console.error("Error loading patient monitoring data:", err);
      setError("Failed to load patient monitoring registry.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPatientsData();
  }, [loadPatientsData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPatientsData();
  };

  const getPatientStatus = (patientId) => {
    const alertSummary = alertsMap[patientId];
    const vit = vitalsMap[patientId];

    if (alertSummary?.status === "ALERT" || alertSummary?.high_alerts > 0) {
      return {
        level: "critical",
        label: "Critical",
        reason: alertSummary.message || "Acute threshold flagged",
      };
    }
    if (vit) {
      if (
        (vit.heart_rate && (vit.heart_rate > 105 || vit.heart_rate < 55)) ||
        (vit.systolic_bp && vit.systolic_bp >= 140) ||
        (vit.spo2 && vit.spo2 < 95) ||
        (vit.blood_sugar && (vit.blood_sugar > 140 || vit.blood_sugar < 70))
      ) {
        return {
          level: "attention",
          label: "Needs Review",
          reason: "Borderline vital readings",
        };
      }
      return {
        level: "stable",
        label: "Stable",
        reason: "Normal physiological range",
      };
    }
    return {
      level: "stable",
      label: "Stable",
      reason: "No active acute alerts",
    };
  };

  // Open full patient details drawer
  const handleOpenPatientDetails = async (patient) => {
    setSelectedPatient(patient);
    setLoadingPatientDetails(true);
    const pid = patient._id || patient.id;

    try {
      const [history, records] = await Promise.all([
        doctorService.getPatientVitals(pid),
        doctorService.getHealthRecords(pid),
      ]);
      setSelectedPatientVitalsHistory(Array.isArray(history) ? history : []);
      setSelectedPatientRecords(Array.isArray(records) ? records : []);
    } catch (err) {
      console.warn("Failed to fetch detailed sub-data:", err);
    } finally {
      setLoadingPatientDetails(false);
    }
  };

  const filteredPatients = patients.filter((pat) => {
    const pid = pat._id || pat.id;
    const { level } = getPatientStatus(pid);

    const matchesStatus =
      statusFilter === "all" ? true : level === statusFilter;

    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (pat.name || "").toLowerCase().includes(query) ||
      (pat.email || "").toLowerCase().includes(query) ||
      (pat.phone || "").toLowerCase().includes(query) ||
      (pid || "").toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const criticalCount = patients.filter(
    (p) => getPatientStatus(p._id || p.id).level === "critical"
  ).length;
  const attentionCount = patients.filter(
    (p) => getPatientStatus(p._id || p.id).level === "attention"
  ).length;
  const stableCount = patients.filter(
    (p) => getPatientStatus(p._id || p.id).level === "stable"
  ).length;

  return (
    <div className="patient-monitoring-page">
      {/* HEADER */}
      <section className="monitoring-hero-header">
        <div className="hero-left">
          <div className="portal-kicker">
            <Users size={14} /> PATIENT REGISTRY & SURVEILLANCE
          </div>
          <h1>Patient Monitoring Hub</h1>
          <p>
            Comprehensive surveillance of all active patients, physiological parameters, acute alerts, and clinical histories.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className={`sync-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Registry"}</span>
          </button>

          <button
            className="record-vital-primary-btn"
            onClick={() => navigate("/doctor/vitals")}
          >
            <Plus size={16} />
            <span>Record Patient Vitals</span>
          </button>
        </div>
      </section>

      {/* KPI TABS */}
      <section className="monitoring-kpi-bar">
        <button
          className={`kpi-chip ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <Users size={16} />
          <span>All Monitored Patients</span>
          <strong>{patients.length}</strong>
        </button>

        <button
          className={`kpi-chip critical ${statusFilter === "critical" ? "active" : ""}`}
          onClick={() => setStatusFilter("critical")}
        >
          <AlertCircle size={16} />
          <span>Critical Alerts</span>
          <strong className="badge-critical">{criticalCount}</strong>
        </button>

        <button
          className={`kpi-chip attention ${statusFilter === "attention" ? "active" : ""}`}
          onClick={() => setStatusFilter("attention")}
        >
          <AlertTriangle size={16} />
          <span>Needs Attention</span>
          <strong className="badge-attention">{attentionCount}</strong>
        </button>

        <button
          className={`kpi-chip stable ${statusFilter === "stable" ? "active" : ""}`}
          onClick={() => setStatusFilter("stable")}
        >
          <CheckCircle2 size={16} />
          <span>Stable Baseline</span>
          <strong>{stableCount}</strong>
        </button>
      </section>

      {/* PROMINENT SEARCH BAR */}
      <section className="prominent-search-section">
        <div className="prominent-search-input-wrap">
          <Search size={20} className="search-icon" />
          <input
            type="search"
            placeholder="Search patients by Full Name, Patient ID, Email address, or Phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="prominent-search-input"
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="search-results-meta">
          Showing <strong>{filteredPatients.length}</strong> of {patients.length} patients
        </div>
      </section>

      {/* ERROR NOTICE */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadPatientsData}>Retry</button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !error && (
        <div className="monitoring-loading">
          <Loader2 size={36} className="spinning" />
          <h3>Loading patient telemetry registry...</h3>
        </div>
      )}

      {/* PATIENT REGISTRY TABLE & CARDS */}
      {!loading && (
        <div className="patient-cards-grid">
          {filteredPatients.length === 0 ? (
            <div className="empty-registry-state">
              <Users size={48} />
              <h3>No patients found</h3>
              <p>
                {searchTerm
                  ? `No patient records match "${searchTerm}". Try adjusting your query or filter.`
                  : "No patients currently registered in the database."}
              </p>
              {searchTerm && (
                <button
                  className="clear-filter-button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Reset Search & Filters
                </button>
              )}
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const pid = patient._id || patient.id;
              const vit = vitalsMap[pid];
              const { level, label, reason } = getPatientStatus(pid);

              return (
                <article key={pid} className={`patient-registry-card ${level}`}>
                  {/* Top Bar */}
                  <div className="registry-card-top">
                    <div className="patient-avatar-badge">
                      {patient.name
                        ? patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "PT"}
                    </div>

                    <div className="patient-main-info">
                      <div className="name-row">
                        <h3>{patient.name || "Patient Record"}</h3>
                        <span className={`status-badge-mini ${level}`}>
                          {label}
                        </span>
                      </div>
                      <div className="id-contact-row">
                        <span className="id-chip">ID: {pid.slice(-6)}</span>
                        {patient.age && <span>Age: {patient.age}</span>}
                        {patient.gender && <span>• {patient.gender}</span>}
                        {patient.blood_group && <span>• Blood: {patient.blood_group}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Contact Snippets */}
                  <div className="patient-contacts-strip">
                    {patient.email && (
                      <span className="contact-item">
                        <Mail size={13} /> {patient.email}
                      </span>
                    )}
                    {patient.phone && (
                      <span className="contact-item">
                        <Phone size={13} /> {patient.phone}
                      </span>
                    )}
                  </div>

                  {/* Vitals Summary Pill Matrix */}
                  <div className="card-vitals-summary">
                    <div className="vital-mini-chip">
                      <HeartPulse size={14} className="icon-bp" />
                      <span className="label">BP:</span>
                      <strong>
                        {vit?.systolic_bp && vit?.diastolic_bp
                          ? `${vit.systolic_bp}/${vit.diastolic_bp}`
                          : "--"}
                      </strong>
                    </div>

                    <div className="vital-mini-chip">
                      <Activity size={14} className="icon-hr" />
                      <span className="label">HR:</span>
                      <strong>{vit?.heart_rate ? `${vit.heart_rate} bpm` : "--"}</strong>
                    </div>

                    <div className="vital-mini-chip">
                      <Droplets size={14} className="icon-spo2" />
                      <span className="label">SpO₂:</span>
                      <strong>{vit?.spo2 ? `${vit.spo2}%` : "--"}</strong>
                    </div>

                    <div className="vital-mini-chip">
                      <Thermometer size={14} className="icon-temp" />
                      <span className="label">Temp:</span>
                      <strong>{vit?.temperature ? `${vit.temperature}°` : "--"}</strong>
                    </div>

                    <div className="vital-mini-chip">
                      <TrendingUp size={14} className="icon-sugar" />
                      <span className="label">Sugar:</span>
                      <strong>{vit?.blood_sugar ? `${vit.blood_sugar} mg/dL` : "--"}</strong>
                    </div>
                  </div>

                  {/* Clinical Alert reason */}
                  <div className="card-alert-line">
                    <span className="alert-reason-text">
                      <strong>Status Note: </strong> {reason}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions-bar">
                    <button
                      className="action-btn view-details"
                      onClick={() => handleOpenPatientDetails(patient)}
                      title="View complete patient dossier"
                    >
                      <span>Patient Details</span>
                    </button>

                    <button
                      className="action-btn telemetry"
                      onClick={() => navigate(`/doctor/health-monitoring?patientId=${pid}`)}
                      title="View telemetry trend charts"
                    >
                      <Activity size={14} />
                      <span>Trends</span>
                    </button>

                    <button
                      className="action-btn chart"
                      onClick={() => navigate(`/doctor/records?patientId=${pid}`)}
                      title="View health records"
                    >
                      <FileText size={14} />
                      <span>Records</span>
                    </button>

                    <button
                      className="action-btn ai-btn"
                      onClick={() => navigate(`/doctor/ai-assistant?patientId=${pid}`)}
                      title="AI Triage & Clinical note"
                    >
                      <Sparkles size={14} />
                      <span>AI Triage</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================
          PATIENT DETAILS DRAWER / MODAL
      ============================================================ */}
      {selectedPatient && (
        <div className="patient-modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="patient-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">PATIENT CLINICAL DOSSIER</span>
                <h2>{selectedPatient.name || "Patient Overview"}</h2>
                <span className="patient-uid">
                  System ID: {selectedPatient._id || selectedPatient.id}
                </span>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setSelectedPatient(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-scrollable-body">
              {/* Demographics Card */}
              <div className="modal-section-card">
                <h3>Demographics & Contact Information</h3>
                <div className="info-grid-2">
                  <div className="info-item">
                    <label>Full Name</label>
                    <span>{selectedPatient.name || "--"}</span>
                  </div>
                  <div className="info-item">
                    <label>Email Address</label>
                    <span>{selectedPatient.email || "--"}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone Number</label>
                    <span>{selectedPatient.phone || "--"}</span>
                  </div>
                  <div className="info-item">
                    <label>Age & Gender</label>
                    <span>
                      {selectedPatient.age ? `Age ${selectedPatient.age}` : "Age N/A"} •{" "}
                      {selectedPatient.gender || "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Blood Group</label>
                    <span>{selectedPatient.blood_group || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Latest Vitals Snapshot */}
              <div className="modal-section-card">
                <div className="section-title-row">
                  <h3>Latest Physiological Telemetry</h3>
                  <button
                    className="modal-action-link"
                    onClick={() => {
                      const pid = selectedPatient._id || selectedPatient.id;
                      setSelectedPatient(null);
                      navigate(`/doctor/vitals?patientId=${pid}`);
                    }}
                  >
                    + Record New Vitals
                  </button>
                </div>

                {vitalsMap[selectedPatient._id || selectedPatient.id] ? (
                  <div className="modal-vitals-grid">
                    {(() => {
                      const vit = vitalsMap[selectedPatient._id || selectedPatient.id];
                      return (
                        <>
                          <div className="modal-vital-box">
                            <span className="box-title">Blood Pressure</span>
                            <strong>
                              {vit.systolic_bp && vit.diastolic_bp
                                ? `${vit.systolic_bp}/${vit.diastolic_bp}`
                                : "--"}
                            </strong>
                            <small>mmHg (Target &lt;120/80)</small>
                          </div>
                          <div className="modal-vital-box">
                            <span className="box-title">Heart Rate</span>
                            <strong>{vit.heart_rate || "--"} bpm</strong>
                            <small>Normal 60-100</small>
                          </div>
                          <div className="modal-vital-box">
                            <span className="box-title">SpO₂ Oxygen</span>
                            <strong>{vit.spo2 ? `${vit.spo2}%` : "--"}</strong>
                            <small>Target &gt;95%</small>
                          </div>
                          <div className="modal-vital-box">
                            <span className="box-title">Body Temperature</span>
                            <strong>{vit.temperature ? `${vit.temperature}°` : "--"}</strong>
                            <small>Normal 36.5-37.5°C</small>
                          </div>
                          <div className="modal-vital-box">
                            <span className="box-title">Blood Sugar</span>
                            <strong>{vit.blood_sugar ? `${vit.blood_sugar} mg/dL` : "--"}</strong>
                            <small>Normal 70-120</small>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="empty-subtext">No vitals recorded for this patient yet.</p>
                )}
              </div>

              {/* Recent Medical Records */}
              <div className="modal-section-card">
                <div className="section-title-row">
                  <h3>Medical Records & Diagnoses</h3>
                  <button
                    className="modal-action-link"
                    onClick={() => {
                      const pid = selectedPatient._id || selectedPatient.id;
                      setSelectedPatient(null);
                      navigate(`/doctor/records?patientId=${pid}`);
                    }}
                  >
                    Open Health Records
                  </button>
                </div>

                {loadingPatientDetails ? (
                  <div className="modal-loader">
                    <Loader2 size={24} className="spinning" />
                    <span>Loading patient records...</span>
                  </div>
                ) : selectedPatientRecords.length === 0 ? (
                  <p className="empty-subtext">No health records recorded yet.</p>
                ) : (
                  <div className="modal-records-list">
                    {selectedPatientRecords.slice(0, 3).map((rec) => (
                      <div key={rec._id || rec.id} className="modal-record-item">
                        <div className="rec-header">
                          <strong>{rec.title || rec.diagnosis || "Health Record"}</strong>
                          <span className="rec-type">{rec.record_type || "General"}</span>
                        </div>
                        {rec.description && <p className="rec-desc">{rec.description}</p>}
                        {rec.medications && rec.medications.length > 0 && (
                          <div className="rec-meds">
                            <span>Medications: </span>
                            {rec.medications.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="modal-footer">
              <button
                className="btn-modal-action secondary"
                onClick={() => {
                  const pid = selectedPatient._id || selectedPatient.id;
                  setSelectedPatient(null);
                  navigate(`/doctor/health-monitoring?patientId=${pid}`);
                }}
              >
                <Activity size={15} /> Telemetry Trends
              </button>

              <button
                className="btn-modal-action ai"
                onClick={() => {
                  const pid = selectedPatient._id || selectedPatient.id;
                  setSelectedPatient(null);
                  navigate(`/doctor/ai-assistant?patientId=${pid}`);
                }}
              >
                <Sparkles size={15} /> AI Clinical Triage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientMonitoring;
