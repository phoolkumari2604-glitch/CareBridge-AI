import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Globe,
  ExternalLink,
  BookOpen,
  Award,
  AlertTriangle,
  History,
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVerification, setSelectedVerification] = useState("");
  const [sortBy, setSortBy] = useState("name");

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
        const val = doctorsData.value;
        const list = Array.isArray(val) ? val : (val?.doctors || val?.data || []);
        setDoctors(Array.isArray(list) ? list : []);
      }
      if (hospitalsData.status === "fulfilled") {
        const val = hospitalsData.value;
        const list = Array.isArray(val) ? val : (val?.hospitals || val?.facilities || val?.data || []);
        setHospitals(Array.isArray(list) ? list : []);
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

  const docList = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);
  const hospList = useMemo(() => (Array.isArray(hospitals) ? hospitals : []), [hospitals]);

  // Map hospital name or fallback to doctor field
  const getDoctorHospital = (doc) => {
    if (!doc) return "Not available";
    if (doc.hospital_name) return doc.hospital_name;
    if (doc.hospital) return doc.hospital;
    if (doc.hospital_id) {
      const found = hospList.find((h) => h._id === doc.hospital_id || h.id === doc.hospital_id);
      if (found) return found.name;
    }
    return "Not available";
  };

  const getDoctorLocation = (doc) => {
    if (!doc) return "Not available";
    const parts = [];
    if (doc.city) parts.push(doc.city);
    if (doc.country) parts.push(doc.country);
    return parts.length > 0 ? parts.join(", ") : "Not available";
  };

  // Distinct lists for filters
  const specialties = useMemo(() => {
    return Array.from(
      new Set(docList.map((d) => d?.specialty || d?.specialization).filter(Boolean))
    ).sort();
  }, [docList]);

  const categories = useMemo(() => {
    return Array.from(new Set(docList.map((d) => d?.category).filter(Boolean))).sort();
  }, [docList]);

  const countries = useMemo(() => {
    return Array.from(new Set(docList.map((d) => d?.country).filter(Boolean))).sort();
  }, [docList]);

  // Filter & search logic
  const filteredDoctors = useMemo(() => {
    return docList.filter((doc) => {
      if (!doc) return false;
      const name = (doc.name || "").toLowerCase();
      const spec = (doc.specialty || doc.specialization || "").toLowerCase();
      const hosp = (doc.hospital_name || doc.hospital || "").toLowerCase();
      const city = (doc.city || "").toLowerCase();
      const country = (doc.country || "").toLowerCase();
      const cat = (doc.category || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        spec.includes(q) ||
        hosp.includes(q) ||
        city.includes(q) ||
        country.includes(q) ||
        cat.includes(q);

      const matchesSpec =
        !selectedSpecialty || (doc.specialty || doc.specialization) === selectedSpecialty;

      const matchesCat = !selectedCategory || doc.category === selectedCategory;

      const matchesCountry = !selectedCountry || doc.country === selectedCountry;

      const matchesVerification =
        !selectedVerification || doc.verification_status === selectedVerification;

      return matchesSearch && matchesSpec && matchesCat && matchesCountry && matchesVerification;
    });
  }, [
    docList,
    searchQuery,
    selectedSpecialty,
    selectedCategory,
    selectedCountry,
    selectedVerification,
  ]);

  // Sort logic
  const sortedDoctors = useMemo(() => {
    return [...filteredDoctors].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "country") {
        return (a.country || "").localeCompare(b.country || "");
      }
      if (sortBy === "category") {
        return (a.category || "").localeCompare(b.category || "");
      }
      if (sortBy === "bookable") {
        return (b.is_bookable === true ? 1 : 0) - (a.is_bookable === true ? 1 : 0);
      }
      return 0;
    });
  }, [filteredDoctors, sortBy]);

  // Handle open booking modal (only for bookable doctors)
  const handleOpenBooking = (doc) => {
    if (doc.is_bookable === false) return;
    setBookingDoctor(doc);
    setSelectedDoctor(null);
    setBookingSuccess(null);
    setBookingError(null);
    setBookingDate(new Date().toISOString().split("T")[0]);
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
        hospital_id: bookingDoctor.hospital_id || hospitals[0]?._id || null,
        doctor_id: bookingDoctor._id || bookingDoctor.id,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        reason: bookingReason.trim(),
      };

      const result = await patientService.bookAppointment(bookingPayload);

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
      const message =
        err.response?.data?.detail || "Failed to schedule appointment. Please try another slot.";
      setBookingError(message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper badge renderer for Verification Status
  const renderVerificationBadge = (status) => {
    const s = status || "Needs Verification";
    if (s === "Verified") {
      return (
        <span className="verification-badge verified" title="Verified against primary medical registry">
          <ShieldCheck size={13} />
          <span>Verified</span>
        </span>
      );
    }
    if (s === "Historical") {
      return (
        <span className="verification-badge historical" title="Historical Medical Pioneer / Deceased">
          <History size={13} />
          <span>Historical Pioneer</span>
        </span>
      );
    }
    return (
      <span className="verification-badge unverified" title="Candidate record awaiting primary verification">
        <AlertTriangle size={13} />
        <span>Needs Verification</span>
      </span>
    );
  };

  // Helper badge renderer for Category
  const renderCategoryBadge = (category) => {
    const c = category || "Practicing Clinician";
    return <span className={`category-tag cat-${c.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>{c}</span>;
  };

  return (
    <div className="doctors-page">
      {/* HEADER */}
      <section className="doctors-header">
        <div>
          <span className="doctors-kicker">MEDICAL DIRECTORY</span>
          <h1>Find Your Specialist</h1>
          <p>
            Explore verified medical professionals and find the right care for your needs.
          </p>
        </div>

        <div className="doctor-header-icon">
          <Stethoscope size={28} />
        </div>
      </section>

      {/* SEARCH AND MULTI-FACET FILTERS */}
      <section className="doctor-search-card multi-filter-card">
        <div className="doctor-search-box full-width-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by doctor, specialty, hospital, or location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filters-subgrid">
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="doctor-filter-select"
          >
            <option value="">All Specialties ({specialties.length})</option>
            {specialties.map((spec, i) => (
              <option key={i} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="doctor-filter-select"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((cat, i) => (
              <option key={i} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="doctor-filter-select"
          >
            <option value="">All Countries ({countries.length})</option>
            {countries.map((ctry, i) => (
              <option key={i} value={ctry}>
                {ctry}
              </option>
            ))}
          </select>

          <select
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            className="doctor-filter-select"
          >
            <option value="">All Verification Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Needs Verification">Needs Verification</option>
            <option value="Historical">Historical</option>
          </select>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="doctors-toolbar">
        <div>
          <h2>Medical Professionals &amp; Specialists</h2>
          <p>
            Showing <strong>{sortedDoctors.length}</strong> verified, published profile{sortedDoctors.length === 1 ? "" : "s"} of {doctors.length} in directory
          </p>
        </div>

        <div className="toolbar-controls">
          {(searchQuery || selectedSpecialty || selectedCategory || selectedCountry || selectedVerification) && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialty("");
                setSelectedCategory("");
                setSelectedCountry("");
                setSelectedVerification("");
              }}
            >
              Reset Filters
            </button>
          )}

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name (A-Z)</option>
            <option value="country">Sort by Country</option>
            <option value="category">Sort by Category</option>
            <option value="bookable">Bookable First</option>
          </select>
        </div>
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <p>We could not find any doctor records matching your filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedSpecialty("");
              setSelectedCategory("");
              setSelectedCountry("");
              setSelectedVerification("");
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* DOCTORS GRID */}
      {!loading && !error && sortedDoctors.length > 0 && (
        <section className="doctor-grid">
          {sortedDoctors.map((doctor) => {
            const initials = doctor.name
              ? doctor.name
                  .replace(/^(Dr\.|Sir|Prof\.)\s*/i, "")
                  .trim()
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "MD";

            const specialty = doctor.specialty || doctor.specialization || "Medical Specialist";
            const hospitalName = getDoctorHospital(doctor);
            const location = getDoctorLocation(doctor);
            const isBookable = doctor.is_bookable === true;
            const category = doctor.category || "Practicing Clinician";
            const verificationStatus = doctor.verification_status || "Needs Verification";

            return (
              <article className="doctor-card" key={doctor._id || doctor.id}>
                <div>
                  <div className="doctor-card-top">
                    <div className="doctor-avatar">{initials}</div>

                    <div className="doctor-main-info">
                      <div className="badge-row-compact">
                        {renderVerificationBadge(verificationStatus)}
                        {renderCategoryBadge(category)}
                      </div>
                      <h3>{doctor.name}</h3>
                      <span className="doctor-specialty">{specialty}</span>
                    </div>
                  </div>

                  <div className="doctor-details">
                    <div className="doctor-detail">
                      <Building size={16} />
                      <span>{hospitalName}</span>
                    </div>

                    <div className="doctor-detail">
                      <MapPin size={16} />
                      <span>{location}</span>
                    </div>

                    {isBookable ? (
                      <div className="doctor-availability bookable-status">
                        <Clock3 size={15} />
                        <div>
                          <strong>Accepting Consultations</strong>
                          <span>
                            {doctor.available_days && doctor.available_days.length > 0
                              ? doctor.available_days.slice(0, 3).join(", ")
                              : "Mon - Fri"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="doctor-availability non-bookable-status">
                        <BookOpen size={15} />
                        <div>
                          <strong>
                            {verificationStatus === "Historical"
                              ? "Historical Pioneer"
                              : "Academic / Research Profile"}
                          </strong>
                          <span>Consultation not directly bookable</span>
                        </div>
                      </div>
                    )}
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

                  {isBookable ? (
                    <button
                      className="doctor-book-btn"
                      onClick={() => handleOpenBooking(doctor)}
                    >
                      <CalendarDays size={16} />
                      Book Consultation
                    </button>
                  ) : (
                    <button
                      className="doctor-book-btn disabled-btn"
                      disabled
                      title="Direct appointments not available for academic / historical profiles"
                    >
                      Non-Consultation
                    </button>
                  )}
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
                    ? selectedDoctor.name
                        .replace(/^(Dr\.|Sir|Prof\.)\s*/i, "")
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                    : "D"}
                </div>
                <div>
                  <div className="badge-row-compact" style={{ marginBottom: 4 }}>
                    {renderVerificationBadge(selectedDoctor.verification_status)}
                    {renderCategoryBadge(selectedDoctor.category)}
                  </div>
                  <h2>{selectedDoctor.name}</h2>
                  <p>{selectedDoctor.specialty || selectedDoctor.specialization || "Medical Specialist"}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDoctor(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Profile Meta Cards */}
              <div className="doctor-profile-stats">
                <div className="prof-stat">
                  <span>Category</span>
                  <strong>{selectedDoctor.category || "Practicing Clinician"}</strong>
                </div>
                <div className="prof-stat">
                  <span>Country</span>
                  <strong>{selectedDoctor.country || "Not available"}</strong>
                </div>
                <div className="prof-stat">
                  <span>Verification</span>
                  <strong className={selectedDoctor.verification_status === "Verified" ? "text-green" : "text-amber"}>
                    {selectedDoctor.verification_status || "Needs Verification"}
                  </strong>
                </div>
              </div>

              <div className="modal-section">
                <h4>Hospital / Academic Institution</h4>
                <p className="flex-row">
                  <Building size={16} />
                  <span>{getDoctorHospital(selectedDoctor)}</span>
                </p>
              </div>

              <div className="modal-section">
                <h4>Primary Location</h4>
                <p className="flex-row">
                  <MapPin size={16} />
                  <span>{getDoctorLocation(selectedDoctor)}</span>
                </p>
              </div>

              {selectedDoctor.bio && (
                <div className="modal-section">
                  <h4>Professional Background &amp; Profile</h4>
                  <p className="doctor-bio-text">{selectedDoctor.bio}</p>
                </div>
              )}

              {/* Source Verification info */}
              <div className="modal-section verification-source-box">
                <h4>Data Source &amp; Verification</h4>
                <div className="verification-info-content">
                  {selectedDoctor.source_url ? (
                    <a
                      href={selectedDoctor.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-url-link"
                    >
                      <Globe size={14} />
                      <span>Primary Source Registry</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="not-avail-text">Source URL: Not available</span>
                  )}
                  {selectedDoctor.verification_date && (
                    <span className="verif-date">
                      Verified On: {selectedDoctor.verification_date}
                    </span>
                  )}
                </div>
              </div>

              {selectedDoctor.is_bookable === true ? (
                <div className="modal-section">
                  <h4>Clinical Consultation Schedule</h4>
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
              ) : (
                <div className="modal-section non-consult-notice">
                  <AlertCircle size={16} />
                  <span>
                    This profile is recorded for academic, research, or historical reference and is not eligible for direct outpatient consultation booking.
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedDoctor.is_bookable === true ? (
                <button
                  className="doctor-book-btn full-btn"
                  onClick={() => handleOpenBooking(selectedDoctor)}
                >
                  <CalendarDays size={16} /> Proceed to Book Appointment
                </button>
              ) : (
                <button
                  className="doctor-outline-btn full-btn"
                  onClick={() => setSelectedDoctor(null)}
                >
                  Close Profile
                </button>
              )}
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
                    <span>{bookingDoctor.specialty || bookingDoctor.specialization}</span>
                    <small>{getDoctorHospital(bookingDoctor)}</small>
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
                    placeholder="Describe your symptoms or reason for visit (e.g. routine checkup, specialist opinion)..."
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