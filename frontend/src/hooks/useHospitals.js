import { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api";
import { calculateHaversineDistance, fetchOverpassHospitals } from "../utils/geo";

/**
 * Custom hook to fetch and filter hospitals with 500ms debounce, AbortController,
 * Haversine proximity computation, and OpenStreetMap Overpass fallback.
 */
export function useHospitals(filters = {}, location = null) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchHospitalsData = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const lat = location?.lat || 17.385;
    const lng = location?.lng || 78.4867;
    const radius = filters?.radius || 10;
    const search = filters?.search?.trim() || "";
    const type = filters?.type && filters.type !== "all" ? filters.type : "";
    const specialty = filters?.specialty && filters.specialty !== "all" ? filters.specialty : "";
    const emergency = filters?.emergencyOnly ? "true" : "";
    const openNow = filters?.openNow ? "true" : "";
    const sortBy = filters?.sortBy || "nearest";

    try {
      const params = {
        lat,
        lng,
        radius,
        radius_km: radius,
        q: search,
        search,
        facility_type: type,
        type,
        specialty,
        emergency,
        open_now: openNow,
        sort_by: sortBy,
        limit: 50,
      };

      let list = [];
      let usedFallback = false;

      try {
        const res = await api.get("/hospitals", {
          params,
          signal: controller.signal,
        });

        const data = res.data;
        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data?.hospitals)) {
          list = data.hospitals;
        } else if (Array.isArray(data?.facilities)) {
          list = data.facilities;
        }
      } catch (backendErr) {
        if (backendErr.name === "AbortError" || controller.signal.aborted) {
          return;
        }
        console.warn("Backend /api/hospitals call failed, attempting Overpass API fallback...", backendErr);
      }

      // If backend returned no results or failed, invoke OpenStreetMap Overpass fallback
      if (!list || list.length === 0) {
        try {
          const fallbackData = await fetchOverpassHospitals(lat, lng, radius, controller.signal);
          if (fallbackData && fallbackData.length > 0) {
            list = fallbackData;
            usedFallback = true;
          }
        } catch (fbErr) {
          if (fbErr.name === "AbortError" || controller.signal.aborted) return;
          console.warn("Fallback Overpass fetch also failed:", fbErr);
        }
      }

      // Format and compute distances if missing
      let mapped = list.map((h) => {
        const hLat = parseFloat(h.lat || h.latitude || 0);
        const hLng = parseFloat(h.lng || h.longitude || 0);
        const dist =
          h.distanceKm !== undefined
            ? h.distanceKm
            : h.distance_km !== undefined
            ? h.distance_km
            : calculateHaversineDistance(lat, lng, hLat, hLng);

        return {
          ...h,
          id: h.id || h._id || `h-${Math.random()}`,
          lat: hLat,
          lng: hLng,
          distanceKm: dist,
          distance_km: dist,
          emergency: Boolean(h.emergency || h.is_emergency_enabled),
          rating: typeof h.rating === "number" ? h.rating : 4.6,
          openNow: h.openNow !== undefined ? h.openNow : h.open_now !== undefined ? h.open_now : true,
          specialties: Array.isArray(h.specialties)
            ? h.specialties
            : typeof h.specialties === "string"
            ? h.specialties.split(",").map((s) => s.trim())
            : ["General Medicine", "Emergency & Trauma"],
        };
      });

      // Filter locally if search / specialty / emergency / openNow are applied
      if (search) {
        const sLower = search.toLowerCase();
        mapped = mapped.filter(
          (h) =>
            h.name?.toLowerCase().includes(sLower) ||
            h.address?.toLowerCase().includes(sLower) ||
            h.specialties?.some((sp) => sp.toLowerCase().includes(sLower))
        );
      }

      if (filters?.emergencyOnly) {
        mapped = mapped.filter((h) => h.emergency);
      }

      if (filters?.openNow) {
        mapped = mapped.filter((h) => h.openNow);
      }

      if (type && type.toLowerCase() !== "all") {
        mapped = mapped.filter((h) => (h.type || h.facility_type || "").toLowerCase().includes(type.toLowerCase()));
      }

      if (specialty && specialty.toLowerCase() !== "all") {
        mapped = mapped.filter((h) =>
          h.specialties?.some((sp) => sp.toLowerCase().includes(specialty.toLowerCase()))
        );
      }

      // Apply sorting
      if (sortBy === "nearest") {
        mapped.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      } else if (sortBy === "rating") {
        mapped.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      }

      setHospitals(mapped);
      setIsFallback(usedFallback);
    } catch (err) {
      if (err.name === "AbortError" || controller.signal.aborted) return;
      console.error("useHospitals hook error:", err);
      setError("Unable to load hospitals. Please check your connection and try again.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    location?.lat,
    location?.lng,
    filters?.radius,
    filters?.search,
    filters?.type,
    filters?.specialty,
    filters?.emergencyOnly,
    filters?.openNow,
    filters?.sortBy,
  ]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchHospitalsData();
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHospitalsData]);

  return {
    hospitals,
    loading,
    error,
    isFallback,
    refetch: fetchHospitalsData,
  };
}
