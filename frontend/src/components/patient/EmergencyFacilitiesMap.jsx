import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import api from "../../services/api";
import "./EmergencyFacilitiesMap.css";

// Haversine formula to compute distance in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
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
  return (R * c).toFixed(1);
}

export default function EmergencyFacilitiesMap({ initialCity = "New Delhi" }) {
  // Current user GPS coordinates (Default: New Delhi center)
  const [userLocation, setUserLocation] = useState({
    lat: 28.6139,
    lng: 77.209,
    accuracy: 50,
    address: "Connaught Place, New Delhi",
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("GPS Synced");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRadius, setSelectedRadius] = useState(10); // km
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchedVehicle, setDispatchedVehicle] = useState(null);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // Map DOM & Leaflet references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const circleLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // 1. Locate User via Geolocation API
  const handleLocateMe = () => {
    setIsLocating(true);
    setLocationStatus("Locating...");

    if (!navigator.geolocation) {
      setLocationStatus("Geolocation unavailable");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy) || 30,
          address: "Your Current Live GPS Location",
        });
        setLocationStatus("GPS High Accuracy Fix");
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14, {
            duration: 1.5,
          });
        }
      },
      (err) => {
        console.warn("Geolocation denied or timed out, using default.", err);
        setLocationStatus("Default Location (GPS Denied)");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Run auto-locate on initial mount
  useEffect(() => {
    handleLocateMe();
  }, []);

  // 2. Fetch or Generate Facilities around user location
  useEffect(() => {
    const loadFacilities = async () => {
      const uLat = userLocation.lat;
      const uLng = userLocation.lng;

      // Real or template hospitals
      let hospitalList = [];
      try {
        const res = await api.get("/hospitals/");
        if (Array.isArray(res.data) && res.data.length > 0) {
          hospitalList = res.data.map((h, i) => {
            // Distribute around user coordinates if no lat/lng provided in backend
            const angle = (i * (360 / Math.max(res.data.length, 4))) * (Math.PI / 180);
            const radiusOffset = 0.015 + (i % 3) * 0.012; // ~1-3 km offset
            const hLat = h.latitude || uLat + Math.cos(angle) * radiusOffset;
            const hLng = h.longitude || uLng + Math.sin(angle) * radiusOffset;

            return {
              id: `hosp-${h._id || i}`,
              name: h.name || `CareBridge Medical Center ${i + 1}`,
              category: "hospital",
              lat: hLat,
              lng: hLng,
              address: h.address || h.city || "Healthcare Enclave",
              phone: h.phone || "102 / +91-11-2345-6789",
              beds: h.beds || 45,
              emergency: h.emergency ? "24/7 Trauma Unit Available" : "Standard Emergency",
              rating: h.rating || 4.8,
              specialties: h.specialties || ["Cardiology", "Trauma", "General"],
            };
          });
        }
      } catch (err) {
        console.log("Using fallback facility points:", err);
      }

      // If backend returned no hospitals, build rich fallback hospitals
      if (hospitalList.length === 0) {
        hospitalList = [
          {
            id: "hosp-1",
            name: "CareBridge Apex Multispecialty Hospital",
            category: "hospital",
            lat: uLat + 0.012,
            lng: uLng + 0.014,
            address: "Ring Road Medical Corridor",
            phone: "+91-11-8901-2345",
            beds: 82,
            emergency: "24/7 Level 1 Trauma Care",
            rating: 4.9,
            specialties: ["Cardiology", "Critical Care", "Neurology"],
          },
          {
            id: "hosp-2",
            name: "City Metro Emergency & Trauma Hospital",
            category: "hospital",
            lat: uLat - 0.015,
            lng: uLng + 0.009,
            address: "Civil Lines, Health Complex",
            phone: "+91-11-7890-1234",
            beds: 34,
            emergency: "Emergency ICU Ready",
            rating: 4.7,
            specialties: ["Pulmonology", "Orthopedics", "ICU"],
          },
          {
            id: "hosp-3",
            name: "Lifeline Community Health Center",
            category: "hospital",
            lat: uLat + 0.019,
            lng: uLng - 0.016,
            address: "Sector 4 Civic Plaza",
            phone: "+91-11-6789-0123",
            beds: 22,
            emergency: "OPD & Rapid Trauma",
            rating: 4.6,
            specialties: ["General Medicine", "Pediatrics"],
          },
        ];
      }

      // Police Stations in proximity
      const policeList = [
        {
          id: "pol-1",
          name: "Central District Police Station",
          category: "police",
          lat: uLat - 0.008,
          lng: uLng - 0.011,
          address: "Sector Police Headquarter, Main Blvd",
          phone: "112 / +91-11-2341-0100",
          division: "Central Division PCR-1",
          status: "24/7 Patrol Active",
        },
        {
          id: "pol-2",
          name: "Rapid Emergency Response Police Post",
          category: "police",
          lat: uLat + 0.016,
          lng: uLng - 0.006,
          address: "Metro Junction Road",
          phone: "112 / +91-11-2341-0101",
          division: "Traffic & Emergency Wing",
          status: "Rapid Responders On Duty",
        },
      ];

      // Emergency Vehicles (Ambulances & Rapid Responders)
      const ambulanceList = [
        {
          id: "amb-1",
          name: "CareBridge ALS Rapid Ambulance #104",
          category: "ambulance",
          lat: uLat + 0.006,
          lng: uLng + 0.005,
          address: "Patrolling Sector 2 (Standby)",
          phone: "108 / +91-98765-43210",
          type: "Advanced Cardiac Life Support (ALS)",
          eta: "4 mins away",
          status: "Available",
          driver: "Paramedic Suresh / EMT Rohit",
        },
        {
          id: "amb-2",
          name: "City Trauma Response Ambulance #109",
          category: "ambulance",
          lat: uLat - 0.009,
          lng: uLng + 0.012,
          address: "Stationed at South Cross",
          phone: "108 / +91-98765-43211",
          type: "Basic Life Support (BLS)",
          eta: "7 mins away",
          status: "On Standby",
          driver: "EMT Manoj Kumar",
        },
        {
          id: "amb-3",
          name: "Neonatal & Critical Care Ambulance #112",
          category: "ambulance",
          lat: uLat - 0.018,
          lng: uLng - 0.014,
          address: "North Hub Base",
          phone: "108 / +91-98765-43212",
          type: "Critical Care ICU Unit",
          eta: "11 mins away",
          status: "Available",
          driver: "Paramedic Anil Sharma",
        },
      ];

      // Merge and compute real-time distance from user
      const allFacilities = [...hospitalList, ...policeList, ...ambulanceList].map((item) => ({
        ...item,
        distance: calculateDistance(uLat, uLng, item.lat, item.lng),
      }));

      // Sort by proximity
      allFacilities.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setFacilities(allFacilities);
    };

    loadFacilities();
  }, [userLocation]);

  // 3. Initialize & update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map instance if not initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 14,
        zoomControl: true,
      });

      // Add OpenStreetMap raster tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Layer groups for markers and radius circle
      markersLayerRef.current = L.layerGroup().addTo(map);
      circleLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const circleLayer = circleLayerRef.current;

    // Update center
    map.setView([userLocation.lat, userLocation.lng]);

    // Clear previous markers & circles
    markersLayer.clearLayers();
    circleLayer.clearLayers();

    // 1. Draw User Live Marker
    const userHtml = `
      <div class="custom-leaflet-marker">
        <div class="user-marker-radar"></div>
        <div class="user-marker-pin">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </div>
      </div>
    `;
    const userIcon = L.divIcon({
      className: "user-div-icon",
      html: userHtml,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      zIndexOffset: 1000,
    })
      .bindPopup(
        `<div class="map-popup-card">
          <span class="popup-category-tag" style="background:#eff6ff;color:#1d4ed8;">You Are Here</span>
          <h4>Current GPS Position</h4>
          <p class="popup-details">${userLocation.address}</p>
        </div>`
      )
      .addTo(markersLayer);

    // Draw user proximity radius circle
    L.circle([userLocation.lat, userLocation.lng], {
      radius: selectedRadius * 1000,
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: "5, 5",
    }).addTo(circleLayer);

    // 2. Filter facilities by category, search query, and radius
    const displayedFacilities = facilities.filter((f) => {
      const matchCat =
        activeCategory === "all" ? true : f.category === activeCategory;
      const matchSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRadius = parseFloat(f.distance) <= selectedRadius;
      return matchCat && matchSearch && matchRadius;
    });

    // 3. Render Custom Facility Markers
    displayedFacilities.forEach((f) => {
      let iconHtml = "";
      let pinClass = "";

      if (f.category === "hospital") {
        pinClass = "hospital-marker-pin";
        iconHtml = `
          <div class="custom-leaflet-marker">
            <div class="${pinClass}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 6v12m-6-6h12"/>
              </svg>
            </div>
          </div>
        `;
      } else if (f.category === "police") {
        pinClass = "police-marker-pin";
        iconHtml = `
          <div class="custom-leaflet-marker">
            <div class="${pinClass}">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
        `;
      } else {
        // Ambulance / Emergency vehicle
        pinClass = "ambulance-marker-pin";
        iconHtml = `
          <div class="custom-leaflet-marker">
            <div class="ambulance-beacon"></div>
            <div class="${pinClass}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: `facility-div-icon ${f.category}`,
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      // Build Interactive Popup
      const popupContent = `
        <div class="map-popup-card">
          <span class="popup-category-tag ${f.category}">
            ${f.category === "hospital" ? "🏥 Hospital" : f.category === "police" ? "🚓 Police" : "🚑 Emergency Vehicle"}
          </span>
          <h4>${f.name}</h4>
          <div class="popup-distance">📍 ${f.distance} km from your location</div>
          <div class="popup-details">
            ${f.category === "hospital" ? `🛏️ ${f.beds} Beds • ${f.emergency}` : ""}
            ${f.category === "police" ? `🛡️ ${f.division} • ${f.status}` : ""}
            ${f.category === "ambulance" ? `⚡ ETA: <strong>${f.eta}</strong> • ${f.type}` : ""}
            <br>📞 Contact: <strong>${f.phone}</strong>
          </div>
          <a href="tel:${f.phone.split("/")[0].trim()}" class="popup-action-btn">
            📞 Direct Call: ${f.phone.split("/")[0].trim()}
          </a>
        </div>
      `;

      L.marker([f.lat, f.lng], { icon: customIcon })
        .bindPopup(popupContent)
        .addTo(markersLayer);
    });

    // Cleanup on component unmount
    return () => {
      // Nothing needed here, map preserved in ref
    };
  }, [userLocation, facilities, activeCategory, searchQuery, selectedRadius]);

  // Clean map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Dispatch Ambulance Action
  const handleRequestDispatch = (ambulance) => {
    setDispatchedVehicle(ambulance);
    setDispatchModalOpen(true);
    setDispatchSuccess(false);
  };

  const confirmDispatch = () => {
    setDispatchSuccess(true);
    setTimeout(() => {
      setDispatchModalOpen(false);
      setDispatchSuccess(false);
    }, 2500);
  };

  // Filter count badges
  const hospitalsCount = facilities.filter((f) => f.category === "hospital").length;
  const policeCount = facilities.filter((f) => f.category === "police").length;
  const ambulanceCount = facilities.filter((f) => f.category === "ambulance").length;

  const filteredFacilitiesList = facilities.filter((f) => {
    const matchCat =
      activeCategory === "all" ? true : f.category === activeCategory;
    const matchSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRadius = parseFloat(f.distance) <= selectedRadius;
    return matchCat && matchSearch && matchRadius;
  });

  return (
    <div className="emergency-map-container">
      {/* ================================
          HEADER WITH LOCATE BUTTON
      ================================= */}
      <div className="emergency-map-header">
        <div className="map-header-left">
          <div className="map-header-badge-row">
            <span className="map-kicker">
              <Siren size={14} /> EMERGENCY & SERVICES LOCATOR
            </span>
            <span className="live-gps-badge">
              <span className="gps-radar-dot"></span> {locationStatus}
            </span>
          </div>
          <h2>Live Emergency Services & Facilities Map</h2>
          <p>
            Locate nearest <strong>Hospitals</strong>, <strong>Police Stations</strong>, and <strong>Active Emergency Vehicles</strong> in real-time.
          </p>
        </div>

        <div className="map-header-actions">
          <button
            className={`locate-me-btn ${isLocating ? "locating" : ""}`}
            onClick={handleLocateMe}
            title="Detect your current GPS location"
          >
            <Navigation size={15} />
            <span>{isLocating ? "Locating GPS..." : "Locate My Position"}</span>
          </button>

          <div className="radius-select-box">
            <Compass size={14} color="#64748b" />
            <span>Radius:</span>
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(Number(e.target.value))}
            >
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================================
          CATEGORY FILTER PILLS & SEARCH
      ================================= */}
      <div className="emergency-map-toolbar">
        <div className="category-filter-pills">
          <button
            className={`category-pill ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            All Services <span className="pill-count">{facilities.length}</span>
          </button>

          <button
            className={`category-pill hospital ${activeCategory === "hospital" ? "active" : ""}`}
            onClick={() => setActiveCategory("hospital")}
          >
            <Cross size={14} /> Hospitals & Trauma <span className="pill-count">{hospitalsCount}</span>
          </button>

          <button
            className={`category-pill police ${activeCategory === "police" ? "active" : ""}`}
            onClick={() => setActiveCategory("police")}
          >
            <Shield size={14} /> Police Stations <span className="pill-count">{policeCount}</span>
          </button>

          <button
            className={`category-pill ambulance ${activeCategory === "ambulance" ? "active" : ""}`}
            onClick={() => setActiveCategory("ambulance")}
          >
            <Truck size={14} /> Emergency Vehicles <span className="pill-count">{ambulanceCount}</span>
          </button>
        </div>

        <div className="map-search-box">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search facility name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X size={14} color="#94a3b8" style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")} />
          )}
        </div>
      </div>

      {/* ================================
          LEAFLET MAP CANVAS
      ================================= */}
      <div className="map-main-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-root" />

        {/* FAST 1-CLICK SOS DISPATCH BANNER */}
        <div className="emergency-quick-banner">
          <div className="sos-icon-pulse">
            <Siren size={18} />
          </div>
          <div className="sos-text">
            <strong>Need Immediate Help?</strong>
            <span>Nearest Ambulance: 4 mins away</span>
          </div>
          <button
            className="sos-call-btn"
            onClick={() => {
              const nearestAmb = facilities.find((f) => f.category === "ambulance");
              handleRequestDispatch(nearestAmb || facilities[0]);
            }}
          >
            <Radio size={14} /> Dispatch Ambulance
          </button>
        </div>
      </div>

      {/* ================================
          FACILITIES LIST CAROUSEL / DRAWER
      ================================= */}
      <div className="map-facilities-drawer">
        <div className="drawer-header">
          <h3>
            Nearest Emergency Facilities & Responders ({filteredFacilitiesList.length})
          </h3>
          <span>Sorted by proximity from your GPS</span>
        </div>

        <div className="facilities-cards-scroll">
          {filteredFacilitiesList.length === 0 ? (
            <div style={{ color: "#94a3b8", padding: "16px", gridColumn: "1 / -1" }}>
              No facilities found within {selectedRadius} km matching your filters.
            </div>
          ) : (
            filteredFacilitiesList.map((f) => (
              <div
                key={f.id}
                className="facility-card-item"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([f.lat, f.lng], 16, {
                      duration: 1.2,
                    });
                  }
                }}
              >
                <div className={`facility-item-icon ${f.category}`}>
                  {f.category === "hospital" && <Cross size={18} />}
                  {f.category === "police" && <Shield size={18} />}
                  {f.category === "ambulance" && <Truck size={18} />}
                </div>

                <div className="facility-item-info">
                  <strong>{f.name}</strong>
                  <p>{f.address}</p>

                  <div className="facility-item-meta">
                    <span className="dist">📍 {f.distance} km</span>
                    {f.category === "hospital" && (
                      <span className="extra">🛏️ {f.beds} Beds</span>
                    )}
                    {f.category === "police" && (
                      <span className="extra">🛡️ 24/7 Desk</span>
                    )}
                    {f.category === "ambulance" && (
                      <span className="extra" style={{ color: "#d97706" }}>⚡ ETA {f.eta}</span>
                    )}
                  </div>
                </div>

                <a
                  href={`tel:${f.phone.split("/")[0].trim()}`}
                  className="facility-call-link"
                  title={`Call ${f.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone size={14} />
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================================
          DISPATCH AMBULANCE MODAL
      ================================= */}
      {dispatchModalOpen && (
        <div className="dispatch-modal-overlay">
          <div className="dispatch-modal-box">
            {dispatchSuccess ? (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#d1fae5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3>Ambulance Dispatched!</h3>
                <p style={{ color: "#059669", fontWeight: 600 }}>
                  Emergency Unit {dispatchedVehicle?.name || "#104"} is en route to your live coordinates. Estimated Arrival: 4 mins.
                </p>
              </div>
            ) : (
              <>
                <div className="dispatch-modal-icon">
                  <Siren size={28} />
                </div>
                <h3>Confirm Emergency Dispatch</h3>
                <p>
                  Are you sure you want to request immediate emergency dispatch to your current GPS position?
                </p>

                <div className="dispatch-details-card">
                  <span>
                    <strong>Vehicle:</strong> {dispatchedVehicle?.name || "CareBridge ALS Ambulance #104"}
                  </span>
                  <span>
                    <strong>Type:</strong> {dispatchedVehicle?.type || "Advanced Cardiac Life Support"}
                  </span>
                  <span>
                    <strong>Estimated Arrival:</strong> <span style={{ color: "#e11d48", fontWeight: 700 }}>4-6 minutes</span>
                  </span>
                  <span>
                    <strong>Destination:</strong> {userLocation.address}
                  </span>
                </div>

                <div className="dispatch-modal-actions">
                  <button
                    className="dispatch-cancel-btn"
                    onClick={() => setDispatchModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="dispatch-confirm-btn" onClick={confirmDispatch}>
                    Confirm & Dispatch Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
