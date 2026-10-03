import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './PatientDashboard.css';
import { 
  Activity, 
  AlertCircle, 
  FileText, 
  Bell, 
  Building, 
  Heart, 
  Thermometer, 
  Droplets, 
  Wind,
  Stethoscope,
  ChevronRight,
  Bot,
  MapPin,
  Shield,
  Truck,
  Siren,
} from 'lucide-react';
import EmergencyFacilitiesMap from '../../components/patient/EmergencyFacilitiesMap';

const PatientDashboard = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    hospitalsCount: 0,
    alertsTotal: 0,
    recordsCount: 0,
    unreadNotifications: 0
  });
  
  const [vitals, setVitals] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.patient_id) {
        setError("Patient profile not found. Please complete your profile registration.");
        setLoading(false);
        return;
      }

      const patientId = user.patient_id;

      try {
        setLoading(true);
        setError(null);

        // Fetch data concurrently
        const [
          hospitalsRes,
          alertsSummaryRes,
          recordsRes,
          notificationsCountRes,
          vitalsRes
        ] = await Promise.allSettled([
          api.get('/hospitals/'),
          api.get(`/health-alerts/${patientId}/summary`),
          api.get(`/health-records/${patientId}`),
          api.get(`/notifications/${patientId}/unread-count`),
          api.get(`/vitals/${patientId}/latest`)
        ]);

        // Process Hospitals
        let hospitalsCount = 0;
        if (hospitalsRes.status === 'fulfilled') {
          hospitalsCount = hospitalsRes.value.data.length || 0;
        }

        // Process Alerts Summary
        let alertsTotal = 0;
        if (alertsSummaryRes.status === 'fulfilled') {
          const summaryData = alertsSummaryRes.value.data;
          setAlertSummary(summaryData);
          alertsTotal = summaryData.total_alerts || 0;
        }

        // Process Records
        let recordsCount = 0;
        if (recordsRes.status === 'fulfilled') {
          const records = recordsRes.value.data;
          recordsCount = records.length || 0;
          setRecentRecords(
            [...records]
              .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
              .slice(0, 3)
          );
        }

        // Process Notifications
        let unreadNotifications = 0;
        if (notificationsCountRes.status === 'fulfilled') {
          unreadNotifications = notificationsCountRes.value.data.unread_count || 0;
        }

        // Process Vitals
        if (vitalsRes.status === 'fulfilled') {
          setVitals(vitalsRes.value.data);
        }

        setStats({
          hospitalsCount,
          alertsTotal,
          recordsCount,
          unreadNotifications
        });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load some dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="skeleton-header"></div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card stat-skeleton"></div>)}
        </div>
        <div className="patient-dashboard-layout">
          <div className="main-column">
            <div className="skeleton-card large-skeleton"></div>
            <div className="skeleton-card large-skeleton"></div>
          </div>
          <div className="side-column">
            <div className="skeleton-card medium-skeleton"></div>
            <div className="skeleton-card medium-skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name || 'Patient'} 👋</h1>
          <p>Here is your personalized health overview and live emergency services locator.</p>
        </div>
        {error && <div className="dashboard-error">{error}</div>}
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <Link to="/patient/hospitals" className="stat-card">
          <div className="stat-icon blue">
            <Building size={24} />
          </div>
          <div className="stat-details">
            <h3>Nearby Hospitals</h3>
            <p className="stat-value">{stats.hospitalsCount}</p>
          </div>
        </Link>
        
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <h3>Health Alerts</h3>
            <p className="stat-value">{stats.alertsTotal}</p>
          </div>
        </div>

        <Link to="/patient/health" className="stat-card">
          <div className="stat-icon teal">
            <FileText size={24} />
          </div>
          <div className="stat-details">
            <h3>Health Records</h3>
            <p className="stat-value">{stats.recordsCount}</p>
          </div>
        </Link>

        <Link to="/patient/notifications" className="stat-card">
          <div className="stat-icon orange">
            <Bell size={24} />
          </div>
          <div className="stat-details">
            <h3>Notifications</h3>
            <p className="stat-value">{stats.unreadNotifications}</p>
          </div>
        </Link>
      </section>

      {/* =========================================================
          LIVE EMERGENCY & NEARBY FACILITIES MAP (HOSPITALS, POLICE, AMBULANCES)
      ========================================================== */}
      <EmergencyFacilitiesMap />

      {/* Main & Side Layout */}
      <div className="patient-dashboard-layout">
        <div className="main-column">
          {/* Latest Vitals Panel */}
          <div className="panel vitals-panel">
            <div className="panel-header">
              <h2>Latest Vitals</h2>
              <Activity className="panel-icon teal-text" size={20} />
            </div>
            {vitals ? (
              <div className="vitals-grid">
                <div className="vital-item">
                  <Heart size={20} className="vital-icon red-text" />
                  <div className="vital-info">
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value">{vitals.heart_rate} <small>bpm</small></span>
                  </div>
                </div>
                <div className="vital-item">
                  <Activity size={20} className="vital-icon blue-text" />
                  <div className="vital-info">
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value">{vitals.systolic_bp}/{vitals.diastolic_bp} <small>mmHg</small></span>
                  </div>
                </div>
                <div className="vital-item">
                  <Wind size={20} className="vital-icon teal-text" />
                  <div className="vital-info">
                    <span className="vital-label">SpO2</span>
                    <span className="vital-value">{vitals.spo2} <small>%</small></span>
                  </div>
                </div>
                <div className="vital-item">
                  <Thermometer size={20} className="vital-icon orange-text" />
                  <div className="vital-info">
                    <span className="vital-label">Temperature</span>
                    <span className="vital-value">{vitals.temperature} <small>°F</small></span>
                  </div>
                </div>
                <div className="vital-item">
                  <Droplets size={20} className="vital-icon red-text" />
                  <div className="vital-info">
                    <span className="vital-label">Blood Sugar</span>
                    <span className="vital-value">{vitals.blood_sugar} <small>mg/dL</small></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No vitals recorded yet.</p>
              </div>
            )}
          </div>

          {/* Recent Health Records */}
          <div className="panel records-panel">
            <div className="panel-header">
              <h2>Recent Health Records</h2>
              <Link to="/patient/health" className="view-all">View All <ChevronRight size={16} /></Link>
            </div>
            {recentRecords.length > 0 ? (
              <div className="records-list">
                {recentRecords.map(record => (
                  <div key={record._id || record.id} className="record-item">
                    <div className="record-icon">
                      <Stethoscope size={20} />
                    </div>
                    <div className="record-content">
                      <h4>{record.diagnosis || record.title || 'Medical Record'}</h4>
                      <p>Dr. {record.doctor_name || 'Unknown'} • {new Date(record.created_at || record.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent health records found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="side-column">
          {/* Health Alert Summary */}
          <div className="panel alert-summary-panel">
            <div className="panel-header">
              <h2>Alert Summary</h2>
              <AlertCircle className="panel-icon red-text" size={20} />
            </div>
            {alertSummary && alertSummary.total_alerts > 0 ? (
              <div className="alert-content">
                <div className="alert-count-big">
                  <span className="count">{alertSummary.total_alerts}</span>
                  <span className="label">Active Alerts</span>
                </div>
                <ul className="alert-status-list">
                  {alertSummary.high_priority > 0 && (
                    <li className="alert-high">
                      <span className="dot red"></span> {alertSummary.high_priority} High Priority
                    </li>
                  )}
                  {alertSummary.medium_priority > 0 && (
                    <li className="alert-medium">
                      <span className="dot orange"></span> {alertSummary.medium_priority} Medium Priority
                    </li>
                  )}
                  {alertSummary.low_priority > 0 && (
                    <li className="alert-low">
                      <span className="dot yellow"></span> {alertSummary.low_priority} Low Priority
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="empty-state success">
                <p>No active health alerts. You're doing great!</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="panel quick-actions-panel">
            <div className="panel-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="quick-actions-grid">
              <Link to="/patient/hospitals" className="action-btn">
                <Building size={20} />
                <span>Find Hospital</span>
              </Link>
              <Link to="/patient/health" className="action-btn">
                <FileText size={20} />
                <span>My Records</span>
              </Link>
              <Link to="/patient/ai-assistant" className="action-btn ai-btn">
                <Bot size={20} />
                <span>AI Assistant</span>
              </Link>
              <Link to="/patient/notifications" className="action-btn">
                <Bell size={20} />
                <span>Notifications</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;