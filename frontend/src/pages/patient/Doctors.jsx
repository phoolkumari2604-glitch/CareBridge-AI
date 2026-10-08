import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  CalendarDays,
  Clock3,
  Stethoscope,
  ChevronRight,
  Loader2,
  AlertCircle,
  Building,
  CheckCircle2,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./Doctors.css";

function Doctors() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [sortBy, setSortBy] = useState("recommended");

  // Modals
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDoctor, setBookingDoctor] = useState(null);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const fetchDoctorsAndHospitals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [doctorsData, hospitalsData] = await Promise.allSettled([
        patientService.getDoctors(),
        patientService.getHospitals(),
      ]);

      if (doctorsData.status === "fulfilled") {
        setDoctors(doctorsData.value || []);
      }
      if (hospitalsData.status === "fulfilled") {
        setHospitals(hospitalsData.value || []);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      setError("Unable to load doctors list. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctorsAndHospitals();
  }, [fetchDoctorsAndHospitals]);

  // Map hospital ID to Hospital name
  const getHospitalName = (hospitalId) => {
    if (!hospitalId) return "CareBridge Medical Network";
    const found = hospitals.find((h) => h._id === hospitalId || h.id === hospitalId);
    return found ? found.name : "CareBridge Hospital";
  };

  const getHospitalLocation = (hospitalId) => {
    if (!hospitalId) return "Main Campus";
    const found = hospitals.find((h) => h._id === hospitalId || h.id === hospitalId);
    return found ? found.city || found.address || "City Center" : "City Center";
  };

  // Distinct specialties list
  const specialties = Array.from(
    new Set(doctors.map((d) => d.specialization || d.specialty).filter(Boolean))
  );

  // Filter & search logic
  const filteredDoctors = doctors.filter((doc) => {
    const name = (doc.name || "").toLowerCase();
    const spec = (doc.specialization || doc.specialty || "").toLowerCase();
    const hosp = getHospitalName(doc.hospital_id).toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = !q || name.includes(q) || spec.includes(q) || hosp.includes(q);
    const matchesSpec = !selectedSpecialty || (doc.specialization || doc.specialty) === selectedSpecialty;
    const matchesHosp = !selectedHospital || doc.hospital_id === selectedHospital;

    return matchesSearch && matchesSpec && matchesHosp;
  });

  // Sort logic
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "experience") {
      const expA = parseInt(a.experience_years || a.experience || 0, 10);
      const expB = parseInt(b.experience_years || b.experience || 0, 10);
      return expB - expA;
    }
    return 0;
  });

  // Handle open booking modal
  const handleOpenBooking = (doc) => {
    setBookingDoctor(doc);
    setSelectedDoctor(null);
    setBookingSuccess(null);
    setBookingError(null);
    setBookingDate(new Date().toISOString().split("T")[0]);
    // Pick first available slot if present
    const slots = doc.available_slots || [];
    setBookingTime(slots.length > 0 ? slots[0] : "10:00 AM");
    setBookingReason("");
  };

  // Submit appointment booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!user?.patient_id) {
      setBookingError("Please complete your patient profile before booking appointments.");
      return;
    }

    if (!bookingDate || !bookingTime || !bookingReason.trim()) {
      setBookingError("Please fill in all booking fields.");
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError(null);

      const bookingPayload = {
        patient_id: user.patient_id,
        hospital_id: bookingDoctor.hospital_id || hospitals[0]?._id,
        doctor_id: bookingDoctor._id || bookingDoctor.id,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        reason: bookingReason.trim(),
      };

      const result = await patientService.bookAppointment(bookingPayload);

      // Store in patient's local appointments sync
      if (result.appointment_id) {
        patientService.addStoredAppointmentId(user.patient_id, result.appointment_id);
      }

      setBookingSuccess({
        id: result.appointment_id,
        doctor: bookingDoctor.name,
        date: bookingDate,
        time: bookingTime,
      });
    } catch (err) {
      console.error("Booking error:", err);
      const message = err.response?.data?.detail || "Failed to schedule appointment. Please try another slot.";
      setBookingError(message);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="doctors-page">
      {/* HEADER */}
      <section className="doctors-header">
        <div>
          <span className="doctors-kicker">HEALTHCARE PROVIDERS</span>
          <h1>Find a Doctor</h1>
          <p>
            Connect with verified specialists, review medical qualifications, check live consultation availability, and book appointments.
          </p>
        </div>

        <div className="doctor-header-icon">
          <Stethoscope size={28} />
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="doctor-search-card">
        <div className="doctor-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="doctor-filter-select"
        >
          <option value="">All Specialties</option>
          {specialties.map((spec, i) => (
            <option key={i} value={spec}>
              {spec}
            </option>
          ))}
        </select>

        <select
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="doctor-filter-select"
        >
          <option value="">All Hospitals</option>
          {hospitals.map((hosp) => (
            <option key={hosp._id || hosp.id} value={hosp._id || hosp.id}>
              {hosp.name}
            </option>
          ))}
        </select>
      </section>

      {/* TOOLBAR */}
      <div className="doctors-toolbar">
        <div>
          <h2>Available Specialists</h2>
          <p>
            {sortedDoctors.length} {sortedDoctors.length === 1 ? "specialist" : "specialists"} found
          </p>
        </div>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="name">Name (A-Z)</option>
          <option value="experience">Most Experienced</option>
        </select>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="doctor-error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchDoctorsAndHospitals}>Try Again</button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && (
        <div className="doctor-loading-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="doctor-card-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-info">
                <div className="skeleton-line title" />
                <div className="skeleton-line spec" />
                <div className="skeleton-line hosp" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && sortedDoctors.length === 0 && (
        <div className="doctor-empty-state">
          <Stethoscope size={48} />
          <h3>No Doctors Found</h3>
          <p>We could not find any doctors matching your search criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedSpecialty("");
              setSelectedHospital("");
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* DOCTORS GRID */}
      {!loading && !error && sortedDoctors.length > 0 && (
        <section className="doctor-grid">
          {sortedDoctors.map((doctor) => {
            const initials = doctor.name
              ? doctor.name
                  .replace(/^(Dr\.|Dr)\s*/i, "")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "DR";

            const specialty = doctor.specialization || doctor.specialty || "General Medicine";
            const hospitalName = getHospitalName(doctor.hospital_id);
            const location = getHospitalLocation(doctor.hospital_id);
            const isAvailable = (doctor.status || "AVAILABLE").toUpperCase() === "AVAILABLE";
            const availableSlots = doctor.available_slots || ["10:00 AM", "11:30 AM", "02:00 PM"];
            const availableDays = doctor.available_days || ["Monday", "Wednesday", "Friday"];

            return (
              <article className="doctor-card" key={doctor._id || doctor.id}>
                <div className="doctor-card-top">
                  <div className="doctor-avatar">{initials}</div>

                  <div className="doctor-main-info">
                    <h3>{doctor.name}</h3>
                    <span className="doctor-specialty">{specialty}</span>

                    <div className="doctor-status-tag">
                      <span className={`status-indicator ${isAvailable ? "available" : "busy"}`} />
                      <span>{isAvailable ? "Available for Booking" : "On Duty / Busy"}</span>
                    </div>
                  </div>
                </div>

                <div className="doctor-details">
                  {doctor.experience_years && (
                    <div className="doctor-detail">
                      <ShieldCheck size={16} />
                      <span>{doctor.experience_years} Years Clinical Practice</span>
                    </div>
                  )}

                  <div className="doctor-detail">
                    <Building size={16} />
                    <span>{hospitalName}</span>
                  </div>

                  <div className="doctor-detail">
                    <MapPin size={16} />
                    <span>{location}</span>
                  </div>

                  <div className="doctor-availability">
                    <Clock3 size={16} />
                    <div>
                      <strong>{availableDays.slice(0, 3).join(", ")}</strong>
                      <span>{availableSlots.slice(0, 2).join(" & ")}</span>
                    </div>
                  </div>
                </div>

                <div className="doctor-card-actions">
                  <button
                    className="doctor-outline-btn"
                    onClick={() => setSelectedDoctor(doctor)}
                  >
                    View Profile
                    <ChevronRight size={15} />
                  </button>

                  <button
                    className="doctor-book-btn"
                    onClick={() => handleOpenBooking(doctor)}
                    disabled={!isAvailable}
                  >
                    <CalendarDays size={16} />
                    Book Consultation
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* VIEW DOCTOR PROFILE MODAL */}
      {selectedDoctor && (
        <div className="modal-overlay" onClick={() => setSelectedDoctor(null)}>
          <div className="modal-content doctor-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="profile-modal-title">
                <div className="doctor-avatar large">
                  {selectedDoctor.name
                    ? selectedDoctor.name.charAt(0).toUpperCase()
                    : "D"}
                </div>
                <div>
                  <h2>{selectedDoctor.name}</h2>
                  <p>{selectedDoctor.specialization || selectedDoctor.specialty || "Medical Specialist"}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDoctor(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="doctor-profile-stats">
                <div className="prof-stat">
                  <span>Experience</span>
                  <strong>{selectedDoctor.experience_years || 10} Years</strong>
                </div>
                <div className="prof-stat">
                  <span>Rating</span>
                  <strong>★ 4.9</strong>
                </div>
                <div className="prof-stat">
                  <span>Status</span>
                  <strong className="text-green">{selectedDoctor.status || "AVAILABLE"}</strong>
                </div>
              </div>

              <div className="modal-section">
                <h4>Hospital Affiliation</h4>
                <p className="flex-row">
                  <Building size={16} />
                  <span>{getHospitalName(selectedDoctor.hospital_id)} &middot; {getHospitalLocation(selectedDoctor.hospital_id)}</span>
                </p>
              </div>

              <div className="modal-section">
                <h4>Available Consultation Days</h4>
                <div className="modal-tags">
                  {(selectedDoctor.available_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]).map(
                    (day, idx) => (
                      <span key={idx} className="modal-tag">
                        {day}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="modal-section">
                <h4>Standard Consultation Slots</h4>
                <div className="modal-tags">
                  {(selectedDoctor.available_slots || ["09:00 AM", "10:30 AM", "02:00 PM", "03:30 PM"]).map(
                    (slot, idx) => (
                      <span key={idx} className="modal-tag secondary">
                        <Clock3 size={12} /> {slot}
                      </span>
                    )
                  )}
                </div>
              </div>

              {selectedDoctor.bio && (
                <div className="modal-section">
                  <h4>About Practitioner</h4>
                  <p className="doctor-bio-text">{selectedDoctor.bio}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="doctor-book-btn full-btn"
                onClick={() => handleOpenBooking(selectedDoctor)}
              >
                <CalendarDays size={16} /> Proceed to Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {bookingDoctor && (
        <div className="modal-overlay" onClick={() => setBookingDoctor(null)}>
          <div className="modal-content doctor-booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Book Appointment</h2>
                <p>Schedule a consultation with {bookingDoctor.name}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setBookingDoctor(null)}>
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="booking-success-view">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={44} />
                </div>
                <h3>Appointment Requested Successfully!</h3>
                <p>
                  Your consultation with <strong>{bookingSuccess.doctor}</strong> is scheduled for{" "}
                  <strong>{bookingSuccess.date}</strong> at <strong>{bookingSuccess.time}</strong>.
                </p>
                <div className="success-actions">
                  <button
                    className="view-apts-btn"
                    onClick={() => {
                      setBookingDoctor(null);
                      navigate("/patient/appointments");
                    }}
                  >
                    View in Appointments
                  </button>
                  <button
                    className="view-opd-btn"
                    onClick={() => {
                      setBookingDoctor(null);
                      navigate("/patient/opd-pass");
                    }}
                  >
                    View Digital OPD Pass
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="booking-form">
                {bookingError && (
                  <div className="form-error-banner">
                    <AlertCircle size={16} />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="booking-doctor-summary">
                  <div className="summary-avatar">
                    {bookingDoctor.name ? bookingDoctor.name.charAt(0).toUpperCase() : "D"}
                  </div>
                  <div>
                    <strong>{bookingDoctor.name}</strong>
                    <span>{bookingDoctor.specialization || bookingDoctor.specialty}</span>
                    <small>{getHospitalName(bookingDoctor.hospital_id)}</small>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <Calendar size={14} /> Consultation Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Clock3 size={14} /> Select Available Time Slot
                  </label>
                  <div className="slots-picker">
                    {(bookingDoctor.available_slots || ["09:00 AM", "10:30 AM", "11:30 AM", "02:00 PM", "03:30 PM"]).map(
                      (slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`slot-pill ${bookingTime === slot ? "selected" : ""}`}
                          onClick={() => setBookingTime(slot)}
                        >
                          {slot}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <Stethoscope size={14} /> Primary Symptoms / Reason for Consultation
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe your health symptoms or reason for visit (e.g. routine checkup, persistent cough, chest discomfort)..."
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    required
                  />
                </div>

                <div className="booking-notice">
                  <ShieldCheck size={16} />
                  <span>
                    Your appointment request will be logged with the hospital OPD desk and doctor schedule.
                  </span>
                </div>

                <div className="modal-footer-actions">
                  <button
                    type="button"
                    className="cancel-booking-btn"
                    onClick={() => setBookingDoctor(null)}
                    disabled={bookingLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="confirm-booking-btn"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirm Appointment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Doctors;