import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Heart,
  Droplets,
  Calendar,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import patientService from "../../services/patientService";
import "./Patients.css";

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "Other",
    blood_group: "O+",
    emergency_contact: "",
    allergies: "",
    medical_history: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const fetchPatients = useCallback(async () => {
    try {
      setError(null);
      const data = await doctorService.getPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load staff patient list:", err);
      setError("Failed to load patient records from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPatients();
  };

  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setAddError("Patient full name and phone number are required.");
      return;
    }

    try {
      setAddLoading(true);
      const payload = {
        name: addForm.name.trim(),
        email: addForm.email.trim() || undefined,
        phone: addForm.phone.trim(),
        age: parseInt(addForm.age, 10) || 30,
        gender: addForm.gender,
        blood_group: addForm.blood_group,
        emergency_contact: addForm.emergency_contact.trim() || undefined,
        allergies: addForm.allergies ? addForm.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
        medical_history: addForm.medical_history ? addForm.medical_history.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };

      await patientService.createPatientProfile(payload);
      setAddSuccess("New patient profile created successfully.");
      setAddForm({
        name: "",
        email: "",
        phone: "",
        age: "",
        gender: "Other",
        blood_group: "O+",
        emergency_contact: "",
        allergies: "",
        medical_history: "",
      });

      await fetchPatients();
      setTimeout(() => {
        setAddSuccess("");
        setShowAddModal(false);
      }, 1500);
    } catch (err) {
      console.error("Create patient failed:", err);
      setAddError(err.response?.data?.detail || "Failed to create patient profile in database.");
    } finally {
      setAddLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const pid = String(patient._id || patient.id || patient.patient_id || "");
      const name = (patient.name || "").toLowerCase();
      const phone = (patient.phone || "");
      const email = (patient.email || "").toLowerCase();
      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        pid.toLowerCase().includes(query) ||
        phone.includes(query) ||
        email.includes(query);

      const status = patient.status || "Active";
      const matchesStatus =
        statusFilter === "All" || status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  return (
    <main className="staff-patients-page">
      {/* Header */}
      <section className="patients-header">
        <div>
          <span className="page-eyebrow">CAREBRIDGE AI — PATIENT REGISTRY</span>
          <h1>Patient Records & Profiles</h1>
          <p>
            Manage hospital registrations, clinical demographics, baseline physiological data, and consultation histories.
          </p>
        </div>

        <div className="header-btn-row">
          <button
            className={`refresh-btn-secondary ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh Patient List"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>

          <button className="add-patient-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Add Patient</span>
          </button>
        </div>
      </section>

      {/* Statistics */}
      <section className="patient-stat-grid">
        <div className="patient-stat-card">
          <div className="stat-icon blue">👥</div>
          <div>
            <span>Total Patients</span>
            <strong>{patients.length}</strong>
            <small>Registered in MongoDB</small>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Active Patients</span>
            <strong>{patients.length}</strong>
            <small>Surveillance Enabled</small>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-icon purple">♥</div>
          <div>
            <span>Telemetry Monitored</span>
            <strong>{patients.filter((p) => p.heart_rate || p.blood_group).length || patients.length}</strong>
            <small>Physiological profiles</small>
          </div>
        </div>
      </section>

      {error && (
        <div className="patients-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={fetchPatients}>Retry</button>
        </div>
      )}

      {/* Main card */}
      <section className="patients-panel">
        <div className="panel-top">
          <div>
            <h2>Patient Directory</h2>
            <p>{filteredPatients.length} patient records displayed</p>
          </div>

          <div className="panel-actions">
            <div className="patient-search">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="patients-loading-box">
            <Loader2 size={30} className="spinner-icon" />
            <p>Loading patient directory from CareBridge AI database...</p>
          </div>
        )}

        {/* Desktop table */}
        {!loading && (
          <div className="patients-table-wrapper">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Age / Gender</th>
                  <th>Blood Group</th>
                  <th>Phone / Email</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => {
                  const pid = patient._id || patient.id || patient.patient_id || "--";
                  const status = patient.status || "Active";

                  return (
                    <tr key={pid}>
                      <td>
                        <div className="patient-name-cell">
                          <div className="patient-avatar">
                            {(patient.name || "P").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{patient.name || "Unnamed Patient"}</strong>
                            <span>{patient.email || "No email"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="patient-id">#{String(pid).slice(-8).toUpperCase()}</span>
                      </td>

                      <td>
                        {patient.age ? `${patient.age} yrs` : "--"}
                        <span className="gender"> / {patient.gender || "Other"}</span>
                      </td>

                      <td>
                        <span className="condition">{patient.blood_group || "O+"}</span>
                      </td>

                      <td>{patient.phone || "--"}</td>

                      <td>
                        <span className={`status-badge ${status.toLowerCase()}`}>
                          <i></i>
                          {status}
                        </span>
                      </td>

                      <td>
                        <button className="view-btn" onClick={() => setSelectedPatient(patient)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPatients.length === 0 && (
              <div className="empty-patients">
                <Users size={36} className="text-muted" />
                <h3>No patients found</h3>
                <p>
                  {patients.length === 0
                    ? "No patients registered in the database yet."
                    : "No patients match your current search or filter criteria."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* VIEW PATIENT MODAL */}
      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal-content patient-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Patient Clinical Dossier</h2>
                <p>ID: #{String(selectedPatient._id || selectedPatient.id).slice(-8).toUpperCase()}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedPatient(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="patient-modal-top">
                <div className="patient-avatar large">
                  {(selectedPatient.name || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{selectedPatient.name}</h3>
                  <p className="flex-row">
                    <Phone size={14} /> <span>{selectedPatient.phone || "No phone"}</span>
                  </p>
                  <p className="flex-row">
                    <Mail size={14} /> <span>{selectedPatient.email || "No email"}</span>
                  </p>
                </div>
              </div>

              <div className="patient-modal-grid">
                <div className="pmodal-item">
                  <span>Age</span>
                  <strong>{selectedPatient.age ? `${selectedPatient.age} Years` : "Not provided"}</strong>
                </div>
                <div className="pmodal-item">
                  <span>Gender</span>
                  <strong>{selectedPatient.gender || "Other"}</strong>
                </div>
                <div className="pmodal-item">
                  <span>Blood Group</span>
                  <strong className="text-red">{selectedPatient.blood_group || "O+"}</strong>
                </div>
                <div className="pmodal-item">
                  <span>Emergency Contact</span>
                  <strong>{selectedPatient.emergency_contact || "None Listed"}</strong>
                </div>
              </div>

              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                <div className="pmodal-section">
                  <h4>Allergies</h4>
                  <p>
                    {Array.isArray(selectedPatient.allergies)
                      ? selectedPatient.allergies.join(", ")
                      : String(selectedPatient.allergies)}
                  </p>
                </div>
              )}

              {selectedPatient.medical_history && selectedPatient.medical_history.length > 0 && (
                <div className="pmodal-section">
                  <h4>Medical History</h4>
                  <p>
                    {Array.isArray(selectedPatient.medical_history)
                      ? selectedPatient.medical_history.join(", ")
                      : String(selectedPatient.medical_history)}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedPatient(null)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PATIENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content add-patient-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Register New Patient</h2>
                <p>Add a new patient profile and clinical baseline to the database</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            {addError && <div className="modal-error-banner">{addError}</div>}
            {addSuccess && <div className="modal-success-banner">{addSuccess}</div>}

            <form onSubmit={handleAddPatientSubmit} className="add-patient-form">
              <div className="form-group">
                <label htmlFor="pname">Full Name *</label>
                <input
                  id="pname"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="pphone">Phone Number *</label>
                  <input
                    id="pphone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pemail">Email Address</label>
                  <input
                    id="pemail"
                    type="email"
                    placeholder="patient@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="page">Age</label>
                  <input
                    id="page"
                    type="number"
                    placeholder="30"
                    value={addForm.age}
                    onChange={(e) => setAddForm({ ...addForm, age: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pgender">Gender</label>
                  <select
                    id="pgender"
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="pblood">Blood Group</label>
                  <select
                    id="pblood"
                    value={addForm.blood_group}
                    onChange={(e) => setAddForm({ ...addForm, blood_group: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pemerg">Emergency Contact</label>
                <input
                  id="pemerg"
                  type="text"
                  placeholder="e.g. +91 9988776655 (Relative)"
                  value={addForm.emergency_contact}
                  onChange={(e) => setAddForm({ ...addForm, emergency_contact: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pallergies">Allergies (comma-separated)</label>
                <input
                  id="pallergies"
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts"
                  value={addForm.allergies}
                  onChange={(e) => setAddForm({ ...addForm, allergies: e.target.value })}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={addLoading}>
                  {addLoading ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Patients;
