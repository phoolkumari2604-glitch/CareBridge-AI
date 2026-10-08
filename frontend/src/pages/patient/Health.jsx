import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Wind,
  FileText,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  ShieldCheck,
  Plus,
  Clock,
  Stethoscope,
  Info,
  Loader2,
  CheckCircle2,
  X,
  Upload,
  Pill,
  Building,
  Eye,
  Weight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./Health.css";

function Health() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vitals, setVitals] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // New Record Form State
  const [newRecord, setNewRecord] = useState({
    title: "",
    record_type: "CONSULTATION",
    diagnosis: "",
    description: "",
    medications: "",
    doctor_name: "",
    hospital_name: "CareBridge Medical Center",
    record_date: new Date().toISOString().split("T")[0],
    fileName: "",
  });

  const fetchHealthData = useCallback(async () => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    const patientId = user.patient_id;

    try {
      setLoading(true);
      setError(null);

      const [
        vitalsRes,
        profileRes,
        recordsRes,
        alertsRes,
        summaryRes,
      ] = await Promise.allSettled([
        patientService.getLatestVital(patientId),
        patientService.getHealthProfile(patientId),
        patientService.getHealthRecords(patientId),
        patientService.getHealthAlerts(patientId),
        patientService.getAlertSummary(patientId),
      ]);

      if (vitalsRes.status === "fulfilled") {
        setVitals(vitalsRes.value);
      }
      if (profileRes.status === "fulfilled") {
        setHealthProfile(profileRes.value);
      }
      if (recordsRes.status === "fulfilled") {
        setHealthRecords(recordsRes.value || []);
      }
      if (alertsRes.status === "fulfilled") {
        setAlerts(alertsRes.value || []);
      }
      if (summaryRes.status === "fulfilled") {
        setAlertSummary(summaryRes.value);
      }
    } catch (err) {
      console.error("Failed to fetch health data:", err);
      setError("Failed to load health records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const isAlert = alertSummary?.status === "ALERT" || (alertSummary?.total_alerts || 0) > 0 || alerts.length > 0;

  // Format vitals display list
  const vitalsList = [
    {
      label: "Heart Rate",
      value: vitals?.heart_rate ?? "--",
      unit: "bpm",
      status:
        vitals?.heart_rate != null
          ? vitals.heart_rate < 50 || vitals.heart_rate > 120
            ? "Abnormal"
            : "Normal"
          : "Not recorded",
      icon: Activity,
      className: "heart",
    },
    {
      label: "Blood Pressure",
      value:
        vitals?.systolic_bp && vitals?.diastolic_bp
          ? `${vitals.systolic_bp}/${vitals.diastolic_bp}`
          : "--/--",
      unit: "mmHg",
      status:
        vitals?.systolic_bp >= 140 || vitals?.diastolic_bp >= 90
          ? "High"
          : vitals?.systolic_bp != null
          ? "Normal"
          : "Not recorded",
      icon: HeartPulse,
      className: "bp",
    },
    {
      label: "SpO₂ Level",
      value: vitals?.spo2 ?? "--",
      unit: "%",
      status:
        vitals?.spo2 != null
          ? vitals.spo2 < 94
            ? "Low"
            : "Normal"
          : "Not recorded",
      icon: Wind,
      className: "spo2",
    },
    {
      label: "Temperature",
      value: vitals?.temperature ?? "--",
      unit: "°C",
      status:
        vitals?.temperature != null
          ? vitals.temperature >= 38
            ? "Fever"
            : "Normal"
          : "Not recorded",
      icon: Thermometer,
      className: "temperature",
    },
    {
      label: "Blood Sugar",
      value: vitals?.blood_sugar ?? "--",
      unit: "mg/dL",
      status:
        vitals?.blood_sugar != null
          ? vitals.blood_sugar < 70 || vitals.blood_sugar > 200
            ? "Abnormal"
            : "Normal"
          : "Not recorded",
      icon: Droplets,
      className: "sugar",
    },
    {
      label: "Body Weight",
      value: vitals?.weight_kg ?? "--",
      unit: "kg",
      status: vitals?.weight_kg ? "Recorded" : "Not recorded",
      icon: Weight,
      className: "weight",
    },
  ];

  // Handle Record Upload Form Submission
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!user?.patient_id) {
      setUploadError("Patient profile missing.");
      return;
    }

    if (!newRecord.title.trim()) {
      setUploadError("Please provide a title for the health record.");
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError(null);

      const medList = newRecord.medications
        ? newRecord.medications.split(",").map((m) => m.trim()).filter(Boolean)
        : [];

      const payload = {
        patient_id: user.patient_id,
        record_type: newRecord.record_type,
        title: newRecord.title.trim(),
        description: newRecord.description.trim() || undefined,
        diagnosis: newRecord.diagnosis.trim() || undefined,
        medications: medList,
        doctor_name: newRecord.doctor_name.trim() || undefined,
        hospital_name: newRecord.hospital_name.trim() || undefined,
        record_date: newRecord.record_date,
      };

      await patientService.createHealthRecord(payload);

      setUploadModal(false);
      setToastMessage("Medical record saved and linked to your health chart.");
      setTimeout(() => setToastMessage(""), 3500);

      // Reset form
      setNewRecord({
        title: "",
        record_type: "CONSULTATION",
        diagnosis: "",
        description: "",
        medications: "",
        doctor_name: "",
        hospital_name: "CareBridge Medical Center",
        record_date: new Date().toISOString().split("T")[0],
        fileName: "",
      });

      // Refresh records
      fetchHealthData();
    } catch (err) {
      console.error("Failed to create health record:", err);
      const msg = err.response?.data?.detail || "Failed to save record. Please verify fields.";
      setUploadError(msg);
    } finally {
      setUploadLoading(false);
    }
  };

  if (!user?.patient_id) {
    return (
      <div className="health-page">
        <div className="health-no-profile">
          <Info size={40} />
          <h2>Patient Profile Required</h2>
          <p>
            Please complete your patient profile registration in the Profile section to start monitoring your clinical vitals and health records.
          </p>
          <Link to="/profile" className="health-record-btn">
            Go to Profile Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="health-page">
      {/* HEADER */}
      <div className="health-header">
        <div>
          <span className="health-kicker">CLINICAL TELEMETRY & DOSSIER</span>
          <h1>My Health Application</h1>
          <p>
            Continuous vital-signs telemetry, electronic health records (EHR), and algorithmic safety alerts.
          </p>
        </div>

        <div className="health-header-actions">
          <button className="health-add-btn" onClick={() => setUploadModal(true)}>
            <Plus size={16} />
            <span>Upload Record</span>
          </button>

          <Link to="/patient/ai-assistant" className="health-assistant-btn">
            <Activity size={16} />
            <span>Consult AI</span>
          </Link>
        </div>
      </div>

      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="health-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* OVERALL HEALTH STATUS CARD */}
      <section className={`health-status-card ${isAlert ? "alert-mode" : ""}`}>
        <div className="health-status-icon">
          {isAlert ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
        </div>

        <div className="health-status-content">
          <span>CLINICAL TRIAGE STATUS</span>
          <h2>{isAlert ? "Attention Recommended" : "Vitals are Stable & Normal"}</h2>
          <p>
            {alertSummary?.message ||
              (isAlert
                ? "Some recorded parameters fall outside standard physiological thresholds. Review active alerts below."
                : "All recent vital sign measurements are within configured safe healthcare parameters.")}
          </p>
        </div>

        <div className="health-status-date">
          <CalendarDays size={15} />
          {vitals?.recorded_at
            ? `Synced ${new Date(vitals.recorded_at).toLocaleDateString()}`
            : "Telemetry Active"}
        </div>
      </section>

      {/* HEALTH PROFILE BANNER */}
      {healthProfile && (
        <section className="health-profile-banner">
          <div className="profile-banner-item">
            <span>Blood Group</span>
            <strong>{healthProfile.blood_type || "Not Set"}</strong>
          </div>

          <div className="profile-banner-item">
            <span>Known Allergies</span>
            <strong>
              {Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0
                ? healthProfile.allergies.join(", ")
                : "None reported"}
            </strong>
          </div>

          <div className="profile-banner-item">
            <span>Chronic Conditions</span>
            <strong>
              {Array.isArray(healthProfile.chronic_conditions) && healthProfile.chronic_conditions.length > 0
                ? healthProfile.chronic_conditions.join(", ")
                : "None reported"}
            </strong>
          </div>

          <div className="profile-banner-item">
            <span>Emergency Contact</span>
            <strong>{healthProfile.emergency_contact || "Not provided"}</strong>
          </div>
        </section>
      )}

      {/* VITALS SECTION */}
      <section className="health-section">
        <div className="health-section-heading">
          <div>
            <span>PHYSIOLOGICAL TELEMETRY</span>
            <h2>Latest Recorded Vitals</h2>
          </div>
          {vitals?.recorded_at && (
            <span className="last-sync-tag">
              <Clock size={13} />
              {new Date(vitals.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="vitals-grid">
          {vitalsList.map((vital) => {
            const Icon = vital.icon;
            const isAbnormal =
              vital.status === "Abnormal" ||
              vital.status === "High" ||
              vital.status === "Fever" ||
              vital.status === "Low";

            return (
              <div
                className={`vital-card ${vital.className} ${isAbnormal ? "vital-alert" : ""}`}
                key={vital.label}
              >
                <div className="vital-top">
                  <div className="vital-icon">
                    <Icon size={18} />
                  </div>
                  <span className={`vital-status ${isAbnormal ? "status-bad" : "status-good"}`}>
                    {vital.status}
                  </span>
                </div>

                <span className="vital-label">{vital.label}</span>

                <div className="vital-value">
                  {vital.value}
                  <small>{vital.unit}</small>
                </div>

                <div className="vital-trend">
                  <TrendingUp size={13} />
                  {isAbnormal ? "Clinical Review Needed" : "Safe Range"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* LOWER CONTENT: RECORDS & ALERTS */}
      <div className="health-content-grid">
        {/* RECORDS CARD */}
        <section className="records-card">
          <div className="health-section-heading">
            <div>
              <span>CLINICAL DOSSIER</span>
              <h2>Medical Health Records</h2>
            </div>
            <div className="records-header-actions">
              <span className="count-pill">{healthRecords.length} Records</span>
              <button className="small-add-record-btn" onClick={() => setUploadModal(true)}>
                <Plus size={14} /> Add Record
              </button>
            </div>
          </div>

          {healthRecords.length === 0 ? (
            <div className="empty-inner-state">
              <FileText size={36} />
              <p>No electronic health records uploaded yet.</p>
              <button className="upload-first-btn" onClick={() => setUploadModal(true)}>
                <Upload size={14} /> Upload First Record
              </button>
            </div>
          ) : (
            <div className="records-list">
              {healthRecords.map((record) => (
                <div
                  className="record-item"
                  key={record._id || record.id}
                  onClick={() => setSelectedRecord(record)}
                  title="Click to view full record details"
                >
                  <div className="record-icon">
                    <FileText size={18} />
                  </div>

                  <div className="record-main">
                    <h3>{record.title || record.diagnosis || "Medical Document"}</h3>
                    <p>
                      <Stethoscope size={13} />
                      {record.doctor_name || record.doctor || "Consulting Physician"} &middot;{" "}
                      <span className="record-type-pill">{record.record_type || "CONSULTATION"}</span>
                    </p>
                    {record.diagnosis && (
                      <span className="record-diagnosis">
                        <strong>Diagnosis:</strong> {record.diagnosis}
                      </span>
                    )}
                  </div>

                  <div className="record-date-col">
                    <span>
                      {record.record_date ||
                        (record.created_at ? new Date(record.created_at).toLocaleDateString() : "--")}
                    </span>
                    <button className="view-record-icon-btn">
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACTIVE ALERTS CARD */}
        <section className="health-alert-card">
          <div className="alert-heading">
            <div className={`alert-icon ${alerts.length > 0 ? "has-alerts" : ""}`}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <span>SYSTEM TELEMETRY</span>
              <h2>Active Health Alerts</h2>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-inner-state">
              <ShieldCheck size={36} color="#10b981" />
              <p>No active health alerts detected.</p>
              <small>All monitored vitals are within normal clinical thresholds.</small>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert, idx) => (
                <div className="alert-item" key={idx}>
                  <div className="alert-dot" />
                  <div className="alert-info">
                    <div className="alert-top-row">
                      <strong>{alert.alert_type?.replace(/_/g, " ")}</strong>
                      <span className={`severity-tag ${(alert.severity || "MEDIUM").toLowerCase()}`}>
                        {alert.severity || "MEDIUM"}
                      </span>
                    </div>
                    <p>{alert.message}</p>
                    {alert.created_at && (
                      <span className="alert-time">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* VIEW RECORD MODAL */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content record-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedRecord.title || "Health Record"}</h2>
                <p>Type: {selectedRecord.record_type || "Consultation"}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedRecord(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="record-modal-meta">
                <div>
                  <span>Date of Record</span>
                  <strong>
                    {selectedRecord.record_date ||
                      (selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "--")}
                  </strong>
                </div>
                <div>
                  <span>Consulting Physician</span>
                  <strong>{selectedRecord.doctor_name || selectedRecord.doctor || "Attending Doctor"}</strong>
                </div>
                <div>
                  <span>Medical Facility</span>
                  <strong>{selectedRecord.hospital_name || "CareBridge Hospital"}</strong>
                </div>
              </div>

              {selectedRecord.diagnosis && (
                <div className="modal-section">
                  <h4>Clinical Diagnosis</h4>
                  <p className="diagnosis-box">{selectedRecord.diagnosis}</p>
                </div>
              )}

              {selectedRecord.description && (
                <div className="modal-section">
                  <h4>Clinical Notes & Evaluation</h4>
                  <p className="modal-notes">{selectedRecord.description}</p>
                </div>
              )}

              {Array.isArray(selectedRecord.medications) && selectedRecord.medications.length > 0 && (
                <div className="modal-section">
                  <h4>Prescribed Medications</h4>
                  <div className="meds-tags-wrap">
                    {selectedRecord.medications.map((med, idx) => (
                      <span key={idx} className="med-pill">
                        <Pill size={12} /> {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="close-details-btn" onClick={() => setSelectedRecord(null)}>
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD / CREATE HEALTH RECORD MODAL */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(false)}>
          <div className="modal-content upload-record-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Upload Health Record</h2>
                <p>Add consultation notes, prescription, or lab reports</p>
              </div>
              <button className="modal-close-btn" onClick={() => setUploadModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="upload-record-form">
              {uploadError && (
                <div className="form-error-banner">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Record Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Cardiovascular Checkup, Blood Work Panel"
                  value={newRecord.title}
                  onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Record Type</label>
                  <select
                    value={newRecord.record_type}
                    onChange={(e) => setNewRecord({ ...newRecord, record_type: e.target.value })}
                  >
                    <option value="CONSULTATION">Doctor Consultation</option>
                    <option value="LAB_REPORT">Lab Test Report</option>
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                    <option value="SCAN_IMAGING">Scan / X-Ray / MRI</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Record Date</label>
                  <input
                    type="date"
                    value={newRecord.record_date}
                    onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Doctor / Specialist Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Ananya Sharma"
                    value={newRecord.doctor_name}
                    onChange={(e) => setNewRecord({ ...newRecord, doctor_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Hospital / Clinic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CareBridge Medical Center"
                    value={newRecord.hospital_name}
                    onChange={(e) => setNewRecord({ ...newRecord, hospital_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Clinical Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g. Mild Hypertension, Sinus Tachycardia"
                  value={newRecord.diagnosis}
                  onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Medications (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Amlodipine 5mg OD, Paracetamol 500mg SOS"
                  value={newRecord.medications}
                  onChange={(e) => setNewRecord({ ...newRecord, medications: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Clinical Notes / Report Summary</label>
                <textarea
                  rows={3}
                  placeholder="Enter medical observations, recommended diet, next follow-up instructions..."
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                />
              </div>

              {/* Document File Attachment Indicator */}
              <div className="file-attach-dropzone">
                <input
                  type="file"
                  id="record-file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewRecord((prev) => ({
                        ...prev,
                        fileName: file.name,
                        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
                      }));
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <label htmlFor="record-file" className="file-drop-label">
                  <Upload size={20} />
                  {newRecord.fileName ? (
                    <div>
                      <strong>Attached: {newRecord.fileName}</strong>
                      <small>Click to choose a different medical document</small>
                    </div>
                  ) : (
                    <div>
                      <strong>Attach Document (PDF, Image, Scans)</strong>
                      <small>Max file size 10MB</small>
                    </div>
                  )}
                </label>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setUploadModal(false)}
                  disabled={uploadLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="save-record-btn" disabled={uploadLoading}>
                  {uploadLoading ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Saving to Dossier...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save Medical Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Health;