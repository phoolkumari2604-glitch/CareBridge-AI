import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  FileText,
  ArrowLeft,
  Loader2,
  Sparkles,
  Info
} from "lucide-react";
import medicineService from "../../services/medicineService";
import "./SourcesAttribution.css";

function SourcesAttribution() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // "ALL" | "APPROVED" | "BLOCKED"
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSources() {
      try {
        setLoading(true);
        const data = await medicineService.getDataSources();
        setSources(data.sources || []);
      } catch (err) {
        setError("Failed to load dataset registry. Please ensure backend is reachable.");
      } finally {
        setLoading(false);
      }
    }
    fetchSources();
  }, []);

  const filteredSources = sources.filter((s) => {
    const matchesFilter =
      filter === "ALL" ||
      (s.status || s.approval_status || "").toUpperCase() === filter;
    const matchesSearch =
      searchTerm === "" ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.license_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const approvedCount = sources.filter((s) => (s.status || s.approval_status) === "APPROVED").length;
  const blockedCount = sources.filter((s) => (s.status || s.approval_status) === "BLOCKED").length;

  return (
    <div className="sources-page">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="sources-header">
        <div>
          <Link to="/patient/medicine-assistant" className="sources-back-link">
            <ArrowLeft size={14} />
            <span>Back to Medicine Assistant</span>
          </Link>
          <span className="sources-eyebrow">OPEN SCIENCE & LICENSING COMPLIANCE</span>
          <h1>Data Sources, Licenses & Clinical Attribution</h1>
          <p>
            Full dataset audit register, licensing terms, and formal intellectual property attribution notices governing the CareBridge AI Medicine Assistant.
          </p>
        </div>

        <div className="sources-summary-badges">
          <div className="sources-metric-card">
            <span className="metric-value">{sources.length}</span>
            <span className="metric-label">Registered Datasets</span>
          </div>
          <div className="sources-metric-card approved">
            <span className="metric-value">{approvedCount}</span>
            <span className="metric-label">Approved & Loaded</span>
          </div>
          <div className="sources-metric-card blocked">
            <span className="metric-value">{blockedCount}</span>
            <span className="metric-label">Prohibited / Blocked</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          NON-COMMERCIAL NOTICE BOX
      ========================================================= */}
      <div className="sources-notice-banner">
        <div className="sources-notice-icon">
          <Info size={20} />
        </div>
        <div className="sources-notice-body">
          <h4>NON-COMMERCIAL STUDENT EDUCATIONAL PROJECT NOTICE</h4>
          <p>
            CareBridge AI is strictly an educational student research prototype developed for non-commercial clinical decision-support evaluation. Datasets licensed under non-commercial or share-alike terms (<strong>DDInter under CC BY-NC-SA 4.0</strong>, <strong>SIDER under CC BY-NC-SA 4.0</strong>, and <strong>WHO Essential Medicines List</strong>) are incorporated exclusively for educational evaluation.
          </p>
          <div className="sources-commercial-clause">
            <strong>Mandatory Commercial Conversion Protocol:</strong> If this project is ever commercialized or deployed in a revenue-generating commercial environment, all non-commercial datasets must be completely purged from the codebase and database prior to commercial launch.
          </div>
        </div>
      </div>

      {/* =========================================================
          FILTER & SEARCH BAR
      ========================================================= */}
      <div className="sources-toolbar">
        <div className="sources-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search datasets by name, ID, or license..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="sources-filter-buttons">
          <button
            type="button"
            className={`sources-filter-btn ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All Datasets ({sources.length})
          </button>
          <button
            type="button"
            className={`sources-filter-btn approved ${filter === "APPROVED" ? "active" : ""}`}
            onClick={() => setFilter("APPROVED")}
          >
            <ShieldCheck size={14} />
            Approved ({approvedCount})
          </button>
          <button
            type="button"
            className={`sources-filter-btn blocked ${filter === "BLOCKED" ? "active" : ""}`}
            onClick={() => setFilter("BLOCKED")}
          >
            <ShieldAlert size={14} />
            Blocked ({blockedCount})
          </button>
        </div>
      </div>

      {/* =========================================================
          DATASET CARDS
      ========================================================= */}
      {loading ? (
        <div className="sources-loading-state">
          <Loader2 size={32} className="sources-spin" />
          <p>Loading dataset attribution matrix from sources.json...</p>
        </div>
      ) : error ? (
        <div className="sources-error-card">
          <AlertTriangle size={24} />
          <p>{error}</p>
        </div>
      ) : (
        <div className="sources-cards-grid">
          {filteredSources.map((s) => {
            const status = (s.status || s.approval_status || "APPROVED").toUpperCase();
            const isApproved = status === "APPROVED";
            const isBlocked = status === "BLOCKED";

            return (
              <div
                key={s.id}
                className={`source-card ${isBlocked ? "source-card-blocked" : "source-card-approved"}`}
              >
                <div className="source-card-header">
                  <div>
                    <span className="source-id-pill">{s.id}</span>
                    <h3>{s.name}</h3>
                  </div>
                  <span className={`source-status-badge ${status.toLowerCase()}`}>
                    {isApproved ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                    {status}
                  </span>
                </div>

                <div className="source-card-body">
                  <div className="source-info-row">
                    <span className="source-label">Official Portal:</span>
                    <a
                      href={s.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {s.official_url}
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <div className="source-info-row">
                    <span className="source-label">License:</span>
                    <a
                      href={s.license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-license-link"
                    >
                      {s.license_name}
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <div className="source-flags-grid">
                    <div className="source-flag-item">
                      <span className="flag-label">Commercial Use:</span>
                      <span className={`flag-value ${s.commercial_allowed ? "yes" : "no"}`}>
                        {s.commercial_allowed ? "Permitted" : "Non-Commercial Only"}
                      </span>
                    </div>

                    <div className="source-flag-item">
                      <span className="flag-label">Attribution Required:</span>
                      <span className="flag-value yes">
                        {s.attribution_required ? "Yes (Mandatory)" : "Optional"}
                      </span>
                    </div>

                    <div className="source-flag-item">
                      <span className="flag-label">Share-Alike Required:</span>
                      <span className={`flag-value ${s.share_alike_required ? "sa-yes" : "sa-no"}`}>
                        {s.share_alike_required ? "Yes (BY-NC-SA)" : "No"}
                      </span>
                    </div>

                    <div className="source-flag-item">
                      <span className="flag-label">Audit Date:</span>
                      <span className="flag-value">{s.date_checked}</span>
                    </div>
                  </div>

                  {s.attribution_text && (
                    <div className="source-attribution-box">
                      <span className="box-title">Mandatory Attribution Notice:</span>
                      <p className="attribution-quote">"{s.attribution_text}"</p>
                    </div>
                  )}

                  {s.notes && (
                    <div className="source-notes-box">
                      <span className="box-title">Compliance Gate Notes:</span>
                      <p className="notes-text">{s.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SourcesAttribution;
