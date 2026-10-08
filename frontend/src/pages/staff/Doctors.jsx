import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  Building,
  MapPin,
  ShieldCheck,
  History,
  AlertTriangle,
  Globe,
  ExternalLink,
  BookOpen,
  Loader2,
  RefreshCw,
  Award,
  Users,
} from "lucide-react";
import patientService from "../../services/patientService";
import "./Doctors.css";

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientService.getDoctors();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load staff doctor directory:", err);
      setError("Failed to load doctor directory from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const specialties = useMemo(() => {
    return Array.from(
      new Set(doctors.map((d) => d.specialty || d.specialization).filter(Boolean))
    ).sort();
  }, [doctors]);

  const categories = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.category).filter(Boolean))).sort();
  }, [doctors]);

  const countries = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.country).filter(Boolean))).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const name = (doctor.name || "").toLowerCase();
      const spec = (doctor.specialty || doctor.specialization || "").toLowerCase();
      const hosp = (doctor.hospital_name || doctor.hospital || "").toLowerCase();
      const city = (doctor.city || "").toLowerCase();
      const country = (doctor.country || "").toLowerCase();
      const cat = (doctor.category || "").toLowerCase();
      const s = search.toLowerCase().trim();

      const matchesSearch =
        !s ||
        name.includes(s) ||
        spec.includes(s) ||
        hosp.includes(s) ||
        city.includes(s) ||
        country.includes(s) ||
        cat.includes(s);

      const matchesSpecialty =
        specialtyFilter === "All" ||
        (doctor.specialty || doctor.specialization) === specialtyFilter;

      const matchesCategory =
        categoryFilter === "All" || doctor.category === categoryFilter;

      const matchesCountry =
        countryFilter === "All" || doctor.country === countryFilter;

      const matchesVerification =
        verificationFilter === "All" ||
        doctor.verification_status === verificationFilter;

      return (
        matchesSearch &&
        matchesSpecialty &&
        matchesCategory &&
        matchesCountry &&
        matchesVerification
      );
    });
  }, [
    doctors,
    search,
    specialtyFilter,
    categoryFilter,
    countryFilter,
    verificationFilter,
  ]);

  const totalDoctors = doctors.length;
  const verifiedDoctors = doctors.filter(
    (d) => d.verification_status === "Verified"
  ).length;
  const practicingClinicians = doctors.filter(
    (d) => d.category === "Practicing Clinician"
  ).length;
  const researchAndAcademics = doctors.filter((d) =>
    ["Medical Researcher", "Academic", "Public Health Expert", "Historical Medical Pioneer"].includes(
      d.category
    )
  ).length;

  const renderVerificationBadge = (status) => {
    const s = status || "Needs Verification";
    if (s === "Verified") {
      return (
        <span className="status-badge active" title="Verified against primary registry">
          Verified
        </span>
      );
    }
    if (s === "Historical") {
      return (
        <span
          className="status-badge"
          style={{ background: "#f5f3ff", color: "#7c3aed" }}
          title="Historical Medical Pioneer"
        >
          Historical
        </span>
      );
    }
    return (
      <span
        className="status-badge"
        style={{ background: "#fffbeb", color: "#b45309" }}
        title="Candidate Record - Needs Verification"
      >
        Needs Verification
      </span>
    );
  };

  return (
    <main className="staff-doctors-page">
      {/* HEADER */}
      <section className="doctors-header">
        <div>
          <span className="doctors-eyebrow">STAFF / ADMIN • DIRECTORY MANAGEMENT</span>
          <h1>Medical Specialist Directory</h1>
          <p>
            Review master records for 50 medical specialists, academic researchers, and historical pioneers across institutions and countries.
          </p>
        </div>

        <button className="secondary-btn" onClick={fetchDoctors} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spinning" : ""} />
          {loading ? "Syncing..." : "Refresh Records"}
        </button>
      </section>

      {/* SUMMARY STATS (Real verified data only, no fake patient counts) */}
      <section className="doctor-stats">
        <div className="doctor-stat-card">
          <div className="stat-icon blue">◉</div>
          <div>
            <span>Total Specialists</span>
            <strong>{totalDoctors}</strong>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Verified Records</span>
            <strong>{verifiedDoctors}</strong>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="stat-icon purple">✦</div>
          <div>
            <span>Practicing Clinicians</span>
            <strong>{practicingClinicians}</strong>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="stat-icon orange">♙</div>
          <div>
            <span>Research &amp; Pioneers</span>
            <strong>{researchAndAcademics}</strong>
          </div>
        </div>
      </section>

      {/* MAIN CARD */}
      <section className="doctors-panel">
        <div className="panel-top">
          <div>
            <h2>Doctor Directory &amp; Affiliations</h2>
            <p>
              Showing {filteredDoctors.length} of {totalDoctors} records
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="doctor-filters" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <div className="doctor-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search by name, specialty, hospital, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
          >
            <option value="All">All Specialties ({specialties.length})</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            <option value="All">All Countries ({countries.length})</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* LOADING */}
        {loading && (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            <Loader2 size={28} className="spinning" style={{ margin: "0 auto 10px" }} />
            <p>Loading medical directory records...</p>
          </div>
        )}

        {/* DESKTOP TABLE */}
        {!loading && (
          <div className="doctors-table-wrapper">
            <table className="doctors-table">
              <thead>
                <tr>
                  <th>Specialist</th>
                  <th>Specialty</th>
                  <th>Institution / Hospital</th>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Clinical Status</th>
                  <th>Verification</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredDoctors.map((doctor) => {
                  const initials = doctor.name
                    ? doctor.name
                        .replace(/^(Dr\.|Sir|Prof\.)\s*/i, "")
                        .trim()
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "MD";

                  const isBookable = doctor.is_bookable === true;

                  return (
                    <tr key={doctor._id || doctor.id || doctor.name}>
                      <td>
                        <div className="doctor-person">
                          <div className="doctor-avatar">{initials}</div>
                          <div>
                            <strong>{doctor.name}</strong>
                            <small>{doctor.country || "International"}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="specialty-text">
                          {doctor.specialty || doctor.specialization}
                        </span>
                      </td>

                      <td>{doctor.hospital_name || doctor.hospital || "Not available"}</td>

                      <td>
                        {[doctor.city, doctor.country].filter(Boolean).join(", ") ||
                          "Not available"}
                      </td>

                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          {doctor.category || "Practicing Clinician"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`availability ${
                            isBookable ? "available" : "unavailable"
                          }`}
                        >
                          <i></i>
                          {isBookable ? "Consultations Open" : "Academic / Research"}
                        </span>
                      </td>

                      <td>{renderVerificationBadge(doctor.verification_status)}</td>

                      <td>
                        <button
                          className="view-btn"
                          onClick={() => setSelectedDoctor(doctor)}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MOBILE CARDS */}
        {!loading && (
          <div className="doctor-mobile-list">
            {filteredDoctors.map((doctor) => {
              const initials = doctor.name
                ? doctor.name
                    .replace(/^(Dr\.|Sir|Prof\.)\s*/i, "")
                    .trim()
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "MD";

              return (
                <article
                  className="doctor-mobile-card"
                  key={doctor._id || doctor.id || doctor.name}
                >
                  <div className="mobile-doctor-head">
                    <div className="doctor-person">
                      <div className="doctor-avatar">{initials}</div>
                      <div>
                        <strong>{doctor.name}</strong>
                        <small>{doctor.country || "International"}</small>
                      </div>
                    </div>

                    {renderVerificationBadge(doctor.verification_status)}
                  </div>

                  <div className="mobile-doctor-details">
                    <div>
                      <span>Specialty</span>
                      <strong>{doctor.specialty || doctor.specialization}</strong>
                    </div>

                    <div>
                      <span>Institution</span>
                      <strong>
                        {doctor.hospital_name || doctor.hospital || "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span>Location</span>
                      <strong>
                        {[doctor.city, doctor.country].filter(Boolean).join(", ") ||
                          "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span>Category</span>
                      <strong>{doctor.category || "Practicing Clinician"}</strong>
                    </div>
                  </div>

                  <div className="mobile-doctor-footer">
                    <span
                      className={`availability ${
                        doctor.is_bookable === true ? "available" : "unavailable"
                      }`}
                    >
                      <i></i>
                      {doctor.is_bookable === true ? "Consultations Open" : "Academic / Research"}
                    </span>

                    <button
                      className="view-btn"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filteredDoctors.length === 0 && (
          <div className="doctors-empty">
            <div>⌕</div>
            <h3>No doctors found</h3>
            <p>Try changing your search or filter parameters.</p>
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}
      {selectedDoctor && (
        <div
          className="doctor-modal-overlay"
          onClick={() => setSelectedDoctor(null)}
        >
          <div
            className="doctor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedDoctor(null)}
            >
              ×
            </button>

            <div className="modal-doctor-header">
              <div className="large-doctor-avatar">
                {selectedDoctor.name
                  ? selectedDoctor.name
                      .replace(/^(Dr\.|Sir|Prof\.)\s*/i, "")
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                  : "D"}
              </div>

              <div>
                <span>{selectedDoctor.category || "Practicing Clinician"}</span>
                <h2>{selectedDoctor.name}</h2>
                <p>{selectedDoctor.specialty || selectedDoctor.specialization}</p>
              </div>
            </div>

            <div className="modal-details">
              <div>
                <span>Institution / Hospital</span>
                <strong>
                  {selectedDoctor.hospital_name ||
                    selectedDoctor.hospital ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>
                  {[selectedDoctor.city, selectedDoctor.country]
                    .filter(Boolean)
                    .join(", ") || "Not available"}
                </strong>
              </div>

              <div>
                <span>Category</span>
                <strong>{selectedDoctor.category || "Practicing Clinician"}</strong>
              </div>

              <div>
                <span>Verification Status</span>
                <strong>
                  {selectedDoctor.verification_status || "Needs Verification"}
                </strong>
              </div>

              <div>
                <span>Clinical Appointments</span>
                <strong>
                  {selectedDoctor.is_bookable === true
                    ? "Available for Consultations"
                    : "Not Bookable (Academic / Historical)"}
                </strong>
              </div>

              <div>
                <span>Verification Date</span>
                <strong>
                  {selectedDoctor.verification_date || "Not available"}
                </strong>
              </div>
            </div>

            {selectedDoctor.bio && (
              <div style={{ marginTop: 20, padding: 14, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <span style={{ display: "block", marginBottom: 5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  Professional Background
                </span>
                <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                  {selectedDoctor.bio}
                </p>
              </div>
            )}

            {selectedDoctor.source_url && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <a
                  href={selectedDoctor.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2563eb", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                >
                  <Globe size={14} />
                  <span>Primary Source Registry</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setSelectedDoctor(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Doctors;