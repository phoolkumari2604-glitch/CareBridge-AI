import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Navigation,
  Search,
  Cross,
  Phone,
  Clock,
  Star,
  ExternalLink,
  Ticket,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Filter,
  Layers,
  X,
  Building,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { useHospitals } from "../../hooks/useHospitals";
import { formatDistance, geocodeNominatim } from "../../utils/geo";
import "./HospitalMap.css";

// Fix Leaflet's default icon path in Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom Teal Marker Icon for standard facilities
const createTealMarkerIcon = (isSelected = false) =>
  L.divIcon({
    className: `cb-custom-marker teal ${isSelected ? "selected" : ""}`,
    html: `
      <div class="marker-pin-wrap">
        <div class="marker-pin teal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6v12M6 12h12"/>
          </svg>
        </div>
        <div class="marker-shadow"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
  });

// Custom Red Marker Icon for 24/7 Emergency facilities
const createRedMarkerIcon = (isSelected = false) =>
  L.divIcon({
    className: `cb-custom-marker red ${isSelected ? "selected" : ""}`,
    html: `
      <div class="marker-pin-wrap">
        <div class="marker-pin red">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <div class="marker-shadow"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
  });

// Patient Location Pulsing Blue Marker Icon
const createPatientMarkerIcon = () =>
  L.divIcon({
    className: "cb-patient-marker",
    html: `
      <div class="patient-pulse-wrap">
        <div class="pulse-ring"></div>
        <div class="patient-core-dot"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

export default function HospitalMap() {
  const navigate = useNavigate();

  // Default coordinates: Hyderabad, Telangana
  const DEFAULT_COORDS = { lat: 17.385, lng: 78.4867, label: "Hyderabad, Telangana" };

  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [isLocating, setIsLocating] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [manualCityQuery, setManualCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [hoveredHospitalId, setHoveredHospitalId] = useState(null);

  // Filter States
  const [filters, setFilters] = useState({
    search: "",
    radius: 10,
    type: "all",
    specialty: "all",
    emergencyOnly: false,
    openNow: false,
    sortBy: "nearest",
  });

  // Query Hospitals via custom hook
  const { hospitals, loading, error, isFallback, refetch } = useHospitals(filters, userLocation);

  // Map DOM & Leaflet Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const patientMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const markerMapRef = useRef(new Map());

  // 1. Geolocation: "Use my location"
  const handleUseMyLocation = () => {
    setIsLocating(true);
    setLocationPermissionDenied(false);

    if (!navigator.geolocation) {
      setLocationPermissionDenied(true);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLoc = {
          lat: latitude,
          lng: longitude,
          label: `GPS (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`,
        };
        setUserLocation(newLoc);
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });
        }
      },
      (err) => {
        console.warn("Geolocation permission error:", err);
        setLocationPermissionDenied(true);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // 2. Nominatim Search for Area/City Fallback
  const handleSearchManualCity = async (e) => {
    e.preventDefault();
    if (!manualCityQuery.trim()) return;

    try {
      const results = await geocodeNominatim(manualCityQuery);
      if (results && results.length > 0) {
        const best = results[0];
        const newLoc = {
          lat: best.lat,
          lng: best.lng,
          label: best.name.split(",")[0] || manualCityQuery,
        };
        setUserLocation(newLoc);
        setCitySuggestions([]);
        setManualCityQuery("");
        setLocationPermissionDenied(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([best.lat, best.lng], 13, { duration: 1.2 });
        }
      }
    } catch (err) {
      console.warn("Manual city search failed:", err);
    }
  };

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersGroupRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Invalidate size to guarantee tiles render properly
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 4. Update Patient Location Marker & Radius Circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing patient marker & circle
    if (patientMarkerRef.current) {
      patientMarkerRef.current.remove();
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }

    // Add pulsing patient marker
    const pMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: createPatientMarkerIcon(),
      zIndexOffset: 1000,
    }).addTo(map);

    pMarker.bindPopup(`
      <div class="cb-patient-popup">
        <strong>Your Current Location</strong>
        <span>${userLocation.label}</span>
      </div>
    `);

    patientMarkerRef.current = pMarker;

    // Add Proximity Radius Circle
    const radiusMeters = filters.radius * 1000;
    const circle = L.circle([userLocation.lat, userLocation.lng], {
      radius: radiusMeters,
      color: "#0d9488",
      weight: 1.5,
      opacity: 0.6,
      fillColor: "#14b8a6",
      fillOpacity: 0.08,
      dashArray: "4, 6",
    }).addTo(map);

    radiusCircleRef.current = circle;
  }, [userLocation, filters.radius]);

  // 5. Update Hospital Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;

    group.clearLayers();
    markerMapRef.current.clear();

    const bounds = L.latLngBounds();
    bounds.extend([userLocation.lat, userLocation.lng]);

    hospitals.forEach((h) => {
      if (!h.lat || !h.lng) return;

      const isEmergency = h.emergency;
      const isSelected = selectedHospitalId === h.id;
      const icon = isEmergency ? createRedMarkerIcon(isSelected) : createTealMarkerIcon(isSelected);

      const marker = L.marker([h.lat, h.lng], { icon });

      const popupContent = `
        <div class="cb-map-popup-card">
          <div class="popup-header">
            <span class="popup-type-badge ${isEmergency ? "red" : "teal"}">
              ${isEmergency ? "24/7 EMERGENCY" : h.type || "HOSPITAL"}
            </span>
            <span class="popup-rating">★ ${h.rating ? h.rating.toFixed(1) : "4.8"}</span>
          </div>
          <h4 class="popup-name">${h.name}</h4>
          <p class="popup-address">${h.address || "Local Healthcare Center"}</p>
          <div class="popup-distance">
            📍 <strong>${formatDistance(h.distanceKm)}</strong> from your location
          </div>
          <div class="popup-specialties">
            ${(h.specialties || ["General Medicine"]).slice(0, 3).map((s) => `<span class="popup-spec-tag">${s}</span>`).join("")}
          </div>
          <div class="popup-actions">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-directions">
              Get Directions
            </a>
            <a href="tel:${h.phone || "+9118002004567"}" class="popup-btn popup-btn-call">
              Call
            </a>
            <button id="book-opd-${h.id}" class="popup-btn popup-btn-book">
              Book OPD Pass
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300, minWidth: 260 });

      marker.on("popupopen", () => {
        setSelectedHospitalId(h.id);
        const bookBtn = document.getElementById(`book-opd-${h.id}`);
        if (bookBtn) {
          bookBtn.onclick = () => {
            navigate(`/patient/opd-pass?hospitalId=${encodeURIComponent(h.id)}&hospitalName=${encodeURIComponent(h.name)}`);
          };
        }
      });

      marker.addTo(group);
      markerMapRef.current.set(h.id, marker);
      bounds.extend([h.lat, h.lng]);
    });

    // Auto-fit bounds if results exist
    if (hospitals.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [hospitals, selectedHospitalId, userLocation, navigate]);

  // 6. Handle Card Click: Fly map to hospital
  const handleSelectHospital = (h) => {
    setSelectedHospitalId(h.id);
    if (mapInstanceRef.current && h.lat && h.lng) {
      mapInstanceRef.current.flyTo([h.lat, h.lng], 15, { duration: 1.2 });
      const marker = markerMapRef.current.get(h.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleBookOpd = (h) => {
    navigate(
      `/patient/opd-pass?hospitalId=${encodeURIComponent(h.id || h._id)}&hospitalName=${encodeURIComponent(h.name)}`
    );
  };

  const specialtyOptions = [
    "all",
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Trauma & Emergency",
    "Pediatrics",
    "Oncology",
    "General Medicine",
    "Pulmonology",
  ];

  return (
    <section className="cb-hosp-section" aria-label="Find Hospitals & Clinical Facilities">
      {/* SECTION HEADER & PROXIMITY CONTROLS */}
      <div className="cb-hosp-header">
        <div className="cb-hosp-title-group">
          <div className="cb-hosp-kicker">
            <Building size={14} />
            <span>GEO-CLINICAL RADAR</span>
          </div>
          <h2>Find Hospitals & Emergency Centers</h2>
          <p>Locate verified network facilities, 24/7 trauma centers, and book OPD passes.</p>
        </div>

        <div className="cb-hosp-loc-actions">
          <button
            type="button"
            className={`cb-locate-btn ${isLocating ? "locating" : ""}`}
            onClick={handleUseMyLocation}
            disabled={isLocating}
            aria-label="Use my current GPS location"
          >
            <Navigation size={16} className={isLocating ? "spin-icon" : ""} />
            <span>{isLocating ? "Detecting GPS..." : "Use my location"}</span>
          </button>
        </div>
      </div>

      {/* LOCATION PERMISSION DENIED OR MANUAL SEARCH BANNER */}
      {locationPermissionDenied && (
        <div className="cb-loc-alert" role="alert">
          <AlertCircle size={18} className="cb-loc-alert-icon" />
          <div className="cb-loc-alert-body">
            <strong>Location access is disabled or unavailable.</strong>
            <span>You can search by city or area name to find nearby hospitals:</span>
            <form onSubmit={handleSearchManualCity} className="cb-city-search-form">
              <input
                type="text"
                placeholder="Enter city (e.g. Hyderabad, Delhi, Bangalore, Mumbai)"
                value={manualCityQuery}
                onChange={(e) => setManualCityQuery(e.target.value)}
                className="cb-city-input"
              />
              <button type="submit" className="cb-city-submit-btn">
                Set Location
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="cb-filter-panel">
        <div className="cb-filter-search-wrap">
          <Search size={18} className="cb-search-icon" />
          <input
            type="text"
            placeholder="Search by hospital name or clinical specialty..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="cb-filter-search-input"
          />
          {filters.search && (
            <button
              type="button"
              className="cb-clear-btn"
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="cb-filter-controls-row">
          {/* Radius Selector */}
          <div className="cb-filter-item">
            <label htmlFor="filter-radius">Radius:</label>
            <select
              id="filter-radius"
              value={filters.radius}
              onChange={(e) => setFilters((prev) => ({ ...prev, radius: Number(e.target.value) }))}
            >
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
            </select>
          </div>

          {/* Facility Type */}
          <div className="cb-filter-item">
            <label htmlFor="filter-type">Type:</label>
            <select
              id="filter-type"
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="Public">Public / Govt</option>
              <option value="Private">Private</option>
              <option value="Trust">Trust / Non-Profit</option>
            </select>
          </div>

          {/* Specialty Dropdown */}
          <div className="cb-filter-item">
            <label htmlFor="filter-spec">Specialty:</label>
            <select
              id="filter-spec"
              value={filters.specialty}
              onChange={(e) => setFilters((prev) => ({ ...prev, specialty: e.target.value }))}
            >
              {specialtyOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Specialties" : s}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="cb-filter-item">
            <label htmlFor="filter-sort">Sort by:</label>
            <select
              id="filter-sort"
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="nearest">Nearest</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="cb-toggle-group">
            <button
              type="button"
              className={`cb-chip-toggle ${filters.emergencyOnly ? "active-red" : ""}`}
              onClick={() => setFilters((prev) => ({ ...prev, emergencyOnly: !prev.emergencyOnly }))}
              aria-pressed={filters.emergencyOnly}
            >
              <span className="dot red"></span>
              <span>Emergency 24x7</span>
            </button>

            <button
              type="button"
              className={`cb-chip-toggle ${filters.openNow ? "active-teal" : ""}`}
              onClick={() => setFilters((prev) => ({ ...prev, openNow: !prev.openNow }))}
              aria-pressed={filters.openNow}
            >
              <span className="dot green"></span>
              <span>Open Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTAINER: LIST ON LEFT, MAP ON RIGHT */}
      <div className="cb-hosp-workspace">
        {/* ================= LEFT LIST COLUMN ================= */}
        <div className="cb-hosp-list-col">
          <div className="cb-list-meta-bar">
            <span>
              Showing <strong>{hospitals.length}</strong> facilities near{" "}
              <strong>{userLocation.label}</strong> ({filters.radius} km radius)
            </span>
            {isFallback && (
              <span className="cb-fallback-badge" title="Live data provided via OpenStreetMap Overpass API">
                OSM Feed Active
              </span>
            )}
          </div>

          {loading ? (
            <div className="cb-skeleton-list">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="cb-hosp-skeleton-card">
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line sub"></div>
                  <div className="skeleton-line pills"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="cb-error-state" role="alert">
              <AlertCircle size={28} className="cb-err-icon" />
              <p>{error}</p>
              <button type="button" onClick={() => refetch()} className="cb-retry-btn">
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="cb-empty-state">
              <Building size={36} className="cb-empty-icon" />
              <h4>No hospitals found within {filters.radius} km</h4>
              <p>Try increasing your search radius or changing your specialty filter.</p>
              <button
                type="button"
                className="cb-increase-radius-btn"
                onClick={() => setFilters((prev) => ({ ...prev, radius: 25, search: "", specialty: "all" }))}
              >
                Expand Radius to 25 km
              </button>
            </div>
          ) : (
            <div className="cb-cards-scroll">
              {hospitals.map((h) => {
                const isSelected = selectedHospitalId === h.id;
                const isHovered = hoveredHospitalId === h.id;

                return (
                  <div
                    key={h.id}
                    tabIndex={0}
                    role="button"
                    className={`cb-hosp-card ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
                    onClick={() => handleSelectHospital(h)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectHospital(h);
                      }
                    }}
                    onMouseEnter={() => setHoveredHospitalId(h.id)}
                    onMouseLeave={() => setHoveredHospitalId(null)}
                    aria-label={`Hospital: ${h.name}, ${formatDistance(h.distanceKm)}`}
                  >
                    <div className="cb-card-header">
                      <div className="cb-card-type-row">
                        <span className={`cb-badge-type ${h.emergency ? "emergency" : "standard"}`}>
                          {h.emergency ? "24/7 EMERGENCY" : h.type || "HOSPITAL"}
                        </span>
                        <div className="cb-card-rating">
                          <Star size={13} className="star-icon" />
                          <span>{h.rating ? h.rating.toFixed(1) : "4.8"}</span>
                        </div>
                      </div>

                      <h3 className="cb-card-name">{h.name}</h3>
                      <p className="cb-card-address">{h.address}</p>
                    </div>

                    <div className="cb-card-info-row">
                      <span className="cb-card-distance">
                        <MapPin size={14} className="pin-icon" />
                        <strong>{formatDistance(h.distanceKm)}</strong>
                      </span>
                      {h.phone && (
                        <span className="cb-card-phone">
                          <Phone size={14} />
                          {h.phone}
                        </span>
                      )}
                    </div>

                    {/* Specialties Tags */}
                    <div className="cb-card-specialties">
                      {(h.specialties || ["General Medicine"]).slice(0, 3).map((spec, i) => (
                        <span key={i} className="cb-spec-chip">
                          {spec}
                        </span>
                      ))}
                      {(h.specialties || []).length > 3 && (
                        <span className="cb-spec-more">+{h.specialties.length - 3}</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="cb-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="cb-action-btn primary"
                        onClick={() => handleBookOpd(h)}
                      >
                        <Ticket size={14} />
                        <span>Book OPD Pass</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cb-action-btn outline"
                        aria-label={`Directions to ${h.name}`}
                      >
                        <ExternalLink size={14} />
                        <span>Directions</span>
                      </a>

                      <a
                        href={`tel:${h.phone || "+9118002004567"}`}
                        className="cb-action-btn outline icon-only"
                        aria-label={`Call ${h.name}`}
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= RIGHT MAP COLUMN ================= */}
        <div className="cb-hosp-map-col">
          <div
            ref={mapContainerRef}
            className="cb-leaflet-map-container"
            aria-label="Interactive Leaflet Map showing hospital locations"
          />

          {/* Map Legend Overlay */}
          <div className="cb-map-legend">
            <div className="legend-item">
              <span className="legend-icon patient"></span>
              <span>Your Location</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon red"></span>
              <span>24/7 Emergency</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon teal"></span>
              <span>General Hospital</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
