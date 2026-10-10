import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  FileText,
  CalendarDays,
  Eye,
  Plus,
  Pill,
  Stethoscope,
  HeartPulse,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  CheckCircle2,
  Trash2,
  Printer,
  Edit3,
  Download,
  User,
  Copy,
  Check,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import { useAuth } from "../../context/AuthContext";
import "./HealthRecords.css";

function HealthRecords() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId || "all");
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, consultations: 0, prescriptions: 0, diagnoses: 0 });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal states
  const [viewingRecord, setViewingRecord] = useState(null);
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Record Form State
  const [formData, setFormData] = useState({
    patient_id: "",
    record_type: "Consultation",
    title: "",
    description: "",
    diagnosis: "",
    medications: "",
    doctor_name: user?.name || "Doctor",
    hospital_name: "CareBridge Medical Center",
    record_date: new Date().toISOString().split("T")[0],
  });

  const loadPatientsAndRecords = useCallback(async () => {
    try {
      setError(null);
      const patientsList = await doctorService.getPatients();
      const validPatients = (Array.isArray(patientsList) ? patientsList : []).filter(
        (p) => (p.name || "").toLowerCase() !== "string"
      );
      setPatients(validPatients);

      const params = selectedPatientId && selectedPatientId !== "all" ? { patient_id: selectedPatientId } : {};
      const summaryData = await doctorService.getHealthRecordsSummary(params);
      
      const recs = Array.isArray(summaryData?.records) ? summaryData.records : (Array.isArray(summaryData) ? summaryData : []);
      setRecords(recs);

      if (summaryData?.stats) {
        setStats(summaryData.stats);
      } else {
        const total = recs.length;
        const consults = recs.filter((r) => (r.record_type || "").toUpperCase().includes("CONSULT")).length;
        const prescripts = recs.filter((r) => r.medications && r.medications.length > 0).length;
        const diags = recs.filter((r) => r.diagnosis && String(r.diagnosis).trim()).length;
        setStats({ total, consultations: consults, prescriptions: prescripts, diagnoses: diags });
      }
    } catch (err) {
      console.error("Error loading health records:", err);
      setError("Failed to load patient health records.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadPatientsAndRecords();
  }, [loadPatientsAndRecords]);

  // Silent 30-second auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      loadPatientsAndRecords();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadPatientsAndRecords]);

  const handlePatientSelectChange = async (patientId) => {
    setSelectedPatientId(patientId);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPatientsAndRecords();
  };

  const handlePrintRecord = (record) => {
    window.print();
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.title.trim()) {
      alert("Please select a patient and provide a record title.");
      return;
    }

    setIsSubmitting(true);
    try {
      const medsArray = formData.medications
        ? formData.medications
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean)
        : [];

      await doctorService.createHealthRecord({
        patient_id: formData.patient_id,
        record_type: formData.record_type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        diagnosis: formData.diagnosis.trim(),
        medications: medsArray,
        doctor_name: formData.doctor_name,
        hospital_name: formData.hospital_name,
        record_date: formData.record_date,
      });

      setToastMessage("Medical record created successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      setIsCreatingModalOpen(false);

      // Reset form & reload records
      setFormData({
        patient_id: selectedPatientId || "",
        record_type: "Consultation",
        title: "",
        description: "",
        diagnosis: "",
        medications: "",
        doctor_name: user?.name || "Doctor",
        hospital_name: "CareBridge Medical Center",
        record_date: new Date().toISOString().split("T")[0],
      });

      if (formData.patient_id === selectedPatientId) {
        const updatedRecords = await doctorService.getHealthRecords(selectedPatientId);
        setRecords(Array.isArray(updatedRecords) ? updatedRecords : []);
      }
    } catch (err) {
      console.error("Failed to create health record:", err);
      alert(err.response?.data?.detail || "Failed to create health record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this clinical health record?")) {
      return;
    }

    try {
      await doctorService.deleteHealthRecord(recordId);
      setToastMessage("Health record deleted successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      setRecords((prev) => prev.filter((r) => (r._id || r.id) !== recordId));
      if (viewingRecord && (viewingRecord._id || viewingRecord.id) === recordId) {
        setViewingRecord(null);
      }
    } catch (err) {
      console.error("Delete record error:", err);
      alert(err.response?.data?.detail || "Failed to delete record.");
    }
  };

  const filteredRecords = records.filter((rec) => {
    const typeUpper = (rec.record_type || "").toUpperCase();
    const matchesType =
      typeFilter === "all" ? true : typeUpper.includes(typeFilter.toUpperCase());

    const title = rec.title || "";
    const diagnosis = rec.diagnosis || "";
    const doctor = rec.doctor_name || rec.doctor || "";
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      title.toLowerCase().includes(query) ||
      diagnosis.toLowerCase().includes(query) ||
      doctor.toLowerCase().includes(query);

    return matchesType && matchesSearch;
  });

  const activePatientObj = patients.find(
    (p) => (p._id || p.id) === selectedPatientId
  );

  return (
    <div className="health-records-page">
      {/* HEADER */}
      <section className="records-header">
        <div>
          <span className="records-kicker">DOCTOR PORTAL</span>
          <h1>Clinical Health Records & Charts</h1>
          <p>
            Access, document, and review patient medical histories, clinical diagnoses, and prescriptions.
          </p>
        </div>

        <div className="records-header-actions">
          <button
            className={`records-refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Syncing..." : "Sync"}</span>
          </button>

          <button
            className="create-record-btn"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                patient_id: selectedPatientId || (patients[0]?._id || ""),
              }));
              setIsCreatingModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Create Health Record</span>
          </button>
        </div>
      </section>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="records-toast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="records-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadPatientsAndRecords}>Retry</button>
        </div>
      )}

      {/* PATIENT SELECTOR & QUICK STATS */}
      <section className="patient-selector-banner">
        <div className="patient-select-wrapper">
          <label htmlFor="patient-select">
            <strong>Select Patient Chart:</strong>
          </label>
          <select
            id="patient-select"
            value={selectedPatientId}
            onChange={(e) => handlePatientSelectChange(e.target.value)}
            className="patient-dropdown"
          >
            <option value="all">-- All Patient Charts ({patients.length} active patients) --</option>
            {patients.map((p) => {
              const pCode = p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6);
              return (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name || "Patient"} (ID: {pCode})
                </option>
              );
            })}
          </select>
        </div>

        {activePatientObj ? (
          <div className="selected-patient-meta">
            <span>
              <strong>Patient ID:</strong> {activePatientObj.patient_code || String(activePatientObj.patientId || "").replace("PT-", "") || String(activePatientObj._id || activePatientObj.id).slice(-6)}
            </span>
            <span>
              <strong>Age/Gender:</strong> {activePatientObj.age ? `${activePatientObj.age} yrs` : "N/A"} • {activePatientObj.gender || "N/A"}
            </span>
            <span>
              <strong>Blood Group:</strong> {activePatientObj.blood_group || "N/A"}
            </span>
            <span>
              <strong>Contact:</strong> {activePatientObj.phone || activePatientObj.email || "N/A"}
            </span>
          </div>
        ) : (
          <div className="selected-patient-meta">
            <span>
              <strong>Registry View:</strong> Global Clinical Repository ({records.length} records across {patients.length} active patients)
            </span>
          </div>
        )}
      </section>

      {/* SUMMARY STATS */}
      <section className="records-summary">
        <div className="record-summary-card">
          <div className="record-summary-icon blue">
            <FileText size={21} />
          </div>
          <div>
            <span>Patient Records</span>
            <strong>{stats.total || records.length}</strong>
            <small>Total charts logged</small>
          </div>
        </div>

        <div className="record-summary-card">
          <div className="record-summary-icon green">
            <Stethoscope size={21} />
          </div>
          <div>
            <span>Consultations</span>
            <strong>{stats.consultations}</strong>
            <small>Clinical sessions</small>
          </div>
        </div>

        <div className="record-summary-card">
          <div className="record-summary-icon purple">
            <Pill size={21} />
          </div>
          <div>
            <span>Prescriptions</span>
            <strong>{stats.prescriptions}</strong>
            <small>Active regimens</small>
          </div>
        </div>

        <div className="record-summary-card">
          <div className="record-summary-icon orange">
            <HeartPulse size={21} />
          </div>
          <div>
            <span>Diagnoses</span>
            <strong>{stats.diagnoses}</strong>
            <small>Documented findings</small>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="records-toolbar">
        <div className="records-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search diagnosis, clinical title, patient name, 6-digit ID, doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="records-filter-chips">
          <button
            className={`filter-chip ${typeFilter === "all" ? "active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            All ({records.length})
          </button>
          <button
            className={`filter-chip ${typeFilter === "consult" ? "active" : ""}`}
            onClick={() => setTypeFilter("consult")}
          >
            Consultations
          </button>
          <button
            className={`filter-chip ${typeFilter === "diagnosis" ? "active" : ""}`}
            onClick={() => setTypeFilter("diagnosis")}
          >
            Diagnoses
          </button>
          <button
            className={`filter-chip ${typeFilter === "prescription" ? "active" : ""}`}
            onClick={() => setTypeFilter("prescription")}
          >
            Prescriptions
          </button>
          <button
            className={`filter-chip ${typeFilter === "checkup" ? "active" : ""}`}
            onClick={() => setTypeFilter("checkup")}
          >
            Checkups
          </button>
        </div>
      </section>

      {/* RECORDS TABLE & CARDS */}
      <section className="records-panel">
        <div className="records-panel-header">
          <div>
            <h2>Documented Medical Charts</h2>
            <p>
              {activePatientObj
                ? `Showing medical records for ${activePatientObj.name}`
                : "Showing all medical records across patient registry"}
            </p>
          </div>
          <span className="record-count">{filteredRecords.length} records</span>
        </div>

        {loading ? (
          <div className="records-loading">
            <Loader2 size={32} className="spinning" />
            <span>Loading medical records...</span>
          </div>
        ) : (
          <div className="records-table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Patient & Title</th>
                  <th>Date</th>
                  <th>Diagnosis</th>
                  <th>Medications / Rx</th>
                  <th>Attending Doctor</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-records-cell">
                      <FileText size={38} />
                      <h3>No medical records found</h3>
                      <p>
                        Click "Create Health Record" to document a consultation note, diagnosis, or prescription.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => {
                    const recordDate =
                      record.record_date ||
                      (record.created_at ? record.created_at.split("T")[0] : "Recent");
                    const patName = record.patient_name || (patients.find(p => (p._id || p.id) === (record.patient_id?._id || record.patient_id))?.name) || "Patient";
                    const pCode = record.patient_code || (patients.find(p => (p._id || p.id) === (record.patient_id?._id || record.patient_id))?.patient_code) || "";

                    return (
                      <tr key={record._id || record.id || index}>
                        <td>
                          <div className="record-title-cell">
                            <strong>{record.title || record.diagnosis || "Medical Note"}</strong>
                            <div className="record-meta-pill-row">
                              <span className="record-type-badge">
                                {record.record_type || "General"}
                              </span>
                              {patName && (
                                <span className="record-patient-pill">
                                  {patName} {pCode && `(ID: ${pCode})`}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="record-date-cell">
                            <CalendarDays size={14} />
                            <span>{recordDate}</span>
                          </div>
                        </td>

                        <td>
                          <strong className="diagnosis-text">
                            {record.diagnosis || "--"}
                          </strong>
                        </td>

                        <td>
                          <div className="meds-cell">
                            {record.medications && record.medications.length > 0 ? (
                              <span className="meds-tag">
                                {record.medications.join(", ")}
                              </span>
                            ) : (
                              <span className="no-meds">None prescribed</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="doctor-name-text">
                            {record.doctor_name || record.doctor || user?.name || "Doctor"}
                          </span>
                        </td>

                        <td>
                          <div className="record-actions-cell">
                            <button
                              className="icon-action-btn view"
                              title="View full record"
                              onClick={() => setViewingRecord(record)}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="icon-action-btn delete"
                              title="Delete record"
                              onClick={() => handleDeleteRecord(record._id || record.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============================================================
          VIEW RECORD MODAL
      ============================================================ */}
      {viewingRecord && (
        <div className="modal-overlay" onClick={() => setViewingRecord(null)}>
          <div className="modal-view-record" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="record-kicker">CLINICAL HEALTH RECORD</span>
                <h2>{viewingRecord.title || viewingRecord.diagnosis || "Medical Chart"}</h2>
                <span className="record-meta-sub">
                  Type: {viewingRecord.record_type || "General"} • Date:{" "}
                  {viewingRecord.record_date || viewingRecord.created_at || "Recent"}
                  {viewingRecord.patient_name && ` • Patient: ${viewingRecord.patient_name} (ID: ${viewingRecord.patient_code || ""})`}
                </span>
              </div>
              <button className="modal-close" onClick={() => setViewingRecord(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-view-body">
              <div className="detail-section">
                <label>Primary Diagnosis</label>
                <div className="detail-value diagnosis-box">
                  {viewingRecord.diagnosis || "No primary diagnosis entered"}
                </div>
              </div>

              {viewingRecord.description && (
                <div className="detail-section">
                  <label>Clinical Notes &amp; Observations</label>
                  <div className="detail-value text-body">
                    {viewingRecord.description}
                  </div>
                </div>
              )}

              {viewingRecord.treatment && (
                <div className="detail-section">
                  <label>Treatment Plan</label>
                  <div className="detail-value text-body">
                    {viewingRecord.treatment}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <label>Prescribed Medications</label>
                <div className="detail-value">
                  {viewingRecord.medications && viewingRecord.medications.length > 0 ? (
                    <div className="meds-list-view">
                      {viewingRecord.medications.map((med, i) => (
                        <span key={i} className="med-pill-item">
                          <Pill size={13} /> {med}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>No medications prescribed for this chart.</span>
                  )}
                </div>
              </div>

              <div className="detail-meta-grid">
                <div>
                  <label>Attending Doctor</label>
                  <span>{viewingRecord.doctor_name || viewingRecord.doctor || "Attending Physician"}</span>
                </div>
                <div>
                  <label>Facility</label>
                  <span>{viewingRecord.hospital_name || "CareBridge Medical Center"}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-action print-btn"
                onClick={() => handlePrintRecord(viewingRecord)}
              >
                <Printer size={15} /> Print Chart
              </button>

              <button
                className="btn-modal-action delete-btn"
                onClick={() => handleDeleteRecord(viewingRecord._id || viewingRecord.id)}
              >
                <Trash2 size={15} /> Delete Record
              </button>

              <button
                className="btn-modal-action close-btn"
                onClick={() => setViewingRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CREATE RECORD MODAL
      ============================================================ */}
      {isCreatingModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreatingModalOpen(false)}>
          <div className="modal-create-record" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="record-kicker">NEW CLINICAL DOCUMENT</span>
                <h2>Create Patient Health Record</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setIsCreatingModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="create-record-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="form-patient">Patient *</label>
                  <select
                    id="form-patient"
                    value={formData.patient_id}
                    onChange={(e) =>
                      setFormData({ ...formData, patient_id: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.name || "Patient"} (ID: {(p._id || p.id).slice(-6)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="form-type">Record Type *</label>
                  <select
                    id="form-type"
                    value={formData.record_type}
                    onChange={(e) =>
                      setFormData({ ...formData, record_type: e.target.value })
                    }
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Diagnosis">Diagnosis Note</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Checkup">Routine Checkup</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="form-title">Record Title *</label>
                  <input
                    id="form-title"
                    type="text"
                    placeholder="e.g., Acute Hypertension Consultation & Regimen Optimization"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="form-diagnosis">Clinical Diagnosis</label>
                  <input
                    id="form-diagnosis"
                    type="text"
                    placeholder="e.g., Primary Essential Hypertension (ICD-10 I10)"
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="form-meds">
                    Prescribed Medications (Comma-separated)
                  </label>
                  <input
                    id="form-meds"
                    type="text"
                    placeholder="e.g., Amlodipine 5mg OD, Telmisartan 40mg OD, Aspirin 75mg"
                    value={formData.medications}
                    onChange={(e) =>
                      setFormData({ ...formData, medications: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="form-desc">
                    Clinical Notes, Observations & Plan
                  </label>
                  <textarea
                    id="form-desc"
                    rows={4}
                    placeholder="Document subjective symptoms, physical findings, and recommended care plan..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="form-doctor">Attending Doctor Name</label>
                  <input
                    id="form-doctor"
                    type="text"
                    value={formData.doctor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, doctor_name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-date">Record Date</label>
                  <input
                    id="form-date"
                    type="date"
                    value={formData.record_date}
                    onChange={(e) =>
                      setFormData({ ...formData, record_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsCreatingModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving Record..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthRecords;