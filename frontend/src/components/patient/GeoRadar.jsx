import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Heart,
  Activity,
  Layers,
  Info,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";
import useNearbyPlaces, { HYDERABAD_COORDS } from "./useNearbyPlaces";
import { useAuth } from "../../context/AuthContext";
import "./geoRadar.css";

// Check if demo simulation is enabled
const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  window.localStorage.getItem("cb_demo_mode") === "true";

// Helper function to create custom Leaflet divIcons
function createCustomMarkerIcon(type, isHovered = false) {
  let bgColor = "#2563eb"; // Blue for hospitals/clinics
  let svgIcon = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 6v12m-6-6h12"/>
    </svg>
  `;

  if (type === "police") {
    bgColor = "#312e81"; // Indigo / Dark Blue for police
    svgIcon = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    `;
  } else if (type === "ambulance") {
    bgColor = "#dc2626"; // Red for ambulance
    svgIcon = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"/>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    `;
  }

  const hoverClass = isHovered ? "radar-marker-highlighted" : "";

  const html = `
    <div class="radar-custom-pin ${type} ${hoverClass}" style="
      background: ${bgColor};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      border: 2px solid #ffffff;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
    ">
      <span style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
        ${svgIcon}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: `custom-marker-icon marker-${type}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// User location marker: pulsing blue dot with accuracy circle
