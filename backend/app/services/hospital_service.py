from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from app.core.database import get_database
from app.utils.helpers import is_valid_object_id

from app.services.providers.local_db_provider import (
    fetch_hospitals_from_local_db,
    get_local_db_status,
)
from app.services.providers.api_ninjas_provider import (
    fetch_hospitals_from_api_ninjas,
    get_api_ninjas_status,
)
from app.services.providers.cms_provider import (
    fetch_hospitals_from_cms,
    get_cms_status,
)
from app.services.providers.hmis_provider import (
    fetch_hospitals_from_hmis,
    get_hmis_status,
)


def get_all_sources_status() -> Dict[str, Any]:
    """Returns the integration and health status for all 4 hospital data providers."""
    return {
        "carebridge_db": get_local_db_status(),
        "api_ninjas": get_api_ninjas_status(),
        "cms": get_cms_status(),
        "hmis": get_hmis_status(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def get_aggregated_hospitals(
    page: int = 1,
    limit: int = 12,
    search: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: Optional[str] = None,
    facility_type: Optional[str] = None,
    ownership: Optional[str] = None,
    source: Optional[str] = "all",
    has_emergency: Optional[bool] = None,
    sort_by: str = "recommended",
) -> Dict[str, Any]:
    """
    Fetches and merges hospitals across enabled providers according to the source filter.
    Applies pagination, sorting, and returns comprehensive data freshness metadata.
    """
    merged_hospitals: List[Dict[str, Any]] = []
    sources_status = get_all_sources_status()

    # 1. Local MongoDB Provider
    if source in ["all", "carebridge_db", "local"]:
        db_res = fetch_hospitals_from_local_db(
            name=search,
            city=city,
            state=state,
            country=country,
            hospital_type=facility_type,
            ownership=ownership,
            has_emergency=has_emergency,
            limit=200,
        )
        if db_res.get("success"):
            merged_hospitals.extend(db_res.get("hospitals", []))

    # 2. U.S. CMS Provider (if applicable or requested)
    if source in ["all", "cms"]:
        # Only query CMS if country is USA or unspecified
        if not country or country.lower() in ["united states", "usa", "us"]:
            cms_res = fetch_hospitals_from_cms(
                name=search,
                city=city,
                state=state,
                limit=30,
            )
            if cms_res.get("success"):
                merged_hospitals.extend(cms_res.get("hospitals", []))

    # 3. API Ninjas Provider (if configured and requested)
    if source in ["all", "api_ninjas"]:
        if sources_status["api_ninjas"]["configured"]:
            ninja_res = fetch_hospitals_from_api_ninjas(
                name=search,
                city=city,
                state=state,
                country=country,
                hospital_type=facility_type,
                limit=30,
            )
            if ninja_res.get("success"):
                merged_hospitals.extend(ninja_res.get("hospitals", []))

    # De-duplicate by name + city (case-insensitive)
    seen = set()
    unique_hospitals: List[Dict[str, Any]] = []
    for h in merged_hospitals:
        dedup_key = f"{str(h.get('name')).strip().lower()}|{str(h.get('city')).strip().lower()}"
        if dedup_key not in seen:
            seen.add(dedup_key)
            unique_hospitals.append(h)

    # Sorting
    if sort_by == "highest_rated":
        unique_hospitals.sort(key=lambda x: x.get("rating") or 0.0, reverse=True)
    elif sort_by == "name_asc":
        unique_hospitals.sort(key=lambda x: str(x.get("name", "")).lower())
    elif sort_by == "name_desc":
        unique_hospitals.sort(key=lambda x: str(x.get("name", "")).lower(), reverse=True)
    elif sort_by == "beds":
        unique_hospitals.sort(key=lambda x: int(x.get("total_beds") or 0), reverse=True)

    # Pagination
    total_records = len(unique_hospitals)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_items = unique_hospitals[start_idx:end_idx]
    total_pages = max(1, (total_records + limit - 1) // limit)

    return {
        "hospitals": paginated_items,
        "total": total_records,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "sources_status": sources_status,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }


def get_hospital_details(hospital_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches detailed hospital information for a specific hospital ID across sources.
    """
    db = get_database()

    # If valid MongoDB ObjectId, check local DB first
    if is_valid_object_id(hospital_id):
        doc = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        if doc:
            db_res = fetch_hospitals_from_local_db(name=doc.get("name"), limit=1)
            if db_res.get("hospitals"):
                return db_res["hospitals"][0]

    # Check prefix-based IDs (e.g. cms_010001, ninja_1234)
    if hospital_id.startswith("cms_"):
        raw_id = hospital_id.replace("cms_", "")
        cms_res = fetch_hospitals_from_cms(limit=50)
        for h in cms_res.get("hospitals", []):
            if h.get("source_id") == raw_id or h.get("id") == hospital_id:
                return h

    if hospital_id.startswith("ninja_"):
        ninja_res = fetch_hospitals_from_api_ninjas(limit=50)
        for h in ninja_res.get("hospitals", []):
            if h.get("id") == hospital_id or h.get("source_id") == hospital_id:
                return h

    # Fallback search by ID or name
    all_res = get_aggregated_hospitals(page=1, limit=500)
    for h in all_res.get("hospitals", []):
        if h.get("id") == hospital_id or h.get("source_id") == hospital_id:
            return h

    return None


def calculate_hospital_statistics() -> Dict[str, Any]:
    """
    Calculates statistics strictly from actual validated data.
    Does NOT invent fake bed numbers.
    """
    sources_status = get_all_sources_status()
    all_res = get_aggregated_hospitals(page=1, limit=500, source="all")
    hospitals = all_res.get("hospitals", [])

    total_hospitals = len(hospitals)
    connected_sources_count = sum(
        1 for s in sources_status.values() if isinstance(s, dict) and s.get("configured") and s.get("status") == "ACTIVE"
    )

    by_city: Dict[str, int] = {}
    by_state: Dict[str, int] = {}
    by_facility_type: Dict[str, int] = {}
    by_ownership: Dict[str, int] = {}
    by_country: Dict[str, int] = {}

    total_verified_beds = 0
    total_verified_occupied = 0
    total_verified_available = 0
    hospitals_with_bed_data = 0
    emergency_ready_count = 0

    for h in hospitals:
        city = h.get("city") or "Other"
        state = h.get("state") or "Other"
        ftype = h.get("facility_type") or "General Medical"
        owner = h.get("ownership") or "Private / Trust"
        country = h.get("country") or "India"

        by_city[city] = by_city.get(city, 0) + 1
        by_state[state] = by_state.get(state, 0) + 1
        by_facility_type[ftype] = by_facility_type.get(ftype, 0) + 1
        by_ownership[owner] = by_ownership.get(owner, 0) + 1
        by_country[country] = by_country.get(country, 0) + 1

        if h.get("emergency"):
            emergency_ready_count += 1

        t_beds = h.get("total_beds")
        o_beds = h.get("occupied_beds")
        a_beds = h.get("available_beds")

        if t_beds and isinstance(t_beds, int) and t_beds > 0:
            total_verified_beds += t_beds
            hospitals_with_bed_data += 1

        if o_beds and isinstance(o_beds, int):
            total_verified_occupied += o_beds

        if a_beds and isinstance(a_beds, int):
            total_verified_available += a_beds

    # Sort distributions
    top_cities = dict(sorted(by_city.items(), key=lambda item: item[1], reverse=True)[:8])
    top_types = dict(sorted(by_facility_type.items(), key=lambda item: item[1], reverse=True)[:6])
    top_ownership = dict(sorted(by_ownership.items(), key=lambda item: item[1], reverse=True)[:5])

    return {
        "total_hospitals": total_hospitals,
        "connected_sources": connected_sources_count,
        "total_sources": len([k for k in sources_status if k != "timestamp"]),
        "sources_summary": sources_status,
        "total_beds": total_verified_beds if total_verified_beds > 0 else None,
        "occupied_beds": total_verified_occupied if total_verified_occupied > 0 else None,
        "available_beds": total_verified_available if total_verified_available > 0 else None,
        "hospitals_with_bed_data": hospitals_with_bed_data,
        "emergency_ready_count": emergency_ready_count,
        "distributions": {
            "by_city": top_cities,
            "by_state": dict(sorted(by_state.items(), key=lambda item: item[1], reverse=True)[:8]),
            "by_facility_type": top_types,
            "by_ownership": top_ownership,
            "by_country": by_country,
        },
        "latest_sync_time": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Metrics are calculated directly from verified partner hospital records and government datasets.",
    }


def get_bed_availability_data() -> Dict[str, Any]:
    """
    Returns verified bed availability metrics or explicit unavailable status.
    Never fabricates random live bed occupancy numbers.
    """
    stats = calculate_hospital_statistics()
    all_res = get_aggregated_hospitals(page=1, limit=100, source="carebridge_db")
    local_hospitals = all_res.get("hospitals", [])

    hospitals_with_beds = [
        {
            "id": h["id"],
            "name": h["name"],
            "city": h["city"],
            "state": h["state"],
            "total_beds": h.get("total_beds"),
            "occupied_beds": h.get("occupied_beds"),
            "available_beds": h.get("available_beds"),
            "icu_beds": h.get("icu_beds"),
            "emergency_beds": h.get("emergency_beds"),
            "data_source": h.get("data_source"),
            "last_updated": h.get("source_updated_at"),
        }
        for h in local_hospitals
        if h.get("total_beds") is not None
    ]

    has_verified_beds = len(hospitals_with_beds) > 0

    return {
        "live_telemetry_active": False,
        "has_verified_static_capacity": has_verified_beds,
        "status_message": (
            "Verified certified hospital bed capacities are displayed from CareBridge Clinical Registry. "
            "Real-time sensor-level live telemetry feeds are currently unavailable from external national APIs."
            if has_verified_beds
            else "Live bed availability data is currently unavailable from the connected sources."
        ),
        "total_beds_registered": stats.get("total_beds"),
        "total_available_beds": stats.get("available_beds"),
        "hospitals": hospitals_with_beds,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
