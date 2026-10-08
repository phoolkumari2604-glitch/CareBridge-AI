import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./HealthMonitoring.css";

function HealthMonitoring() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);

  // Active parameter tab: 'hr' | 'bp' | 'spo2' | 'temp' | 'sugar'
  const [activeMetric, setActiveMetric] = useState("hr");
  // Time interval: '24h' | '7d' | '30d' | 'all'
  const [timeInterval, setTimeInterval] = useState("7d");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const patientsList = await doctorService.getPatients();
      const validPatients = Array.isArray(patientsList) ? patientsList : [];
      setPatients(validPatients);

      let targetId = selectedPatientId;
      if (!targetId && validPatients.length > 0) {
        targetId = validPatients[0]._id || validPatients[0].id;
        setSelectedPatientId(targetId);
      }

      if (targetId) {
        const [vitalsData, summaryData] = await Promise.all([
          doctorService.getPatientVitals(targetId),
          doctorService.getHealthAlertSummary(targetId),
        ]);
        setVitalsHistory(Array.isArray(vitalsData) ? vitalsData : []);
        setAlertSummary(summaryData || null);
      }
    } catch (err) {
      console.error("Health Monitoring load error:", err);
      setError("Failed to load telemetry trend data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePatientChange = async (newPatientId) => {
    setSelectedPatientId(newPatientId);
    setLoading(true);
    try {
      const [vitalsData, summaryData] = await Promise.all([
        doctorService.getPatientVitals(newPatientId),
        doctorService.getHealthAlertSummary(newPatientId),
      ]);
      setVitalsHistory(Array.isArray(vitalsData) ? vitalsData : []);
      setAlertSummary(summaryData || null);
    } catch (err) {
      console.warn("Patient telemetry change error:", err);
      setVitalsHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Filter vitals by time interval
  const filteredVitals = useMemo(() => {
    if (!vitalsHistory || vitalsHistory.length === 0) return [];
    const now = new Date().getTime();

    return vitalsHistory.filter((v) => {
      if (timeInterval === "all") return true;
      if (!v.recorded_at && !v.created_at) return true;
      const recTime = new Date(v.recorded_at || v.created_at).getTime();
      const diffHours = (now - recTime) / (1000 * 60 * 60);

      if (timeInterval === "24h") return diffHours <= 24;
      if (timeInterval === "7d") return diffHours <= 24 * 7;
      if (timeInterval === "30d") return diffHours <= 24 * 30;
      return true;
    });
  }, [vitalsHistory, timeInterval]);

  // Selected Patient Details
  const currentPatient = patients.find(
    (p) => (p._id || p.id) === selectedPatientId
  );

  // Compute metric stats & chart coordinates
  const metricConfig = {
    hr: {
      name: "Heart Rate",
      unit: "bpm",
      icon: Activity,
      color: "#0284c7",
      normalRange: "60 - 100",
      minNormal: 60,
      maxNormal: 100,
      getValue: (v) => v.heart_rate,
    },
    bp: {
      name: "Systolic Blood Pressure",
      unit: "mmHg",
      icon: HeartPulse,
      color: "#dc2626",
      normalRange: "90 - 120",
      minNormal: 90,
      maxNormal: 120,
      getValue: (v) => v.systolic_bp,
    },
    spo2: {
      name: "SpO₂ Oxygen Saturation",
      unit: "%",
      icon: Droplets,
      color: "#0891b2",
      normalRange: "95 - 100",
      minNormal: 95,
      maxNormal: 100,
      getValue: (v) => v.spo2,
    },
    temp: {
      name: "Body Temperature",
      unit: "°C",
      icon: Thermometer,
      color: "#d97706",
      normalRange: "36.5 - 37.5",
      minNormal: 36.5,
      maxNormal: 37.5,
      getValue: (v) => v.temperature,
    },
    sugar: {
      name: "Blood Sugar",
      unit: "mg/dL",
      icon: TrendingUp,
      color: "#7c3aed",
      normalRange: "70 - 120",
      minNormal: 70,
      maxNormal: 120,
      getValue: (v) => v.blood_sugar,
    },
  };

  const currentConfig = metricConfig[activeMetric] || metricConfig.hr;
  const MetricIcon = currentConfig.icon;

  // Extract non-null points
  const points = useMemo(() => {
    const list = [...filteredVitals].reverse(); // chronological
    return list
      .map((v, i) => {
        const val = currentConfig.getValue(v);
        const timeStr = v.recorded_at
          ? new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : `R${i + 1}`;
        const dateStr = v.recorded_at
          ? new Date(v.recorded_at).toLocaleDateString([], { month: "short", day: "numeric" })
          : "";
        return { val, timeStr, dateStr, raw: v };
      })
      .filter((p) => p.val !== undefined && p.val !== null);
  }, [filteredVitals, currentConfig]);

  // Compute Min, Max, Avg, Latest
  const stats = useMemo(() => {
    if (points.length === 0) return { min: "--", max: "--", avg: "--", latest: "--", trend: "N/A" };
    const vals = points.map((p) => Number(p.val)).filter((n) => !isNaN(n));
    if (vals.length === 0) return { min: "--", max: "--", avg: "--", latest: "--", trend: "N/A" };

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    const latest = vals[vals.length - 1];
    const prev = vals.length > 1 ? vals[vals.length - 2] : latest;

    const trend =
      latest > prev ? "Rising (+)" : latest < prev ? "Falling (-)" : "Stable (=)";

    return { min, max, avg, latest, trend };
  }, [points]);

  // SVG Chart Calculation
  const svgChart = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.map((p) => Number(p.val));
    const rawMin = Math.min(...vals, currentConfig.minNormal);
    const rawMax = Math.max(...vals, currentConfig.maxNormal);
    const padding = (rawMax - rawMin) * 0.15 || 5;
    const minBound = rawMin - padding;
    const maxBound = rawMax + padding;
    const range = maxBound - minBound || 1;

    const width = 680;
    const height = 220;
    const margin = { top: 20, right: 30, bottom: 35, left: 45 };

    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const coords = points.map((p, index) => {
      const x = margin.left + (index / (points.length - 1)) * plotW;
      const y = margin.top + plotH - ((p.val - minBound) / range) * plotH;
      return { x, y, val: p.val, label: p.timeStr, date: p.dateStr };
    });

    const pathD = coords.reduce(
      (acc, c, i) => `${acc} ${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
      ""
    );

    // Baseline Normal Area Y coordinates
    const normalTopY = margin.top + plotH - ((currentConfig.maxNormal - minBound) / range) * plotH;
    const normalBottomY = margin.top + plotH - ((currentConfig.minNormal - minBound) / range) * plotH;

    return { coords, pathD, width, height, normalTopY, normalBottomY, margin, plotW, plotH };
  }, [points, currentConfig]);

  // Overall Patient Telemetry Status
  const statusBadge = useMemo(() => {
    if (alertSummary?.status === "ALERT" || alertSummary?.high_alerts > 0) {
      return {
        level: "critical",
        label: "CRITICAL ALERT",
        icon: AlertCircle,
        desc: alertSummary.message || "Physiological thresholds exceeded.",
      };
    }
    if (vitalsHistory.length > 0) {
      const latest = vitalsHistory[0];
      if (
        (latest.heart_rate && (latest.heart_rate > 105 || latest.heart_rate < 55)) ||
        (latest.systolic_bp && latest.systolic_bp >= 140) ||
        (latest.spo2 && latest.spo2 < 95)
      ) {
        return {
          level: "attention",
          label: "ATTENTION NEEDED",
          icon: AlertTriangle,
          desc: "Borderline vital parameters detected in recent streams.",
        };
      }
    }
    return {
      level: "stable",
      label: "STABLE",
      icon: CheckCircle2,
      desc: "All physiological parameters within expected baseline range.",
    };
  }, [alertSummary, vitalsHistory]);

  const StatusIcon = statusBadge.icon;

  return (
    <div className="health-monitoring-page">
      {/* HEADER */}
      <section className="telemetry-header">
        <div>
          <span className="telemetry-kicker">
            <Activity size={14} /> CLINICAL TELEMETRY ANALYTICS
          </span>
          <h1>Continuous Health Monitoring & Trends</h1>
          <p>
            Real-time physiological curves, baseline range surveillance, and multi-interval trend graphs.
          </p>
        </div>

        <div className="telemetry-header-actions">
          <button
            className={`telemetry-refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Syncing..." : "Sync Curves"}</span>
          </button>

          <button
            className="record-vital-btn"
            onClick={() =>
              navigate(`/doctor/vitals?patientId=${selectedPatientId || ""}`)
            }
          >
            <Plus size={16} />
            <span>Log Vital Reading</span>
          </button>
        </div>
      </section>

      {/* ERROR NOTICE */}
      {error && (
        <div className="telemetry-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {/* PATIENT SELECTOR BAR */}
      <section className="telemetry-patient-bar">
        <div className="patient-selector-inline">
          <label htmlFor="monitoring-patient-select">
            <strong>Monitored Patient:</strong>
          </label>
          <select
            id="monitoring-patient-select"
            value={selectedPatientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            className="patient-select-field"
          >
            {patients.length === 0 ? (
              <option value="">No patients available</option>
            ) : (
              patients.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name || "Patient"} (ID: {(p._id || p.id).slice(-6)})
                </option>
              ))
            )}
          </select>
        </div>

        {currentPatient && (
          <div className="patient-quick-badge">
            <span>
              <strong>Age:</strong> {currentPatient.age || "N/A"}
            </span>
            <span>•</span>
            <span>
              <strong>Gender:</strong> {currentPatient.gender || "N/A"}
            </span>
            <span>•</span>
            <span>
              <strong>Blood:</strong> {currentPatient.blood_group || "N/A"}
            </span>
          </div>
        )}

        {/* STATUS BADGE */}
        <div className={`telemetry-status-pill ${statusBadge.level}`}>
          <StatusIcon size={16} />
          <span>{statusBadge.label}</span>
        </div>
      </section>

      {/* PARAMETER SELECTOR TABS & TIME INTERVAL */}
      <section className="metric-controls-bar">
        <div className="metric-tabs-group">
          <button
            className={`metric-tab ${activeMetric === "hr" ? "active hr" : ""}`}
            onClick={() => setActiveMetric("hr")}
          >
            <Activity size={16} />
            <span>Heart Rate</span>
          </button>

          <button
            className={`metric-tab ${activeMetric === "bp" ? "active bp" : ""}`}
            onClick={() => setActiveMetric("bp")}
          >
            <HeartPulse size={16} />
            <span>Blood Pressure</span>
          </button>

          <button
            className={`metric-tab ${activeMetric === "spo2" ? "active spo2" : ""}`}
            onClick={() => setActiveMetric("spo2")}
          >
            <Droplets size={16} />
            <span>SpO₂ Oxygen</span>
          </button>

          <button
            className={`metric-tab ${activeMetric === "temp" ? "active temp" : ""}`}
            onClick={() => setActiveMetric("temp")}
          >
            <Thermometer size={16} />
            <span>Temperature</span>
          </button>

          <button
            className={`metric-tab ${activeMetric === "sugar" ? "active sugar" : ""}`}
            onClick={() => setActiveMetric("sugar")}
          >
            <TrendingUp size={16} />
            <span>Blood Sugar</span>
          </button>
        </div>

        {/* TIME INTERVAL SELECTOR */}
        <div className="time-interval-selector">
          <button
            className={timeInterval === "24h" ? "active" : ""}
            onClick={() => setTimeInterval("24h")}
          >
            24h
          </button>
          <button
            className={timeInterval === "7d" ? "active" : ""}
            onClick={() => setTimeInterval("7d")}
          >
            7 Days
          </button>
          <button
            className={timeInterval === "30d" ? "active" : ""}
            onClick={() => setTimeInterval("30d")}
          >
            30 Days
          </button>
          <button
            className={timeInterval === "all" ? "active" : ""}
            onClick={() => setTimeInterval("all")}
          >
            All History
          </button>
        </div>
      </section>

      {/* STATS TILES FOR ACTIVE METRIC */}
      <section className="metric-kpis-grid">
        <div className="metric-kpi-card">
          <span className="kpi-label">Latest Reading</span>
          <div className="kpi-value-row">
            <MetricIcon size={20} style={{ color: currentConfig.color }} />
            <strong>{stats.latest}</strong>
            <small>{currentConfig.unit}</small>
          </div>
          <span className="kpi-sub">Target: {currentConfig.normalRange} {currentConfig.unit}</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Average in Interval</span>
          <div className="kpi-value-row">
            <strong>{stats.avg}</strong>
            <small>{currentConfig.unit}</small>
          </div>
          <span className="kpi-sub">Based on {points.length} readings</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Min / Max Range</span>
          <div className="kpi-value-row">
            <strong>
              {stats.min} - {stats.max}
            </strong>
            <small>{currentConfig.unit}</small>
          </div>
          <span className="kpi-sub">Interval fluctuation</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Trend Direction</span>
          <div className="kpi-value-row">
            <strong
              className={
                stats.trend.includes("+")
                  ? "text-red"
                  : stats.trend.includes("-")
                  ? "text-blue"
                  : "text-green"
              }
            >
              {stats.trend}
            </strong>
          </div>
          <span className="kpi-sub">Compared to previous stream</span>
        </div>
      </section>

      {/* MAIN TELEMETRY CHART PANEL */}
      <section className="chart-main-panel">
        <div className="chart-panel-header">
          <div>
            <h2>
              {currentConfig.name} Trend Curve ({currentConfig.unit})
            </h2>
            <p>
              Displaying {points.length} chronological physiological data points for interval {timeInterval.toUpperCase()}
            </p>
          </div>

          <div className="chart-legend-box">
            <span className="legend-item line">
              <span className="legend-line" style={{ backgroundColor: currentConfig.color }} />
              <span>Telemetry Value</span>
            </span>
            <span className="legend-item baseline">
              <span className="legend-baseline-box" />
              <span>Normal Zone ({currentConfig.normalRange})</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="chart-loading-state">
            <Loader2 size={32} className="spinning" />
            <span>Calculating physiological curve...</span>
          </div>
        ) : points.length === 0 ? (
          <div className="chart-empty-state">
            <Activity size={40} />
            <h3>No recorded readings for {currentConfig.name} in this time range</h3>
            <p>Click below to log the first vital signs reading for this patient.</p>
            <button
              className="log-now-btn"
              onClick={() =>
                navigate(`/doctor/vitals?patientId=${selectedPatientId || ""}`)
              }
            >
              <Plus size={16} /> Log Vital Signs
            </button>
          </div>
        ) : points.length === 1 ? (
          <div className="chart-single-point-state">
            <MetricIcon size={36} style={{ color: currentConfig.color }} />
            <h3>Single Telemetry Point: {points[0].val} {currentConfig.unit}</h3>
            <p>
              Recorded on {points[0].dateStr || "Recent"} at {points[0].timeStr}. Log additional readings to display trend curves.
            </p>
          </div>
        ) : (
          <div className="svg-chart-container">
            <svg
              viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
              className="telemetry-svg"
            >
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Normal Baseline Range Strip */}
              {svgChart.normalBottomY && svgChart.normalTopY && (
                <rect
                  x={svgChart.margin.left}
                  y={svgChart.normalTopY}
                  width={svgChart.plotW}
                  height={Math.max(4, svgChart.normalBottomY - svgChart.normalTopY)}
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="rgba(16, 185, 129, 0.25)"
                  strokeDasharray="4 4"
                />
              )}

              {/* Grid Lines */}
              <line
                x1={svgChart.margin.left}
                y1={svgChart.margin.top}
                x2={svgChart.width - svgChart.margin.right}
                y2={svgChart.margin.top}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <line
                x1={svgChart.margin.left}
                y1={svgChart.margin.top + svgChart.plotH / 2}
                x2={svgChart.width - svgChart.margin.right}
                y2={svgChart.margin.top + svgChart.plotH / 2}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <line
                x1={svgChart.margin.left}
                y1={svgChart.margin.top + svgChart.plotH}
                x2={svgChart.width - svgChart.margin.right}
                y2={svgChart.margin.top + svgChart.plotH}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {/* Trend Path */}
              <path
                d={svgChart.pathD}
                fill="none"
                stroke={currentConfig.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Circles */}
              {svgChart.coords.map((c, i) => (
                <g key={i} className="chart-node-group">
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="5"
                    fill="#ffffff"
                    stroke={currentConfig.color}
                    strokeWidth="2.5"
                  />
                  <text
                    x={c.x}
                    y={c.y - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#0f172a"
                  >
                    {c.val}
                  </text>
                  <text
                    x={c.x}
                    y={svgChart.height - 10}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="500"
                    fill="#64748b"
                  >
                    {c.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </section>

      {/* HISTORICAL READINGS LOG TABLE */}
      <section className="historical-readings-panel">
        <div className="readings-header">
          <div>
            <h3>Historical Telemetry Readings Log</h3>
            <p>Chronological records of recorded vital signs</p>
          </div>
          <span className="log-count">{filteredVitals.length} readings recorded</span>
        </div>

        <div className="readings-table-wrapper">
          <table className="readings-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Heart Rate (bpm)</th>
                <th>Blood Pressure (mmHg)</th>
                <th>SpO₂ (%)</th>
                <th>Temperature (°C)</th>
                <th>Blood Sugar (mg/dL)</th>
              </tr>
            </thead>
            <tbody>
              {filteredVitals.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
                    No historical vital signs recorded for this patient.
                  </td>
                </tr>
              ) : (
                filteredVitals.map((v, i) => {
                  const time = v.recorded_at
                    ? new Date(v.recorded_at).toLocaleString()
                    : "Recent";

                  return (
                    <tr key={v._id || v.id || i}>
                      <td>
                        <div className="time-chip">
                          <Clock3 size={13} />
                          <span>{time}</span>
                        </div>
                      </td>
                      <td>
                        <strong className={v.heart_rate > 100 ? "text-red" : ""}>
                          {v.heart_rate || "--"}
                        </strong>
                      </td>
                      <td>
                        <strong className={v.systolic_bp >= 140 ? "text-amber" : ""}>
                          {v.systolic_bp && v.diastolic_bp
                            ? `${v.systolic_bp}/${v.diastolic_bp}`
                            : "--"}
                        </strong>
                      </td>
                      <td>
                        <strong className={v.spo2 < 95 ? "text-red" : ""}>
                          {v.spo2 ? `${v.spo2}%` : "--"}
                        </strong>
                      </td>
                      <td>
                        <strong>{v.temperature ? `${v.temperature}°` : "--"}</strong>
                      </td>
                      <td>
                        <strong>{v.blood_sugar ? `${v.blood_sugar}` : "--"}</strong>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default HealthMonitoring;
