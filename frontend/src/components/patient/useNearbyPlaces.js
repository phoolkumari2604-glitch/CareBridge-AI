import { useState, useEffect, useCallback, useRef } from "react";
import hospitalService from "../../services/hospitalService";

// Default fallback coordinates: Hyderabad, Telangana, India
export const HYDERABAD_COORDS = {
  lat: 17.385,
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

// 5-minute In-Memory Cache for Overpass API responses
const overpassCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function useNearbyPlaces(options = {}) {
  const [userLocation, setUserLocation] = useState(HYDERABAD_COORDS);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locating, setLocating] = useState(false);

  const [radius, setRadius] = useState(options.initialRadius || 10); // km
  const [category, setCategory] = useState("all"); // 'all' | 'hospital' | 'police' | 'ambulance'
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sortBy, setSortBy] = useState("nearest"); // 'nearest' | 'name'

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Acquire user's live GPS coordinates
  const detectLiveLocation = useCallback(() => {
    setLocating(true);
    setLocationDenied(false);

    if (!navigator.geolocation) {
      setLocationDenied(true);
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          address: `Current Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
        });
        setIsLiveLocation(true);
        setLocationDenied(false);
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or failed, falling back to Hyderabad:", err);
        setLocationDenied(true);
        setIsLiveLocation(false);
        setUserLocation(HYDERABAD_COORDS);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // Fetch from Overpass API with 5-minute caching
  const fetchOverpassFacilities = async (lat, lng, radiusKm) => {
    const radiusMeters = Math.min(Math.max(radiusKm * 1000, 1000), 50000);
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`;
    const cached = overpassCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // Build Overpass QL query targeting hospitals, clinics, police, and ambulance stations
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        node["amenity"="police"](around:${radiusMeters},${lat},${lng});
        way["amenity"="police"](around:${radiusMeters},${lat},${lng});
        node["emergency"="ambulance_station"](around:${radiusMeters},${lat},${lng});
        node["amenity"="ambulance_station"](around:${radiusMeters},${lat},${lng});
      );
      out center 100;
    `;

    const url = "https://overpass-api.de/api/interpreter";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      throw new Error(`Overpass API responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    const rawElements = json.elements || [];

    const mapped = rawElements
      .map((el) => {
        const tags = el.tags || {};
        const elLat = el.lat || el.center?.lat;
        const elLng = el.lon || el.center?.lon;
        if (!elLat || !elLng) return null;

        let type = "hospital";
        if (tags.amenity === "police") {
          type = "police";
        } else if (tags.emergency === "ambulance_station" || tags.amenity === "ambulance_station") {
          type = "ambulance";
        }

        const name = tags.name || tags["name:en"] || (type === "police" ? "Police Station" : type === "ambulance" ? "Ambulance Station" : "Medical Center");
        const emergency = tags.emergency === "yes" || tags.emergency === "24/7" || tags["emergency:service"] === "yes" || type === "ambulance" || type === "police";

        return {
          id: `osm-${el.id}`,
          name,
          type,
          lat: elLat,
          lng: elLng,
          address: tags["addr:street"]
            ? `${tags["addr:housenumber"] || ""} ${tags["addr:street"]}, ${tags["addr:city"] || ""}`.trim()
            : tags["addr:full"] || `${name}, Vicinity`,
          phone: tags.phone || tags["contact:phone"] || (type === "police" ? "100" : type === "ambulance" ? "108" : "+91 40 2345 6789"),
          emergency,
          isDbHospital: false,
          rating: 4.5,
          specialties: tags.healthcare ? [tags.healthcare] : ["General Care", "Emergency Triage"],
        };
      })
      .filter(Boolean);

    overpassCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
    return mapped;
  };

  // Fetch local DB hospitals
  const fetchDbHospitals = async () => {
    try {
      const res = await hospitalService.getHospitals({ limit: 50 });
      const hospList = res.hospitals || [];
      return hospList.map((h) => ({
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
    } catch (e) {
      console.warn("Could not retrieve DB hospitals, using OSM places only:", e);
      return [];
    }
  };

  // Core aggregator effect
  const loadNearbyData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [osmPlaces, dbHospitals] = await Promise.all([
        fetchOverpassFacilities(userLocation.lat, userLocation.lng, radius),
        fetchDbHospitals(),
      ]);

      // Calculate distance for all items
      const withDistance = [...dbHospitals, ...osmPlaces].map((item) => ({
        ...item,
        distance: calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng),
      }));

      // Filter by radius
      const withinRadius = withDistance.filter((item) => item.distance <= radius);

      // De-duplicate by name and nearby coordinate (<150m)
      const deduped = [];
      const seen = new Set();

      for (const item of withinRadius) {
        const normName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const roundedLat = item.lat.toFixed(3);
        const roundedLng = item.lng.toFixed(3);
        const key = `${normName}_${roundedLat}_${roundedLng}`;

        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }

      setPlaces(deduped);
    } catch (err) {
      console.error("Failed to load geo-clinical radar data:", err);
      setError("Unable to retrieve nearby medical and emergency facilities. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userLocation.lat, userLocation.lng, radius]);

  useEffect(() => {
    loadNearbyData();
  }, [loadNearbyData]);

  // Initial GPS detection on mount
  useEffect(() => {
    detectLiveLocation();
  }, [detectLiveLocation]);

  return {
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
    refresh: loadNearbyData,
  };
}

export default useNearbyPlaces;
