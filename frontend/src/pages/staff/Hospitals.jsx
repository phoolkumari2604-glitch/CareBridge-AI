import React, { useMemo, useState } from "react";
import "./Hospitals.css";

const hospitalData = [
  {
    id: "HSP-001",
    name: "CareBridge Central Hospital",
    location: "Banjara Hills, Hyderabad",
    type: "Multi-Speciality",
    doctors: 42,
    patients: 1280,
    beds: 320,
    status: "Active",
    rating: 4.8,
    phone: "+91 98765 43210",
  },
  {
    id: "HSP-002",
    name: "CityCare Medical Center",
    location: "Hitech City, Hyderabad",
    type: "General Hospital",
    doctors: 31,
    patients: 946,
    beds: 210,
    status: "Active",
    rating: 4.6,
    phone: "+91 91234 56780",
  },
  {
    id: "HSP-003",
    name: "Apollo Health Hub",
    location: "Jubilee Hills, Hyderabad",
    type: "Multi-Speciality",
    doctors: 56,
    patients: 1540,
    beds: 410,
    status: "Active",
    rating: 4.9,
    phone: "+91 99887 66554",
  },
  {
    id: "HSP-004",
    name: "GreenLife Hospital",
    location: "Kondapur, Hyderabad",
    type: "Speciality",
    doctors: 24,
    patients: 620,
    beds: 150,
    status: "Pending",
    rating: 4.4,
    phone: "+91 90000 11223",
  },
  {
    id: "HSP-005",
    name: "Sunrise Community Hospital",
    location: "Secunderabad, Hyderabad",
    type: "Community",
    doctors: 19,
    patients: 480,
    beds: 120,
    status: "Inactive",
    rating: 4.1,
    phone: "+91 95555 22110",
  },
];

function Hospitals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedHospital, setSelectedHospital] = useState(null);

  const filteredHospitals = useMemo(() => {
    return hospitalData.filter((hospital) => {
      const matchesSearch =
        hospital.name.toLowerCase().includes(search.toLowerCase()) ||
        hospital.location.toLowerCase().includes(search.toLowerCase()) ||
        hospital.id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        hospital.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalHospitals = hospitalData.length;

  const activeHospitals = hospitalData.filter(
    (hospital) => hospital.status === "Active"
  ).length;

  const pendingHospitals = hospitalData.filter(
    (hospital) => hospital.status === "Pending"
  ).length;

  const totalBeds = hospitalData.reduce(
    (sum, hospital) => sum + hospital.beds,
    0
  );

  return (
    <div className="staff-hospitals-page">

      {/* HEADER */}
      <section className="hospitals-header">
        <div>
          <span className="page-eyebrow">
            STAFF / ADMIN • MANAGEMENT
          </span>

          <h1>Hospitals</h1>

          <p>
            Manage registered hospitals, facilities, doctors,
            capacity and operational status.
          </p>
        </div>

        <button className="add-hospital-btn">
          <span>＋</span>
          Add Hospital
        </button>
      </section>

      {/* STAT CARDS */}
      <section className="hospital-stat-grid">

        <div className="hospital-stat-card">
          <div className="stat-icon purple">🏥</div>
          <div>
            <span>Total Hospitals</span>
            <strong>{totalHospitals}</strong>
            <small>Registered facilities</small>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Active</span>
            <strong>{activeHospitals}</strong>
            <small>Currently operational</small>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="stat-icon orange">⏳</div>
          <div>
            <span>Pending</span>
            <strong>{pendingHospitals}</strong>
            <small>Awaiting verification</small>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="stat-icon blue">🛏</div>
          <div>
            <span>Total Beds</span>
            <strong>{totalBeds.toLocaleString()}</strong>
            <small>Across all facilities</small>
          </div>
        </div>

      </section>

      {/* TOOLBAR */}
      <section className="hospitals-toolbar">

        <div className="hospital-search">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search hospitals, location or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="hospital-filter">
          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

      </section>

      {/* HOSPITAL GRID */}
      <section className="hospital-grid">

        {filteredHospitals.map((hospital) => (
          <article
            className="hospital-card"
            key={hospital.id}
          >

            <div className="hospital-card-top">

              <div className="hospital-logo">
                🏥
              </div>

              <span
                className={`hospital-status ${hospital.status.toLowerCase()}`}
              >
                {hospital.status}
              </span>

            </div>

            <div className="hospital-main">

              <span className="hospital-id">
                {hospital.id}
              </span>

              <h2>{hospital.name}</h2>

              <p className="hospital-location">
                <span>📍</span>
                {hospital.location}
              </p>

              <span className="hospital-type">
                {hospital.type}
              </span>

            </div>

            <div className="hospital-metrics">

              <div>
                <strong>{hospital.doctors}</strong>
                <span>Doctors</span>
              </div>

              <div>
                <strong>
                  {hospital.patients.toLocaleString()}
                </strong>
                <span>Patients</span>
              </div>

              <div>
                <strong>{hospital.beds}</strong>
                <span>Beds</span>
              </div>

            </div>

            <div className="hospital-card-footer">

              <div className="hospital-rating">
                <span>★</span>
                {hospital.rating}
              </div>

              <button
                className="view-hospital-btn"
                onClick={() => setSelectedHospital(hospital)}
              >
                View Details
                <span>→</span>
              </button>

            </div>

          </article>
        ))}

      </section>

      {/* EMPTY STATE */}
      {filteredHospitals.length === 0 && (
        <div className="hospital-empty">
          <div>🏥</div>
          <h3>No hospitals found</h3>
          <p>
            Try changing your search or status filter.
          </p>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedHospital && (
        <div
          className="hospital-modal-overlay"
          onClick={() => setSelectedHospital(null)}
        >
          <div
            className="hospital-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="modal-close"
              onClick={() => setSelectedHospital(null)}
            >
              ×
            </button>

            <div className="modal-hospital-icon">
              🏥
            </div>

            <span className="hospital-id">
              {selectedHospital.id}
            </span>

            <h2>{selectedHospital.name}</h2>

            <p className="modal-location">
              📍 {selectedHospital.location}
            </p>

            <div className="modal-details">

              <div>
                <span>Type</span>
                <strong>{selectedHospital.type}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedHospital.status}</strong>
              </div>

              <div>
                <span>Doctors</span>
                <strong>{selectedHospital.doctors}</strong>
              </div>

              <div>
                <span>Patients</span>
                <strong>
                  {selectedHospital.patients.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>Beds</span>
                <strong>{selectedHospital.beds}</strong>
              </div>

              <div>
                <span>Rating</span>
                <strong>★ {selectedHospital.rating}</strong>
              </div>

            </div>

            <div className="modal-contact">
              <span>Contact</span>
              <strong>{selectedHospital.phone}</strong>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Hospitals;