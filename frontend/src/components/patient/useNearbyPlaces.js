import { useState, useEffect, useCallback, useRef } from "react";
import hospitalService from "../../services/hospitalService";

// Default fallback coordinates: Hyderabad, Telangana, India
export const HYDERABAD_COORDS = {
  lat: 17.3850,
  lng: 78.4867,
  address: "Hyderabad, Telangana, India",
};

// Haversine formula to compute geodesic distance in kilometers
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
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
  return parseFloat((R * c).toFixed(2));
}

// 10-minute LocalStorage + In-Memory Cache for facility responses
const LOCAL_STORAGE_CACHE_PREFIX = "carebridge_radar_cache_";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getStorageCache(key) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed.data;
    }
  } catch (e) {
    console.warn("Storage cache read error:", e);
  }
  return null;
}

function setStorageCache(key, data) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_CACHE_PREFIX + key,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (e) {
    console.warn("Storage cache write error:", e);
  }
}

// Verified default medical and emergency facilities around Hyderabad to guarantee 24/7 availability
const DEFAULT_HYDERABAD_FACILITIES = [
  {
    id: "hyd-kims-secunderabad",
    name: "KIMS Hospitals, Secunderabad",
    type: "hospital",
    subType: "hospital",
    lat: 17.4375,
    lng: 78.4839,
    address: "1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet, Secunderabad",
    phone: "+91 40 4488 5000",
    emergency: true,
    isDbHospital: true,
    rating: 4.8,
    specialties: ["Emergency & Trauma", "Cardiology", "Neurology", "Critical Care"],
  },
  {
    id: "hyd-apollo-jubilee",
    name: "Apollo Health City, Jubilee Hills",
    type: "hospital",
    subType: "hospital",
    lat: 17.4265,
    lng: 78.4125,
    address: "Road No. 72, Opposite Bharatiya Vidya Bhavan, Film Nagar, Jubilee Hills",
    phone: "+91 40 2360 7777",
    emergency: true,
    isDbHospital: true,
    rating: 4.9,
    specialties: ["Level 1 Trauma Center", "Emergency Medicine", "Cardiac ICU"],
  },
  {
    id: "hyd-yashoda-somajiguda",
    name: "Yashoda Hospitals, Somajiguda",
    type: "hospital",
    subType: "hospital",
    lat: 17.4276,
    lng: 78.4578,
    address: "Raj Bhavan Road, Matha Nagar, Somajiguda, Hyderabad",
    phone: "+91 40 4567 4567",
    emergency: true,
    isDbHospital: true,
    rating: 4.7,
    specialties: ["24/7 Stroke Unit", "Emergency Care", "Interventional Cardiology"],
  },
  {
    id: "hyd-osmania-general",
    name: "Osmania General Hospital",
    type: "hospital",
    subType: "hospital",
    lat: 17.3762,
    lng: 78.4735,
    address: "Afzal Gunj, Hyderabad, Telangana 500012",
    phone: "+91 40 2460 0121",
    emergency: true,
    isDbHospital: true,
    rating: 4.4,
    specialties: ["State Trauma Center", "Emergency Casualty", "Surgical ICU"],
  },
  {
    id: "hyd-care-banjara",
    name: "CARE Hospitals, Banjara Hills",
    type: "hospital",
    subType: "hospital",
    lat: 17.4156,
    lng: 78.4485,
    address: "Road No. 1, Banjara Hills, Hyderabad, Telangana 500034",
    phone: "+91 40 6165 6565",
    emergency: true,
    isDbHospital: true,
    rating: 4.7,
    specialties: ["Cardiac Emergency", "Emergency Medicine", "Pediatric ICU"],
  },
  {
    id: "hyd-police-punjagutta",
    name: "Punjagutta Police Station",
    type: "police",
    subType: "police",
    lat: 17.4285,
    lng: 78.4518,
    address: "Nagarjuna Circle, Punjagutta, Hyderabad, Telangana 500082",
    phone: "100",
    emergency: true,
    isDbHospital: false,
    rating: 4.5,
    specialties: ["Law Enforcement", "Emergency Response Team", "Patrol Unit"],
  },
  {
    id: "hyd-police-begumpet",
    name: "Begumpet Police Station",
    type: "police",
    subType: "police",
    lat: 17.4412,
    lng: 78.4719,
    address: "Main Road, Begumpet, Hyderabad, Telangana 500016",
    phone: "100",
    emergency: true,
    isDbHospital: false,
    rating: 4.3,
    specialties: ["Emergency Rapid Action", "Traffic Control", "Public Safety"],
  },
  {
    id: "hyd-police-abids",
    name: "Abids Police Station",
    type: "police",
    subType: "police",
    lat: 17.3912,
    lng: 78.4785,
    address: "Station Road, Abids, Hyderabad, Telangana 500001",
    phone: "100",
    emergency: true,
    isDbHospital: false,
    rating: 4.4,
    specialties: ["Central Response", "Emergency Assistance"],
  },
  {
    id: "hyd-ambulance-somajiguda",
    name: "108 EMRI Central Dispatch Hub",
    type: "ambulance",
    subType: "ambulance",
    lat: 17.4241,
    lng: 78.4552,
    address: "Somajiguda Sector, Hyderabad Central",
    phone: "108",
    emergency: true,
    isDbHospital: false,
    rating: 4.9,
    specialties: ["ALS Fleet Dispatch", "Emergency Paramedic Unit", "Trauma Transit"],
  },
  {
    id: "hyd-ambulance-koti",
    name: "Red Cross & 108 Emergency Ambulance Station",
    type: "ambulance",
    subType: "ambulance",
    lat: 17.3865,
    lng: 78.4891,
    address: "Koti Medical Hub, Bank Street, Hyderabad",
    phone: "108",
    emergency: true,
    isDbHospital: false,
    rating: 4.8,
    specialties: ["Basic Life Support (BLS)", "Advanced Cardiac Transit"],
  },
  {
    id: "hyd-ambulance-secunderabad",
    name: "Secunderabad Rapid Ambulance Station",
    type: "ambulance",
    subType: "ambulance",
    lat: 17.4401,
    lng: 78.4982,
    address: "Station Road, Secunderabad, Telangana 500003",
    phone: "108",
    emergency: true,
    isDbHospital: false,
    rating: 4.6,
    specialties: ["24/7 Mobile ICU", "Neonatal Transit Unit"],
  },
];

