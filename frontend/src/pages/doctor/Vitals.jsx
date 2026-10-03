import {
  HeartPulse,
  Activity,
  Droplets,
  Thermometer,
  Weight,
  UserRound,
  Clock3,
  Search,
  Plus,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

import "./Vitals.css";

function Vitals() {
  const patients = [
    {
      id: 1,
      name: "Ananya Sharma",
      age: 28,
      time: "09:30 AM",
      bp: "118/76",
      heartRate: "72",
      spo2: "98%",
      sugar: "92",
      temperature: "98.4°F",
      status: "Normal",
    },
    {
      id: 2,
      name: "Rahul Verma",
      age: 45,
      time: "10:15 AM",
      bp: "142/92",
      heartRate: "88",
      spo2: "96%",
      sugar: "126",
      temperature: "99.1°F",
      status: "Attention",
    },
    {
      id: 3,
      name: "Priya Reddy",
      age: 34,
      time: "11:00 AM",
      bp: "120/80",
      heartRate: "76",
      spo2: "99%",
      sugar: "89",
      temperature: "98.2°F",
      status: "Normal",
    },
    {
      id: 4,
      name: "Arjun Kumar",
      age: 52,
      time: "11:45 AM",
      bp: "150/95",
      heartRate: "94",
      spo2: "94%",
      sugar: "148",
      temperature: "100.2°F",
      status: "Critical",
    },
  ];

  return (
    <div className="doctor-vitals">

      {/* HEADER */}
      <section className="vitals-header">
        <div>
          <span className="vitals-kicker">
            DOCTOR PORTAL
          </span>

          <h1>Patient Vitals</h1>

          <p>
            Monitor and review patient vital signs and health measurements.
          </p>
        </div>

        <button className="add-vitals-btn">
          <Plus size={18} />
          Record Vitals
        </button>
      </section>

      {/* SUMMARY CARDS */}
      <section className="vitals-summary">

        <div className="vital-summary-card">
          <div className="vital-summary-icon blue">
            <UserRound size={21} />
          </div>

          <div>
            <span>Patients Checked</span>
            <strong>24</strong>
            <small>
              Today
            </small>
          </div>
        </div>

        <div className="vital-summary-card">
          <div className="vital-summary-icon green">
            <HeartPulse size={21} />
          </div>

          <div>
            <span>Normal Vitals</span>
            <strong>18</strong>
            <small className="positive">
              75% of patients
            </small>
          </div>
        </div>

        <div className="vital-summary-card">
          <div className="vital-summary-icon orange">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Needs Attention</span>
            <strong>04</strong>
            <small>
              Review required
            </small>
          </div>
        </div>

        <div className="vital-summary-card">
          <div className="vital-summary-icon red">
            <Activity size={21} />
          </div>

          <div>
            <span>Critical</span>
            <strong>02</strong>
            <small className="critical-text">
              Immediate review
            </small>
          </div>
        </div>

      </section>

      {/* SEARCH */}
      <section className="vitals-toolbar">

        <div className="vitals-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search patient..."
          />
        </div>

        <div className="vitals-date">
          <Clock3 size={17} />
          Today's readings
        </div>

      </section>

      {/* VITAL CARDS */}
      <section className="vitals-panel">

        <div className="vitals-panel-header">
          <div>
            <h2>Recent Vital Readings</h2>
            <p>
              Latest measurements recorded for your patients
            </p>
          </div>

          <span className="readings-count">
            {patients.length} patients
          </span>
        </div>

        <div className="patient-vitals-list">

          {patients.map((patient) => (
            <article
              className="patient-vital-card"
              key={patient.id}
            >

              {/* PATIENT */}
              <div className="vital-patient">

                <div className="vital-avatar">
                  {patient.name.charAt(0)}
                </div>

                <div>
                  <h3>{patient.name}</h3>

                  <p>
                    Age {patient.age}
                    <span>•</span>
                    {patient.time}
                  </p>
                </div>

              </div>

              {/* BP */}
              <div className="measurement">
                <div className="measurement-icon bp">
                  <HeartPulse size={17} />
                </div>

                <div>
                  <span>Blood Pressure</span>
                  <strong>{patient.bp}</strong>
                  <small>mmHg</small>
                </div>
              </div>

              {/* HEART RATE */}
              <div className="measurement">
                <div className="measurement-icon heart">
                  <Activity size={17} />
                </div>

                <div>
                  <span>Heart Rate</span>
                  <strong>{patient.heartRate}</strong>
                  <small>bpm</small>
                </div>
              </div>

              {/* SPO2 */}
              <div className="measurement">
                <div className="measurement-icon oxygen">
                  <Droplets size={17} />
                </div>

                <div>
                  <span>SpO₂</span>
                  <strong>{patient.spo2}</strong>
                  <small>oxygen</small>
                </div>
              </div>

              {/* SUGAR */}
              <div className="measurement">
                <div className="measurement-icon sugar">
                  <TrendingUp size={17} />
                </div>

                <div>
                  <span>Blood Sugar</span>
                  <strong>{patient.sugar}</strong>
                  <small>mg/dL</small>
                </div>
              </div>

              {/* TEMPERATURE */}
              <div className="measurement">
                <div className="measurement-icon temperature">
                  <Thermometer size={17} />
                </div>

                <div>
                  <span>Temperature</span>
                  <strong>{patient.temperature}</strong>
                  <small>body</small>
                </div>
              </div>

              {/* STATUS */}
              <div
                className={`vital-status ${patient.status
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {patient.status}
              </div>

            </article>
          ))}

        </div>

      </section>

    </div>
  );
}

export default Vitals;