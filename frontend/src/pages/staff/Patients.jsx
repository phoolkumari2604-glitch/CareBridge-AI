import React, { useMemo, useState } from "react";
import "./Patients.css";

const patientsData = [
  {
    id: "CB-1001",
    name: "Ananya Sharma",
    age: 28,
    gender: "Female",
    phone: "+91 98765 43210",
    condition: "General Checkup",
    doctor: "Dr. Priya Rao",
    status: "Active",
    lastVisit: "02 Oct 2026",
  },
  {
    id: "CB-1002",
    name: "Rahul Verma",
    age: 42,
    gender: "Male",
    phone: "+91 91234 56780",
    condition: "Hypertension",
    doctor: "Dr. Arjun Mehta",
    status: "Active",
    lastVisit: "01 Oct 2026",
  },
  {
    id: "CB-1003",
    name: "Sneha Reddy",
    age: 35,
    gender: "Female",
    phone: "+91 99887 66554",
    condition: "Diabetes",
    doctor: "Dr. Kavya Nair",
    status: "Pending",
    lastVisit: "29 Sep 2026",
  },
  {
    id: "CB-1004",
    name: "Vikram Singh",
    age: 51,
    gender: "Male",
    phone: "+91 90123 45678",
    condition: "Cardiology",
    doctor: "Dr. Arjun Mehta",
    status: "Active",
    lastVisit: "28 Sep 2026",
  },
  {
    id: "CB-1005",
    name: "Meera Iyer",
    age: 24,
    gender: "Female",
    phone: "+91 93456 78901",
    condition: "General Checkup",
    doctor: "Dr. Priya Rao",
    status: "Inactive",
    lastVisit: "20 Sep 2026",
  },
  {
    id: "CB-1006",
    name: "Aditya Kumar",
    age: 39,
    gender: "Male",
    phone: "+91 87654 32109",
    condition: "Respiratory",
    doctor: "Dr. Kavya Nair",
    status: "Active",
    lastVisit: "18 Sep 2026",
  },
];

function Patients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const filteredPatients = useMemo(() => {
    return patientsData.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(search.toLowerCase()) ||
        patient.id.toLowerCase().includes(search.toLowerCase()) ||
        patient.phone.includes(search);

      const matchesStatus =
        statusFilter === "All" || patient.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <main className="staff-patients-page">
      {/* Header */}
      <section className="patients-header">
        <div>
          <span className="page-eyebrow">STAFF MANAGEMENT</span>

          <h1>Patients</h1>

          <p>
            Manage patient profiles, appointments, records and healthcare
            activity from one place.
          </p>
        </div>

        <button className="add-patient-btn">
          <span>＋</span>
          Add Patient
        </button>
      </section>

      {/* Statistics */}
      <section className="patient-stat-grid">
        <div className="patient-stat-card">
          <div className="stat-icon blue">👥</div>
          <div>
            <span>Total Patients</span>
            <strong>1,248</strong>
            <small>+8.4% this month</small>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Active Patients</span>
            <strong>982</strong>
            <small>78.7% of total</small>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-icon orange">◷</div>
          <div>
            <span>Pending</span>
            <strong>86</strong>
            <small>Needs attention</small>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-icon purple">♥</div>
          <div>
            <span>Today's Visits</span>
            <strong>180</strong>
            <small>24 appointments remaining</small>
          </div>
        </div>
      </section>

      {/* Main card */}
      <section className="patients-panel">
        <div className="panel-top">
          <div>
            <h2>Patient Directory</h2>
            <p>
              {filteredPatients.length} patients displayed
            </p>
          </div>

          <div className="panel-actions">
            <div className="patient-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Desktop table */}
        <div className="patients-table-wrapper">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Patient ID</th>
                <th>Age / Gender</th>
                <th>Condition</th>
                <th>Doctor</th>
                <th>Last Visit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="patient-name-cell">
                      <div className="patient-avatar">
                        {patient.name.charAt(0)}
                      </div>

                      <div>
                        <strong>{patient.name}</strong>
                        <span>{patient.phone}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="patient-id">
                      {patient.id}
                    </span>
                  </td>

                  <td>
                    {patient.age} yrs
                    <span className="gender">
                      {" "}
                      / {patient.gender}
                    </span>
                  </td>

                  <td>
                    <span className="condition">
                      {patient.condition}
                    </span>
                  </td>

                  <td>{patient.doctor}</td>

                  <td>{patient.lastVisit}</td>

                  <td>
                    <span
                      className={`status-badge ${patient.status.toLowerCase()}`}
                    >
                      <i></i>
                      {patient.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPatients.length === 0 && (
            <div className="empty-patients">
              <div>⌕</div>
              <h3>No patients found</h3>
              <p>Try changing your search or filter.</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="mobile-patient-list">
          {filteredPatients.map((patient) => (
            <article className="mobile-patient-card" key={patient.id}>
              <div className="mobile-patient-top">
                <div className="patient-name-cell">
                  <div className="patient-avatar">
                    {patient.name.charAt(0)}
                  </div>

                  <div>
                    <strong>{patient.name}</strong>
                    <span>{patient.id}</span>
                  </div>
                </div>

                <span
                  className={`status-badge ${patient.status.toLowerCase()}`}
                >
                  <i></i>
                  {patient.status}
                </span>
              </div>

              <div className="mobile-patient-details">
                <div>
                  <span>Age / Gender</span>
                  <strong>
                    {patient.age} / {patient.gender}
                  </strong>
                </div>

                <div>
                  <span>Condition</span>
                  <strong>{patient.condition}</strong>
                </div>

                <div>
                  <span>Doctor</span>
                  <strong>{patient.doctor}</strong>
                </div>

                <div>
                  <span>Last Visit</span>
                  <strong>{patient.lastVisit}</strong>
                </div>
              </div>

              <button
                className="mobile-view-btn"
                onClick={() => setSelectedPatient(patient)}
              >
                View Patient
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Patient modal */}
      {selectedPatient && (
        <div
          className="patient-modal-overlay"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="patient-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedPatient(null)}
            >
              ×
            </button>

            <div className="modal-profile">
              <div className="modal-avatar">
                {selectedPatient.name.charAt(0)}
              </div>

              <div>
                <span>Patient Profile</span>
                <h2>{selectedPatient.name}</h2>
                <p>{selectedPatient.id}</p>
              </div>
            </div>

            <div className="modal-grid">
              <div>
                <span>Phone</span>
                <strong>{selectedPatient.phone}</strong>
              </div>

              <div>
                <span>Age</span>
                <strong>{selectedPatient.age} years</strong>
              </div>

              <div>
                <span>Gender</span>
                <strong>{selectedPatient.gender}</strong>
              </div>

              <div>
                <span>Condition</span>
                <strong>{selectedPatient.condition}</strong>
              </div>

              <div>
                <span>Doctor</span>
                <strong>{selectedPatient.doctor}</strong>
              </div>

              <div>
                <span>Last Visit</span>
                <strong>{selectedPatient.lastVisit}</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary-btn">
                View Records
              </button>

              <button className="primary-btn">
                View Appointments
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Patients;

