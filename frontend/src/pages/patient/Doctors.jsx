import {
  Search,
  MapPin,
  CalendarDays,
  Clock3,
  Stethoscope,
  Star,
  ChevronRight,
} from "lucide-react";

import "./Doctors.css";

const doctors = [
  {
    id: 1,
    name: "Dr. Ananya Sharma",
    specialty: "Cardiologist",
    hospital: "CareBridge Medical Center",
    location: "Hyderabad",
    experience: "12 years",
    rating: "4.9",
    availability: "Available today",
    time: "10:00 AM – 1:00 PM",
    initials: "AS",
  },
  {
    id: 2,
    name: "Dr. Rahul Mehta",
    specialty: "General Physician",
    hospital: "CareBridge City Hospital",
    location: "Hyderabad",
    experience: "9 years",
    rating: "4.8",
    availability: "Available today",
    time: "2:00 PM – 5:00 PM",
    initials: "RM",
  },
  {
    id: 3,
    name: "Dr. Priya Reddy",
    specialty: "Dermatologist",
    hospital: "CareBridge Health Center",
    location: "Hyderabad",
    experience: "8 years",
    rating: "4.9",
    availability: "Tomorrow",
    time: "9:30 AM – 12:30 PM",
    initials: "PR",
  },
  {
    id: 4,
    name: "Dr. Arjun Rao",
    specialty: "Orthopedic Specialist",
    hospital: "CareBridge Specialty Hospital",
    location: "Hyderabad",
    experience: "11 years",
    rating: "4.7",
    availability: "Tomorrow",
    time: "11:00 AM – 3:00 PM",
    initials: "AR",
  },
];

function Doctors() {
  return (
    <div className="doctors-page">

      {/* HEADER */}
      <section className="doctors-header">
        <div>
          <span className="doctors-kicker">CARE PROVIDERS</span>

          <h1>Find a doctor</h1>

          <p>
            Search trusted healthcare professionals and find a
            convenient time for your consultation.
          </p>
        </div>

        <div className="doctor-header-icon">
          <Stethoscope size={30} />
        </div>
      </section>

      {/* SEARCH */}
      <section className="doctor-search-card">
        <div className="doctor-search-box">
          <Search size={20} />

          <input
            type="text"
            placeholder="Search by doctor, specialty or hospital"
          />
        </div>

        <select defaultValue="">
          <option value="" disabled>
            Specialty
          </option>
          <option>General Physician</option>
          <option>Cardiologist</option>
          <option>Dermatologist</option>
          <option>Orthopedic Specialist</option>
        </select>

        <select defaultValue="Hyderabad">
          <option>Hyderabad</option>
          <option>Bengaluru</option>
          <option>Chennai</option>
          <option>Mumbai</option>
        </select>

        <button className="doctor-search-btn">
          Search
        </button>
      </section>

      {/* TOP ROW */}
      <div className="doctors-toolbar">
        <div>
          <h2>Available doctors</h2>
          <p>{doctors.length} healthcare professionals found</p>
        </div>

        <select className="sort-select" defaultValue="recommended">
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rated</option>
          <option value="experience">Most experienced</option>
        </select>
      </div>

      {/* DOCTOR CARDS */}
      <section className="doctor-grid">

        {doctors.map((doctor) => (
          <article className="doctor-card" key={doctor.id}>

            <div className="doctor-card-top">

              <div className="doctor-avatar">
                {doctor.initials}
              </div>

              <div className="doctor-main-info">
                <h3>{doctor.name}</h3>

                <span className="doctor-specialty">
                  {doctor.specialty}
                </span>

                <div className="doctor-rating">
                  <Star size={15} fill="currentColor" />
                  <strong>{doctor.rating}</strong>
                  <span>Patient rating</span>
                </div>
              </div>

            </div>

            <div className="doctor-details">

              <div className="doctor-detail">
                <Stethoscope size={17} />
                <span>{doctor.experience} experience</span>
              </div>

              <div className="doctor-detail">
                <MapPin size={17} />
                <span>
                  {doctor.hospital}, {doctor.location}
                </span>
              </div>

              <div className="doctor-availability">
                <Clock3 size={17} />

                <div>
                  <strong>{doctor.availability}</strong>
                  <span>{doctor.time}</span>
                </div>
              </div>

            </div>

            <div className="doctor-card-actions">

              <button className="doctor-outline-btn">
                View profile
                <ChevronRight size={16} />
              </button>

              <button className="doctor-book-btn">
                <CalendarDays size={17} />
                Book appointment
              </button>

            </div>

          </article>
        ))}

      </section>

      {/* INFO */}
      <section className="doctor-info-banner">
        <div className="doctor-info-icon">
          <Stethoscope size={22} />
        </div>

        <div>
          <h3>Choose the right care for you</h3>
          <p>
            Review doctor specialties, experience and availability
            before booking your appointment.
          </p>
        </div>
      </section>

    </div>
  );
}

export default Doctors;