const createUserPulsingIcon = () =>
  L.divIcon({
    html: `
      <div class="user-radar-pulse-ring">
        <div class="user-radar-dot"></div>
      </div>
    `,
    className: "user-gps-pulse-container",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

// Live Ambulance marker for active dispatch
const createAmbulanceLiveIcon = () =>
  L.divIcon({
    html: `
      <div class="live-ambulance-marker-ring">
        <div class="live-ambulance-marker-badge">
          🚑
        </div>
      </div>
    `,
    className: "live-ambulance-marker-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

export default function GeoRadar() {
  const { user } = useAuth();
  const userRole = (user?.role || "patient").toLowerCase();

  const {
    userLocation,
    userAccuracy,
    isLiveLocation,
    locationDenied,
    locationErrorMsg,
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
    lastUpdated,
    refresh,
  } = useNearbyPlaces({ initialRadius: 10 });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState(null);
  const [travelTime, setTravelTime] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Live Dispatch & Ambulance Tracking State
  const [activeDispatch, setActiveDispatch] = useState({
    active: true,
    ambulanceId: "AMB-108-HYD",
    driverName: "Rajesh Kumar (EMT Lead)",
    driverPhone: "+91 98490 12345",
    status: "En route", // "Dispatched" | "En route" | "Arrived" | "At hospital"
    speedKmh: 48,
    etaMins: 7,
    distanceKm: "3.2",
    currentLocation: {
      lat: userLocation.lat + 0.015,
      lng: userLocation.lng - 0.012,
    },
    assignedHospital: "KIMS Hospitals, Secunderabad",
    assignedHospitalAddress: "Minister Road, Secunderabad",
    patient: {
      name: user?.name || "Rahul Varma",
      age: user?.age || 58,
      id: user?.id || user?._id || "PT-88912",
      phone: user?.phone || "+91 98491 55678",
      emergencyType: "Acute Coronary Syndrome / Chest Pain",
      vitals: {
        spo2: 91, // Critical < 92
        bp: "155/95", // High
        hr: 104, // Tachycardia
      },
    },
  });

  // Map DOM & Leaflet references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const ambulanceMarkerRef = useRef(null);
  const ambulanceTrailRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);
  const markerByPlaceIdRef = useRef({});

  // 400ms Debounce on Search Query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
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
          const matchName = (place.name || "").toLowerCase().includes(q);
          const matchAddress = (place.address || "").toLowerCase().includes(q);
          const matchSpec = (place.specialties || []).some((s) =>
            s.toLowerCase().includes(q)
          );
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

  // ----------------------------------------------------
  // INITIALIZE LEAFLET MAP
  // ----------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);

      // User location marker
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserPulsingIcon(),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(
          `<div class="popup-user-inner"><strong>Your Location</strong><br/>${userLocation.address}</div>`
        );

      // User accuracy circle
      if (userAccuracy) {
        userAccuracyCircleRef.current = L.circle(
          [userLocation.lat, userLocation.lng],
          {
            radius: Math.min(userAccuracy, 500),
            color: "#0284c7",
            fillColor: "#0284c7",
            fillOpacity: 0.12,
            weight: 1,
          }
        ).addTo(map);
      }

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
      if (userAccuracyCircleRef.current && userAccuracy) {
        userAccuracyCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userAccuracyCircleRef.current.setRadius(Math.min(userAccuracy, 500));
      }
    }
  }, [userLocation, userAccuracy]);

  // ----------------------------------------------------
  // OSRM DRIVING ROUTE & TIME
  // ----------------------------------------------------
  const handleSelectPlace = useCallback(
    async (place) => {
      setSelectedPlace(place);
      if (!mapInstanceRef.current) return;

      try {
        setRoutingLoading(true);
        if (routeLayerRef.current) {
          routeLayerRef.current.clearLayers();
        }

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
            const coordinates = route.geometry.coordinates.map((coord) => [
              coord[1],
              coord[0],
            ]);
            const polyline = L.polyline(coordinates, {
              color: "#0284c7",
              weight: 5,
              opacity: 0.9,
              dashArray: "1, 8",
              lineJoin: "round",
            });

            if (routeLayerRef.current) {
              polyline.addTo(routeLayerRef.current);
            }

            // Fit map bounds to show complete route
            mapInstanceRef.current.fitBounds(polyline.getBounds(), {
              padding: [60, 60],
            });
          }
        }
      } catch (e) {
        console.warn("Could not retrieve OSRM driving route:", e);
      } finally {
        setRoutingLoading(false);
      }
    },
    [userLocation.lat, userLocation.lng]
  );

  // ----------------------------------------------------
  // RENDER FACILITY MARKERS & BOUNDS FIT
  // ----------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    markerByPlaceIdRef.current = {};

    const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng]]);

    filteredPlaces.forEach((place) => {
      const isSelected = selectedPlace?.id === place.id;
      const isHovered = hoveredPlaceId === place.id;
      const marker = L.marker([place.lat, place.lng], {
        icon: createCustomMarkerIcon(place.type, isHovered || isSelected),
      });

      markerByPlaceIdRef.current[place.id] = marker;
      bounds.extend([place.lat, place.lng]);

      const popupContent = `
        <div class="popup-inner">
          <div class="popup-head">
            <span class="popup-type-tag ${place.type}">${place.type.toUpperCase()}</span>
            ${place.emergency ? '<span class="popup-247-tag">24/7 EMERGENCY</span>' : ""}
          </div>
          <h4 class="popup-title">${place.name}</h4>
          <p class="popup-address">${place.address}</p>
          <div class="popup-metrics-row">
            <span>Distance: <strong>${place.distance} km</strong></span>
            <span>Phone: <strong>${place.phone}</strong></span>
          </div>
          <div class="popup-actions-row">
            <button id="btn-popup-dir-${place.id}" class="popup-btn primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Get Directions
            </button>
            <a href="tel:${place.phone}" class="popup-btn secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "custom-leaflet-popup",
        maxWidth: 290,
      });

      marker.on("popupopen", () => {
        const dirBtn = document.getElementById(`btn-popup-dir-${place.id}`);
        if (dirBtn) {
          dirBtn.onclick = () => handleSelectPlace(place);
        }
      });

      marker.on("click", () => {
        handleSelectPlace(place);
      });

      marker.addTo(markersLayer);
    });

    // Auto-fit bounds if we have facilities
    if (filteredPlaces.length > 0 && !selectedPlace) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [filteredPlaces, userLocation, hoveredPlaceId, selectedPlace, handleSelectPlace]);

  // ----------------------------------------------------
  // HOVER SYNC: CARD HOVER HIGHLIGHTS MARKER
  // ----------------------------------------------------
  const handleCardMouseEnter = (place) => {
    setHoveredPlaceId(place.id);
    const marker = markerByPlaceIdRef.current[place.id];
    if (marker) {
      marker.setIcon(createCustomMarkerIcon(place.type, true));
    }
  };

  const handleCardMouseLeave = (place) => {
    setHoveredPlaceId(null);
    const marker = markerByPlaceIdRef.current[place.id];
    if (marker) {
      marker.setIcon(createCustomMarkerIcon(place.type, selectedPlace?.id === place.id));
    }
  };

  // ----------------------------------------------------
  // LIVE AMBULANCE SIMULATION (GPS FEED)
  // Updates position towards user or hospital every 10 seconds
  // ----------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !activeDispatch.active) return;
    const map = mapInstanceRef.current;

    // Create or update ambulance marker
    if (!ambulanceMarkerRef.current) {
      ambulanceMarkerRef.current = L.marker(
        [activeDispatch.currentLocation.lat, activeDispatch.currentLocation.lng],
        {
          icon: createAmbulanceLiveIcon(),
          zIndexOffset: 1200,
        }
      )
        .addTo(map)
        .bindPopup(
          `<div class="popup-ambulance-track">
            <strong>${activeDispatch.ambulanceId}</strong> (${activeDispatch.status})<br/>
            Speed: ${activeDispatch.speedKmh} km/h | ETA: ${activeDispatch.etaMins} mins
          </div>`
        );
    } else {
      ambulanceMarkerRef.current.setLatLng([
        activeDispatch.currentLocation.lat,
        activeDispatch.currentLocation.lng,
      ]);
    }

    // Interval to simulate live GPS movement towards destination
    const interval = setInterval(() => {
      setActiveDispatch((prev) => {
        if (!prev.active) return prev;

        // Step movement 5% towards user location
        const dLat = (userLocation.lat - prev.currentLocation.lat) * 0.08;
        const dLng = (userLocation.lng - prev.currentLocation.lng) * 0.08;
        const newLat = prev.currentLocation.lat + dLat;
        const newLng = prev.currentLocation.lng + dLng;

        const remDist = calculateDistance(
          newLat,
          newLng,
          userLocation.lat,
          userLocation.lng
        );
        const newEta = Math.max(1, Math.round((remDist / (prev.speedKmh || 40)) * 60));
        const newStatus =
          remDist < 0.2 ? "Arrived" : remDist < 1.0 ? "Arriving shortly" : "En route";

        // Draw trail polyline
        if (ambulanceTrailRef.current) {
          ambulanceTrailRef.current.addLatLng([newLat, newLng]);
        } else {
          ambulanceTrailRef.current = L.polyline(
            [
              [prev.currentLocation.lat, prev.currentLocation.lng],
              [newLat, newLng],
            ],
            { color: "#dc2626", weight: 4, dashArray: "4, 6", opacity: 0.8 }
          ).addTo(map);
        }

        return {
          ...prev,
          currentLocation: { lat: newLat, lng: newLng },
          distanceKm: remDist.toFixed(1),
          etaMins: newEta,
          status: newStatus,
          speedKmh: Math.floor(42 + Math.random() * 12),
        };
      });
    }, 10000); // 10s live GPS tick

    return () => clearInterval(interval);
  }, [userLocation.lat, userLocation.lng, activeDispatch.active]);

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

  // Determine role-based visibility for Live Patient Details card
  const canViewPatientDetails =
    userRole === "doctor" ||
    userRole === "staff" ||
    userRole === "admin" ||
    (userRole === "patient" &&
      (user?.id === activeDispatch.patient.id ||
        user?.name === activeDispatch.patient.name));

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
          {lastUpdated && (
            <span className="radar-last-updated-pill" title="Last background radar update">
              <Clock size={13} /> Updated {lastUpdated}
            </span>
          )}

          <button
            type="button"
            className="btn-locate-me"
            onClick={detectLiveLocation}
            disabled={locating}
            title="Detect and watch live GPS location"
          >
            <LocateFixed size={16} />
            <span>
              {locating
                ? "Locating GPS..."
                : isLiveLocation
                ? "GPS Active"
                : "Use My Location"}
            </span>
          </button>

          <button
            type="button"
            className="radar-refresh-btn"
            onClick={refresh}
            title="Refresh radar dataset"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* LOCATION NOTICE */}
      {locationDenied && (
        <div className="radar-notice-banner" role="alert">
          <AlertCircle size={18} />
          <span>
            {locationErrorMsg ||
              'Location access was denied or timed out. Defaulting to Hyderabad, Telangana coordinates. Click "Use My Location" anytime to retry.'}
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
            aria-label="Filter facilities by name or specialty"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-icon-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search input"
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
            aria-label="Toggle 24/7 Emergency only filter"
          >
            <Siren size={15} />
            <span>24/7 Emergency</span>
          </button>
        </div>
      </div>

      {/* CATEGORY CHIPS WITH REAL LIVE COUNTS */}
      <div className="radar-chips-bar" role="tablist">
        <button
          type="button"
          className={`radar-chip ${category === "all" ? "active" : ""}`}
          onClick={() => setCategory("all")}
          role="tab"
          aria-selected={category === "all"}
        >
          <span>All Facilities</span>
          <span className="chip-count-badge">{places.length}</span>
        </button>

        <button
          type="button"
          className={`radar-chip ${category === "hospital" ? "active" : ""}`}
          onClick={() => setCategory("hospital")}
          role="tab"
          aria-selected={category === "hospital"}
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
          role="tab"
          aria-selected={category === "police"}
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
          role="tab"
          aria-selected={category === "ambulance"}
        >
          <span>🚑 Ambulance Stations</span>
          <span className="chip-count-badge">
            {places.filter((p) => p.type === "ambulance").length}
          </span>
        </button>
      </div>

      {/* DISPATCH & PATIENT LIVE TELEMETRY BAR (IF ACTIVE) */}
      {activeDispatch.active && (
        <div className="radar-telemetry-twin-grid">
          {/* AMBULANCE TRACKING PANEL */}
          <div className="radar-ambulance-track-card">
            <div className="track-card-header">
              <div className="ambulance-badge-row">
                <span className="pulse-indicator-red"></span>
                <span className="ambulance-id-tag">{activeDispatch.ambulanceId}</span>
                <span className={`status-pill ${activeDispatch.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  {activeDispatch.status}
                </span>
              </div>
              <span className="track-eta-highlight">ETA: {activeDispatch.etaMins} mins</span>
            </div>

            <div className="track-card-body">
              <div className="track-meta-item">
                <span className="meta-label">Paramedic Driver:</span>
                <span className="meta-value">{activeDispatch.driverName}</span>
              </div>
              <div className="track-meta-item">
                <span className="meta-label">Telemetry:</span>
                <span className="meta-value">
                  {activeDispatch.speedKmh} km/h • {activeDispatch.distanceKm} km away
                </span>
              </div>
              <div className="track-meta-item">
                <span className="meta-label">Assigned Facility:</span>
                <span className="meta-value">{activeDispatch.assignedHospital}</span>
              </div>
            </div>

            <div className="track-card-actions">
              <a href={`tel:${activeDispatch.driverPhone}`} className="btn-call-ambulance">
                <Phone size={13} /> Call EMT Driver
              </a>
              <span className="track-sub-text">Updates live every 10s via OSRM GPS</span>
            </div>
          </div>

          {/* LINKED PATIENT DETAILS CARD (ROLE-PROTECTED) */}
          {canViewPatientDetails && (
            <div className="radar-patient-vitals-card">
              <div className="patient-card-header">
                <div>
                  <span className="patient-kicker">LINKED EMERGENCY PATIENT</span>
                  <h4 className="patient-name">
                    {activeDispatch.patient.name} ({activeDispatch.patient.age}y)
                  </h4>
                </div>
                <span className="patient-id-badge">{activeDispatch.patient.id}</span>
              </div>

              <div className="emergency-type-tag">
                <AlertCircle size={14} />
                <span>{activeDispatch.patient.emergencyType}</span>
              </div>

              <div className="patient-vitals-row">
                <div
                  className={`vital-box ${
                    activeDispatch.patient.vitals.spo2 < 92 ? "critical" : ""
                  }`}
                >
                  <span className="vital-label">SpO₂</span>
                  <span className="vital-val">{activeDispatch.patient.vitals.spo2}%</span>
                  <span className="vital-status">
                    {activeDispatch.patient.vitals.spo2 < 92 ? "CRITICAL" : "NORMAL"}
                  </span>
                </div>

                <div className="vital-box">
                  <span className="vital-label">Blood Pressure</span>
                  <span className="vital-val">{activeDispatch.patient.vitals.bp}</span>
                  <span className="vital-status">STAGE 1</span>
                </div>

                <div className="vital-box">
                  <span className="vital-label">Heart Rate</span>
                  <span className="vital-val">{activeDispatch.patient.vitals.hr} bpm</span>
                  <span className="vital-status">ELEVATED</span>
                </div>
              </div>

              <div className="patient-card-footer">
                <span>Direct line: {activeDispatch.patient.phone}</span>
                <span className="role-visibility-note">
                  {userRole === "doctor"
                    ? "Verified Clinical View"
                    : "Patient Direct Telemetry"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTS COUNT INFO */}
      <div className="radar-results-info">
        <span>
          Showing <strong>{filteredPlaces.length}</strong> facilities within {radius} km of{" "}
          <strong>{userLocation.address}</strong>
        </span>
        {routingLoading && (
          <span className="routing-calc-text">Calculating live drive route...</span>
        )}
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
                Drive to <strong>{selectedPlace.name}</strong>:{" "}
                <strong>{travelTime.durationMins} mins</strong> ({travelTime.distanceKm} km)
              </div>
              <button
                type="button"
                className="btn-clear-route"
                onClick={clearActiveRoute}
                title="Clear active driving route"
                aria-label="Clear active driving route"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* FACILITIES LIST (OR SKELETON / EMPTY STATE) */}
        <div className="radar-facilities-list-wrap">
          {loading && places.length === 0 ? (
            <div className="radar-skeleton-grid">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="radar-skeleton-card" />
              ))}
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="radar-facility-card empty-card">
              <AlertCircle size={32} className="empty-icon" />
              <h4>No facilities found</h4>
              <p>
                No medical or emergency points matched your selected filters or radius. Try
                expanding the scan radius to 20 km or 50 km.
              </p>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={() => {
                  setRadius(20);
                  setCategory("all");
                  setEmergencyOnly(false);
                  setSearchQuery("");
                }}
              >
                Expand Search to 20 km
              </button>
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isSelected = selectedPlace?.id === place.id;
              const isHovered = hoveredPlaceId === place.id;

              return (
                <div
                  key={place.id}
                  className={`radar-facility-card ${isSelected ? "selected" : ""} ${
                    isHovered ? "hovered" : ""
                  }`}
                  onClick={() => handleSelectPlace(place)}
                  onMouseEnter={() => handleCardMouseEnter(place)}
                  onMouseLeave={() => handleCardMouseLeave(place)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${place.name}, ${place.distance} kilometers away`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleSelectPlace(place);
                    }
                  }}
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

                  {place.specialties && place.specialties.length > 0 && (
                    <div className="radar-specialties-chips">
                      {place.specialties.slice(0, 3).map((spec, sIdx) => (
                        <span key={sIdx} className="specialty-mini-chip">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="radar-card-actions">
                    <button
                      type="button"
                      className="btn-card-action route"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlace(place);
                      }}
                      aria-label={`Get directions to ${place.name}`}
                    >
                      <Navigation size={13} /> Directions
                    </button>

                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="btn-card-action call"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Call ${place.name} at ${place.phone}`}
                      >
                        <Phone size={13} /> Call
                      </a>
                    )}

                    {place.isDbHospital && (
                      <Link
                        to="/patient/opd-pass"
                        className="btn-card-action opd"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Generate Fast-track OPD pass"
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
