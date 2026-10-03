import React, { useState } from "react";
import "./Profile.css";

function Profile() {
  const [profile, setProfile] = useState({
    name: "Phool Kumari",
    email: "phool@example.com",
    phone: "+91 98765 43210",
    role: "Patient",
    bloodGroup: "O+",
    location: "Hyderabad, India",
  });

  const [editing, setEditing] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Header */}
        <div className="profile-header">
          <div>
            <span className="profile-eyebrow">ACCOUNT</span>
            <h1>My Profile</h1>
            <p>
              Manage your personal information and account details.
            </p>
          </div>

          <button
            className={`profile-edit-btn ${editing ? "cancel" : ""}`}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {/* Profile Card */}
        <section className="profile-card">

          <div className="profile-cover">
            <div className="profile-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>

            <div className="profile-identity">
              <h2>{profile.name}</h2>
              <span>{profile.role}</span>
            </div>
          </div>

          {/* Personal Information */}
          <div className="profile-section">
            <div className="section-title">
              <div>
                <h3>Personal Information</h3>
                <p>Your basic account information</p>
              </div>
            </div>

            <div className="profile-grid">

              <div className="profile-field">
                <label>Full Name</label>

                {editing ? (
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="profile-value">
                    {profile.name}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label>Email Address</label>

                {editing ? (
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="profile-value">
                    {profile.email}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label>Phone Number</label>

                {editing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="profile-value">
                    {profile.phone}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label>Role</label>

                <div className="profile-value readonly">
                  {profile.role}
                </div>
              </div>

            </div>
          </div>

          {/* Health Information */}
          <div className="profile-section">

            <div className="section-title">
              <div>
                <h3>Health Information</h3>
                <p>Basic information used for healthcare services</p>
              </div>
            </div>

            <div className="profile-grid">

              <div className="profile-field">
                <label>Blood Group</label>

                {editing ? (
                  <select
                    name="bloodGroup"
                    value={profile.bloodGroup}
                    onChange={handleChange}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <div className="profile-value">
                    {profile.bloodGroup}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label>Location</label>

                {editing ? (
                  <input
                    type="text"
                    name="location"
                    value={profile.location}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="profile-value">
                    {profile.location}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Save */}
          {editing && (
            <div className="profile-actions">
              <button
                className="save-profile-btn"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          )}

        </section>

        {/* Security Card */}
        <section className="security-card">

          <div className="security-icon">
            🔐
          </div>

          <div className="security-content">
            <h3>Account Security</h3>
            <p>
              Keep your account secure by using a strong password
              and reviewing your account activity regularly.
            </p>
          </div>

          <button className="security-btn">
            Security Settings
          </button>

        </section>

      </div>
    </div>
  );
}

export default Profile;