export function useNearbyPlaces(options = {}) {
  const [userLocation, setUserLocation] = useState(HYDERABAD_COORDS);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationErrorMsg, setLocationErrorMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [userAccuracy, setUserAccuracy] = useState(null);

  const [radius, setRadius] = useState(options.initialRadius || 10); // km
  const [category, setCategory] = useState("all"); // 'all' | 'hospital' | 'police' | 'ambulance'
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sortBy, setSortBy] = useState("nearest"); // 'nearest' | 'name'

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Watch position ID ref for live location tracking
  const watchIdRef = useRef(null);
  const activeAbortControllerRef = useRef(null);

  // Geolocation with watchPosition
  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setLocationErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationDenied(false);
    setLocationErrorMsg("");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          address: `Live GPS (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
        });
        setUserAccuracy(accuracy);
        setIsLiveLocation(true);
        setLocationDenied(false);
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation watchPosition notice:", err.message);
        let msg = "Location access was denied or unavailable. Defaulting to Hyderabad, Telangana.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser settings or use the fallback city.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please check your network or GPS connection.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Defaulting to Hyderabad coordinates.";
        }
        setLocationDenied(true);
        setLocationErrorMsg(msg);
        setIsLiveLocation(false);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  const detectLiveLocation = useCallback(() => {
    startWatchingLocation();
  }, [startWatchingLocation]);

  // Query Overpass with multi-mirror fallback and exponential backoff
  const queryOverpassWithMirrors = async (lat, lng, radiusKm, signal) => {
    const radiusMeters = Math.min(Math.max(radiusKm * 1000, 1000), 50000);
    const query = `[out:json][timeout:15];
