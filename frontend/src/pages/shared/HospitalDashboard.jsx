import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Navigation,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Compass,
  Filter,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Locate,
  Loader2,
  ExternalLink,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../services/api";
import "./HospitalDashboard.css";

// Fix Leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom Blue Pin for User Location & Red Pin for Hospital
const createUserIcon = () =>
  L.divIcon({
    className: "custom-user-marker",
    html: `<div class="user-marker-pulse"><div class="user-marker-dot"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

const createHospitalIcon = (isPartner = true) =>
  L.divIcon({
    className: "custom-hospital-marker",
    html: `<div class="hospital-pin ${isPartner ? "pin-partner" : ""}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 6v12m-6-6h12"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const RADIUS_OPTIONS = [
  { value: "all", label: "All Radius" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" },
  { value: "50", label: "Within 50 km" },
];

export default function HospitalDashboard() {
  // Data State
  const [hospitals, setHospitals] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);

  // Live User Location
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("prompt"); // "prompt" | "locating" | "granted" | "denied"
  const [locationError, setLocationError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [radiusFilter, setRadiusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("nearest");

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Leaflet Map References
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Request & Watch User Live Geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationStatus("locating");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(coords);
        setLocationStatus("granted");
      },
      (err) => {
        console.warn("Geolocation permission error:", err);
        setLocationStatus("denied");
        setLocationError("Location permission denied. Showing all registered hospitals.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // On Mount: Request location automatically
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Track live movement with watchPosition
  useEffect(() => {
    if (locationStatus !== "granted" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => console.warn("Watch position error:", err),
      { enableHighAccuracy: true, maximumAge: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationStatus]);

  // Fetch Hospitals from Backend
  const fetchHospitals = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        city: cityFilter !== "All" ? cityFilter : undefined,
        sort_by: sortBy,
      };

      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        if (radiusFilter !== "all") {
          params.radius_km = radiusFilter;
        }
      }

      const res = await api.get("/hospitals/", { params });
      const data = res.data || {};

      const list = Array.isArray(data) ? data : (data.hospitals || []);
      setHospitals(list);
      setTotalCount(data.total || list.length);
      setTotalPages(data.pages || Math.max(1, Math.ceil((data.total || list.length) / pageSize)));
    } catch (err) {
      console.error("Hospitals fetch error:", err);
      setError("Failed to retrieve verified hospitals from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, cityFilter, radiusFilter, sortBy, userLocation]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation ? userLocation.lat : 28.6139;
      const initialLng = userLocation ? userLocation.lng : 77.2090;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Detect dark theme
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Map Markers when hospitals or user location changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. User Live Location Marker & Pulse Ring
    if (userLocation) {
      const userLatLng = [userLocation.lat, userLocation.lng];

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userLatLng, {
          icon: createUserIcon(),
          zIndexOffset: 1000,
        }).bindPopup(`
          <div class="leaflet-custom-popup user-popup">
            <strong>Your Live Location</strong>
            <small>Accuracy: ~${Math.round(userLocation.accuracy || 10)}m</small>
          </div>
        `);
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
      }
      markersLayerRef.current.addLayer(userMarkerRef.current);

      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(userLatLng, {
          radius: Math.min(userLocation.accuracy || 200, 1000),
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
          weight: 1,
        });
      } else {
        userAccuracyCircleRef.current.setLatLng(userLatLng);
        userAccuracyCircleRef.current.setRadius(Math.min(userLocation.accuracy || 200, 1000));
      }
      markersLayerRef.current.addLayer(userAccuracyCircleRef.current);
    }

    // 2. Hospital Markers with interactive popups
    const bounds = L.latLngBounds();
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);

    hospitals.forEach((hosp) => {
      const hLat = hosp.lat || hosp.latitude;
      const hLng = hosp.lng || hosp.longitude;
      if (!hLat || !hLng) return;

      const hospLatLng = [hLat, hLng];
      bounds.extend(hospLatLng);

      const distanceText = hosp.distanceKm
        ? `<div class="popup-dist"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> ${hosp.distanceKm} km away</div>`
        : "";

      const phoneLink = hosp.phone
        ? `<a href="tel:${hosp.phone.replace(/[^+\d]/g, "")}" class="popup-phone-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${hosp.phone}</a>`
        : "";

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hLat},${hLng}`;

      const marker = L.marker(hospLatLng, {
        icon: createHospitalIcon(true),
      }).bindPopup(`
        <div class="leaflet-custom-popup">
          <div class="popup-header">
            <h4>${hosp.name}</h4>
            <span class="popup-type">${hosp.facility_type || "Hospital"}</span>
          </div>
          <p class="popup-addr"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${hosp.address}</p>
          ${distanceText}
          <div class="popup-actions">
            ${phoneLink}
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="popup-dir-btn">
              Directions &rarr;
            </a>
          </div>
        </div>
      `);

      markersLayerRef.current.addLayer(marker);
    });

    if (hospitals.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [hospitals, userLocation]);

  // Fly Map to Specific Hospital
  const flyToHospital = (hosp) => {
    const hLat = hosp.lat || hosp.latitude;
    const hLng = hosp.lng || hosp.longitude;
    if (!hLat || !hLng || !mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([hLat, hLng], 15, { duration: 1.2 });
    // Scroll map into view on mobile
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Open Details Modal
  const openDetails = (hosp) => {
    setSelectedHospital(hosp);
    setShowDetailsModal(true);
  };

  return (
    <div className="hospitals-page-container">
      {/* Hero Header */}
      <section className="hospitals-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Compass size={14} />
            <span>VERIFIED CLINICAL FACILITIES</span>
          </div>
          <h1 className="hero-title">Find Nearby Hospitals</h1>
          <p className="hero-subtitle">
            Explore emergency centers, multi-specialty hospitals, and critical care units with real-time distance calculation and interactive Leaflet map telemetry.
          </p>

          {/* Location Status Pill */}
          <div className="location-status-bar">
            {locationStatus === "granted" && userLocation && (
              <div className="status-pill status-granted">
                <span className="live-indicator-dot" />
                <span>Live Location Active ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})</span>
              </div>
            )}
            {locationStatus === "locating" && (
              <div className="status-pill status-locating">
                <Loader2 size={13} className="spin-icon" />
                <span>Locating your current GPS coordinates...</span>
              </div>
            )}
            {locationStatus === "denied" && (
              <div className="status-pill status-denied">
                <AlertCircle size={13} />
                <span>Location disabled.</span>
                <button className="btn-enable-location" onClick={requestLocation}>
                  <Locate size={12} /> Enable Location
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hero-actions">
          <button
            className={`hero-btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchHospitals(true)}
            disabled={isRefreshing || loading}
            title="Refresh Hospital Registry"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Main Map Section */}
      <section className="hospitals-map-section">
        <div className="map-header">
          <div className="map-title-wrap">
            <MapPin size={18} className="map-icon" />
            <h3>Live Hospital Network Map</h3>
            <span className="map-hosp-count">{hospitals.length} facilities in view</span>
          </div>

          <div className="map-controls">
            {userLocation && (
              <button
                className="btn-center-user"
                onClick={() => {
                  if (mapInstanceRef.current && userLocation) {
                    mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14);
                  }
                }}
                title="Recenter on My Location"
              >
                <Locate size={14} /> My Location
              </button>
            )}
          </div>
        </div>

        <div className="leaflet-map-wrapper">
          <div ref={mapContainerRef} className="leaflet-map-element" />
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="hospitals-toolbar">
        <div className="search-input-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search hospitals by name, specialty, address, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-selects-group">
          {/* Radius Filter */}
          <div className="select-wrapper">
            <Compass size={14} />
            <select
              value={radiusFilter}
              onChange={(e) => {
                setRadiusFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!userLocation}
              title={!userLocation ? "Enable location to filter by radius" : "Filter radius"}
            >
              {RADIUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="select-wrapper">
            <Filter size={14} />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="nearest">Nearest First</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name (A – Z)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Global Error Banner */}
      {error && (
        <div className="hospitals-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Hospital Cards Grid */}
      <section className="hospitals-grid-section">
        {loading && (
          <div className="hospitals-skeleton-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="hospital-card skeleton-card">
                <div className="skeleton-line title" />
                <div className="skeleton-line subtitle" />
                <div className="skeleton-line badge" />
                <div className="skeleton-line row" />
                <div className="skeleton-line row" />
                <div className="skeleton-line btn-row" />
              </div>
            ))}
          </div>
        )}

        {!loading && hospitals.length === 0 && (
          <div className="hospitals-empty-state">
            <div className="empty-icon-wrap">
              <Building2 size={48} />
            </div>
            <h3>No hospitals found</h3>
            <p>
              {search || radiusFilter !== "all"
                ? "No healthcare facilities match your active search and radius criteria. Try expanding the radius or clearing the search."
                : "No verified hospitals are currently registered in the database."}
            </p>
            {(search || radiusFilter !== "all") && (
              <button
                className="btn-reset-filters"
                onClick={() => {
                  setSearch("");
                  setRadiusFilter("all");
                  setSortBy("nearest");
                  setCurrentPage(1);
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {!loading && hospitals.length > 0 && (
          <div className="hospitals-cards-grid">
            {hospitals.map((hosp) => {
              const hospId = hosp._id || hosp.id;
              const hLat = hosp.lat || hosp.latitude;
              const hLng = hosp.lng || hosp.longitude;
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hLat},${hLng}`;

              return (
                <div key={hospId} className="hospital-card">
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="card-title-group">
                      <h4 className="hospital-name" title={hosp.name}>
                        {hosp.name}
                      </h4>
                      <div className="card-badges-row">
                        <span className="type-badge">{hosp.facility_type || "Multi-Specialty"}</span>
                        {hosp.emergency && (
                          <span className="emergency-badge">24/7 Emergency</span>
                        )}
                      </div>
                    </div>

                    <div className="rating-pill">
                      <Star size={13} className="star-filled" />
                      <span>{hosp.rating ? hosp.rating.toFixed(1) : "4.8"}</span>
                    </div>
                  </div>

                  {/* Card Body - Inline 16px icons */}
                  <div className="card-body">
                    {/* Distance Line */}
                    {hosp.distanceKm !== undefined && hosp.distanceKm !== null && (
                      <div className="meta-line distance-line">
                        <Compass size={15} className="meta-icon icon-blue" />
                        <strong>{hosp.distanceKm} km away</strong>
                      </div>
                    )}

                    {/* Address Line */}
                    <div className="meta-line">
                      <MapPin size={15} className="meta-icon" />
                      <span className="meta-text" title={hosp.address}>
                        {hosp.address}
                      </span>
                    </div>

                    {/* Phone Line */}
                    <div className="meta-line">
                      <Phone size={15} className="meta-icon" />
                      <a
                        href={`tel:${(hosp.phone || "").replace(/[^+\d]/g, "")}`}
                        className="meta-link"
                      >
                        {hosp.phone || "+91 11 2658 8500"}
                      </a>
                    </div>

                    {/* Website Line */}
                    {hosp.website && (
                      <div className="meta-line">
                        <Globe size={15} className="meta-icon" />
                        <a
                          href={hosp.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="meta-link website-link"
                        >
                          Visit Official Website <ExternalLink size={11} />
                        </a>
                      </div>
                    )}

                    {/* Live Bed Data small muted line */}
                    <div className="beds-muted-note">
                      <span>Live bed telemetry unavailable • Walk-ins accepted</span>
                    </div>
                  </div>

                  {/* Card Footer / Action Buttons */}
                  <div className="card-actions-row">
                    {/* Call Button */}
                    <a
                      href={`tel:${(hosp.phone || "").replace(/[^+\d]/g, "")}`}
                      className="card-btn btn-call"
                      title="Call Hospital Hotline"
                    >
                      <Phone size={14} />
                      <span>Call</span>
                    </a>

                    {/* Directions Button */}
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-btn btn-directions"
                      title="Get Google Maps Driving Directions"
                    >
                      <Navigation size={14} />
                      <span>Directions</span>
                    </a>

                    {/* View Details / Fly Map Button */}
                    <button
                      className="card-btn btn-details"
                      onClick={() => openDetails(hosp)}
                      title="View Facility Profile"
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>

                    {/* Map Fly Icon */}
                    <button
                      className="card-btn btn-map-fly"
                      onClick={() => flyToHospital(hosp)}
                      title="Locate on Map"
                    >
                      <MapPin size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && hospitals.length > 0 && (
          <div className="hospitals-pagination-footer">
            <span className="pagination-info">
              Showing <strong>{hospitals.length}</strong> of <strong>{totalCount}</strong> verified hospitals
            </span>

            <div className="pagination-controls">
              <button
                className="pag-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="pag-page">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pag-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* MODAL: VIEW HOSPITAL DETAILS */}
      {/* ============================================================ */}
      {showDetailsModal && selectedHospital && (
        <div className="hosp-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="hosp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Building2 size={20} className="modal-icon" />
                <div>
                  <h2>{selectedHospital.name}</h2>
                  <span className="modal-sub">{selectedHospital.facility_type}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid-2">
                <div className="detail-card">
                  <h4><MapPin size={16} /> Location & Address</h4>
                  <p><strong>Address:</strong> {selectedHospital.address}</p>
                  <p><strong>City / State:</strong> {selectedHospital.city}, {selectedHospital.state}</p>
                  <p><strong>Country:</strong> {selectedHospital.country}</p>
                  {selectedHospital.distanceKm !== undefined && (
                    <p><strong>Calculated Distance:</strong> {selectedHospital.distanceKm} km away</p>
                  )}
                </div>

                <div className="detail-card">
                  <h4><Phone size={16} /> Contact & Hotline</h4>
                  <p><strong>Phone:</strong> {selectedHospital.phone}</p>
                  <p><strong>Emergency 24/7:</strong> {selectedHospital.emergency ? "Available" : "Standard Hours"}</p>
                  <p><strong>Rating:</strong> {selectedHospital.rating} / 5.0 (Verified Clinical Review)</p>
                </div>
              </div>

              {selectedHospital.specialties && selectedHospital.specialties.length > 0 && (
                <div className="detail-card-full">
                  <h4><ShieldCheck size={16} /> Key Medical Specialties</h4>
                  <div className="specialties-tags-wrap">
                    {selectedHospital.specialties.map((spec, idx) => (
                      <span key={idx} className="spec-tag">{spec}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <a
                href={`tel:${(selectedHospital.phone || "").replace(/[^+\d]/g, "")}`}
                className="btn-modal-call"
              >
                <Phone size={15} /> Call Hospital
              </a>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedHospital.lat},${selectedHospital.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-modal-directions"
              >
                <Navigation size={15} /> Open Navigation Directions
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
