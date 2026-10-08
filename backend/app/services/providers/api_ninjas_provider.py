import os
import time
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# In-memory cache for API Ninjas results (query_key -> (timestamp, data))
_CACHE: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL_SECONDS = 600  # 10 minutes cache


def get_api_ninjas_status() -> Dict[str, Any]:
    """Returns the integration status of API Ninjas Hospitals API."""
    api_key = os.environ.get("API_NINJAS_KEY", "").strip()
    is_configured = bool(api_key and api_key != "your_api_key_here")

    return {
        "id": "api_ninjas",
        "name": "API Ninjas Hospitals API",
        "official_url": "https://api-ninjas.com/api/hospitals",
        "auth_type": "API Key (X-Api-Key Header)",
        "configured": is_configured,
        "status": "ACTIVE" if is_configured else "NEEDS_KEY",
        "details": (
            "Connected to API Ninjas global hospital registry."
            if is_configured
            else "API_NINJAS_KEY environment variable is not configured. Add API_NINJAS_KEY to backend/.env to query global API Ninjas hospital records."
        ),
        "provides_realtime_beds": False,
        "update_frequency": "Periodic Provider Sync",
    }


def fetch_hospitals_from_api_ninjas(
    name: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: Optional[str] = None,
    zip_code: Optional[str] = None,
    hospital_type: Optional[str] = None,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Fetches hospital listings from API Ninjas Hospitals API.
    Maps results to the standard CareBridge hospital data structure.
    """
    api_key = os.environ.get("API_NINJAS_KEY", "").strip()
    if not api_key or api_key == "your_api_key_here":
        return {
            "source": "api_ninjas",
            "success": False,
            "configured": False,
            "hospitals": [],
            "message": "API_NINJAS_KEY is not configured in environment.",
        }

    # Build query params
    params: Dict[str, Any] = {}
    if name:
        params["name"] = name.strip()
    if city:
        params["city"] = city.strip()
    if state:
        params["state"] = state.strip()
    if country:
        params["country"] = country.strip()
    if zip_code:
        params["zip"] = zip_code.strip()
    if hospital_type:
        params["type"] = hospital_type.strip()

    cache_key = f"{params.get('name')}|{params.get('city')}|{params.get('state')}|{params.get('country')}|{limit}"
    now = time.time()

    # Check cache
    if cache_key in _CACHE:
        cached_time, cached_data = _CACHE[cache_key]
        if now - cached_time < _CACHE_TTL_SECONDS:
            return {
                "source": "api_ninjas",
                "success": True,
                "configured": True,
                "cached": True,
                "hospitals": cached_data,
                "count": len(cached_data),
            }

    url = "https://api.api-ninjas.com/v1/hospitals"
    headers = {"X-Api-Key": api_key}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=6)
        if response.status_code == 200:
            raw_data = response.json()
            if not isinstance(raw_data, list):
                raw_data = []

            mapped_hospitals: List[Dict[str, Any]] = []
            for item in raw_data[:limit]:
                h_name = item.get("name") or "Unnamed Hospital"
                h_city = item.get("city") or "N/A"
                h_state = item.get("state") or "N/A"
                h_country = item.get("country") or "Global"
                h_address = item.get("address") or f"{h_city}, {h_state}"
                h_phone = item.get("phone") or None
                h_website = item.get("url") or item.get("website") or None
                h_type = item.get("hospital_type") or item.get("type") or "General Medical & Surgical"
                h_ownership = item.get("ownership") or item.get("owner") or "Private / Trust"
                
                # Beds info if provided by Ninjas
                beds_raw = item.get("beds") or item.get("total_beds")
                total_beds = int(beds_raw) if beds_raw and str(beds_raw).isdigit() else None

                mapped_hospitals.append({
                    "id": f"ninja_{item.get('id', hash(h_name))}",
                    "name": h_name,
                    "address": h_address,
                    "city": h_city,
                    "state": h_state,
                    "country": h_country,
                    "postal_code": item.get("zip") or item.get("postal_code") or None,
                    "phone": h_phone,
                    "website": h_website,
                    "facility_type": h_type,
                    "ownership": h_ownership,
                    "total_beds": total_beds,
                    "occupied_beds": None,
                    "available_beds": None,
                    "emergency": bool(item.get("emergency_services", True)),
                    "rating": float(item.get("rating", 4.2)) if item.get("rating") else 4.2,
                    "data_source": "API Ninjas Hospitals API",
                    "source_id": str(item.get("id", "")),
                    "source_updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "retrieved_at": datetime.now(timezone.utc).isoformat(),
                    "data_freshness": "Periodic Provider Data (Not Live Telemetry)",
                })

            _CACHE[cache_key] = (now, mapped_hospitals)
            return {
                "source": "api_ninjas",
                "success": True,
                "configured": True,
                "cached": False,
                "hospitals": mapped_hospitals,
                "count": len(mapped_hospitals),
            }
        elif response.status_code == 400:
            return {
                "source": "api_ninjas",
                "success": False,
                "configured": True,
                "hospitals": [],
                "message": f"API Ninjas bad request: {response.text}",
            }
        elif response.status_code in [401, 403]:
            return {
                "source": "api_ninjas",
                "success": False,
                "configured": False,
                "hospitals": [],
                "message": "Invalid or unauthorized API_NINJAS_KEY.",
            }
        elif response.status_code == 429:
            return {
                "source": "api_ninjas",
                "success": False,
                "configured": True,
                "hospitals": [],
                "message": "API Ninjas rate limit exceeded. Please try again later.",
            }
        else:
            return {
                "source": "api_ninjas",
                "success": False,
                "configured": True,
                "hospitals": [],
                "message": f"API Ninjas returned HTTP {response.status_code}",
            }
    except requests.exceptions.RequestException as e:
        return {
            "source": "api_ninjas",
            "success": False,
            "configured": True,
            "hospitals": [],
            "message": f"API Ninjas network timeout or connection error: {str(e)}",
        }
