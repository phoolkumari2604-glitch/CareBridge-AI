import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import "./cancelAppointmentModal.css";

const CANCEL_REASONS = [
  "Schedule conflict",
  "Feeling better / Symptoms resolved",
  "Booked another specialist / elsewhere",
  "Transportation / travel issues",
  "Doctor requested reschedule",
  "Other"
];

const CancelAppointmentModal = ({
  appointment,
  doctorName,
  onClose,
  onConfirmCancel,
  loading
}) => {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [error, setError] = useState(null);

  if (!appointment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason === "Other" && !otherReason.trim()) {
      setError("Please specify the reason for cancellation.");
      return;
    }
    setError(null);
    onConfirmCancel({ reason, other_reason: otherReason.trim() });
  };

  return (
    <div className="cam-modal-overlay" onClick={onClose}>
      <div className="cam-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cam-modal-header">
          <h3 className="cam-modal-title">
            <AlertTriangle className="cam-warning-icon" size={20} />
            Cancel Consultation
          </h3>
          <button className="cam-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="cam-modal-body">
            <div className="cam-warning-box">
              <AlertTriangle className="cam-warning-icon" size={22} />
              <div>
                <strong>Cancellation Confirmation Notice</strong>
                <p style={{ margin: "0.25rem 0 0 0" }}>
                  Cancelling this appointment will release your allocated consultation slot, notify the hospital OPD desk, and cancel your queue token.
                </p>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="cam-appt-details">
              <div>
                <strong>Specialist:</strong> {doctorName || appointment.doctor_name || "Assigned Specialist"}
              </div>
              <div>
                <strong>Scheduled Date & Time:</strong> {appointment.appointment_date} at {appointment.appointment_time}
              </div>
              <div>
                <strong>Hospital:</strong> {appointment.hospital_name || "CareBridge Hospital"}
              </div>
            </div>

            {/* Reason Dropdown */}
            <div className="cam-field-group">
              <label className="cam-label">Reason for Cancellation *</label>
              <select
                className="cam-select"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Other reason textarea */}
            {reason === "Other" && (
              <div className="cam-field-group">
                <label className="cam-label">Please explain:</label>
                <textarea
                  rows={2}
                  className="cam-textarea"
                  placeholder="Provide additional details..."
                  value={otherReason}
                  onChange={(e) => {
                    setOtherReason(e.target.value);
                    setError(null);
                  }}
                  required
                />
              </div>
            )}

            {error && <div className="cam-error-msg">{error}</div>}
          </div>

          {/* Footer actions */}
          <div className="cam-modal-footer">
            <button
              type="button"
              className="cam-btn-keep"
              onClick={onClose}
              disabled={loading}
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              className="cam-btn-cancel-confirm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Yes, Cancel Consultation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelAppointmentModal;
