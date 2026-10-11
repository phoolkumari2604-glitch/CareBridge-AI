import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Cross,
  Shield,
  Truck,
  Phone,
  Navigation,
  Compass,
  Search,
  AlertCircle,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  Siren,
  Building2,
  CheckCircle2,
  X,
  RefreshCw,
  Ticket,
  AlertTriangle,
  LocateFixed,
} from "lucide-react";
import useNearbyPlaces, { HYDERABAD_COORDS } from "./useNearbyPlaces";
import "./geoRadar.css";

// Helper function to create custom Leaflet divIcons
function createCustomMarkerIcon(type) {
  let bgColor = "#ef4444";
  let symbol = "🏥";

  if (type === "police") {
    bgColor = "#2563eb";
    symbol = "🚓";
  } else if (type === "ambulance") {
    bgColor = "#f97316";
    symbol = "🚑";
  }

  const html = `
    <div style="
      background: ${bgColor};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      border: 2px solid #ffffff;
      cursor: pointer;
    ">
      <span style="transform: rotate(45deg); font-size: 15px; line-height: 1;">${symbol}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-marker-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

const userLocationIcon = L.divIcon({
  html: `
    <div style="
      width: 18px;
      height: 18px;
      background: #0284c7;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 12px #0284c7;
    "></div>
  `,
  className: "user-gps-dot",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function GeoRadar() {
  const {
    userLocation,
    isLiveLocation,
    locationDenied,
    locating,
    detectLiveLocation,
    radius,
    setRadius,
    category,
    setCategory,
    emergencyOnly,
    setEmergencyOnly,
    sortBy,
    setSortBy,
    places,
    loading,
    error,
    refresh,
  } = useNearbyPlaces({ initialRadius: 10 });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [travelTime, setTravelTime] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Map DOM & Leaflet references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // 300ms debounce on search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Filter & sort logic for places
  const filteredPlaces = useMemo(() => {
    return places
      .filter((place) => {
        // Category filter
        if (category !== "all" && place.type !== category) {
          return false;
        }
        // Emergency 24/7 filter
        if (emergencyOnly && !place.emergency) {
          return false;
        }
        // Debounced text search
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase().trim();
          const matchName = place.name.toLowerCase().includes(q);
          const matchAddress = place.address.toLowerCase().includes(q);
          const matchSpec = (place.specialties || []).some((s) => s.toLowerCase().includes(q));
          if (!matchName && !matchAddress && !matchSpec) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "nearest") {
          return a.distance - b.distance;
        }
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [places, category, emergencyOnly, debouncedSearch, sortBy]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);

      // User location marker
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userLocationIcon,
      })
        .addTo(map)
        .bindPopup("<strong>Your Location</strong>");

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center & user marker when userLocation changes
  useEffect(() => {
    if (mapInstanceRef.current && userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation]);

  // Fetch travel time and route line via OSRM
  const handleSelectPlace = async (place) => {
    setSelectedPlace(place);
    if (!mapInstanceRef.current) return;

    try {
      setRoutingLoading(true);
      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
      }

      // OSRM Public Routing API: format: {lng},{lat};{lng},{lat}
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${place.lng},${place.lat}?overview=full&geometries=geojson`;

      const res = await fetch(osrmUrl);
      if (res.ok) {
        const data = await res.json();
        const route = data.routes?.[0];
        if (route) {
          const durationMins = Math.round(route.duration / 60);
          const distanceKm = (route.distance / 1000).toFixed(1);
          setTravelTime({
            durationMins,
            distanceKm,
          });

          // Draw polyline on Leaflet map
          const coordinates = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
          const polyline = L.polyline(coordinates, {
            color: "#0284c7",
            weight: 5,
            opacity: 0.85,
            dashArray: "1, 8",
            lineJoin: "round",
          });

          if (routeLayerRef.current) {
            polyline.addTo(routeLayerRef.current);
          }

          // Fit map bounds to show complete route
          mapInstanceRef.current.fitBounds(polyline.getBounds(), {
            padding: [50, 50],
          });
        }
      }
    } catch (e) {
      console.warn("Could not retrieve OSRM driving route:", e);
    } finally {
      setRoutingLoading(false);
    }
  };

  // Render markers onto Leaflet map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    filteredPlaces.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: createCustomMarkerIcon(place.type),
      });

      const popupContent = `
        <div class="popup-inner">
          <h4>${place.name}</h4>
          <p>${place.address}</p>
          <div class="popup-metrics-row">
            <span>Distance: <strong>${place.distance} km</strong></span>
            <span>Emergency: <strong>${place.emergency ? "24/7" : "Daytime"}</strong></span>
          </div>
          <div class="popup-actions-row">
            <a href="https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${place.lat},${place.lng}" target="_blank" rel="noopener noreferrer" class="popup-btn primary">
              Directions
            </a>
            <a href="tel:${place.phone}" class="popup-btn secondary">
              Call ${place.phone}
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: "custom-leaflet-popup" });

      marker.on("click", () => {
        handleSelectPlace(place);
      });

      marker.addTo(markersLayer);
    });
  }, [filteredPlaces, userLocation]);

  const clearActiveRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setTravelTime(null);
    setSelectedPlace(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  };

  return (
    <section className="geo-radar-section" aria-label="Geo-Clinical Radar">
      {/* HEADER */}
      <div className="geo-radar-header">
        <div>
          <span className="radar-kicker">GEO-CLINICAL RADAR</span>
          <h2>Find Hospitals & Emergency Centers</h2>
          <p className="radar-subtitle">
            Live OpenStreetMap facilities, real-time driving routes, and integrated hospital admission triage.
          </p>
        </div>

        <div className="radar-actions-top">
          <button
            type="button"
            className="btn-locate-me"
            onClick={detectLiveLocation}
            disabled={locating}
            title="Detect GPS location"
          >
            <LocateFixed size={16} />
            <span>{locating ? "Detecting GPS..." : isLiveLocation ? "GPS Active" : "Use My Location"}</span>
          </button>

          <button
            type="button"
            className="radar-refresh-btn"
            onClick={refresh}
            title="Refresh radar dataset"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* LOCATION NOTICE */}
      {locationDenied && (
        <div className="radar-notice-banner" role="alert">
          <AlertCircle size={18} />
          <span>
            Location access was denied or timed out. Defaulting to <strong>Hyderabad, Telangana</strong> coordinates. Click "Use My Location" anytime to retry.
          </span>
        </div>
      )}

      {/* ERROR NOTICE */}
      {error && (
        <div className="radar-notice-banner error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="btn-retry-radar" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* SEARCH & FILTERS CONTROLS */}
      <div className="radar-controls-grid">
        <div className="radar-search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            placeholder="Filter facilities by name, specialty (e.g. Cardiology, Police)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-icon-btn"
              onClick={() => setSearchQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="radar-filters-subrow">
          <select
            className="radar-select-field"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Scan Radius"
          >
            <option value={2}>Radius: 2 km</option>
            <option value={5}>Radius: 5 km</option>
            <option value={10}>Radius: 10 km</option>
            <option value={20}>Radius: 20 km</option>
            <option value={50}>Radius: 50 km</option>
          </select>

          <select
            className="radar-select-field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort By"
          >
            <option value="nearest">Sort: Nearest First</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>

          <button
            type="button"
            className={`radar-emergency-toggle ${emergencyOnly ? "active" : ""}`}
            onClick={() => setEmergencyOnly(!emergencyOnly)}
          >
            <Siren size={15} />
            <span>24/7 Emergency</span>
          </button>
        </div>
      </div>

      {/* CATEGORY CHIPS */}
      <div className="radar-chips-bar" role="tablist">
        <button
          type="button"
          className={`radar-chip ${category === "all" ? "active" : ""}`}
          onClick={() => setCategory("all")}
        >
          <span>All Facilities</span>
          <span className="chip-count-badge">{places.length}</span>
        </button>

        <button
          type="button"
          className={`radar-chip ${category === "hospital" ? "active" : ""}`}
          onClick={() => setCategory("hospital")}
        >
          <span>🏥 Hospitals & Clinics</span>
          <span className="chip-count-badge">
            {places.filter((p) => p.type === "hospital").length}
          </span>
        </button>

        <button
          type="button"
          className={`radar-chip ${category === "police" ? "active" : ""}`}
          onClick={() => setCategory("police")}
        >
          <span>🚓 Police Stations</span>
          <span className="chip-count-badge">
            {places.filter((p) => p.type === "police").length}
          </span>
        </button>

        <button
          type="button"
          className={`radar-chip ${category === "ambulance" ? "active" : ""}`}
          onClick={() => setCategory("ambulance")}
        >
          <span>🚑 Ambulance Stations</span>
          <span className="chip-count-badge">
            {places.filter((p) => p.type === "ambulance").length}
          </span>
        </button>
      </div>

      {/* RESULTS COUNT INFO */}
      <div className="radar-results-info">
        <span>
          Showing <strong>{filteredPlaces.length}</strong> facilities within {radius} km of{" "}
          <strong>{userLocation.address}</strong>
        </span>
        {routingLoading && <span>Calculating live drive time...</span>}
      </div>

      {/* MAIN RADAR VIEW (MAP + LIST) */}
      <div className="radar-main-layout">
        {/* MAP CONTAINER */}
        <div className="radar-map-wrapper">
          <div ref={mapContainerRef} className="radar-leaflet-map" />

          {travelTime && selectedPlace && (
            <div className="map-travel-time-indicator">
              <Navigation size={18} />
              <div>
                Drive to <strong>{selectedPlace.name}</strong>: <strong>{travelTime.durationMins} mins</strong> ({travelTime.distanceKm} km)
              </div>
              <button
                type="button"
                className="btn-clear-route"
                onClick={clearActiveRoute}
                title="Clear route"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* FACILITIES LIST */}
        <div className="radar-facilities-list-wrap">
          {loading ? (
            <div className="radar-skeleton-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="radar-skeleton-card" />
              ))}
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="radar-facility-card empty-card">
              <p>No results found matching your criteria. Try adjusting your radius or search term.</p>
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isSelected = selectedPlace?.id === place.id;

              return (
                <div
                  key={place.id}
                  className={`radar-facility-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectPlace(place)}
                >
                  <div className="card-type-row">
                    <span className={`badge-place-type ${place.type}`}>
                      {place.type === "hospital"
                        ? "Hospital / Clinic"
                        : place.type === "police"
                        ? "Police Station"
                        : "Ambulance Station"}
                    </span>
                    <span className="card-distance-tag">{place.distance} km away</span>
                  </div>

                  <h3 className="radar-facility-name">{place.name}</h3>
                  <p className="radar-facility-address">{place.address}</p>

                  <div className="radar-card-actions">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${place.lat},${place.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-card-action route"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation size={13} /> Directions
                    </a>

                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="btn-card-action call"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={13} /> Call
                      </a>
                    )}

                    {place.isDbHospital && (
                      <Link
                        to="/patient/opd-pass"
                        className="btn-card-action opd"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Ticket size={13} /> OPD Pass
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
