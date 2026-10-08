from app import create_app

def test_hospital_dashboard_endpoints():
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        print("\n--- 1. Testing GET /api/hospitals (Pagination & Filters) ---")
        res = client.get("/api/hospitals?page=1&limit=6")
        assert res.status_code == 200, f"Failed: {res.data}"
        data = res.get_json()
        assert "hospitals" in data
        assert "total" in data
        assert "sources_status" in data
        print(f"Retrieved {len(data['hospitals'])} hospitals of {data['total']} total records (Page 1/{data['total_pages']})")

        print("\n--- 2. Testing GET /api/hospitals/search ---")
        search_res = client.get("/api/hospitals/search?q=Hospital&limit=5")
        assert search_res.status_code == 200
        search_data = search_res.get_json()
        assert "results" in search_data
        print(f"Search returned {len(search_data['results'])} matching facilities")

        print("\n--- 3. Testing GET /api/hospitals/statistics ---")
        stats_res = client.get("/api/hospitals/statistics")
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert "total_hospitals" in stats
        assert "connected_sources" in stats
        assert "distributions" in stats
        print(f"Statistics: {stats['total_hospitals']} hospitals across {stats['connected_sources']} active sources")
        print(f"Distributions by city: {list(stats['distributions']['by_city'].keys())[:4]}")

        print("\n--- 4. Testing GET /api/hospitals/availability (Bed Availability) ---")
        avail_res = client.get("/api/hospitals/availability")
        assert avail_res.status_code == 200
        avail = avail_res.get_json()
        assert "status_message" in avail
        print(f"Bed Availability Message: {avail['status_message'][:80]}...")

        print("\n--- 5. Testing GET /api/hospitals/sources (Data Sources Status) ---")
        sources_res = client.get("/api/hospitals/sources")
        assert sources_res.status_code == 200
        sources = sources_res.get_json()
        assert "carebridge_db" in sources
        assert "api_ninjas" in sources
        assert "cms" in sources
        assert "hmis" in sources
        print(f"Sources: carebridge_db={sources['carebridge_db']['status']}, cms={sources['cms']['status']}, hmis={sources['hmis']['status']}, api_ninjas={sources['api_ninjas']['status']}")

        print("\n--- 6. Testing GET /api/hospitals/<id> (Details Page) ---")
        first_hospital_id = data["hospitals"][0]["id"]
        detail_res = client.get(f"/api/hospitals/{first_hospital_id}")
        assert detail_res.status_code == 200
        detail = detail_res.get_json()
        assert detail["id"] == first_hospital_id
        assert "name" in detail
        assert "data_source" in detail
        print(f"Hospital Detail: {detail['name']} ({detail['city']}, {detail['country']}) - Source: {detail['data_source']}")

        print("\n========================================================")
        print(">>> ALL HOSPITAL DASHBOARD BACKEND APIS VERIFIED 100% <<<")
        print("========================================================")

if __name__ == "__main__":
    test_hospital_dashboard_endpoints()
