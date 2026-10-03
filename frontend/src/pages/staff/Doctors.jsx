import React, { useMemo, useState } from "react";
import "./Doctors.css";

const doctorsData = [
  {
    id: "DOC-001",
    name: "Dr. Ananya Rao",
    specialty: "Cardiology",
    hospital: "CareBridge Central Hospital",
    experience: "12 years",
    patients: 428,
    status: "Active",
    availability: "Available",
  },
  {
    id: "DOC-002",
    name: "Dr. Rahul Sharma",
    specialty: "General Medicine",
    hospital: "CareBridge Central Hospital",
    experience: "8 years",
    patients: 316,
    status: "Active",
    availability: "Busy",
  },
  {
    id: "DOC-003",
    name: "Dr. Priya Reddy",
    specialty: "Dermatology",
    hospital: "CareBridge Skin & Care",
    experience: "7 years",
    patients: 285,
    status: "Active",
    availability: "Available",
  },
  {
    id: "DOC-004",
    name: "Dr. Arjun Mehta",
    specialty: "Orthopedics",
    hospital: "CareBridge Central Hospital",
    experience: "15 years",
    patients: 512,
    status: "Inactive",
    availability: "Unavailable",
  },
  {
    id: "DOC-005",
    name: "Dr. Sneha Kapoor",
    specialty: "Pediatrics",
    hospital: "CareBridge Children's Hospital",
    experience: "10 years",
    patients: 374,
    status: "Active",
    availability: "Available",
  },
  {
    id: "DOC-006",
    name: "Dr. Vikram Singh",
    specialty: "Neurology",
    hospital: "CareBridge Central Hospital",
    experience: "14 years",
    patients: 391,
    status: "Active",
    availability: "Busy",
  },
];

