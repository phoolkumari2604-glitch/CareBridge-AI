import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Stethoscope,
  X,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarDays
} from "lucide-react";
import "./bookAppointmentModal.css";

const BookAppointmentModal = ({
  doctor,
  hospitals,
  user,
  onClose,
  onBookingSuccess
}) => {
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  // Free-time checker state
  const [showFreeTimeTool, setShowFreeTimeTool] = useState(false);
  const [preferredTimeInput, setPreferredTimeInput] = useState("10:00 AM");
  const [freeTimeResult, setFreeTimeResult] = useState(null);
  const [checkingFreeTime, setCheckingFreeTime] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  // Fetch dynamic slots whenever date changes
  const fetchSlots = useCallback(async (date) => {
    if (!doctor) return;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot("");
    try {
      const docId = doctor._id || doctor.id;
      const res = await fetch(`/api/doctors/${docId}/schedule?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        if (data.slots && data.slots.length > 0) {
          setSelectedSlot(data.slots[0]);
        } else {
          setSlotsError(data.reason || "No available slots on this date");
        }
      } else {
        setSlotsError("Could not retrieve doctor's schedule");
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setSlotsError("Failed to connect to schedule service");
    } finally {
      setSlotsLoading(false);
    }
  }, [doctor]);

  useEffect(() => {
    fetchSlots(bookingDate);
  }, [bookingDate, fetchSlots]);

  // Check free-time window
  const handleCheckFreeTime = async () => {
    if (!preferredTimeInput) return;
    setCheckingFreeTime(true);
    setFreeTimeResult(null);
    try {
      const docId = doctor._id || doctor.id;
      const res = await fetch(`/api/doctors/${docId}/check-free-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: bookingDate,
          preferred_time: preferredTimeInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFreeTimeResult(data);
        if (data.match && data.slot) {
          setSelectedSlot(data.slot);
        }
      }
    } catch (err) {
      console.error("Free-time check error:", err);
    } finally {
      setCheckingFreeTime(false);
    }
  };

  // Submit appointment
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedSlot) {
      setSubmitError("Please choose an available appointment time slot.");
      return;
    }

    if (!symptoms.trim() || symptoms.trim().length < 5) {
      setSubmitError("Please provide symptoms or reason for visit (minimum 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const docId = doctor._id || doctor.id;
      const hospId = doctor.hospital_id || (hospitals && hospitals[0]?._id) || null;

      const payload = {
        patient_id: user?.patient_id || user?._id,
        hospital_id: hospId,
        doctor_id: docId,
        appointment_date: bookingDate,
        appointment_time: selectedSlot,
        reason: symptoms.trim()
      };

      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.detail || data.error || "Failed to schedule appointment");
      } else {
        setConfirmationData(data);
        if (onBookingSuccess) onBookingSuccess(data);
      }
    } catch (err) {
      console.error("Booking submission error:", err);
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!doctor) return null;

  return (
    <div className="bam-modal-overlay" onClick={onClose}>
      <div className="bam-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bam-modal-header">
          <div>
            <h3 className="bam-modal-title">
              <CalendarDays className="text-primary" size={20} />
              Book Clinical Consultation
            </h3>
            <p className="bam-modal-subtitle">
              Schedule an in-person or OPD consultation slot with your chosen specialist
            </p>
          </div>
          <button className="bam-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Confirmation Success View */}
        {confirmationData ? (
          <div className="bam-modal-body">
            <div className="bam-success-view">
              <div className="bam-success-icon">
                <CheckCircle size={36} />
              </div>
              <h2 className="bam-success-title">Consultation Confirmed!</h2>
              <p style={{ color: "var(--text-secondary, #64748b)", margin: 0 }}>
                Your appointment has been registered with the hospital and added to your active bookings.
              </p>

              <div className="bam-success-details">
                <div>
                  <strong>Appointment Reference:</strong> {confirmationData.booking_id || "APT-REF"}
                </div>
                <div>
                  <strong>Specialist:</strong> {doctor.name} ({doctor.specialty})
                </div>
                <div>
                  <strong>Date & Time:</strong> {bookingDate} at {selectedSlot}
                </div>
                <div>
                  <strong>Facility:</strong> {doctor.hospital_name || doctor.hospital || "CareBridge Hospital"}
                </div>
              </div>

              <button className="bam-btn-submit" onClick={onClose} style={{ marginTop: "1rem" }}>
                Done / View Appointments
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="bam-modal-body">
              {/* Doctor Summary Pill */}
              <div className="bam-doc-summary">
                <div className="bam-doc-avatar">
                  {doctor.name?.charAt(0) || "D"}
                </div>
                <div className="bam-doc-info">
                  <h4>{doctor.name}</h4>
                  <p>{doctor.specialty || doctor.specialization} • {doctor.hospital_name || doctor.hospital || "CareBridge Partner"}</p>
                </div>
              </div>

              {/* Consultation Date */}
              <div className="bam-field-group">
                <label className="bam-label">
                  <Calendar size={15} /> Select Consultation Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="bam-input"
                  required
                />
              </div>

              {/* Dynamic Time Slots */}
              <div className="bam-field-group">
                <label className="bam-label">
                  <Clock size={15} /> Available Clinical Slots ({bookingDate})
                </label>

                {slotsLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary, #64748b)", padding: "0.5rem" }}>
                    <Loader2 size={16} className="spinner-icon" /> Checking live slot availability...
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="bam-slots-grid">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`bam-slot-btn ${selectedSlot === slot ? "selected" : ""}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bam-no-slots-alert">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{slotsError || "No slots available on this date. Please pick another date or use the free-time checker below."}</span>
                  </div>
                )}
              </div>

              {/* Can't find suitable time? Free Time Checker Tool */}
              <div className="bam-free-time-box">
                <div
                  className="bam-free-time-header"
                  onClick={() => setShowFreeTimeTool(!showFreeTimeTool)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <HelpCircle size={14} /> Can't find a suitable time? Enter your free time
                  </span>
                  {showFreeTimeTool ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {showFreeTimeTool && (
                  <>
                    <div className="bam-free-time-row">
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM or 03:00 PM"
                        value={preferredTimeInput}
                        onChange={(e) => setPreferredTimeInput(e.target.value)}
                        className="bam-input"
                        style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}
                      />
                      <button
                        type="button"
                        className="bam-check-time-btn"
                        onClick={handleCheckFreeTime}
                        disabled={checkingFreeTime}
                      >
                        {checkingFreeTime ? "Checking..." : "Check"}
                      </button>
                    </div>

                    {freeTimeResult && (
                      <div className={`bam-free-time-result ${freeTimeResult.match ? "success" : "warning"}`}>
                        <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600 }}>{freeTimeResult.message}</p>
                        {freeTimeResult.nearest_slots?.length > 0 && (
                          <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
                            {freeTimeResult.nearest_slots.map((s) => (
                              <button
                                key={s}
                                type="button"
                                className="bam-slot-btn"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                onClick={() => setSelectedSlot(s)}
                              >
                                Select {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Symptoms / Reason */}
              <div className="bam-field-group">
                <label className="bam-label">
                  <Stethoscope size={15} /> Primary Symptoms / Reason for Visit *
                </label>
                <textarea
                  rows={3}
                  className="bam-textarea"
                  placeholder="Describe your health symptoms, conditions, or reason for requesting a consultation (min 5 characters)..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                />
                <div className="bam-char-count">{symptoms.length} characters (min 5)</div>
              </div>

              {/* Error banner */}
              {submitError && (
                <div className="bam-error-banner">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="bam-modal-footer">
              <button
                type="button"
                className="bam-btn-cancel"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bam-btn-submit"
                disabled={submitting || !selectedSlot}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Booking...</span>
                  </>
                ) : (
                  <span>Confirm Appointment</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookAppointmentModal;
