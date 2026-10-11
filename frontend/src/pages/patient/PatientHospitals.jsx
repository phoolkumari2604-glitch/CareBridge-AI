import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Star,
  Activity,
  Bed,
  ShieldAlert,
  SlidersHorizontal,
  Navigation,
  Compass,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  Layers,
  HeartPulse
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./patientHospitals.css";

// Fallback user location: Hyderabad
const DEFAULT_COORDS = [17.3850, 78.4867];

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Search text highlight helper
function HighlightText({ text, query }) {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${q})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="ph-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

const PatientHospitals = () => {
  // Location states
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [usingLiveGps, setUsingLiveGps] = useState(false);
  const [locationName, setLocationName] = useState("Hyderabad, India");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(20);
  const [selectedType, setSelectedType] = useState("ALL");
  const [sortBy, setSortBy] = useState("nearest");

  // Data states
  const [hospitals, setHospitals] = useState([]);
  const [bedMap, setBedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastBedsUpdated, setLastBedsUpdated] = useState(new Date());
  const [highlightedHospitalId, setHighlightedHospitalId] = useState(null);

  // Map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // 1. Debounce search query 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Fetch live user GPS location
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setUsingLiveGps(true);
        setLocationName("Your Current GPS Location");
      },
      (err) => {
        console.warn("GPS error, defaulting to Hyderabad:", err);
        setUserLocation(DEFAULT_COORDS);
        setUsingLiveGps(false);
        setLocationName("Hyderabad (Default)");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // Fetch all hospitals from API
  const fetchHospitals = async () => {
    try {
      const res = await fetch("/api/hospitals?limit=100");
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data.facilities || data.data || [];
        setHospitals(rawList);
      }
    } catch (err) {
      console.error("Error fetching hospitals:", err);
    }
  };

  // Fetch bed capacities from db.hospital_beds
  const fetchBedData = async () => {
    try {
      const res = await fetch("/api/hospitals/beds");
      if (res.ok) {
        const data = await res.json();
        setBedMap(data.beds || {});
        setLastBedsUpdated(new Date());
      }
    } catch (err) {
      console.error("Error fetching beds:", err);
    }
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchHospitals(), fetchBedData()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // 30s bed data auto-polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBedData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort hospitals
  const filteredHospitals = useMemo(() => {
    const [uLat, uLng] = userLocation;
    return hospitals
      .map((h) => {
        const lat = h.location?.coordinates?.[1] || h.lat || h.latitude;
        const lng = h.location?.coordinates?.[0] || h.lng || h.longitude;
        const dist = calculateDistance(uLat, uLng, lat, lng);
        const bedData = bedMap[h._id || h.id] || null;
        return {
          ...h,
          computedDist: dist !== null ? dist : 9999,
          bedData,
          coords: lat && lng ? [lat, lng] : null
        };
      })
      .filter((h) => {
        // Radius filter
        if (radiusKm && h.computedDist > radiusKm) return false;

        // Type filter
        if (selectedType !== "ALL") {
          const fType = (h.facility_type || h.type || "").toUpperCase();
          if (!fType.includes(selectedType)) return false;
        }

        // Search query
        if (debouncedQuery) {
          const q = debouncedQuery.toLowerCase();
          const name = (h.name || "").toLowerCase();
          const city = (h.city || "").toLowerCase();
          const addr = (h.address || "").toLowerCase();
          const specs = Array.isArray(h.specialties)
            ? h.specialties.join(" ").toLowerCase()
            : "";
          if (
            !name.includes(q) &&
            !city.includes(q) &&
            !addr.includes(q) &&
            !specs.includes(q)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "nearest") return a.computedDist - b.computedDist;
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "beds") {
          const aAvail = a.bedData ? a.bedData.available_beds : a.available_beds || 0;
          const bAvail = b.bedData ? b.bedData.available_beds : b.available_beds || 0;
          return bAvail - aAvail;
        }
        return 0;
      });
  }, [hospitals, bedMap, userLocation, radiusKm, selectedType, debouncedQuery, sortBy]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: userLocation,
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    map.invalidateSize();

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // User marker
    const userIcon = L.divIcon({
      className: "ph-user-dot",
      html: `<div style="width: 16px; height: 16px; background: #0284c7; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(2,132,199,0.8);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const userMarker = L.marker(userLocation, { icon: userIcon })
      .bindPopup(`<b>Your Location</b><br/>${locationName}`)
      .addTo(map);
    markersRef.current["user"] = userMarker;

    // Hospital markers
    const bounds = L.latLngBounds([userLocation]);
    let hasHospitalCoords = false;

    filteredHospitals.forEach((h) => {
      if (h.coords) {
        bounds.extend(h.coords);
        hasHospitalCoords = true;

        const isHighlighted = highlightedHospitalId === (h._id || h.id);
        const markerIcon = L.divIcon({
          className: "ph-hospital-marker",
          html: `
            <div style="
              width: ${isHighlighted ? "34px" : "28px"};
              height: ${isHighlighted ? "34px" : "28px"};
              background: ${isHighlighted ? "#0284c7" : "#ef4444"};
              border: 2px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
              transition: transform 0.2s;
            ">
              🏥
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker(h.coords, { icon: markerIcon }).addTo(map);
        marker.on("click", () => {
          setHighlightedHospitalId(h._id || h.id);
        });

        const bedInfo = h.bedData
          ? `Beds: ${h.bedData.available_beds} Free / ${h.bedData.total_beds}`
          : "Bed info not reported";

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; min-width: 160px;">
            <b style="color: #0f172a;">${h.name}</b><br/>
            <span style="color: #64748b;">${h.address || h.city || ""}</span><br/>
            <span style="color: #0284c7; font-weight: 600;">${bedInfo}</span><br/>
            <span style="color: #475569; font-size: 11px;">📍 ${h.computedDist} km away</span>
          </div>
        `);

        markersRef.current[h._id || h.id] = marker;
      }
    });

    if (hasHospitalCoords) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      map.setView(userLocation, 12);
    }
  }, [filteredHospitals, userLocation, highlightedHospitalId, locationName]);

  // Card click zooms map
  const handleCardClick = (hospital) => {
    setHighlightedHospitalId(hospital._id || hospital.id);
    if (hospital.coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(hospital.coords, 14, { duration: 1 });
      const m = markersRef.current[hospital._id || hospital.id];
      if (m) m.openPopup();
    }
  };

  return (
    <div className="patient-hospitals-page">
      {/* Header */}
      <div className="ph-header">
        <div className="ph-title-row">
          <div className="ph-title-group">
            <h1>
              <Building2 className="text-primary" size={30} />
              Hospital Directory & Live Bed Availability
            </h1>
            <p className="ph-subtitle">
              Locate authorized medical facilities, inspect real bed capacities, and navigate instantaneously.
            </p>
          </div>

          <div className="ph-header-actions">
            <button
              className={`ph-gps-btn ${usingLiveGps ? "active" : ""}`}
              onClick={handleGetLocation}
              title="Use GPS Coordinates"
            >
              <Navigation size={15} />
              {usingLiveGps ? "Using Live GPS" : "Use My Location"}
            </button>

            <div className="ph-polling-pill" title="Live database synchronization every 30 seconds">
              <span className="ph-polling-dot"></span>
              Auto-sync 30s
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="ph-controls-panel">
        <div className="ph-search-row">
          <div className="ph-search-input-wrap">
            <Search className="ph-search-icon" size={17} />
            <input
              type="text"
              className="ph-search-input"
              placeholder="Search by hospital name, city, address or medical specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="ph-clear-btn" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="ph-radius-filter-wrap">
            <div className="ph-radius-input-box">
              <span>Radius:</span>
              <input
                type="number"
                min="1"
                max="5000"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(1, Number(e.target.value) || 1))}
                className="ph-radius-number-input"
              />
              <span className="ph-radius-unit">km</span>
            </div>

            <div className="ph-chips-row">
              {[2, 5, 10, 20, 50].map((r) => (
                <button
                  key={r}
                  className={`ph-chip-btn ${radiusKm === r ? "active" : ""}`}
                  onClick={() => setRadiusKm(r)}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ph-secondary-filters">
          <div className="ph-type-chips">
            {["ALL", "PUBLIC", "PRIVATE", "TRUST"].map((type) => (
              <button
                key={type}
                className={`ph-type-chip ${selectedType === type ? "active" : ""}`}
                onClick={() => setSelectedType(type)}
              >
                {type === "ALL" ? "All Facilities" : `${type.charAt(0) + type.slice(1).toLowerCase()} Hospitals`}
              </button>
            ))}
          </div>

          <div className="ph-sort-wrap">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="ph-sort-select"
            >
              <option value="nearest">Distance (Nearest)</option>
              <option value="rating">Top Rated</option>
              <option value="beds">Most Beds Available</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Cards + Map */}
      <div className="ph-main-layout">
        {/* Left: Facilities Cards */}
        <div className="ph-cards-container">
          <div className="ph-results-count">
            Showing {filteredHospitals.length} {filteredHospitals.length === 1 ? "hospital" : "hospitals"} within {radiusKm} km of {locationName}
          </div>

          {filteredHospitals.length === 0 ? (
            <div className="ph-empty-state">
              <Building2 size={40} color="#94a3b8" />
              <p>No hospitals found within {radiusKm} km matching your search.</p>
              <button className="ph-chip-btn active" onClick={() => { setRadiusKm(50); setSearchQuery(""); setSelectedType("ALL"); }}>
                Expand Radius to 50 km & Reset Filters
              </button>
            </div>
          ) : (
            <div className="ph-cards-grid">
              {filteredHospitals.map((h) => {
                const hId = h._id || h.id;
                const isSelected = highlightedHospitalId === hId;
                const b = h.bedData;
                const totalBeds = b ? b.total_beds : h.total_beds || 0;
                const availBeds = b ? b.available_beds : h.available_beds || 0;
                const icuAvail = b ? b.icu_available : h.icu_beds_available || 0;
                const ventAvail = b ? b.ventilators_available : h.ventilators_available || 0;

                const occPct = totalBeds > 0 ? Math.round(((totalBeds - availBeds) / totalBeds) * 100) : 0;
                let occColorClass = "green";
                if (occPct >= 85) occColorClass = "red";
                else if (occPct >= 70) occColorClass = "amber";

                const specialties = Array.isArray(h.specialties) ? h.specialties : [];
                const firstSpecs = specialties.slice(0, 3);
                const extraSpecs = specialties.length - 3;

                return (
                  <div
                    key={hId}
                    className={`ph-card ${isSelected ? "highlighted" : ""}`}
                    onClick={() => handleCardClick(h)}
                  >
                    <div className="ph-card-top">
                      <div>
                        <h2 className="ph-card-name">
                          <HighlightText text={h.name} query={debouncedQuery} />
                        </h2>
                        <div className="ph-badges-row">
                          <span className="ph-type-badge">{h.facility_type || h.type || "Hospital"}</span>
                          {(h.emergency_available || h.is_24_7 || h.emergency) && (
                            <span className="ph-emergency-badge">
                              <ShieldAlert size={11} /> 24/7 ER
                            </span>
                          )}
                          {h.rating && (
                            <span style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "2px", color: "#eab308", fontWeight: 700 }}>
                              <Star size={11} fill="#eab308" /> {h.rating}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ph-card-dist-pill">
                        <Compass size={12} />
                        {h.computedDist < 999 ? `${h.computedDist} km` : "N/A"}
                      </div>
                    </div>

                    <p className="ph-card-address" title={h.address || h.city}>
                      <MapPin size={13} style={{ flexShrink: 0 }} />
                      <HighlightText text={h.address || h.city || "Address not provided"} query={debouncedQuery} />
                    </p>

                    {/* Specialties chips */}
                    {specialties.length > 0 && (
                      <div className="ph-card-specs">
                        {firstSpecs.map((s, idx) => (
                          <span key={idx} className="ph-spec-chip">
                            <HighlightText text={s} query={debouncedQuery} />
                          </span>
                        ))}
                        {extraSpecs > 0 && (
                          <span className="ph-spec-more">+{extraSpecs} more</span>
                        )}
                      </div>
                    )}

                    {/* Real Bed Statistics Row */}
                    <div className="ph-beds-section">
                      <div className="ph-beds-header">
                        <span className="ph-beds-header-title">
                          <Bed size={13} /> Bed Capacity Status
                        </span>
                        {b && (
                          <span>
                            Updated {b.updated_at ? new Date(b.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
                          </span>
                        )}
                      </div>

                      {b || totalBeds > 0 ? (
                        <>
                          <div className="ph-beds-tiles">
                            <div className="ph-bed-tile">
                              <div className="ph-bed-tile-num">{totalBeds}</div>
                              <div className="ph-bed-tile-label">Total</div>
                            </div>
                            <div className="ph-bed-tile available">
                              <div className="ph-bed-tile-num">{availBeds}</div>
                              <div className="ph-bed-tile-label">Available</div>
                            </div>
                            <div className="ph-bed-tile icu">
                              <div className="ph-bed-tile-num">{icuAvail}</div>
                              <div className="ph-bed-tile-label">ICU Free</div>
                            </div>
                            <div className="ph-bed-tile vent">
                              <div className="ph-bed-tile-num">{ventAvail}</div>
                              <div className="ph-bed-tile-label">Ventilators</div>
                            </div>
                          </div>

                          <div className="ph-occupancy-wrap">
                            <div className="ph-occupancy-label-row">
                              <span>Occupancy Rate</span>
                              <span style={{ fontWeight: 600 }}>{occPct}%</span>
                            </div>
                            <div className="ph-progress-track">
                              <div
                                className={`ph-progress-fill ${occColorClass}`}
                                style={{ width: `${Math.min(100, occPct)}%` }}
                              ></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="ph-no-bed-data">
                          Bed capacity data not reported for this facility
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="ph-card-actions" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/patient/opd-pass?hospital_id=${hId}`}
                        className="ph-btn-primary"
                      >
                        Book OPD Pass
                        <ChevronRight size={14} />
                      </Link>

                      {h.coords && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${h.coords[0]},${h.coords[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ph-btn-secondary"
                          title="Get driving directions in Google Maps"
                        >
                          <Navigation size={13} />
                          Directions
                        </a>
                      )}

                      {h.phone && (
                        <a
                          href={`tel:${h.phone}`}
                          className="ph-btn-secondary"
                          title={`Call ${h.phone}`}
                        >
                          <Phone size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Leaflet Interactive Map */}
        <div className="ph-map-side">
          <div className="ph-map-card">
            <div ref={mapContainerRef} className="ph-map-container" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHospitals;
