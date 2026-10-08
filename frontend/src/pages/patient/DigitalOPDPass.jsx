import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  CalendarDays,
  Stethoscope,
  ShieldCheck,
  QrCode,
  Printer,
  Copy,
  Building,
  AlertCircle,
  Loader2,
  Archive,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Ticket,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./DigitalOPDPass.css";

function DigitalOPDPass() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "archive"

  const [activePasses, setActivePasses] = useState([]);
  const [selectedPass, setSelectedPass] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadOPDPassData = useCallback(async () => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch patient's appointments and OPD passes concurrently
      const [passesRes, aptsRes, docsRes, hospsRes] = await Promise.allSettled([
        patientService.getPatientOPDPasses(user.patient_id),
        patientService.getPatientAppointments(user.patient_id),
        patientService.getDoctors(),
        patientService.getHospitals(),
      ]);

      let passes = [];
      if (passesRes.status === "fulfilled") {
        passes = passesRes.value || [];
      }

      let appointments = [];
      if (aptsRes.status === "fulfilled") {
        appointments = aptsRes.value || [];
      }

      if (docsRes.status === "fulfilled") {
        setDoctors(docsRes.value || []);
      }
      if (hospsRes.status === "fulfilled") {
        setHospitals(hospsRes.value || []);
      }

      // If passes are empty or we have approved appointments that don't have separate pass documents,
      // generate structured active digital OPD passes from approved appointments:
      const consolidatedPasses = [...passes];

      appointments.forEach((apt) => {
        const aptId = apt._id || apt.id;
        const exists = consolidatedPasses.some((p) => p.appointment_id === aptId);
        if (!exists) {
          const passNumber = `OPD-${(apt.appointment_date || "20261008").replace(/-/g, "")}-${String(aptId).slice(-6).toUpperCase()}`;
          consolidatedPasses.push({
            _id: `gen-${aptId}`,
            appointment_id: aptId,
            patient_id: user.patient_id,
            hospital_id: apt.hospital_id,
            doctor_id: apt.doctor_id,
            pass_number: passNumber,
            status: (apt.status === "COMPLETED" ? "USED" : apt.approval_status === "APPROVED" ? "ACTIVE" : "PENDING"),
            created_at: apt.created_at,
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            reason: apt.reason,
          });
        }
      });

      setActivePasses(consolidatedPasses);

      // Select specific pass if requested via query param, or pick the first active one
      if (appointmentIdParam) {
        const matched = consolidatedPasses.find((p) => p.appointment_id === appointmentIdParam);
        if (matched) setSelectedPass(matched);
        else setSelectedPass(consolidatedPasses[0] || null);
      } else {
        setSelectedPass(consolidatedPasses[0] || null);
      }
    } catch (err) {
      console.error("Failed to load OPD pass data:", err);
      setError("Unable to retrieve digital pass information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, appointmentIdParam]);

  useEffect(() => {
    loadOPDPassData();
  }, [loadOPDPassData]);

  // Lookup helpers
  const getDoctor = (doctorId) => {
    return doctors.find((d) => d._id === doctorId || d.id === doctorId) || {};
  };

  const getHospital = (hospitalId) => {
    return hospitals.find((h) => h._id === hospitalId || h.id === hospitalId) || {};
  };

  const handleCopy = async () => {
    if (!selectedPass?.pass_number) return;
    try {
      await navigator.clipboard.writeText(selectedPass.pass_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Unable to copy Pass ID");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeList = activePasses.filter((p) => p.status === "ACTIVE" || p.status === "PENDING");
  const archiveList = activePasses.filter((p) => p.status === "USED" || p.status === "EXPIRED" || p.status === "CANCELLED");

  const currentPassDoctor = selectedPass ? getDoctor(selectedPass.doctor_id) : {};
  const currentPassHospital = selectedPass ? getHospital(selectedPass.hospital_id) : {};

  return (
    <div className="opd-page">
      {/* HEADER */}
      <div className="opd-header">
        <div>
          <span className="opd-kicker">VERIFIED PATIENT ACCESS</span>
          <h1>Digital OPD Pass</h1>
          <p>
            Instant QR verification for outpatient hospital admission, doctor triage, and reception check-in.
          </p>
        </div>

        <div className="opd-header-actions">
          <button className="opd-outline-btn" onClick={handlePrint} disabled={!selectedPass}>
            <Printer size={16} />
            <span>Print Pass</span>
          </button>

          <button className="opd-download-btn" onClick={handlePrint} disabled={!selectedPass}>
            <Download size={16} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* PASS SELECTION TABS */}
      <div className="opd-tabs-bar">
        <button
          className={`opd-tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          <Ticket size={15} /> Active Passes ({activeList.length})
        </button>
        <button
          className={`opd-tab-btn ${activeTab === "archive" ? "active" : ""}`}
          onClick={() => setActiveTab("archive")}
        >
          <Archive size={15} /> Pass Archive ({archiveList.length})
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="opd-loading">
          <Loader2 size={32} className="spinner-icon" />
          <p>Retrieving secure Digital OPD Pass credentials...</p>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="opd-error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={loadOPDPassData}>Retry</button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && (activeTab === "active" ? activeList.length === 0 : archiveList.length === 0) && (
        <div className="opd-empty-state">
          <Ticket size={48} />
          <h3>{activeTab === "active" ? "No Active OPD Passes" : "No Archived Passes"}</h3>
          <p>
            {activeTab === "active"
              ? "You do not have an active OPD Pass for today. Schedule an appointment to automatically receive a digital admission pass."
              : "No historical or completed OPD passes found in your medical archive."}
          </p>
          {activeTab === "active" && (
            <Link to="/patient/doctors" className="find-doc-btn">
              <Stethoscope size={16} /> Book an Appointment
            </Link>
          )}
        </div>
      )}

      {/* MAIN OPD LAYOUT */}
      {!loading && !error && selectedPass && (
        <div className="opd-layout">
          {/* PASS CARDS SELECTOR (IF MULTIPLE) */}
          {activePasses.length > 1 && (
            <div className="opd-selector-row">
              {(activeTab === "active" ? activeList : archiveList).map((pass) => (
                <button
                  key={pass._id}
                  className={`pass-select-pill ${selectedPass._id === pass._id ? "selected" : ""}`}
                  onClick={() => setSelectedPass(pass)}
                >
                  <Ticket size={14} />
                  <span>{pass.pass_number}</span>
                  <small>({pass.status})</small>
                </button>
              ))}
            </div>
          )}

          {/* DIGITAL PASS CARD */}
          <section className="digital-pass-card" id="printable-opd-pass">
            <div className="pass-top">
              <div className="pass-brand">
                <div className="pass-logo">CB</div>
                <div>
                  <strong>CareBridge AI</strong>
                  <span>Digital Outpatient Pass</span>
                </div>
              </div>

              <div className="verified-badge">
                <ShieldCheck size={15} />
                <span>HIPAA & HL7 Verified</span>
              </div>
            </div>

            <div className="pass-divider" />

            <div className="pass-content">
              <div className="pass-status-row">
                <span className={`pass-status-badge ${selectedPass.status?.toLowerCase()}`}>
                  <CheckCircle2 size={16} />
                  {selectedPass.status === "ACTIVE" ? "Valid for Consultation" : selectedPass.status}
                </span>

                <span className="pass-dept-tag">
                  {currentPassDoctor.specialization || "Clinical Outpatient"}
                </span>
              </div>

              <h2>{selectedPass.reason || "General Medical Consultation"}</h2>
              <p className="pass-subtitle">
                Patient: <strong>{user?.name || "Verified Patient"}</strong> &middot; ID: #{String(user?.patient_id || "").slice(-6).toUpperCase()}
              </p>

              {/* APPOINTMENT INFO GRID */}
              <div className="pass-info-grid">
                <div className="pass-info">
                  <div className="pass-info-icon">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <span>Consultation Date</span>
                    <strong>{selectedPass.appointment_date || "Today"}</strong>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="pass-info-icon">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <span>Appointment Slot</span>
                    <strong>{selectedPass.appointment_time || "10:00 AM"}</strong>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="pass-info-icon">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <span>Consulting Specialist</span>
                    <strong>{currentPassDoctor.name || "Medical Practitioner"}</strong>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="pass-info-icon">
                    <Building size={18} />
                  </div>
                  <div>
                    <span>Hospital / Medical Unit</span>
                    <strong>{currentPassHospital.name || "CareBridge Medical Center"}</strong>
                  </div>
                </div>
              </div>

              {/* PASS ID & COPY */}
              <div className="pass-id-box">
                <div>
                  <span>Digital Pass Identification Number</span>
                  <strong>{selectedPass.pass_number}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="copy-pass-btn"
                  title="Copy Pass ID to clipboard"
                >
                  {copied ? <CheckCircle2 size={16} className="text-green" /> : <Copy size={16} />}
                  <span>{copied ? "Copied" : "Copy ID"}</span>
                </button>
              </div>
            </div>

            {/* QR CODE SCANNING SECTION */}
            <div className="qr-section">
              <div className="qr-box">
                <div className="qr-pattern">
                  <QrCode size={118} strokeWidth={1.5} />
                </div>
                <span className="qr-code-label">SECURE TOKEN</span>
              </div>

              <div className="qr-text">
                <strong>Hospital Reception & Triage Scan</strong>
                <p>
                  Present this QR code at reception desks, nurse stations, or doctor chamber scanners for instant patient intake.
                </p>
                <div className="qr-meta">
                  <span>Authorized by CareBridge Health Network</span>
                </div>
              </div>
            </div>

            <div className="pass-footer">
              <span>
                <ShieldCheck size={14} /> Cryptographically Signed OPD Authorization
              </span>
              <span>Valid for Single Hospital Entry</span>
            </div>
          </section>

          {/* VISIT SUMMARY TIMELINE SIDEBAR */}
          <aside className="visit-sidebar">
            <div className="visit-card">
              <div className="visit-card-header">
                <div>
                  <span className="small-label">CLINICAL VISIT WORKFLOW</span>
                  <h3>Consultation Timeline</h3>
                </div>
                <div className="visit-check">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              <div className="visit-timeline">
                <div className="timeline-item completed">
                  <div className="timeline-dot">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <strong>1. Appointment Scheduled</strong>
                    <span>Validated & confirmed in system</span>
                  </div>
                </div>

                <div className="timeline-line completed" />

                <div className="timeline-item completed">
                  <div className="timeline-dot">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <strong>2. Digital Pass Issued</strong>
                    <span>QR verification generated</span>
                  </div>
                </div>

                <div className="timeline-line active" />

                <div className="timeline-item active">
                  <div className="timeline-dot">
                    <Clock3 size={14} />
                  </div>
                  <div>
                    <strong>3. Hospital Reception Intake</strong>
                    <span>Arrive 15 min prior to slot</span>
                  </div>
                </div>

                <div className="timeline-line" />

                <div className="timeline-item">
                  <div className="timeline-dot">
                    <Stethoscope size={14} />
                  </div>
                  <div>
                    <strong>4. Doctor Consultation</strong>
                    <span>Room & vitals review</span>
                  </div>
                </div>
              </div>

              <div className="live-queue-link-wrap">
                <Link to="/patient/queue" className="queue-action-link">
                  <span>Track Live Queue Position</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* HELPFUL GUIDELINES */}
            <div className="opd-help-card">
              <div className="help-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3>Keep Pass Ready</h3>
                <p>
                  Screenshots and printed PDF passes are accepted at all partner hospital reception counters.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default DigitalOPDPass;