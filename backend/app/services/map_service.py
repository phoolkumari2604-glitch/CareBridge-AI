import math
import leafmap.foliumap as leafmap
import folium
import requests

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on the Earth in km."""
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(6371 * c, 2)

def generate_hospitals_map_html(hospitals, center_lat=20.5937, center_lng=78.9629, zoom=5, user_lat=None, user_lng=None):
    """Generate an interactive Leafmap HTML visualization for hospital locations."""
    if hospitals and len(hospitals) > 0 and (center_lat == 20.5937 and center_lng == 78.9629):
        first = hospitals[0]
        h_lat = first.get("lat") or first.get("latitude")
        h_lng = first.get("lng") or first.get("longitude")
        if h_lat and h_lng:
            center_lat, center_lng = float(h_lat), float(h_lng)
            zoom = 12

    if user_lat and user_lng:
        center_lat, center_lng = float(user_lat), float(user_lng)
        zoom = 13

    m = leafmap.Map(center=[center_lat, center_lng], zoom=zoom, draw_control=False)

    if user_lat and user_lng:
        # Add user location marker
        folium.Marker(
            location=[float(user_lat), float(user_lng)],
            popup="<b>Your Location</b>",
            tooltip="You are here",
            icon=folium.Icon(color="blue", icon="user", prefix="fa")
        ).add_to(m)

    for h in hospitals:
        lat = h.get("lat") or h.get("latitude")
        lng = h.get("lng") or h.get("longitude")
        name = h.get("name", "Medical Facility")
        city = h.get("city", "")
        phone = h.get("phone", "")
        emergency = h.get("emergency", True)

        if lat and lng:
            try:
                lat_f, lng_f = float(lat), float(lng)
                popup_content = f"""
                <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
                    <strong style="color: #0b192c; font-size: 14px;">{name}</strong><br/>
                    <span style="color: #64748b;">{city}</span><br/>
                    <span style="color: #0d9488;">Phone: {phone or 'N/A'}</span><br/>
                    <span style="color: {'#16a34a' if emergency else '#64748b'}; font-weight: 600;">
                        {'24/7 Emergency Available' if emergency else 'Standard Hours'}
                    </span>
                </div>
                """
                folium.Marker(
                    location=[lat_f, lng_f],
                    popup=popup_content,
                    tooltip=name,
                    icon=folium.Icon(color="red" if emergency else "green", icon="plus", prefix="fa")
                ).add_to(m)
            except (ValueError, TypeError):
                continue

    return m.to_html()


def fetch_realtime_osm_facilities(lat, lng, radius_km=10.0):
    """Fetch live real-world hospitals and emergency services around coordinates using OpenStreetMap Overpass API."""
    radius_meters = int(radius_km * 1000)
    overpass_query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:{radius_meters},{lat},{lng});
      way["amenity"="hospital"](around:{radius_meters},{lat},{lng});
      node["amenity"="clinic"](around:{radius_meters},{lat},{lng});
      node["amenity"="police"](around:{radius_meters},{lat},{lng});
      way["amenity"="police"](around:{radius_meters},{lat},{lng});
    );
    out center 30;
    """

    results = {
        "user_location": {"lat": lat, "lng": lng, "radius_km": radius_km},
        "hospitals": [],
        "police_stations": [],
        "source": "openstreetmap_live",
    }

    try:
        resp = requests.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": overpass_query},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            elements = data.get("elements", [])
            for elem in elements:
                elem_lat = elem.get("lat") or elem.get("center", {}).get("lat")
                elem_lng = elem.get("lon") or elem.get("center", {}).get("lon")
                tags = elem.get("tags", {})
                name = tags.get("name") or tags.get("name:en")
                amenity = tags.get("amenity")

                if not elem_lat or not elem_lng or not name:
                    continue

                distance = haversine_distance(lat, lng, elem_lat, elem_lng)
                addr = tags.get("addr:street") or tags.get("addr:city") or tags.get("address") or "City Area"
                phone = tags.get("phone") or tags.get("contact:phone") or ("102" if amenity in ["hospital", "clinic"] else "112")
                gmaps_url = f"https://www.google.com/maps/search/?api=1&query={name.replace(' ', '+')}+{elem_lat},{elem_lng}"
                directions_url = f"https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={elem_lat},{elem_lng}"

                item = {
                    "id": f"osm-{elem.get('id')}",
                    "name": name,
                    "lat": elem_lat,
                    "lng": elem_lng,
                    "distance_km": distance,
                    "address": addr,
                    "phone": phone,
                    "emergency": tags.get("emergency") == "yes",
                    "google_maps_url": gmaps_url,
                    "directions_url": directions_url,
                }

                if amenity in ["hospital", "clinic"]:
                    item["category"] = "hospital"
                    item["beds"] = tags.get("capacity:beds") or 50
                    results["hospitals"].append(item)
                elif amenity == "police":
                    item["category"] = "police"
                    item["division"] = tags.get("operator") or "District Police Post"
                    results["police_stations"].append(item)

            results["hospitals"].sort(key=lambda x: x["distance_km"])
            results["police_stations"].sort(key=lambda x: x["distance_km"])

    except Exception as e:
        results["source"] = "fallback"
        results["error"] = str(e)

    return results
