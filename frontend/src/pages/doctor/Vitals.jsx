import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Activity,
  Droplets,
  Thermometer,
  Weight,
  Clock3,
  Plus,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./Vitals.css";

function Vitals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId);
  const [vitalsHistory, setVitalsHistory] = useState([]);

  // Modal State for Recording Vitals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: preselectedPatientId || "",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    blood_sugar: "",
    temperature: "",
    spo2: "",
    weight_kg: "",
  });

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const patientsList = await doctorService.getPatients();
      const validPatients = Array.isArray(patientsList) ? patientsList : [];
      setPatients(validPatients);

      let targetId = selectedPatientId;
      if (!targetId && validPatients.length > 0) {
        targetId = validPatients[0]._id || validPatients[0].id;
        setSelectedPatientId(targetId);
      }

      if (targetId) {
        const history = await doctorService.getPatientVitals(targetId);
        setVitalsHistory(Array.isArray(history) ? history : []);
      }
    } catch (err) {
      console.error("Error loading vitals:", err);
      setError("Failed to load patient vitals data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePatientChange = async (newPatientId) => {
    setSelectedPatientId(newPatientId);
    setLoading(true);
    try {
      const history = await doctorService.getPatientVitals(newPatientId);
      setVitalsHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.warn("Failed to load vitals for patient:", err);
      setVitalsHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleRecordVitals = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) {
      alert("Please select a patient.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: formData.patient_id,
        heart_rate: formData.heart_rate ? Number(formData.heart_rate) : undefined,
        systolic_bp: formData.systolic_bp ? Number(formData.systolic_bp) : undefined,
        diastolic_bp: formData.diastolic_bp ? Number(formData.diastolic_bp) : undefined,
        blood_sugar: formData.blood_sugar ? Number(formData.blood_sugar) : undefined,
        temperature: formData.temperature ? Number(formData.temperature) : undefined,
        spo2: formData.spo2 ? Number(formData.spo2) : undefined,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
      };

      await doctorService.recordVitals(payload);

      setToastMessage("Vital signs recorded successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      setIsRecordModalOpen(false);

      // Reset
      setFormData({
        patient_id: selectedPatientId || "",
        heart_rate: "",
        systolic_bp: "",
        diastolic_bp: "",
        blood_sugar: "",
        temperature: "",
        spo2: "",
        weight_kg: "",
      });

      if (formData.patient_id === selectedPatientId) {
        const updatedHistory = await doctorService.getPatientVitals(selectedPatientId);
        setVitalsHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
      }
    } catch (err) {
      console.error("Failed to record vitals:", err);
      alert(err.response?.data?.detail || "Failed to record vital signs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPatient = patients.find(
    (p) => (p._id || p.id) === selectedPatientId
  );

  const latestVital = vitalsHistory.length > 0 ? vitalsHistory[0] : null;
  const previousVital = vitalsHistory.length > 1 ? vitalsHistory[1] : null;

  // Helper for trend calculation
  const getTrend = (current, previous) => {
    if (current === undefined || current === null || previous === undefined || previous === null) {
      return { text: "No previous reading", class: "neutral" };
    }
    const diff = (current - previous).toFixed(1);
    if (diff > 0) return { text: `+${diff} vs prev`, class: "up" };
    if (diff < 0) return { text: `${diff} vs prev`, class: "down" };
    return { text: "Equal to prev", class: "neutral" };
  };

  return (
    <div className="doctor-vitals">
      {/* HEADER */}
      <section className="vitals-header">
        <div>
          <span className="vitals-kicker">DOCTOR PORTAL</span>
          <h1>Patient Physiological Vitals</h1>
          <p>
            Monitor acute vital parameters, review previous telemetry deltas, and log new clinical measurements.
          </p>
        </div>

        <div className="vitals-header-actions">
          <button
            className={`vitals-refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Syncing..." : "Sync Vitals"}</span>
          </button>

          <button
            className="add-vitals-btn"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                patient_id: selectedPatientId || (patients[0]?._id || ""),
              }));
              setIsRecordModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Record New Vitals</span>
          </button>
        </div>
      </section>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="vitals-toast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="vitals-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {/* PATIENT SELECTOR BAR */}
      <section className="vitals-patient-selector-bar">
        <div className="selector-group">
          <label htmlFor="patient-select-vitals">
            <strong>Select Patient:</strong>
          </label>
          <select
            id="patient-select-vitals"
            value={selectedPatientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            className="patient-select"
          >
            {patients.length === 0 ? (
              <option value="">No patients available</option>
            ) : (
              patients.map((p) => {
                const pCode = p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6);
                return (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name || "Patient"} (ID: {pCode})
                  </option>
                );
              })
            )}
          </select>
        </div>

        {currentPatient && (
          <div className="patient-demographic-badge">
            <span>
              <strong>Age:</strong> {currentPatient.age || "N/A"}
            </span>
            <span>•</span>
            <span>
              <strong>Gender:</strong> {currentPatient.gender || "N/A"}
            </span>
            <span>•</span>
            <span>
              <strong>Phone:</strong> {currentPatient.phone || "N/A"}
            </span>
          </div>
        )}

        <button
          className="telemetry-jump-btn"
          onClick={() =>
            navigate(`/doctor/health-monitoring?patientId=${selectedPatientId || ""}`)
          }
        >
          <Activity size={15} />
          <span>View Telemetry Trends</span>
        </button>
      </section>

      {/* PROFESSIONAL VITAL CARDS GRID */}
      <section className="vitals-grid-cards">
        {/* 1. HEART RATE */}
        <div className="vital-card-pro">
          <div className="card-top-row">
            <div className="vital-icon-box blue">
              <Activity size={20} />
            </div>
            <span className="vital-name">Heart Rate</span>
            <span className="vital-status-tag normal">Normal 60-100</span>
          </div>
          <div className="vital-value-row">
            <strong>{latestVital?.heart_rate || "--"}</strong>
            <small>bpm</small>
          </div>
          <div className="vital-card-footer">
            <span
              className={`trend-pill ${
                getTrend(latestVital?.heart_rate, previousVital?.heart_rate).class
              }`}
            >
              {getTrend(latestVital?.heart_rate, previousVital?.heart_rate).text}
            </span>
            <span className="prev-value">
              Prev: {previousVital?.heart_rate ? `${previousVital.heart_rate} bpm` : "--"}
            </span>
          </div>
        </div>

        {/* 2. BLOOD PRESSURE */}
        <div className="vital-card-pro">
          <div className="card-top-row">
            <div className="vital-icon-box red">
              <HeartPulse size={20} />
            </div>
            <span className="vital-name">Blood Pressure</span>
            <span className="vital-status-tag normal">Target &lt;120/80</span>
          </div>
          <div className="vital-value-row">
            <strong>
              {latestVital?.systolic_bp && latestVital?.diastolic_bp
                ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}`
                : "--/--"}
            </strong>
            <small>mmHg</small>
          </div>
          <div className="vital-card-footer">
            <span
              className={`trend-pill ${
                getTrend(latestVital?.systolic_bp, previousVital?.systolic_bp).class
              }`}
            >
              {getTrend(latestVital?.systolic_bp, previousVital?.systolic_bp).text}
            </span>
            <span className="prev-value">
              Prev:{" "}
              {previousVital?.systolic_bp && previousVital?.diastolic_bp
                ? `${previousVital.systolic_bp}/${previousVital.diastolic_bp}`
                : "--"}
            </span>
          </div>
        </div>

        {/* 3. SPO2 OXYGEN */}
        <div className="vital-card-pro">
          <div className="card-top-row">
            <div className="vital-icon-box teal">
              <Droplets size={20} />
            </div>
            <span className="vital-name">SpO₂ Oxygen</span>
            <span className="vital-status-tag normal">Target &gt;95%</span>
          </div>
          <div className="vital-value-row">
            <strong>{latestVital?.spo2 ? `${latestVital.spo2}%` : "--%"}</strong>
            <small>saturation</small>
          </div>
          <div className="vital-card-footer">
            <span
              className={`trend-pill ${
                getTrend(latestVital?.spo2, previousVital?.spo2).class
              }`}
            >
              {getTrend(latestVital?.spo2, previousVital?.spo2).text}
            </span>
            <span className="prev-value">
              Prev: {previousVital?.spo2 ? `${previousVital.spo2}%` : "--"}
            </span>
          </div>
        </div>

        {/* 4. TEMPERATURE */}
        <div className="vital-card-pro">
          <div className="card-top-row">
            <div className="vital-icon-box amber">
              <Thermometer size={20} />
            </div>
            <span className="vital-name">Temperature</span>
            <span className="vital-status-tag normal">36.5 - 37.5°C</span>
          </div>
          <div className="vital-value-row">
            <strong>{latestVital?.temperature ? `${latestVital.temperature}°` : "--°"}</strong>
            <small>body</small>
          </div>
          <div className="vital-card-footer">
            <span
              className={`trend-pill ${
                getTrend(latestVital?.temperature, previousVital?.temperature).class
              }`}
            >
              {getTrend(latestVital?.temperature, previousVital?.temperature).text}
            </span>
            <span className="prev-value">
              Prev: {previousVital?.temperature ? `${previousVital.temperature}°` : "--"}
            </span>
          </div>
        </div>

        {/* 5. BLOOD SUGAR */}
        <div className="vital-card-pro">
          <div className="card-top-row">
            <div className="vital-icon-box purple">
              <TrendingUp size={20} />
            </div>
            <span className="vital-name">Blood Sugar</span>
            <span className="vital-status-tag normal">70 - 120 mg/dL</span>
          </div>
          <div className="vital-value-row">
            <strong>{latestVital?.blood_sugar || "--"}</strong>
            <small>mg/dL</small>
          </div>
          <div className="vital-card-footer">
            <span
              className={`trend-pill ${
                getTrend(latestVital?.blood_sugar, previousVital?.blood_sugar).class
              }`}
            >
              {getTrend(latestVital?.blood_sugar, previousVital?.blood_sugar).text}
            </span>
            <span className="prev-value">
              Prev: {previousVital?.blood_sugar || "--"}
            </span>
          </div>
        </div>

        {/* 6. BODY WEIGHT */}
        <div className="vital-card-pro">
          <div className="card-top-row">
            <div className="vital-icon-box cyan">
              <Weight size={20} />
            </div>
            <span className="vital-name">Body Weight</span>
            <span className="vital-status-tag normal">kg</span>
          </div>
          <div className="vital-value-row">
            <strong>{latestVital?.weight_kg || "--"}</strong>
            <small>kg</small>
          </div>
          <div className="vital-card-footer">
            <span
              className={`trend-pill ${
                getTrend(latestVital?.weight_kg, previousVital?.weight_kg).class
              }`}
            >
              {getTrend(latestVital?.weight_kg, previousVital?.weight_kg).text}
            </span>
            <span className="prev-value">
              Prev: {previousVital?.weight_kg ? `${previousVital.weight_kg} kg` : "--"}
            </span>
          </div>
        </div>
      </section>

      {/* VITAL RECORDINGS HISTORY TABLE */}
      <section className="vitals-history-panel">
        <div className="vitals-panel-header">
          <div>
            <h2>Recorded Vital Signs Stream</h2>
            <p>
              {currentPatient
                ? `Historical measurements recorded for ${currentPatient.name}`
                : "Select a patient to view vital sign history"}
            </p>
          </div>
          <span className="readings-count">{vitalsHistory.length} recordings</span>
        </div>

        {loading ? (
          <div className="vitals-loading">
            <Loader2 size={32} className="spinning" />
            <span>Loading vital signs recordings...</span>
          </div>
        ) : (
          <div className="vitals-table-wrapper">
            <table className="vitals-table">
              <thead>
                <tr>
                  <th>Recorded At</th>
                  <th>Blood Pressure</th>
                  <th>Heart Rate</th>
                  <th>SpO₂ Oxygen</th>
                  <th>Temperature</th>
                  <th>Blood Sugar</th>
                  <th>Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {vitalsHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-vitals-cell">
                      <HeartPulse size={36} />
                      <p>No vital signs recorded for this patient yet.</p>
                      <button
                        className="quick-record-link"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            patient_id: selectedPatientId || (patients[0]?._id || ""),
                          }));
                          setIsRecordModalOpen(true);
                        }}
                      >
                        + Record Vitals Now
                      </button>
                    </td>
                  </tr>
                ) : (
                  vitalsHistory.map((vit, idx) => {
                    const time = vit.recorded_at
                      ? new Date(vit.recorded_at).toLocaleString()
                      : "Recent";

                    return (
                      <tr key={vit._id || vit.id || idx}>
                        <td>
                          <div className="time-cell">
                            <Clock3 size={13} />
                            <span>{time}</span>
                          </div>
                        </td>
                        <td>
                          <strong>
                            {vit.systolic_bp && vit.diastolic_bp
                              ? `${vit.systolic_bp}/${vit.diastolic_bp} mmHg`
                              : "--"}
                          </strong>
                        </td>
                        <td>
                          <strong>{vit.heart_rate ? `${vit.heart_rate} bpm` : "--"}</strong>
                        </td>
                        <td>
                          <strong>{vit.spo2 ? `${vit.spo2}%` : "--"}</strong>
                        </td>
                        <td>
                          <strong>{vit.temperature ? `${vit.temperature}°C` : "--"}</strong>
                        </td>
                        <td>
                          <strong>{vit.blood_sugar ? `${vit.blood_sugar} mg/dL` : "--"}</strong>
                        </td>
                        <td>
                          <strong>{vit.weight_kg ? `${vit.weight_kg} kg` : "--"}</strong>
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
          RECORD VITALS MODAL
      ============================================================ */}
      {isRecordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRecordModalOpen(false)}>
          <div className="modal-box-vitals" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">CLINICAL TELEMETRY ENTRY</span>
                <h2>Record Patient Vital Signs</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setIsRecordModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordVitals} className="vitals-record-form">
              <div className="form-group full-width">
                <label htmlFor="vital-patient">Patient *</label>
                <select
                  id="vital-patient"
                  value={formData.patient_id}
                  onChange={(e) =>
                    setFormData({ ...formData, patient_id: e.target.value })
                  }
                  required
                >
                  <option value="">-- Select Patient --</option>
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

              <div className="vitals-inputs-grid">
                <div className="form-group">
                  <label htmlFor="vital-hr">Heart Rate (bpm)</label>
                  <input
                    id="vital-hr"
                    type="number"
                    step="1"
                    min="30"
                    max="250"
                    placeholder="e.g. 76"
                    value={formData.heart_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, heart_rate: e.target.value })
                    }
                  />
                  <span className="field-hint">Normal: 60-100 bpm</span>
                </div>

                <div className="form-group">
                  <label htmlFor="vital-sys">Systolic BP (mmHg)</label>
                  <input
                    id="vital-sys"
                    type="number"
                    step="1"
                    min="50"
                    max="300"
                    placeholder="e.g. 120"
                    value={formData.systolic_bp}
                    onChange={(e) =>
                      setFormData({ ...formData, systolic_bp: e.target.value })
                    }
                  />
                  <span className="field-hint">Target: &lt;120 mmHg</span>
                </div>

                <div className="form-group">
                  <label htmlFor="vital-dia">Diastolic BP (mmHg)</label>
                  <input
                    id="vital-dia"
                    type="number"
                    step="1"
                    min="30"
                    max="200"
                    placeholder="e.g. 80"
                    value={formData.diastolic_bp}
                    onChange={(e) =>
                      setFormData({ ...formData, diastolic_bp: e.target.value })
                    }
                  />
                  <span className="field-hint">Target: &lt;80 mmHg</span>
                </div>

                <div className="form-group">
                  <label htmlFor="vital-spo2">SpO₂ Oxygen (%)</label>
                  <input
                    id="vital-spo2"
                    type="number"
                    step="1"
                    min="50"
                    max="100"
                    placeholder="e.g. 98"
                    value={formData.spo2}
                    onChange={(e) =>
                      setFormData({ ...formData, spo2: e.target.value })
                    }
                  />
                  <span className="field-hint">Target: &gt;95%</span>
                </div>

                <div className="form-group">
                  <label htmlFor="vital-temp">Temperature (°C)</label>
                  <input
                    id="vital-temp"
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    placeholder="e.g. 36.8"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({ ...formData, temperature: e.target.value })
                    }
                  />
                  <span className="field-hint">Normal: 36.5 - 37.5°C</span>
                </div>

                <div className="form-group">
                  <label htmlFor="vital-sugar">Blood Sugar (mg/dL)</label>
                  <input
                    id="vital-sugar"
                    type="number"
                    step="1"
                    min="20"
                    max="600"
                    placeholder="e.g. 95"
                    value={formData.blood_sugar}
                    onChange={(e) =>
                      setFormData({ ...formData, blood_sugar: e.target.value })
                    }
                  />
                  <span className="field-hint">Target: 70-120 mg/dL</span>
                </div>

                <div className="form-group">
                  <label htmlFor="vital-weight">Body Weight (kg)</label>
                  <input
                    id="vital-weight"
                    type="number"
                    step="0.1"
                    min="1"
                    max="300"
                    placeholder="e.g. 68.5"
                    value={formData.weight_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, weight_kg: e.target.value })
                    }
                  />
                  <span className="field-hint">Kilograms</span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setIsRecordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn-save"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Logging Vitals..." : "Save Vital Signs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vitals;