function Doctors() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const filteredDoctors = useMemo(() => {
    return doctorsData.filter((doctor) => {
      const matchesSearch =
        doctor.name.toLowerCase().includes(search.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(search.toLowerCase()) ||
        doctor.hospital.toLowerCase().includes(search.toLowerCase()) ||
        doctor.id.toLowerCase().includes(search.toLowerCase());

      const matchesSpecialty =
        specialty === "All" || doctor.specialty === specialty;

      const matchesStatus =
        status === "All" || doctor.status === status;

      return matchesSearch && matchesSpecialty && matchesStatus;
    });
  }, [search, specialty, status]);

  const activeDoctors = doctorsData.filter(
    (doctor) => doctor.status === "Active"
  ).length;

  const availableDoctors = doctorsData.filter(
    (doctor) => doctor.availability === "Available"
  ).length;

  const totalPatients = doctorsData.reduce(
    (total, doctor) => total + doctor.patients,
    0
  );

  return (
    <main className="staff-doctors-page">
      {/* HEADER */}
      <section className="doctors-header">
        <div>
          <span className="doctors-eyebrow">
            STAFF / ADMIN • MANAGEMENT
          </span>

          <h1>Doctors</h1>

          <p>
            Manage doctors, specialties, availability and hospital
            assignments from one place.
          </p>
        </div>

        <button className="add-doctor-btn">
          <span>+</span>
          Add Doctor
        </button>
      </section>

      {/* SUMMARY CARDS */}
      <section className="doctor-stats">
        <div className="doctor-stat-card">
          <div className="stat-icon blue">◉</div>
          <div>
            <span>Total Doctors</span>
            <strong>{doctorsData.length}</strong>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Active Doctors</span>
            <strong>{activeDoctors}</strong>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="stat-icon purple">✦</div>
          <div>
            <span>Available Now</span>
            <strong>{availableDoctors}</strong>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="stat-icon orange">♙</div>
          <div>
            <span>Patients Managed</span>
            <strong>{totalPatients.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      {/* MAIN CARD */}
      <section className="doctors-panel">
        <div className="panel-top">
          <div>
            <h2>Doctor Directory</h2>
            <p>
              {filteredDoctors.length} doctor
              {filteredDoctors.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="doctor-actions">
            <button className="secondary-btn">Export</button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="doctor-filters">
          <div className="doctor-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search doctor, specialty, hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="All">All Specialties</option>
            <option value="Cardiology">Cardiology</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Neurology">Neurology</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* DESKTOP TABLE */}
        <div className="doctors-table-wrapper">
          <table className="doctors-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Hospital</th>
                <th>Experience</th>
                <th>Patients</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>
                    <div className="doctor-person">
                      <div className="doctor-avatar">
                        {doctor.name
                          .replace("Dr. ", "")
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div>
                        <strong>{doctor.name}</strong>
                        <small>{doctor.id}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="specialty-text">
                      {doctor.specialty}
                    </span>
                  </td>

                  <td>{doctor.hospital}</td>

                  <td>{doctor.experience}</td>

                  <td>
                    <strong className="patient-count">
                      {doctor.patients}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`availability ${doctor.availability
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      <i></i>
                      {doctor.availability}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge ${doctor.status.toLowerCase()}`}
                    >
                      {doctor.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="doctor-mobile-list">
          {filteredDoctors.map((doctor) => (
            <article className="doctor-mobile-card" key={doctor.id}>
              <div className="mobile-doctor-head">
                <div className="doctor-person">
                  <div className="doctor-avatar">
                    {doctor.name
                      .replace("Dr. ", "")
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div>
                    <strong>{doctor.name}</strong>
                    <small>{doctor.id}</small>
                  </div>
                </div>

                <span
                  className={`status-badge ${doctor.status.toLowerCase()}`}
                >
                  {doctor.status}
                </span>
              </div>

              <div className="mobile-doctor-details">
                <div>
                  <span>Specialty</span>
                  <strong>{doctor.specialty}</strong>
                </div>

                <div>
                  <span>Hospital</span>
                  <strong>{doctor.hospital}</strong>
                </div>

                <div>
                  <span>Experience</span>
                  <strong>{doctor.experience}</strong>
                </div>

                <div>
                  <span>Patients</span>
                  <strong>{doctor.patients}</strong>
                </div>
              </div>

              <div className="mobile-doctor-footer">
                <span
                  className={`availability ${doctor.availability
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  <i></i>
                  {doctor.availability}
                </span>

                <button
                  className="view-btn"
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  View Details
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredDoctors.length === 0 && (
          <div className="doctors-empty">
            <div>⌕</div>
            <h3>No doctors found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}
      {selectedDoctor && (
        <div
          className="doctor-modal-overlay"
          onClick={() => setSelectedDoctor(null)}
        >
          <div
            className="doctor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedDoctor(null)}
            >
              ×
            </button>

            <div className="modal-doctor-header">
              <div className="large-doctor-avatar">
                {selectedDoctor.name
                  .replace("Dr. ", "")
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)}
              </div>

              <div>
                <span>Doctor Profile</span>
                <h2>{selectedDoctor.name}</h2>
                <p>{selectedDoctor.specialty}</p>
              </div>
            </div>

            <div className="modal-details">
              <div>
                <span>Doctor ID</span>
                <strong>{selectedDoctor.id}</strong>
              </div>

              <div>
                <span>Hospital</span>
                <strong>{selectedDoctor.hospital}</strong>
              </div>

              <div>
                <span>Experience</span>
                <strong>{selectedDoctor.experience}</strong>
              </div>

              <div>
                <span>Patients Managed</span>
                <strong>{selectedDoctor.patients}</strong>
              </div>

              <div>
                <span>Availability</span>
                <strong>{selectedDoctor.availability}</strong>
              </div>

              <div>
                <span>Account Status</span>
                <strong>{selectedDoctor.status}</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setSelectedDoctor(null)}
              >
                Close
              </button>

              <button className="add-doctor-btn">
                Edit Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Doctors;