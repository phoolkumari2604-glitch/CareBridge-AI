import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  Receipt,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./DoctorEarnings.css";

export default function DoctorEarnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [earningsData, setEarningsData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/doctors/earnings");
      setEarningsData(res.data);
    } catch (err) {
      console.error("Failed to fetch earnings:", err);
      setError("Unable to load financial reports. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const handleExportCSV = () => {
    if (!earningsData || !earningsData.transactions) return;
    const headers = ["Transaction ID,Appointment ID,Patient Name,Date,Time,Specialty,Fee (INR),Payment Status,Payout Status,Payment Method\n"];
    const rows = earningsData.transactions.map((t) =>
      `"${t.id}","${t.appointment_id}","${t.patient_name}","${t.date}","${t.time}","${t.specialty}","${t.fee}","${t.status}","${t.payout_status}","${t.payment_method}"`
    );
    const csvBlob = new Blob([headers.concat(rows.join("\n"))], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Doctor_Financial_Statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const metrics = earningsData?.metrics || {
    total_earnings: 0,
    today_earnings: 0,
    this_month_earnings: 0,
    total_consultations: 0,
    completed_consultations: 0,
    pending_settlement: 0,
    average_fee: 800,
  };

  const filteredTransactions = (earningsData?.transactions || []).filter((t) => {
    const matchesSearch =
      t.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="doctor-earnings-container">
      {/* Header */}
      <div className="earnings-header">
        <div>
          <div className="earnings-kicker">FINANCIAL REPORTS & REVENUE</div>
          <h1>Earnings & Financial Reports</h1>
          <p>
            Track consultation revenues, settlement disbursements, and download financial statements.
          </p>
        </div>
        <div className="header-action-buttons">
          <button
            className={`action-btn-secondary ${refreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh revenue metrics"
          >
            <RefreshCw size={16} />
            <span>Sync</span>
          </button>
          <button className="action-btn-secondary" onClick={handleExportCSV} title="Export CSV Statement">
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>
          <button className="action-btn-primary" onClick={handlePrint} title="Print Financial Report">
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="earnings-alert-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="earnings-kpi-grid">
        <div className="kpi-card total-card">
          <div className="kpi-icon-wrap green">
            <Wallet size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Revenue</span>
            <h2>₹{metrics.total_earnings.toLocaleString("en-IN")}</h2>
            <div className="kpi-subtext positive">
              <TrendingUp size={14} />
              <span>{metrics.completed_consultations} Completed Consultations</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap blue">
            <Calendar size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">This Month</span>
            <h2>₹{metrics.this_month_earnings.toLocaleString("en-IN")}</h2>
            <div className="kpi-subtext">
              <span>Standard consultation rate: ₹{metrics.average_fee}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap cyan">
            <DollarSign size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Today's Revenue</span>
            <h2>₹{metrics.today_earnings.toLocaleString("en-IN")}</h2>
            <div className="kpi-subtext">
              <span>Active billing queue</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <Clock size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Pending Settlement</span>
            <h2>₹{metrics.pending_settlement.toLocaleString("en-IN")}</h2>
            <div className="kpi-subtext warning">
              <span>Direct bank disbursement in progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Card */}
      <div className="transactions-card">
        <div className="transactions-card-header">
          <div>
            <h3>Consultation Transactions & Statements</h3>
            <p>Showing {filteredTransactions.length} records</p>
          </div>
          <div className="transactions-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search patient, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={28} className="spinning" />
            <p>Loading financial transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <Receipt size={36} />
            <h4>No Transactions Found</h4>
            <p>No billing records match your search criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="earnings-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Patient Name</th>
                  <th>Consultation Date</th>
                  <th>Department</th>
                  <th>Fee Amount</th>
                  <th>Payment Status</th>
                  <th>Disbursement</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="txn-id-pill">{t.id}</span>
                    </td>
                    <td>
                      <strong>{t.patient_name}</strong>
                    </td>
                    <td>
                      <div className="date-time-cell">
                        <span>{t.date}</span>
                        <small>{t.time}</small>
                      </div>
                    </td>
                    <td>{t.specialty}</td>
                    <td>
                      <strong className="amount-cell">₹{t.fee}</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${t.status.toLowerCase()}`}>
                        {t.status === "PAID" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <span className={`payout-pill ${t.payout_status.toLowerCase()}`}>
                        {t.payout_status}
                      </span>
                    </td>
                    <td>
                      <span className="method-text">{t.payment_method}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
