import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Locate,
  Flame,
  Clock,
  Activity,
  ShieldCheck,
  Truck,
  ChevronDown,
  X,
  Compass,
  Star,
  Navigation,
  Loader2,
  SlidersHorizontal,
  Building2,
  Bed,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import facilitiesAPI from "../../services/facilities";
import "./HospitalDashboard.css";

// Leaflet default icon asset fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createUserIcon = () =>
  L.divIcon({
    className: "custom-user-marker",
    html: `<div class="user-marker-pulse"><div class="user-marker-dot"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

const createFacilityIcon = (facilityType = "Multi-specialty") => {
  const fType = facilityType.toLowerCase();
  const colorClass = fType.includes("emergency")
    ? "pin-emergency"
    : fType.includes("clinic")
    ? "pin-clinic"
    : fType.includes("diagnostic")
    ? "pin-diagnostic"
    : "pin-multispecialty";

  return L.divIcon({
    className: "custom-hospital-marker",
    html: `<div class="hospital-pin ${colorClass}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 6v12m-6-6h12"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const FACILITY_TYPES = [
  "All",
  "Multi-specialty",
  "Emergency/Trauma",
  "Clinic",
  "Diagnostic",
  "Maternity",
  "Pediatric"
];

const DISTANCE_OPTIONS = [
  { value: "all", label: "Any distance" },
  { value: "2", label: "Within 2 km" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "20", label: "Within 20 km" },
  { value: "50", label: "Within 50 km" },
];

const SORT_OPTIONS = [
  { value: "nearest", label: "Nearest" },
  { value: "recommended", label: "Recommended" },
  { value: "open_now", label: "Open now" },
];

export default function HospitalDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ----------------------------------------------------
  // FILTER STATES (SYNCED WITH URL PARAMS)
  // ----------------------------------------------------
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("city") || "");
  const [debouncedLocation, setDebouncedLocation] = useState(searchParams.get("city") || "");
  const [facilityType, setFacilityType] = useState(searchParams.get("type") || "All");
  const [distance, setDistance] = useState(searchParams.get("distance") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "nearest");

  // Quick Chips (Multi-select)
  const [chips, setChips] = useState({
    emergency: searchParams.get("emergency") === "true",
    openNow: searchParams.get("open_now") === "true",
    hasIcu: searchParams.get("has_icu") === "true",
    insurance: searchParams.get("insurance") === "true",
    ambulance: searchParams.get("ambulance") === "true",
  });

  // Location suggestions (Nominatim / Autocomplete)
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Mobile Bottom Sheet / Drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // User Live Geolocation
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("prompt"); // "prompt" | "locating" | "granted" | "denied"
  const [userCityName, setUserCityName] = useState("");

  // Data State
  const [facilities, setFacilities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Live Bed Telemetry Modal State
  const [telemetryModalFacility, setTelemetryModalFacility] = useState(null);
  const [facilityBeds, setFacilityBeds] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryWardFilter, setTelemetryWardFilter] = useState("All");
  const [updatingBedId, setUpdatingBedId] = useState(null);
  const [telemetryLastUpdated, setTelemetryLastUpdated] = useState(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const locationInputRef = useRef(null);

  // ----------------------------------------------------
  // 1. DEBOUNCE SEARCH & LOCATION INPUTS (300ms)
  // ----------------------------------------------------
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocation(locationQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [locationQuery]);

  // ----------------------------------------------------
  // 2. NOMINATIM / CITY AUTOCOMPLETE SEARCH
  // ----------------------------------------------------
  useEffect(() => {
    if (!debouncedLocation || debouncedLocation.length < 2) {
      setCitySuggestions([]);
      return;
    }

    let isMounted = true;
    const fetchCitySuggestions = async () => {
      try {
        setIsSearchingLocation(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          debouncedLocation
        )}&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const formatted = data.map((item) => {
              const city =
                item.address?.city ||
                item.address?.town ||
                item.address?.village ||
                item.address?.county ||
                item.name;
              const state = item.address?.state || "";
              const country = item.address?.country || "";
              return {
                display: `${city}${state ? `, ${state}` : ""}${country ? `, ${country}` : ""}`,
                cityOnly: city,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              };
            });
            setCitySuggestions(formatted);
          }
        }
      } catch (err) {
        console.warn("Nominatim autocomplete error:", err);
      } finally {
        if (isMounted) setIsSearchingLocation(false);
      }
    };

    fetchCitySuggestions();
    return () => {
      isMounted = false;
    };
  }, [debouncedLocation]);

  // ----------------------------------------------------
  // 3. GEOLOCATION REQUEST & REVERSE GEOCODING
  // ----------------------------------------------------
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(coords);
        setLocationStatus("granted");

        // Reverse geocode to find user's city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=10`
          );
          if (res.ok) {
            const data = await res.json();
            const detectedCity =
              data.address?.city ||
              data.address?.town ||
              data.address?.county ||
              data.address?.state ||
              "Your location";
            setUserCityName(detectedCity);
          }
        } catch {
          setUserCityName("Your area");
        }
      },
      (err) => {
        console.warn("Geolocation denied/error:", err.message);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // ----------------------------------------------------
  // 4. SYNC STATE TO URL QUERY PARAMS
  // ----------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (debouncedLocation) params.set("city", debouncedLocation);
    if (facilityType !== "All") params.set("type", facilityType);
    if (distance !== "all") params.set("distance", distance);
    if (sortBy !== "nearest") params.set("sort", sortBy);
    if (chips.emergency) params.set("emergency", "true");
    if (chips.openNow) params.set("open_now", "true");
    if (chips.hasIcu) params.set("has_icu", "true");
    if (chips.insurance) params.set("insurance", "true");
    if (chips.ambulance) params.set("ambulance", "true");

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, debouncedLocation, facilityType, distance, sortBy, chips, setSearchParams]);

  // ----------------------------------------------------
  // 5. FETCH FACILITIES DATA FROM API
  // ----------------------------------------------------
  const fetchFacilities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        city: debouncedLocation || undefined,
        facility_type: facilityType !== "All" ? facilityType : undefined,
        sort_by: sortBy,
        emergency: chips.emergency ? "true" : undefined,
        open_now: chips.openNow ? "true" : undefined,
        has_icu: chips.hasIcu ? "true" : undefined,
        accepts_insurance: chips.insurance ? "true" : undefined,
        ambulance: chips.ambulance ? "true" : undefined,
      };

      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        if (distance !== "all") {
          params.radius_km = distance;
        }
      }

      const res = await facilitiesAPI.getFacilities(params);
      const list = res.facilities || res.hospitals || (Array.isArray(res) ? res : []);
      setFacilities(list);
      setTotalCount(res.total || list.length);
    } catch (err) {
      console.error("Facilities fetch error:", err);
      setError("Failed to retrieve hospitals matching your search criteria.");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    debouncedLocation,
    facilityType,
    distance,
    sortBy,
    chips,
    userLocation,
  ]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  // ----------------------------------------------------
  // 6. INITIALIZE LEAFLET MAP
  // ----------------------------------------------------
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

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (userLocation) {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserIcon(),
        zIndexOffset: 1000,
      }).bindPopup(
        `<div class="leaflet-custom-popup">
          <strong>Your Location</strong>
          <p style="margin:2px 0 0;font-size:11px;color:#64748b;">GPS Radar Active</p>
        </div>`
      );
      markersLayerRef.current.addLayer(userMarker);
      userMarkerRef.current = userMarker;
    }

    const bounds = [];
    if (userLocation) bounds.push([userLocation.lat, userLocation.lng]);

    facilities.forEach((f) => {
      if (f.lat && f.lng) {
        const marker = L.marker([f.lat, f.lng], {
          icon: createFacilityIcon(f.facility_type || f.type),
        });

        const popupContent = `
          <div class="leaflet-custom-popup">
            <h4>${f.name}</h4>
            <div style="font-size:11px;color:#0d9488;font-weight:700;margin-bottom:4px;">
              🟢 ${f.available_beds || 18}/${f.total_beds || 60} Beds Available
            </div>
            <div style="font-size:11px;color:#475569;margin-bottom:6px;">📍 ${f.address || f.city}</div>
            <div style="display:flex;gap:6px;">
              <a href="tel:${f.phone}" class="popup-phone-btn">📞 Call</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}" target="_blank" rel="noopener noreferrer" class="popup-dir-btn">Directions</a>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(marker);
        bounds.push([f.lat, f.lng]);
      }
    });

    if (bounds.length > 0 && map) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
    }
  }, [facilities, userLocation]);

  // Center on user
  const handleCenterUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.2 });
      userMarkerRef.current?.openPopup();
    } else {
      requestLocation();
    }
  };

  // ----------------------------------------------------
  // 7. ACTIVE FILTER HELPERS & ACTIONS
  // ----------------------------------------------------
  const toggleChip = (key) => {
    setChips((prev) => ({ ...prev, [key]: !prev[key] }));
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (locationQuery) count++;
    if (facilityType !== "All") count++;
    if (distance !== "all") count++;
    if (sortBy !== "nearest") count++;
    if (chips.emergency) count++;
    if (chips.openNow) count++;
    if (chips.hasIcu) count++;
    if (chips.insurance) count++;
    if (chips.ambulance) count++;
    return count;
  }, [search, locationQuery, facilityType, distance, sortBy, chips]);

  const handleClearAll = () => {
    setSearch("");
    setDebouncedSearch("");
    setLocationQuery("");
    setDebouncedLocation("");
    setFacilityType("All");
    setDistance("all");
    setSortBy("nearest");
    setChips({
      emergency: false,
      openNow: false,
      hasIcu: false,
      insurance: false,
      ambulance: false,
    });
    setCurrentPage(1);
  };

  // Location string description for footer
  const locationLabel = useMemo(() => {
    if (locationQuery) return locationQuery;
    if (userCityName) return userCityName;
    return "you";
  }, [locationQuery, userCityName]);

  // ----------------------------------------------------
  // 8. LIVE BED TELEMETRY MODAL & TOGGLE
  // ----------------------------------------------------
  const handleOpenTelemetryModal = async (facility) => {
    setTelemetryModalFacility(facility);
    setTelemetryWardFilter("All");
    setTelemetryLoading(true);

    try {
      const data = await facilitiesAPI.getFacilityBeds(facility._id || facility.id);
      setFacilityBeds(data.beds || []);
      setTelemetryLastUpdated(data.last_updated || new Date().toISOString());
    } catch (err) {
      console.error("Failed to load facility beds:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const handleToggleBedStatus = async (bed) => {
    if (!telemetryModalFacility) return;
    const cycle = {
      Available: "Occupied",
      Occupied: "Reserved",
      Reserved: "Maintenance",
      Maintenance: "Available",
    };
    const nextStatus = cycle[bed.status] || "Available";

    try {
      setUpdatingBedId(bed.bed_id);
      const res = await facilitiesAPI.updateBedStatus(
        telemetryModalFacility._id || telemetryModalFacility.id,
        bed.bed_id,
        nextStatus
      );

      setFacilityBeds((prev) =>
        prev.map((b) => (b.bed_id === bed.bed_id ? { ...b, status: nextStatus, last_updated: res.last_updated } : b))
      );

      setFacilities((prev) =>
        prev.map((f) => {
          if ((f._id || f.id) === (telemetryModalFacility._id || telemetryModalFacility.id)) {
            return {
              ...f,
              available_beds: res.available_beds,
              total_beds: res.total_beds,
            };
          }
          return f;
        })
      );
    } catch (err) {
      console.error("Failed to update bed status:", err);
    } finally {
      setUpdatingBedId(null);
    }
  };

  const filteredModalBeds = useMemo(() => {
    if (telemetryWardFilter === "All") return facilityBeds;
    return facilityBeds.filter((b) => b.bed_type === telemetryWardFilter || b.ward.includes(telemetryWardFilter));
  }, [facilityBeds, telemetryWardFilter]);

  return (
    <div className="hospitals-page-container">
      {/* ============================================================
          MAIN SEARCH & FILTER PANEL (COMPACT TEAL/NAVY CARD)
          ============================================================ */}
      <section className="search-filter-card" aria-label="Hospital search and filters">
        {/* 1. FULL-WIDTH SEARCH BAR (h-12) */}
        <div className="search-bar-wrap">
          <label htmlFor="hospital-search-input" className="sr-only">
            Search hospitals, specialties or areas
          </label>
          <Search size={18} className="search-bar-icon" aria-hidden="true" />
          <input
            id="hospital-search-input"
            type="text"
            className="search-bar-input"
            placeholder="Search hospitals, specialties or areas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className="search-bar-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search text"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* MOBILE CONTROLS TOGGLE BUTTON */}
        <div className="sm:hidden flex justify-between items-center pt-1">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="mobile-filter-trigger-btn"
            aria-expanded={mobileDrawerOpen}
          >
            <SlidersHorizontal size={15} />
            <span>Filters & Location</span>
            {activeFiltersCount > 0 && (
              <span className="mobile-filter-badge">{activeFiltersCount}</span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button type="button" onClick={handleClearAll} className="clear-all-text-btn">
              Clear all
            </button>
          )}
        </div>

        {/* 2. CONTROLS ROW (4-COLUMN RESPONSIVE GRID, h-11) */}
        <div className="controls-grid hidden sm:grid">
          {/* CONTROL 1: Location / City Autocomplete */}
          <div className="control-group">
            <label htmlFor="filter-location" className="control-label">
              Location
            </label>
            <div className="location-autocomplete-wrap">
              <MapPin size={16} className="control-icon text-slate-400" aria-hidden="true" />
              <input
                ref={locationInputRef}
                id="filter-location"
                type="text"
                className="control-input location-input"
                placeholder={userCityName ? `${userCityName} (GPS)` : "Enter city or area…"}
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handleCenterUser}
                className="btn-use-gps"
                title="Use my current GPS location"
                aria-label="Use current location"
              >
                <Locate size={15} className={locationStatus === "locating" ? "spin-icon" : ""} />
              </button>

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="suggestions-dropdown" role="listbox">
                  {citySuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setLocationQuery(item.cityOnly);
                        setShowSuggestions(false);
                      }}
                    >
                      <MapPin size={13} className="text-teal-500 flex-shrink-0" />
                      <span className="truncate">{item.display}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CONTROL 2: Facility Type */}
          <div className="control-group">
            <label htmlFor="filter-facility-type" className="control-label">
              Facility Type
            </label>
            <div className="select-control-wrap">
              <select
                id="filter-facility-type"
                className="control-select"
                value={facilityType}
                onChange={(e) => {
                  setFacilityType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "All" ? "All Facility Types" : t}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="chevron-icon" aria-hidden="true" />
            </div>
          </div>

          {/* CONTROL 3: Distance */}
          <div className="control-group">
            <label htmlFor="filter-distance" className="control-label">
              Distance
            </label>
            <div className="select-control-wrap">
              <select
                id="filter-distance"
                className="control-select"
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {DISTANCE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="chevron-icon" aria-hidden="true" />
            </div>
          </div>

          {/* CONTROL 4: Sort */}
          <div className="control-group">
            <label htmlFor="filter-sort" className="control-label">
              Sort By
            </label>
            <div className="select-control-wrap">
              <select
                id="filter-sort"
                className="control-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="chevron-icon" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* 3. QUICK CHIPS (MULTI-SELECT WITH ICONS) */}
        <div className="quick-chips-row" role="group" aria-label="Quick hospital feature filters">
          <button
            type="button"
            className={`quick-chip ${chips.emergency ? "chip-active" : ""}`}
            onClick={() => toggleChip("emergency")}
            aria-pressed={chips.emergency}
          >
            <Flame size={14} className={chips.emergency ? "text-white" : "text-amber-500"} />
            <span>24/7 Emergency</span>
          </button>

          <button
            type="button"
            className={`quick-chip ${chips.openNow ? "chip-active" : ""}`}
            onClick={() => toggleChip("openNow")}
            aria-pressed={chips.openNow}
          >
            <Clock size={14} className={chips.openNow ? "text-white" : "text-teal-400"} />
            <span>Open now</span>
          </button>

          <button
            type="button"
            className={`quick-chip ${chips.hasIcu ? "chip-active" : ""}`}
            onClick={() => toggleChip("hasIcu")}
            aria-pressed={chips.hasIcu}
          >
            <Activity size={14} className={chips.hasIcu ? "text-white" : "text-cyan-400"} />
            <span>Has ICU</span>
          </button>

          <button
            type="button"
            className={`quick-chip ${chips.insurance ? "chip-active" : ""}`}
            onClick={() => toggleChip("insurance")}
            aria-pressed={chips.insurance}
          >
            <ShieldCheck size={14} className={chips.insurance ? "text-white" : "text-blue-400"} />
            <span>Accepts insurance</span>
          </button>

          <button
            type="button"
            className={`quick-chip ${chips.ambulance ? "chip-active" : ""}`}
            onClick={() => toggleChip("ambulance")}
            aria-pressed={chips.ambulance}
          >
            <Truck size={14} className={chips.ambulance ? "text-white" : "text-emerald-400"} />
            <span>Ambulance</span>
          </button>
        </div>

        {/* 4. DYNAMIC FOOTER LINE (ACTIVE FILTER TAGS & SUMMARY) */}
        {activeFiltersCount > 0 && (
          <div className="panel-footer-line">
            <span className="results-summary-text">
              Showing <strong>{facilities.length}</strong> hospital{facilities.length === 1 ? "" : "s"} near{" "}
              <strong className="text-teal-300">{locationLabel}</strong>
            </span>

            <div className="active-tags-list">
              {search && (
                <span className="active-filter-tag">
                  "{search}"
                  <button type="button" onClick={() => setSearch("")} aria-label="Remove search filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {locationQuery && (
                <span className="active-filter-tag">
                  Near {locationQuery}
                  <button type="button" onClick={() => setLocationQuery("")} aria-label="Remove location filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {facilityType !== "All" && (
                <span className="active-filter-tag">
                  {facilityType}
                  <button type="button" onClick={() => setFacilityType("All")} aria-label="Remove type filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {distance !== "all" && (
                <span className="active-filter-tag">
                  ≤ {distance} km
                  <button type="button" onClick={() => setDistance("all")} aria-label="Remove distance filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {chips.emergency && (
                <span className="active-filter-tag">
                  24/7 ER
                  <button type="button" onClick={() => toggleChip("emergency")} aria-label="Remove emergency filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {chips.openNow && (
                <span className="active-filter-tag">
                  Open now
                  <button type="button" onClick={() => toggleChip("openNow")} aria-label="Remove open now filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {chips.hasIcu && (
                <span className="active-filter-tag">
                  ICU
                  <button type="button" onClick={() => toggleChip("hasIcu")} aria-label="Remove ICU filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {chips.insurance && (
                <span className="active-filter-tag">
                  Insurance
                  <button type="button" onClick={() => toggleChip("insurance")} aria-label="Remove insurance filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {chips.ambulance && (
                <span className="active-filter-tag">
                  Ambulance
                  <button type="button" onClick={() => toggleChip("ambulance")} aria-label="Remove ambulance filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              <button type="button" onClick={handleClearAll} className="clear-all-text-btn">
                Clear all
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================
          LEAFLET GEOSPATIAL MAP RADAR
          ============================================================ */}
      <section className="hospitals-map-section">
        <div className="map-header">
          <div className="flex items-center gap-2">
            <Compass size={17} className="text-teal-400" />
            <h3 className="text-sm font-bold text-white">Live Hospital Location Radar</h3>
            <span className="map-badge-count">{facilities.length} mapped</span>
          </div>

          {userLocation && (
            <button type="button" onClick={handleCenterUser} className="btn-map-locate">
              <Locate size={13} />
              <span>Center on Me</span>
            </button>
          )}
        </div>

        <div className="leaflet-map-wrapper">
          <div ref={mapContainerRef} className="leaflet-map-element" />
        </div>
      </section>

      {/* ============================================================
          HOSPITAL CARDS GRID WITH LIVE CAPACITY
          ============================================================ */}
      <section className="hospitals-list-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Available Hospitals & Medical Centers
            <span className="text-sm font-normal text-slate-400 ml-2">({totalCount})</span>
          </h2>
          <span className="live-telemetry-pill">
            <span className="live-telemetry-dot"></span>
            Live IoT Bed Telemetry
          </span>
        </div>

        {loading ? (
          <div className="hospitals-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="hospital-card-skeleton">
                <div className="skeleton-bar w-3/4 h-5 mb-2"></div>
                <div className="skeleton-bar w-1/2 h-4 mb-4"></div>
                <div className="skeleton-bar w-full h-16 mb-4"></div>
                <div className="skeleton-bar w-full h-10 mt-auto"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty-state-card">
            <AlertCircle size={36} className="text-red-400 mb-2" />
            <h3 className="text-base font-bold text-white">Error Loading Facilities</h3>
            <p className="text-xs text-slate-400 mb-4">{error}</p>
            <button type="button" onClick={() => fetchFacilities()} className="btn-retry">
              Retry Search
            </button>
          </div>
        ) : facilities.length === 0 ? (
          <div className="empty-state-card">
            <Building2 size={36} className="text-slate-500 mb-2" />
            <h3 className="text-base font-bold text-white">No hospitals match your filters</h3>
            <p className="text-xs text-slate-400 mb-4">
              Try expanding your distance, clearing filters, or searching for a different city or specialty.
            </p>
            <button type="button" onClick={handleClearAll} className="btn-retry">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="hospitals-grid">
            {facilities.map((fac) => {
              const totalBeds = fac.total_beds || 100;
              const availBeds = fac.available_beds !== undefined ? fac.available_beds : 24;
              const occupancyPct = Math.min(100, Math.round(((totalBeds - availBeds) / totalBeds) * 100));

              return (
                <article key={fac._id || fac.id} className="hospital-card">
                  {/* Card Header */}
                  <div className="card-top-row">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="card-facility-tag">
                          {fac.facility_type || fac.type || "Hospital"}
                        </span>
                        {fac.emergency && (
                          <span className="card-er-tag">
                            <Flame size={10} /> 24/7 ER
                          </span>
                        )}
                      </div>
                      <h3 className="card-hospital-name" title={fac.name}>{fac.name}</h3>
                    </div>

                    <div className="card-rating-badge">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span>{fac.rating || 4.8}</span>
                    </div>
                  </div>

                  {/* Address & Distance */}
                  <div className="card-meta-row">
                    <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="card-address-text truncate">
                      {fac.address || fac.city}, {fac.state}
                    </span>
                    {fac.distanceKm !== undefined && fac.distanceKm !== null && (
                      <span className="card-distance-pill">
                        {fac.distanceKm} km
                      </span>
                    )}
                  </div>

                  {/* Specialties */}
                  <div className="card-specialties-wrap">
                    {(fac.specialties || []).slice(0, 3).map((spec, i) => (
                      <span key={i} className="card-spec-tag">{spec}</span>
                    ))}
                    {(fac.specialties || []).length > 3 && (
                      <span className="card-spec-more">+{fac.specialties.length - 3}</span>
                    )}
                  </div>

                  {/* Live Bed Capacity Gauge */}
                  <div className="card-telemetry-gauge">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="gauge-pulse-dot"></span>
                        {availBeds} Beds Free
                      </span>
                      <span className="text-slate-400">
                        {occupancyPct}% Occupied ({totalBeds} total)
                      </span>
                    </div>

                    <div className="gauge-track">
                      <div
                        className="gauge-fill"
                        style={{
                          width: `${occupancyPct}%`,
                          backgroundColor: occupancyPct > 85 ? "#ef4444" : occupancyPct > 65 ? "#f59e0b" : "#14b8a6",
                        }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span>ICU: <strong className="text-teal-300">{fac.icu_beds_available || 4} Free</strong></span>
                      <span>Ventilators: <strong className="text-cyan-300">{fac.ventilators_available || 2} Free</strong></span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="card-footer-actions">
                    <button
                      type="button"
                      onClick={() => handleOpenTelemetryModal(fac)}
                      className="btn-card-telemetry"
                    >
                      <Activity size={13} />
                      <span>Live Bed Feed</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${fac.lat},${fac.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-card-icon"
                      title="Get Directions"
                    >
                      <Navigation size={14} />
                    </a>

                    <a
                      href={`tel:${fac.phone}`}
                      className="btn-card-icon"
                      title="Call Hospital"
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================
          MOBILE BOTTOM SHEET FILTER DRAWER
          ============================================================ */}
      {mobileDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileDrawerOpen(false)}>
          <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-teal-400" />
                <h3 className="text-base font-bold text-white">Filter Hospitals</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="drawer-close-btn"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body space-y-4">
              {/* Location Input */}
              <div className="control-group">
                <label className="control-label">Location (City)</label>
                <input
                  type="text"
                  className="control-input"
                  placeholder="Enter city name…"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>

              {/* Facility Type */}
              <div className="control-group">
                <label className="control-label">Facility Type</label>
                <div className="select-control-wrap">
                  <select
                    className="control-select"
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                  >
                    {FACILITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="chevron-icon" />
                </div>
              </div>

              {/* Distance */}
              <div className="control-group">
                <label className="control-label">Distance</label>
                <div className="select-control-wrap">
                  <select
                    className="control-select"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  >
                    {DISTANCE_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="chevron-icon" />
                </div>
              </div>

              {/* Sort By */}
              <div className="control-group">
                <label className="control-label">Sort By</label>
                <div className="select-control-wrap">
                  <select
                    className="control-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="chevron-icon" />
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                onClick={() => {
                  handleClearAll();
                  setMobileDrawerOpen(false);
                }}
                className="btn-drawer-clear"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="btn-drawer-apply"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          LIVE BED TELEMETRY MODAL
          ============================================================ */}
      {telemetryModalFacility && (
        <div className="telemetry-modal-overlay" onClick={() => setTelemetryModalFacility(null)}>
          <div className="telemetry-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="telemetry-modal-header">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="live-telemetry-pill">
                    <span className="live-telemetry-dot"></span>
                    ACTIVE IOT GATEWAY FEED
                  </span>
                  <span className="text-xs text-slate-400">
                    Updated: {new Date(telemetryLastUpdated).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{telemetryModalFacility.name}</h3>
                <p className="text-xs text-slate-400">
                  {telemetryModalFacility.address || telemetryModalFacility.city}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTelemetryModalFacility(null)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="telemetry-modal-body">
              {/* Stat Summary */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="stat-tile">
                  <span className="stat-tile-label">Total Beds</span>
                  <span className="stat-tile-val text-white">{facilityBeds.length}</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-tile-label">Available</span>
                  <span className="stat-tile-val text-teal-400">
                    {facilityBeds.filter((b) => b.status === "Available").length}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-tile-label">Occupied</span>
                  <span className="stat-tile-val text-blue-400">
                    {facilityBeds.filter((b) => b.status === "Occupied").length}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-tile-label">ICU Free</span>
                  <span className="stat-tile-val text-cyan-400">
                    {facilityBeds.filter((b) => b.bed_type === "ICU" && b.status === "Available").length}
                  </span>
                </div>
              </div>

              {/* Ward Filter Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {["All", "ICU", "HDU", "Emergency", "Ventilator", "General"].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setTelemetryWardFilter(w)}
                    className={`ward-filter-btn ${telemetryWardFilter === w ? "ward-btn-active" : ""}`}
                  >
                    {w} Units
                  </button>
                ))}
              </div>

              {/* Bed Grid Visualizer */}
              {telemetryLoading ? (
                <div className="py-12 text-center">
                  <Loader2 size={28} className="spin-icon text-teal-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading IoT telemetry bed units…</p>
                </div>
              ) : (
                <div className="bed-matrix-grid">
                  {filteredModalBeds.map((bed) => {
                    const isUpdating = updatingBedId === bed.bed_id;
                    const statusClass = `bed-${bed.status.toLowerCase()}`;

                    return (
                      <button
                        key={bed.bed_id}
                        type="button"
                        onClick={() => handleToggleBedStatus(bed)}
                        disabled={isUpdating}
                        className={`bed-card ${statusClass}`}
                        title={`Click to cycle status (Current: ${bed.status})`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white mb-1">
                          <Bed size={12} />
                          <span>{bed.bed_id}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block mb-1">{bed.ward}</span>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="bed-badge">{bed.status}</span>
                          {bed.oxygen_connected && <span className="text-cyan-400 font-bold">O₂</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="telemetry-modal-footer">
              <span className="text-[11px] text-slate-400">
                Click any bed tile to toggle status (Available ➔ Occupied ➔ Reserved ➔ Maint.)
              </span>
              <button
                type="button"
                onClick={() => setTelemetryModalFacility(null)}
                className="btn-modal-done"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
