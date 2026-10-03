import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Phone,
  Clock3,
  Star,
  Navigation,
  Heart,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Bed,
  ShieldAlert
} from "lucide-react";
import api from "../../services/api";
import "./Hospitals.css";

function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [selectedHospital, setSelectedHospital] = useState(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hospitals/");
      setHospitals(res.data || []);
    } catch (err) {
      console.error("Failed to fetch hospitals:", err);
      setError("Failed to load hospitals. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCity = async (e) => {
    e.preventDefault();
    if (!cityQuery.trim()) {
      fetchHospitals();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/hospitals/search/by-city?city=${encodeURIComponent(cityQuery.trim())}`);
      setHospitals(res.data || []);
    } catch (err) {
      console.error("Failed to search hospitals by city:", err);
      setError("City search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredHospitals = hospitals.filter((h) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      h.name?.toLowerCase().includes(query) ||
      h.city?.toLowerCase().includes(query) ||
      h.address?.toLowerCase().includes(query) ||
      h.type?.toLowerCase().includes(query) ||
      (Array.isArray(h.specialties) &&
        h.specialties.some((s) => s.toLowerCase().includes(query)));

    if (!matchesSearch) return false;

    if (activeFilter === "open") {
      return h.status?.toLowerCase() === "open" || h.status === true;
    }
    if (activeFilter === "emergency") {
      return h.emergency === true || h.has_emergency === true;
    }
    if (activeFilter === "top_rated") {
      return (h.rating || 4.5) >= 4.5;
    }

    return true;
  });

  // Client-side sorting
  const sortedHospitals = [...filteredHospitals].sort((a, b) => {
    if (sortBy === "highest_rated") {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    return 0; // Default: API order
  });

  return (
    <div className="hospitals-page">
      {/* HEADER */}
      <section className="hospitals-header">
        <div>
          <p className="hospitals-kicker">HEALTHCARE NETWORK</p>
          <h1>Find a Hospital</h1>
          <p className="hospitals-subtitle">
            Search our network of verified hospitals, specialty centers, and healthcare facilities.
          </p>
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="hospital-search-card">
        <div className="hospital-search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search hospitals by name, specialty, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <form onSubmit={handleSearchCity} className="city-search-form">
          <div className="city-input-wrap">
            <MapPin size={18} />
            <input
              type="text"
              placeholder="Search by city..."
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="location-button">
            Search City
          </button>
        </form>
      </section>

      {/* QUICK FILTERS */}
      <section className="hospital-filters">
        <button
          className={`filter ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All Hospitals ({hospitals.length})
        </button>
        <button
          className={`filter ${activeFilter === "open" ? "active" : ""}`}
          onClick={() => setActiveFilter("open")}
        >
          <CheckCircle2 size={14} /> Open Now
        </button>
        <button
          className={`filter ${activeFilter === "emergency" ? "active" : ""}`}
          onClick={() => setActiveFilter("emergency")}
        >
          <ShieldAlert size={14} /> 24/7 Emergency
        </button>
        <button
          className={`filter ${activeFilter === "top_rated" ? "active" : ""}`}
          onClick={() => setActiveFilter("top_rated")}
        >
          <Star size={14} /> Top Rated (4.5+)
        </button>
      </section>

      {/* RESULT HEADER */}
      <div className="hospital-result-header">
        <div>
          <h2>Available Healthcare Facilities</h2>
          <p>{sortedHospitals.length} facilities match your criteria</p>
        </div>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchHospitals}>Try Again</button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="hospital-loading-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="hospital-card-skeleton">
              <div className="skeleton-line title" />
              <div className="skeleton-line subtitle" />
              <div className="skeleton-line detail" />
              <div className="skeleton-tags" />
              <div className="skeleton-btn" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && sortedHospitals.length === 0 && (
        <div className="hospital-empty-state">
          <Building size={48} />
          <h3>No Hospitals Found</h3>
          <p>
            We couldn't find any hospitals matching your current search and filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCityQuery("");
              setActiveFilter("all");
              fetchHospitals();
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* HOSPITAL CARDS GRID */}
      {!loading && !error && sortedHospitals.length > 0 && (
        <section className="hospital-grid">
          {sortedHospitals.map((hospital) => {
            const isEmergency = hospital.emergency === true || hospital.has_emergency === true;
            const isOpen = hospital.status?.toLowerCase() === "open" || hospital.status === true || hospital.status === "ACTIVE" || !hospital.status;

            return (
              <article className="hospital-card" key={hospital._id}>
                <div className="hospital-card-top">
                  <div className="hospital-icon">
                    <Building size={22} />
                  </div>

                  <div className="hospital-badges">
                    {isEmergency && (
                      <span className="emergency-badge">
                        <ShieldAlert size={12} /> Emergency
                      </span>
                    )}
                    <span className={`open-badge ${isOpen ? "is-open" : "is-closed"}`}>
                      {isOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                </div>

                <div className="hospital-info">
                  <div className="hospital-name-row">
                    <h3>{hospital.name}</h3>
                  </div>

                  <p className="hospital-type">
                    {hospital.type || "General Hospital"}
                  </p>

                  <div className="hospital-detail">
                    <MapPin size={15} />
                    <span>
                      {[hospital.address, hospital.city].filter(Boolean).join(", ") || "Location details on file"}
                    </span>
                  </div>

                  <div className="hospital-meta">
                    {hospital.rating && (
                      <span className="meta-rating">
                        <Star size={14} />
                        {hospital.rating}
                      </span>
                    )}

                    {hospital.beds && (
                      <span className="meta-beds">
                        <Bed size={14} />
                        {hospital.beds} Beds
                      </span>
                    )}

                    {hospital.phone && (
                      <span className="meta-phone">
                        <Phone size={14} />
                        {hospital.phone}
                      </span>
                    )}
                  </div>
                </div>

                {Array.isArray(hospital.specialties) && hospital.specialties.length > 0 && (
                  <div className="specialties">
                    {hospital.specialties.slice(0, 4).map((spec, i) => (
                      <span key={i}>{spec}</span>
                    ))}
                    {hospital.specialties.length > 4 && (
                      <span className="more-tag">+{hospital.specialties.length - 4} more</span>
                    )}
                  </div>
                )}

                <div className="hospital-actions">
                  <button
                    className="outline-button"
                    onClick={() => setSelectedHospital(hospital)}
                  >
                    View Details
                  </button>

                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      `${hospital.name}, ${hospital.city || ""}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-button"
                  >
                    <Navigation size={15} />
                    Directions
                  </a>
                </div>

                {hospital.phone && (
                  <div className="hospital-contact">
                    <Phone size={14} />
                    <span>Emergency Call: {hospital.phone}</span>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* HOSPITAL DETAILS MODAL */}
      {selectedHospital && (
        <div className="modal-overlay" onClick={() => setSelectedHospital(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Building size={24} className="modal-icon" />
                <div>
                  <h2>{selectedHospital.name}</h2>
                  <p>{selectedHospital.type || "Healthcare Center"}</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedHospital(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h4>Address & Contact</h4>
                <p>
                  <MapPin size={16} /> {[selectedHospital.address, selectedHospital.city].filter(Boolean).join(", ")}
                </p>
                {selectedHospital.phone && (
                  <p>
                    <Phone size={16} /> {selectedHospital.phone}
                  </p>
                )}
              </div>

              {Array.isArray(selectedHospital.specialties) && selectedHospital.specialties.length > 0 && (
                <div className="modal-section">
                  <h4>Specialties</h4>
                  <div className="modal-tags">
                    {selectedHospital.specialties.map((s, idx) => (
                      <span key={idx} className="modal-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(selectedHospital.services) && selectedHospital.services.length > 0 && (
                <div className="modal-section">
                  <h4>Available Services</h4>
                  <div className="modal-tags">
                    {selectedHospital.services.map((svc, idx) => (
                      <span key={idx} className="modal-tag secondary">{svc}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-section stats-row">
                {selectedHospital.beds && (
                  <div>
                    <span>Total Beds</span>
                    <strong>{selectedHospital.beds}</strong>
                  </div>
                )}
                <div>
                  <span>Emergency Unit</span>
                  <strong>{selectedHospital.emergency ? "24/7 Available" : "Standard"}</strong>
                </div>
                <div>
                  <span>Current Status</span>
                  <strong className="status-open">Operational</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${selectedHospital.name}, ${selectedHospital.city || ""}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="primary-button full-btn"
              >
                <Navigation size={16} /> Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Hospitals;