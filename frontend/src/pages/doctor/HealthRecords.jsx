import {
  Search,
  FileText,
  UserRound,
  CalendarDays,
  Activity,
  Download,
  Eye,
  Plus,
  Pill,
  Stethoscope,
  HeartPulse,
  AlertCircle,
} from "lucide-react";

import "./HealthRecords.css";

function HealthRecords() {
  const records = [
    {
      id: 1,
      patient: "Ananya Sharma",
      age: 28,
      date: "02 Oct 2026",
      type: "General Consultation",
      diagnosis: "Seasonal Allergy",
      doctor: "Dr. Arjun Mehta",
      status: "Reviewed",
    },
    {
      id: 2,
      patient: "Rahul Verma",
      age: 45,
      date: "02 Oct 2026",
      type: "Cardiology",
      diagnosis: "Hypertension",
      doctor: "Dr. Arjun Mehta",
      status: "Follow-up",
    },
    {
      id: 3,
      patient: "Priya Reddy",
      age: 34,
      date: "01 Oct 2026",
      type: "General Consultation",
      diagnosis: "Migraine",
      doctor: "Dr. Arjun Mehta",
      status: "Reviewed",
    },
    {
      id: 4,
      patient: "Arjun Kumar",
      age: 52,
      date: "30 Sep 2026",
      type: "Diabetes",
      diagnosis: "Type 2 Diabetes",
      doctor: "Dr. Arjun Mehta",
      status: "Follow-up",
    },
    {
      id: 5,
      patient: "Sneha Rao",
      age: 31,
      date: "29 Sep 2026",
      type: "General Consultation",
      diagnosis: "Viral Fever",
      doctor: "Dr. Arjun Mehta",
      status: "Reviewed",
    },
  ];

  return (
    <div className="health-records-page">

      {/* =========================
          HEADER
      ========================= */}

      <section className="records-header">
        <div>
          <span className="records-kicker">
            DOCTOR PORTAL
          </span>

          <h1>Health Records</h1>

          <p>
            Access, review and manage patient medical records.
          </p>
        </div>

        <button className="create-record-btn">
          <Plus size={18} />
          Create Record
        </button>
      </section>

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="records-summary">

        <div className="record-summary-card">
          <div className="record-summary-icon blue">
            <FileText size={21} />
          </div>

          <div>
            <span>Total Records</span>
            <strong>248</strong>
            <small>All patient records</small>
          </div>
        </div>

        <div className="record-summary-card">
          <div className="record-summary-icon green">
            <UserRound size={21} />
          </div>

          <div>
            <span>Patients</span>
            <strong>86</strong>
            <small>Active patients</small>
          </div>
        </div>

        <div className="record-summary-card">
          <div className="record-summary-icon orange">
            <CalendarDays size={21} />
          </div>

          <div>
            <span>Today's Records</span>
            <strong>18</strong>
            <small>Updated today</small>
          </div>
        </div>

        <div className="record-summary-card">
          <div className="record-summary-icon red">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>Follow-ups</span>
            <strong>12</strong>
            <small>Require attention</small>
          </div>
        </div>

      </section>

      {/* =========================
          QUICK ACTIONS
      ========================= */}

      <section className="record-actions">

        <button className="record-action active">
          <FileText size={18} />
          All Records
        </button>

        <button className="record-action">
          <Activity size={18} />
          Vitals
        </button>

        <button className="record-action">
          <Pill size={18} />
          Prescriptions
        </button>

        <button className="record-action">
          <Stethoscope size={18} />
          Consultations
        </button>

      </section>

      {/* =========================
          SEARCH BAR
      ========================= */}

      <section className="records-toolbar">

        <div className="records-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search patient, diagnosis or record..."
          />
        </div>

        <select className="records-filter">
          <option>All Records</option>
          <option>Consultations</option>
          <option>Prescriptions</option>
          <option>Vitals</option>
          <option>Follow-ups</option>
        </select>

        <select className="records-filter">
          <option>All Dates</option>
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>

      </section>

      {/* =========================
          RECORDS TABLE
      ========================= */}

      <section className="records-panel">

        <div className="records-panel-header">
          <div>
            <h2>Medical Records</h2>

            <p>
              Recently updated patient records
            </p>
          </div>

          <span className="record-count">
            {records.length} shown
          </span>
        </div>

        <div className="records-table-wrapper">

          <table className="records-table">

            <thead>
              <tr>
                <th>Patient</th>
                <th>Date</th>
                <th>Record Type</th>
                <th>Diagnosis</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {records.map((record) => (
                <tr key={record.id}>

                  {/* PATIENT */}

                  <td>
                    <div className="record-patient">

                      <div className="record-avatar">
                        {record.patient.charAt(0)}
                      </div>

                      <div>
                        <strong>
                          {record.patient}
                        </strong>

                        <span>
                          Age {record.age}
                        </span>
                      </div>

                    </div>
                  </td>

                  {/* DATE */}

                  <td>
                    <div className="record-date">
                      <CalendarDays size={15} />
                      {record.date}
                    </div>
                  </td>

                  {/* TYPE */}

                  <td>
                    <span className="record-type">
                      {record.type}
                    </span>
                  </td>

                  {/* DIAGNOSIS */}

                  <td>
                    <strong className="diagnosis">
                      {record.diagnosis}
                    </strong>
                  </td>

                  {/* DOCTOR */}

                  <td>
                    <span className="doctor-name">
                      {record.doctor}
                    </span>
                  </td>

                  {/* STATUS */}

                  <td>
                    <span
                      className={`record-status ${
                        record.status === "Reviewed"
                          ? "reviewed"
                          : "follow-up"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td>

                    <div className="record-actions-cell">

                      <button
                        className="icon-action"
                        title="View record"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        className="icon-action"
                        title="Download record"
                      >
                        <Download size={17} />
                      </button>

                    </div>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </section>

      {/* =========================
          HEALTH OVERVIEW
      ========================= */}

      <section className="health-overview">

        <div className="overview-card">

          <div className="overview-icon">
            <HeartPulse size={21} />
          </div>

          <div>
            <h3>Health monitoring</h3>
            <p>
              Patient vitals and medical history are available
              from the records section.
            </p>
          </div>

        </div>

        <div className="overview-card">

          <div className="overview-icon">
            <FileText size={21} />
          </div>

          <div>
            <h3>Complete medical history</h3>
            <p>
              Review previous consultations, diagnoses and
              treatment information.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}

export default HealthRecords;