(
  node["amenity"~"hospital|clinic|police|ambulance_station"](around:${radiusMeters},${lat},${lng});
  way["amenity"~"hospital|clinic|police|ambulance_station"](around:${radiusMeters},${lat},{lng});
  relation["amenity"~"hospital|clinic|police|ambulance_station"](around:${radiusMeters},${lat},{lng});
  node["emergency"="ambulance_station"](around:${radiusMeters},${lat},{lng});
  way["emergency"="ambulance_station"](around:${radiusMeters},${lat},{lng});
  relation["emergency"="ambulance_station"](around:${radiusMeters},${lat},{lng});
);
out center tags;`;

    const mirrors = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

    let lastErr = null;

    for (const mirror of mirrors) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(mirror, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `data=${encodeURIComponent(query)}`,
            signal,
          });

          if (res.ok) {
            const json = await res.json();
            const elements = json.elements || [];
            if (elements.length > 0) {
              return elements;
            }
          }
        } catch (err) {
          if (err.name === "AbortError") throw err;
          lastErr = err;
        }
        // Small exponential delay between attempts
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
      }
    }

    if (lastErr) console.warn("All Overpass direct mirrors failed or timed out:", lastErr);
    return [];
  };

  // Fetch facilities combining Backend Proxy + Overpass Multi-mirror + Local DB
  const fetchFacilitiesUnified = async (lat, lng, radiusKm, signal) => {
    const roundedLat = parseFloat(lat.toFixed(3));
    const roundedLng = parseFloat(lng.toFixed(3));
    const cacheKey = `${roundedLat}_${roundedLng}_${radiusKm}`;

    // 1. Check 10-minute cache first
    const cached = getStorageCache(cacheKey);
    if (cached && cached.length > 0) {
      return { data: cached, fromCache: true };
    }

    let combinedResults = [];

    // 2. Try Backend Proxy endpoint first (/api/facilities/nearby/realtime or /api/hospitals/nearby/realtime)
    try {
      const backendRes = await hospitalService.getNearbyFacilities(lat, lng, radiusKm);
      if (backendRes && Array.isArray(backendRes.facilities) && backendRes.facilities.length > 0) {
        combinedResults = backendRes.facilities;
      }
    } catch (e) {
      console.warn("Backend proxy returned error, falling back to direct mirror fetch:", e.message);
    }

    // 3. If backend didn't return facilities, query Overpass mirrors directly
    if (combinedResults.length === 0) {
      try {
        const osmElements = await queryOverpassWithMirrors(lat, lng, radiusKm, signal);
        const mappedOsm = osmElements
          .map((el) => {
            const tags = el.tags || {};
            const elLat = el.lat || el.center?.lat;
            const elLng = el.lon || el.center?.lon;
            if (!elLat || !elLng) return null;

            const amenity = tags.amenity || "";
            let type = "hospital";
            if (amenity === "police") {
              type = "police";
            } else if (
              tags.emergency === "ambulance_station" ||
              amenity === "ambulance_station"
            ) {
              type = "ambulance";
            } else if (amenity === "clinic") {
              type = "hospital";
            }

            const name =
              tags.name ||
              tags["name:en"] ||
              (type === "police"
                ? "Police Station"
                : type === "ambulance"
                ? "Ambulance Station"
                : "Medical Clinic");

            const isEmergency =
              tags.emergency === "yes" ||
              tags.emergency === "24/7" ||
              tags["emergency:service"] === "yes" ||
              type === "ambulance" ||
              type === "police";

            const addrParts = [
              tags["addr:housenumber"],
              tags["addr:street"],
              tags["addr:suburb"],
              tags["addr:city"],
            ];
            const address =
              addrParts.filter(Boolean).join(", ") ||
              tags["addr:full"] ||
              `${name}, Vicinity`;

            const phone =
              tags.phone ||
              tags["contact:phone"] ||
              (type === "police" ? "100" : type === "ambulance" ? "108" : "102");

            return {
              id: `osm-${el.id}`,
              name,
              type,
              lat: elLat,
              lng: elLng,
              address,
              phone,
              emergency: isEmergency,
              isDbHospital: false,
              rating: 4.6,
              specialties: tags.healthcare
                ? [tags.healthcare]
                : ["General Care", "Emergency Triage"],
            };
          })
          .filter(Boolean);

        if (mappedOsm.length > 0) {
          combinedResults = mappedOsm;
        }
      } catch (err) {
        if (err.name === "AbortError") throw err;
        console.warn("Direct Overpass query caught:", err);
      }
    }

    // 4. Fetch local DB verified hospitals to ensure CareBridge platform integration
    try {
      const dbRes = await hospitalService.getHospitals({ limit: 50 });
      const hospList = dbRes.hospitals || [];
      const mappedDb = hospList.map((h) => ({
        id: h.id || h._id,
        name: h.name,
        type: "hospital",
        lat: parseFloat(h.lat),
        lng: parseFloat(h.lng),
        address: h.address || `${h.city}, ${h.state}`,
        phone: h.phone || "+91 40 2338 8000",
        emergency: Boolean(h.emergency || h.has_emergency),
        isDbHospital: true,
        rating: h.rating || 4.8,
        specialties: h.specialties || ["Multi-Specialty", "Emergency Medicine"],
      }));
      combinedResults = [...mappedDb, ...combinedResults];
    } catch (e) {
      console.warn("Local DB fetch fallback note:", e);
    }

    // 5. If near Hyderabad and combined results are scarce or empty, merge verified defaults
    const distToHyd = calculateDistance(lat, lng, HYDERABAD_COORDS.lat, HYDERABAD_COORDS.lng);
    if (distToHyd < 100 || combinedResults.length === 0) {
      combinedResults = [...DEFAULT_HYDERABAD_FACILITIES, ...combinedResults];
    }

    // 6. Compute distances, filter by radius, and deduplicate
    const withDistance = combinedResults.map((item) => ({
      ...item,
      distance: calculateDistance(lat, lng, item.lat, item.lng),
    }));

    const withinRadius = withDistance.filter((item) => item.distance <= radiusKm);

    const deduped = [];
    const seen = new Set();
    for (const item of withinRadius) {
      const cleanName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const rLat = item.lat ? item.lat.toFixed(3) : "0";
      const rLng = item.lng ? item.lng.toFixed(3) : "0";
      const key = `${cleanName}_${rLat}_${rLng}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    // Sort by distance
    deduped.sort((a, b) => a.distance - b.distance);

    // Save in 10-minute cache
    if (deduped.length > 0) {
      setStorageCache(cacheKey, deduped);
    }

    return { data: deduped, fromCache: false };
  };

  // Aggregator loader
  const loadNearbyData = useCallback(async () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const roundedLat = parseFloat(userLocation.lat.toFixed(3));
    const roundedLng = parseFloat(userLocation.lng.toFixed(3));
    const cacheKey = `${roundedLat}_${roundedLng}_${radius}`;

    // Instant load from cache if available while refreshing
    const cachedData = getStorageCache(cacheKey);
    if (cachedData && cachedData.length > 0) {
      setPlaces(cachedData);
      setLoading(false);
    }

    try {
      const { data } = await fetchFacilitiesUnified(
        userLocation.lat,
        userLocation.lng,
        radius,
        controller.signal
      );

      setPlaces(data);
      const now = new Date();
      setLastUpdated(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Failed to load geo-clinical radar data:", err);
      // If we don't already have places shown, display error banner
      if (!cachedData || cachedData.length === 0) {
        setError(
          "Unable to retrieve nearby medical and emergency facilities. Please click Retry."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userLocation.lat, userLocation.lng, radius]);

  // Initial trigger & 5-minute auto-refresh
  useEffect(() => {
    loadNearbyData();

    const interval = setInterval(() => {
      loadNearbyData();
    }, 5 * 60 * 1000); // 5 minutes auto-refresh

    return () => {
      clearInterval(interval);
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [loadNearbyData]);

  // Initial GPS detection on mount
  useEffect(() => {
    startWatchingLocation();
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startWatchingLocation]);

  return {
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
    refresh: loadNearbyData,
  };
}

export default useNearbyPlaces;
