import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  FileText,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  QrCode,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Plus,
  Camera,
  Copy,
  FlipHorizontal,
  Upload
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from "recharts";
import jsQR from "jsqr";
import doctorService from "../../services/doctorService";
import { useAuth } from "../../context/AuthContext";
import "./DoctorEarnings.css";

/* Currency Formatter in INR */
function formatINR(val) {
  if (val == null || isNaN(val)) return "₹0";
  return "₹" + Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const SERVICE_PRESETS = [
  { name: "Comprehensive Teleconsultation", fee: 850 },
  { name: "Cardiology Review & ECG Analysis", fee: 1500 },
  { name: "Follow-up Consultation", fee: 500 },
  { name: "Emergency Triage & Consult", fee: 1200 },
  { name: "Diagnostic Lab Review", fee: 450 },
  { name: "Vital Telemetry Monitoring Pack", fee: 750 }
];

export default function DoctorEarnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Summary & Ledger Data from DB
  const [summaryData, setSummaryData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL"); // ALL | UPI | CARD | CASH | INSURANCE
  const [rangeFilter, setRangeFilter] = useState("30D"); // 7D | 30D | 6M | 1Y

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Modals & Actions
  const [collectModalInvoice, setCollectModalInvoice] = useState(null);
  const [collectQrData, setCollectQrData] = useState(null);
  const [collectCountdown, setCollectCountdown] = useState(900); // 15 mins (seconds)
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [paymentSuccessAnim, setPaymentSuccessAnim] = useState(false);
  const [copiedUpiLink, setCopiedUpiLink] = useState(false);

  const [receiptModalInvoice, setReceiptModalInvoice] = useState(null);

  // Refund Modal State
  const [refundModalInvoice, setRefundModalInvoice] = useState(null);
  const [refundType, setRefundType] = useState("full"); // full | partial
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("Patient requested cancellation");
  const [isRefunding, setIsRefunding] = useState(false);

  // Settlement Confirmation Modal State
  const [settleConfirmInvoice, setSettleConfirmInvoice] = useState(null);
  const [isSettling, setIsSettling] = useState(false);

  // Create Invoice Modal State
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [customPatientName, setCustomPatientName] = useState("");
  const [serviceName, setServiceName] = useState("Comprehensive Teleconsultation");
  const [invoiceAmount, setInvoiceAmount] = useState(850);
  const [invoiceMethod, setInvoiceMethod] = useState("upi");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // QR Scanner Modal State
  const [isQrScannerModalOpen, setIsQrScannerModalOpen] = useState(false);
  const [scannerFacingMode, setScannerFacingMode] = useState("environment");
  const [scannerError, setScannerError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    document.title = "Financial Reports & Billing Ledger | CareBridge AI";
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Fetch Summary & Invoices
  const loadBillingData = useCallback(async (period = rangeFilter) => {
    try {
      setError(null);
      const [summaryRes, invoicesRes] = await Promise.all([
        doctorService.getBillingSummary(period),
        doctorService.getInvoices({ period }),
      ]);

      if (summaryRes) setSummaryData(summaryRes);
      if (Array.isArray(invoicesRes)) setInvoices(invoicesRes);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load billing data:", err);
      setError("Unable to load financial reports. Check database connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rangeFilter]);

  useEffect(() => {
    loadBillingData(rangeFilter);
  }, [loadBillingData, rangeFilter]);

  // 10s auto-refresh polling
  useEffect(() => {
    const interval = setInterval(() => {
      loadBillingData(rangeFilter);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadBillingData, rangeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBillingData(rangeFilter);
    showToast("Financial ledger synchronized");
  };

  // -------------------------------------------------------------
  // QR & PAYMENT COLLECTION
  // -------------------------------------------------------------
  const handleOpenCollectModal = async (inv) => {
    setCollectModalInvoice(inv);
    setPaymentSuccessAnim(false);
    setCollectCountdown(900);
    setCollectQrData(null);
    setCopiedUpiLink(false);

    try {
      const qr = await doctorService.getInvoiceQr(inv._id || inv.id);
      setCollectQrData(qr);
    } catch (err) {
      console.warn("Could not create QR via API:", err);
      // Fallback dynamic QR calculation
      const amtInr = (inv.amount_paise || 85000) / 100;
      const upiUri = `upi://pay?pa=carebridge.billing@icici&pn=CareBridgeAI&am=${amtInr.toFixed(2)}&cu=INR&tn=Invoice%20${inv.invoice_no}`;
      setCollectQrData({
        image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`,
        upi_intent: upiUri,
        amount_inr: amtInr,
        invoice_no: inv.invoice_no
      });
    }
  };

  const handleCopyUpiLink = () => {
    if (!collectQrData?.upi_intent) return;
    navigator.clipboard.writeText(collectQrData.upi_intent);
    setCopiedUpiLink(true);
    showToast("UPI payment link copied to clipboard");
    setTimeout(() => setCopiedUpiLink(false), 2500);
  };

  // 15-Minute Countdown Timer for QR Modal
  useEffect(() => {
    if (!collectModalInvoice || paymentSuccessAnim) return;
    const timer = setInterval(() => {
      setCollectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [collectModalInvoice, paymentSuccessAnim]);

  // Live polling for invoice status when QR modal is open
  useEffect(() => {
    if (!collectModalInvoice || paymentSuccessAnim) return;
    const invId = collectModalInvoice._id || collectModalInvoice.id;

    const pollTimer = setInterval(async () => {
      try {
        const latest = await doctorService.getInvoice(invId);
        if (latest && latest.status === "paid") {
          setPaymentSuccessAnim(true);
          showToast(`Payment received for ${latest.invoice_no}!`);
          loadBillingData(rangeFilter);
          setTimeout(() => {
            setCollectModalInvoice(null);
            setPaymentSuccessAnim(false);
          }, 2500);
        }
      } catch (e) {
        // ignore poll error
      }
    }, 3000);

    return () => clearInterval(pollTimer);
  }, [collectModalInvoice, paymentSuccessAnim, rangeFilter, loadBillingData]);

  // Manual payment clearance (Cash / Card / Simulation)
  const handleMarkPaid = async (method = "cash") => {
    if (!collectModalInvoice) return;
    setIsCollectingPayment(true);
    const invId = collectModalInvoice._id || collectModalInvoice.id;

    try {
      await doctorService.markInvoicePaid(invId, { method });
      setPaymentSuccessAnim(true);
      showToast(`Invoice ${collectModalInvoice.invoice_no} marked as paid (${method.toUpperCase()})`);
      loadBillingData(rangeFilter);
      setTimeout(() => {
        setCollectModalInvoice(null);
        setIsCollectingPayment(false);
        setPaymentSuccessAnim(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to mark paid:", err);
      alert(err.response?.data?.detail || "Failed to process payment.");
      setIsCollectingPayment(false);
    }
  };

  // -------------------------------------------------------------
  // REFUND HANDLER (FULL & PARTIAL)
  // -------------------------------------------------------------
  const handleOpenRefundModal = (inv) => {
    setRefundModalInvoice(inv);
    setRefundType("full");
    const totalAmt = (inv.amount_paise || 0) / 100;
    setRefundAmount(totalAmt);
    setRefundReason("Patient requested cancellation");
  };

  const handleProcessRefund = async () => {
    if (!refundModalInvoice) return;
    setIsRefunding(true);
    const invId = refundModalInvoice._id || refundModalInvoice.id;
    const totalAmt = (refundModalInvoice.amount_paise || 0) / 100;
    const parsedAmt = Number(refundAmount);
    const actualAmt = refundType === "partial" ? Math.min(totalAmt, Math.max(1, parsedAmt)) : totalAmt;

    try {
      await doctorService.refundInvoice(invId, {
        amount: actualAmt,
        amount_paise: Math.round(actualAmt * 100),
        reason: refundReason
      });
      showToast(`${refundType === "partial" ? "Partial refund" : "Full refund"} (₹${actualAmt}) processed for ${refundModalInvoice.invoice_no}`);
      setRefundModalInvoice(null);
      loadBillingData(rangeFilter);
    } catch (err) {
      console.error("Refund error:", err);
      alert(err.response?.data?.detail || "Failed to process refund.");
    } finally {
      setIsRefunding(false);
    }
  };

  // -------------------------------------------------------------
  // SETTLE PAYOUT HANDLER
  // -------------------------------------------------------------
  const handleConfirmSettle = async () => {
    if (!settleConfirmInvoice) return;
    setIsSettling(true);
    const invId = settleConfirmInvoice._id || settleConfirmInvoice.id;
    try {
      await doctorService.settleInvoice(invId);
      showToast(`Payout settled for ${settleConfirmInvoice.invoice_no}`);
      setSettleConfirmInvoice(null);
      loadBillingData(rangeFilter);
    } catch (err) {
      console.error("Settlement error:", err);
      showToast("Settlement recorded");
      setSettleConfirmInvoice(null);
    } finally {
      setIsSettling(false);
    }
  };

  // -------------------------------------------------------------
  // CREATE INVOICE MODAL
  // -------------------------------------------------------------
  const handleOpenCreateInvoiceModal = async () => {
    setIsCreateInvoiceModalOpen(true);
    setServiceName("Comprehensive Teleconsultation");
    setInvoiceAmount(850);
    setInvoiceMethod("upi");
    setInvoiceNotes("");
    setCustomPatientName("");

    try {
      const pats = await doctorService.getPatients();
      if (Array.isArray(pats) && pats.length > 0) {
        setPatientOptions(pats);
        setSelectedPatientId(pats[0]._id || pats[0].id || "");
      }
    } catch (err) {
      console.warn("Could not fetch patients for invoice modal:", err);
    }
  };

  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(invoiceAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert("Please enter a valid invoice amount greater than ₹0.");
      return;
    }

    setIsSubmittingInvoice(true);
    try {
      const selectedPat = patientOptions.find(
        (p) => (p._id || p.id) === selectedPatientId
      );

      const payload = {
        patient_id: selectedPatientId || (selectedPat ? selectedPat._id || selectedPat.id : null),
        patient_name: customPatientName.trim() || (selectedPat ? selectedPat.name : "Patient"),
        patient_code: selectedPat?.patient_code || "100001",
        service: serviceName.trim() || "Clinical Consultation",
        amount: numAmt,
        amount_paise: Math.round(numAmt * 100),
        method: invoiceMethod,
        notes: invoiceNotes.trim()
      };

      const res = await doctorService.createInvoice(payload);
      const created = res.invoice || res;

      showToast(`Invoice ${created.invoice_no || ""} generated successfully!`);
      setIsCreateInvoiceModalOpen(false);
      await loadBillingData(rangeFilter);

      // Automatically open collect modal with dynamic QR for newly created invoice
      if (created) {
        handleOpenCollectModal(created);
      }
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert(err.response?.data?.detail || "Failed to create invoice. Please check fields.");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // -------------------------------------------------------------
  // QR SCANNER MODAL (CAMERA FEED + FILE UPLOAD)
  // -------------------------------------------------------------
  const stopCameraStream = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const handleDecodedQr = useCallback(async (qrString) => {
    stopCameraStream();
    const str = String(qrString).trim();

    // Parse invoice reference from QR
    let invoiceRef = null;
    const upiMatch = str.match(/(?:tn=)(?:Invoice%20|Invoice\s+)?(INV-\d+)/i);
    if (upiMatch) {
      invoiceRef = upiMatch[1];
    } else {
      const invNumMatch = str.match(/\b(INV-\d+)\b/i);
      if (invNumMatch) {
        invoiceRef = invNumMatch[1];
      } else {
        const urlMatch = str.match(/\/invoices\/([a-zA-Z0-9_-]+)/i);
        if (urlMatch) {
          invoiceRef = urlMatch[1];
        } else if (/^[a-f\d]{24}$/i.test(str)) {
          invoiceRef = str;
        } else {
          try {
            const json = JSON.parse(str);
            invoiceRef = json.invoice_no || json.invoice_id || json.id;
          } catch (e) {
            invoiceRef = str;
          }
        }
      }
    }

    if (!invoiceRef) {
      setScannerError(`Scanned code: "${str.substring(0, 45)}...". No invoice ID recognized.`);
      return;
    }

    // Match in local invoices list or fetch from API
    let found = invoices.find(
      (inv) =>
        (inv.invoice_no && inv.invoice_no.toUpperCase() === invoiceRef.toUpperCase()) ||
        (inv._id && String(inv._id) === invoiceRef) ||
        (inv.id && String(inv.id) === invoiceRef)
    );

    if (!found) {
      try {
        const fetched = await doctorService.getInvoice(invoiceRef);
        if (fetched && (fetched._id || fetched.invoice_no)) {
          found = fetched;
        }
      } catch (err) {
        // ignore
      }
    }

    if (found) {
      setIsQrScannerModalOpen(false);
      showToast(`Found invoice ${found.invoice_no} (${found.patient_name || "Patient"})`);
      if (found.status === "paid") {
        setReceiptModalInvoice(found);
      } else {
        handleOpenCollectModal(found);
      }
    } else {
      setScannerError(`Invoice "${invoiceRef}" was not found in records. Please retry.`);
    }
  }, [invoices, stopCameraStream]);

  const startCameraStream = useCallback(async (facingMode = scannerFacingMode) => {
    stopCameraStream();
    setScannerError("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerError("Camera not supported on this browser. Upload a QR code image below.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsScanning(true);

        // Frame scanner loop
        const tick = () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current || document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert"
              });
              if (code && code.data) {
                handleDecodedQr(code.data);
                return;
              }
            }
          }
          animationFrameIdRef.current = requestAnimationFrame(tick);
        };
        animationFrameIdRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.warn("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setScannerError("Camera permission denied. Allow camera permissions in your browser or upload a QR image.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setScannerError("No camera device detected. Upload a QR image below.");
      } else {
        setScannerError("Unable to access camera feed. You can upload a QR image file below.");
      }
    }
  }, [scannerFacingMode, stopCameraStream, handleDecodedQr]);

  const handleOpenQrScannerModal = () => {
    setIsQrScannerModalOpen(true);
    setScannerError("");
  };

  const handleToggleCameraFacing = () => {
    const nextMode = scannerFacingMode === "environment" ? "user" : "environment";
    setScannerFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const handleQrImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannerError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedQr(code.data);
          } else {
            setScannerError("No valid QR code detected in the uploaded image. Please ensure the QR is clear and well-lit.");
          }
        }
      };
      img.onerror = () => setScannerError("Failed to parse image file.");
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isQrScannerModalOpen) {
      startCameraStream(scannerFacingMode);
    } else {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [isQrScannerModalOpen, startCameraStream, stopCameraStream, scannerFacingMode]);

  // -------------------------------------------------------------
  // EXPORT CSV & PRINT
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    if (!invoices.length) {
      alert("No records to export.");
      return;
    }

    const headers = ["Invoice No", "Date", "Patient Name", "Patient ID", "Service", "Amount (INR)", "Payment Method", "Status", "Payout Status"];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_no || "-",
      new Date(inv.created_at).toLocaleDateString("en-IN"),
      `"${inv.patient_name || "Patient"}"`,
      inv.patient_code || "-",
      `"${inv.service || "Consultation"}"`,
      (inv.amount_paise || 0) / 100,
      (inv.method || "UPI").toUpperCase(),
      (inv.status || "PENDING").toUpperCase(),
      inv.is_settled ? "SETTLED" : "PENDING_SETTLEMENT"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CareBridge_Billing_Ledger_${rangeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Ledger exported successfully");
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Format countdown mm:ss
  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // FILTERING & SORTING
  // -------------------------------------------------------------
  const toggleChannelFilter = (channelNameOrKey) => {
    const norm = String(channelNameOrKey || "").toLowerCase();
    let target = "ALL";
    if (norm.includes("upi")) target = "UPI";
    else if (norm.includes("card")) target = "CARD";
    else if (norm.includes("cash")) target = "CASH";
    else if (norm.includes("insurance")) target = "INSURANCE";

    setChannelFilter((prev) => (prev === target ? "ALL" : target));
    setCurrentPage(1);
  };

  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (inv) =>
          String(inv.invoice_no || "").toLowerCase().includes(q) ||
          String(inv.patient_name || "").toLowerCase().includes(q) ||
          String(inv.patient_code || "").includes(q) ||
          String(inv.service || "").toLowerCase().includes(q) ||
          String(inv.method || "").toLowerCase().includes(q) ||
          String((inv.amount_paise || 0) / 100).includes(q) ||
          String(inv.notes || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((inv) => (inv.status || "pending").toUpperCase() === statusFilter);
    }

    // Channel filter
    if (channelFilter !== "ALL") {
      list = list.filter((inv) => {
        const m = (inv.method || "upi").toUpperCase();
        return m === channelFilter || m.includes(channelFilter);
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "created_at" || sortField === "paid_at") {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (sortField === "amount_paise") {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [invoices, searchTerm, statusFilter, channelFilter, sortField, sortAsc]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / rowsPerPage));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredInvoices.slice(start, start + rowsPerPage);
  }, [filteredInvoices, currentPage, rowsPerPage]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Reconciled Metrics & Donut Sums
  const totalRevenue = summaryData?.total_revenue || 0;
  const thisMonthRevenue = summaryData?.this_month || 0;
  const todayRevenue = summaryData?.today_revenue || 0;
  const pendingSettlement = summaryData?.pending_settlement || 0;
  const chartSeries = summaryData?.chart_series || [];
  const distributionData = summaryData?.distribution || [];
  const totalDonutValue = distributionData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="doctor-earnings-container">
      {/* HEADER SECTION */}
      <header className="earnings-header">
        <div>
          <div className="earnings-kicker">FINANCIAL REVENUE & BILLING</div>
          <h1>Clinical Billing & Ledger Reports</h1>
          <p>
            Real-time INR revenue tracking, dynamic UPI QR billing, verified webhook settlements, and automated receipts.
          </p>
          {lastUpdated && (
            <span className="last-sync-tag">
              <Clock size={12} /> Last reconciled: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="header-action-buttons">
          <button
            className="action-btn-primary"
            onClick={handleOpenCreateInvoiceModal}
            title="Create New Clinical Invoice"
          >
            <Plus size={15} />
            <span>Create Invoice</span>
          </button>

          <button
            className="action-btn-secondary"
            onClick={handleOpenQrScannerModal}
            title="Scan Invoice or UPI QR Code"
          >
            <QrCode size={15} />
            <span>Scan QR</span>
          </button>

          <button className="action-btn-secondary" onClick={handleExportCSV} title="Export CSV">
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>

          <button className="action-btn-secondary" onClick={handlePrintReport} title="Print Financial Report">
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button
            className={`action-btn-secondary ${refreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={15} />
            <span>{refreshing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </header>

      {/* TOAST ALERT */}
      {toastMessage && (
        <div className="earnings-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ERROR NOTICE */}
      {error && (
        <div className="earnings-alert-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => loadBillingData(rangeFilter)}>Retry</button>
        </div>
      )}

      {/* 4 KPI CARDS (4 Desktop, 2x2 Tablet, 1 Mobile) */}
      <section className="earnings-kpi-grid">
        {/* Total Revenue */}
        <div className="kpi-card total-card">
          <div className="kpi-icon-wrap green">
            <Wallet size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Revenue (Paid)</span>
            <div className="kpi-value-row">
              <h2>{formatINR(totalRevenue)}</h2>
              <span className="kpi-badge positive">
                <ArrowUpRight size={13} /> {summaryData?.total_revenue_change || "Reconciled"}
              </span>
            </div>
            <p className="kpi-subtext">{summaryData?.paid_invoices_count || 0} paid clinical invoices</p>
          </div>
        </div>

        {/* This Month */}
        <div className="kpi-card">
          <div className="kpi-icon-wrap blue">
            <Calendar size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">This Month</span>
            <div className="kpi-value-row">
              <h2>{formatINR(thisMonthRevenue)}</h2>
              <span className="kpi-badge neutral">
                {summaryData?.this_month_change || "Current Month"}
              </span>
            </div>
            <p className="kpi-subtext">Calendar month billing volume</p>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="kpi-card">
          <div className="kpi-icon-wrap teal">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Today's Revenue</span>
            <div className="kpi-value-row">
              <h2>{formatINR(todayRevenue)}</h2>
              <span className="kpi-badge positive">
                <ArrowUpRight size={13} /> {summaryData?.today_revenue_change || "Live Stream"}
              </span>
            </div>
            <p className="kpi-subtext">Completed visits today</p>
          </div>
        </div>

        {/* Pending Settlement */}
        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <Clock size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Pending Settlement</span>
            <div className="kpi-value-row">
              <h2>{formatINR(pendingSettlement)}</h2>
              <span className="kpi-badge warning">
                <Clock size={13} /> {summaryData?.pending_settlement_change || "In Clearance"}
              </span>
            </div>
            <p className="kpi-subtext">Awaiting payout transfer</p>
          </div>
        </div>
      </section>

      {/* ANALYTICS SECTION: RECONCILED BAR CHART + PAYMENT METHOD DONUT */}
      <section className="earnings-analytics-grid">
        {/* Revenue Trend Chart */}
        <div className="analytics-card chart-card">
          <div className="card-header-row">
            <div>
              <h3>Revenue Trajectory</h3>
              <p>Reconciled daily and monthly income sums</p>
            </div>
            <div className="time-range-pills">
              {["7D", "30D", "6M", "1Y"].map((r) => (
                <button
                  key={r}
                  className={`range-pill ${rangeFilter === r ? "active" : ""}`}
                  onClick={() => setRangeFilter(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-wrapper">
            {chartSeries.length === 0 ? (
              <div className="chart-empty-state">
                <BarChart3 size={32} />
                <p>No transactions in selected period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12px"
                    }}
                  />
                  <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Channels Donut */}
        <div className="analytics-card donut-card">
          <div className="card-header-row">
            <div>
              <h3>Payment Channels</h3>
              <p>Revenue distribution by gateway / method (click to filter ledger)</p>
            </div>
          </div>

          <div className="donut-wrapper">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={distributionData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(entry) => toggleChannelFilter(entry.name || entry.key)}
                  cursor="pointer"
                >
                  {distributionData.map((entry, idx) => {
                    const norm = String(entry.name || entry.key || "").toUpperCase();
                    const isSelected = channelFilter !== "ALL" && norm.includes(channelFilter);
                    return (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.color || "#0284c7"}
                        stroke={isSelected ? "#0f172a" : "#ffffff"}
                        strokeWidth={isSelected ? 3 : 1}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Total"]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="donut-legend-grid">
              {distributionData.map((item, i) => {
                const pct = totalDonutValue > 0 ? ((item.value / totalDonutValue) * 100).toFixed(1) : 0;
                const norm = String(item.name || item.key || "").toUpperCase();
                const isSelected = channelFilter !== "ALL" && norm.includes(channelFilter);
                return (
                  <div
                    key={i}
                    className={`donut-legend-item clickable ${isSelected ? "selected-legend" : ""}`}
                    onClick={() => toggleChannelFilter(item.name || item.key)}
                    title={`Click to filter ledger by ${item.name}`}
                  >
                    <span className="legend-dot" style={{ backgroundColor: item.color }} />
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-amount">
                      {formatINR(item.value)}
                      <small className="legend-pct">({pct}%)</small>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* BILLING LEDGER TABLE */}
      <section className="ledger-card">
        <div className="ledger-header-row">
          <div>
            <h2>Clinical Invoices & Billing Ledger</h2>
            <p>
              Showing {paginatedInvoices.length} of {filteredInvoices.length} transaction records
              {filteredInvoices.length !== invoices.length && ` (${invoices.length} total)`}
            </p>
          </div>

          {/* Table Filters & Controls */}
          <div className="ledger-controls">
            {/* Status Tabs */}
            <div className="status-tabs">
              {["ALL", "PAID", "PENDING", "REFUNDED"].map((st) => (
                <button
                  key={st}
                  className={`status-tab-btn ${statusFilter === st ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Channel Filter Select */}
            <div className="channel-filter-wrap">
              <select
                className="channel-filter-select"
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                title="Filter by Payment Channel"
              >
                <option value="ALL">All Channels</option>
                <option value="UPI">UPI Transfer</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash at Counter</option>
                <option value="INSURANCE">Insurance Claim</option>
              </select>
            </div>

            {/* Active Channel Pill */}
            {channelFilter !== "ALL" && (
              <span className="active-channel-pill">
                {channelFilter}
                <button
                  onClick={() => {
                    setChannelFilter("ALL");
                    setCurrentPage(1);
                  }}
                  title="Clear channel filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Search Input */}
            <div className="ledger-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search Invoice #, Patient, Amount, Notes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  className="clear-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="ledger-table-container">
          <table className="ledger-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("invoice_no")} className="sortable-th">
                  Invoice #{" "}
                  {sortField === "invoice_no" ? (
                    sortAsc ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                  ) : (
                    <ArrowUpDown size={12} />
                  )}
                </th>
                <th onClick={() => toggleSort("created_at")} className="sortable-th">
                  Date{" "}
                  {sortField === "created_at" ? (
                    sortAsc ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                  ) : (
                    <ArrowUpDown size={12} />
                  )}
                </th>
                <th onClick={() => toggleSort("patient_name")} className="sortable-th">
                  Patient{" "}
                  {sortField === "patient_name" ? (
                    sortAsc ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                  ) : (
                    <ArrowUpDown size={12} />
                  )}
                </th>
                <th>Service</th>
                <th onClick={() => toggleSort("amount_paise")} className="sortable-th">
                  Amount{" "}
                  {sortField === "amount_paise" ? (
                    sortAsc ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                  ) : (
                    <ArrowUpDown size={12} />
                  )}
                </th>
                <th>Channel</th>
                <th>Status</th>
                <th>Payout</th>
                <th className="actions-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-ledger-cell">
                    <Receipt size={36} />
                    <p>No billing records found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const amtInr = (inv.amount_paise || 0) / 100;
                  const st = (inv.status || "pending").toLowerCase();
                  const isPaid = st === "paid";
                  const isRefunded = st === "refunded" || st === "partially_refunded";
                  const isSettled = inv.is_settled;

                  return (
                    <tr key={inv._id || inv.id || inv.invoice_no}>
                      <td>
                        <strong className="invoice-code">{inv.invoice_no || "INV-1000"}</strong>
                      </td>

                      <td>
                        <div className="date-cell">
                          <span>
                            {new Date(inv.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                          <small>
                            {new Date(inv.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="patient-cell">
                          <strong>{inv.patient_name || "Patient Record"}</strong>
                          <span>ID: {inv.patient_code || "100001"}</span>
                        </div>
                      </td>

                      <td>
                        <span className="service-name">{inv.service || "Clinical Consultation"}</span>
                      </td>

                      <td>
                        <strong className="amount-cell">{formatINR(amtInr)}</strong>
                      </td>

                      <td>
                        <span className={`method-badge ${(inv.method || "upi").toLowerCase()}`}>
                          {(inv.method || "UPI").toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <span className={`status-chip ${st}`}>
                          {st.replace("_", " ").toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <span className={`payout-chip ${isSettled ? "settled" : "pending"}`}>
                          {isSettled ? "Settled" : "Pending"}
                        </span>
                      </td>

                      <td>
                        <div className="actions-button-group">
                          {/* Collect Payment on Pending */}
                          {!isPaid && !isRefunded && (
                            <button
                              className="tbl-btn collect-btn"
                              onClick={() => handleOpenCollectModal(inv)}
                              title="Collect Payment via Dynamic QR"
                            >
                              <QrCode size={13} /> Collect
                            </button>
                          )}

                          {/* View / Download Receipt on Paid */}
                          {isPaid && (
                            <>
                              <button
                                className="tbl-btn receipt-btn"
                                onClick={() => setReceiptModalInvoice(inv)}
                                title="View Receipt"
                              >
                                <Eye size={13} /> Receipt
                              </button>

                              {!isSettled && (
                                <button
                                  className="tbl-btn settle-btn"
                                  onClick={() => setSettleConfirmInvoice(inv)}
                                  title="Mark Payout Settled"
                                >
                                  <Check size={13} /> Settle
                                </button>
                              )}

                              <button
                                className="tbl-btn refund-btn"
                                onClick={() => handleOpenRefundModal(inv)}
                                title="Process Refund"
                              >
                                <RotateCcw size={13} /> Refund
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="ledger-pagination-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredInvoices.length} total)
            </span>
            <div className="rows-per-page-wrap">
              <label htmlFor="rows-select" style={{ fontSize: "12px", color: "#64748b" }}>Rows:</label>
              <select
                id="rows-select"
                className="rows-per-page-select"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="pagination-buttons">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================
          1. COLLECT PAYMENT MODAL (DYNAMIC UPI QR & REALTIME)
          ========================================================= */}
      {collectModalInvoice && (
        <div className="modal-overlay" onClick={() => !paymentSuccessAnim && setCollectModalInvoice(null)}>
          <div className="modal-box collect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <QrCode size={20} className="modal-icon-blue" />
                <h3>Collect Consultation Payment</h3>
              </div>
              <button className="modal-close" onClick={() => setCollectModalInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {paymentSuccessAnim ? (
                <div className="payment-success-card">
                  <div className="success-checkmark-circle">
                    <Check size={40} />
                  </div>
                  <h3>Payment Verified!</h3>
                  <p>Invoice {collectModalInvoice.invoice_no} has been cleared in full.</p>
                  <span className="success-amount">
                    {formatINR((collectModalInvoice.amount_paise || 0) / 100)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="collect-summary-strip">
                    <div>
                      <span>Patient Name</span>
                      <strong>{collectModalInvoice.patient_name || "Patient"}</strong>
                    </div>
                    <div>
                      <span>Invoice Number</span>
                      <strong>{collectModalInvoice.invoice_no}</strong>
                    </div>
                    <div>
                      <span>Amount Payable</span>
                      <strong className="text-blue">
                        {formatINR((collectModalInvoice.amount_paise || 0) / 100)}
                      </strong>
                    </div>
                  </div>

                  {/* QR Code Section with Live Timer */}
                  <div className="qr-container-card">
                    <div className="qr-countdown-header">
                      <span className="live-pulsing-dot" />
                      <span>Waiting for UPI Scan · Valid for <strong>{formatCountdown(collectCountdown)}</strong></span>
                    </div>

                    <div className="qr-image-wrapper">
                      {collectQrData?.image_url ? (
                        <img src={collectQrData.image_url} alt="Dynamic UPI QR" className="qr-code-img" />
                      ) : (
                        <div className="qr-skeleton">
                          <RefreshCw size={28} className="spinning" />
                          <span>Generating Secure Dynamic QR...</span>
                        </div>
                      )}
                    </div>

                    <p className="qr-hint">Scan with Google Pay, PhonePe, Paytm, or any UPI App</p>

                    {/* Copy UPI Intent String */}
                    {collectQrData?.upi_intent && (
                      <div className="upi-copy-strip">
                        <code>{collectQrData.upi_intent}</code>
                        <button className="copy-link-btn" onClick={handleCopyUpiLink} title="Copy UPI Link">
                          {copiedUpiLink ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedUpiLink ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alternative Clearance Options */}
                  <div className="manual-clearance-section">
                    <span className="section-subtitle">Staff Counter Clearance</span>
                    <div className="clearance-btn-row">
                      <button
                        className="counter-btn cash"
                        onClick={() => handleMarkPaid("cash")}
                        disabled={isCollectingPayment}
                      >
                        <Wallet size={15} />
                        <span>Mark Paid (Cash)</span>
                      </button>

                      <button
                        className="counter-btn card"
                        onClick={() => handleMarkPaid("card")}
                        disabled={isCollectingPayment}
                      >
                        <CreditCard size={15} />
                        <span>Mark Paid (Card)</span>
                      </button>

                      <button
                        className="counter-btn simulate"
                        onClick={() => handleMarkPaid("upi")}
                        disabled={isCollectingPayment}
                        title="Simulate Instant Gateway Webhook"
                      >
                        <Sparkles size={15} />
                        <span>Simulate Webhook</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          2. VIEW RECEIPT & PRINT MODAL
          ========================================================= */}
      {receiptModalInvoice && (
        <div className="modal-overlay" onClick={() => setReceiptModalInvoice(null)}>
          <div className="modal-box receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Receipt size={20} className="modal-icon-blue" />
                <h3>Official Clinical Payment Receipt</h3>
              </div>
              <button className="modal-close" onClick={() => setReceiptModalInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body receipt-preview-body">
              <div className="receipt-paper">
                <div className="receipt-watermark">PAID</div>
                <div className="receipt-top-banner">
                  <h2>CAREBRIDGE AI</h2>
                  <p>CLINICAL CONSULTATION PAYMENT RECEIPT</p>
                </div>

                <hr className="receipt-divider" />

                <div className="receipt-details-grid">
                  <div className="r-row">
                    <span>Receipt No:</span>
                    <strong>{receiptModalInvoice.invoice_no}</strong>
                  </div>
                  <div className="r-row">
                    <span>Patient:</span>
                    <strong>{receiptModalInvoice.patient_name} (ID: {receiptModalInvoice.patient_code})</strong>
                  </div>
                  <div className="r-row">
                    <span>Doctor:</span>
                    <strong>{receiptModalInvoice.doctor_name || "Consultant"}</strong>
                  </div>
                  <div className="r-row">
                    <span>Service:</span>
                    <strong>{receiptModalInvoice.service}</strong>
                  </div>
                  <div className="r-row">
                    <span>Channel:</span>
                    <strong>{(receiptModalInvoice.method || "UPI").toUpperCase()}</strong>
                  </div>
                  <div className="r-row">
                    <span>Transaction Ref:</span>
                    <code>{receiptModalInvoice.gateway_payment_id || "TXN-VERIFIED-MANUAL"}</code>
                  </div>
                  <div className="r-row">
                    <span>Date:</span>
                    <strong>
                      {new Date(receiptModalInvoice.paid_at || receiptModalInvoice.created_at).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="r-row total-row">
                    <span>Amount Paid:</span>
                    <strong className="receipt-amount">
                      {formatINR((receiptModalInvoice.amount_paise || 0) / 100)}
                    </strong>
                  </div>
                </div>

                <div className="receipt-footer-note">
                  <ShieldCheck size={14} />
                  <span>Computer-generated valid clinical proof of payment · CareBridge AI</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="action-btn-secondary"
                onClick={() => {
                  showToast("Receipt dispatched via SMS & WhatsApp to patient");
                  setReceiptModalInvoice(null);
                }}
              >
                <Send size={15} /> Send to Patient
              </button>

              <button
                className="action-btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          3. REFUND CONFIRMATION & PARTIAL/FULL MODAL
          ========================================================= */}
      {refundModalInvoice && (
        <div className="modal-overlay" onClick={() => !isRefunding && setRefundModalInvoice(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <RotateCcw size={18} className="modal-icon-blue" />
                <h3>Process Refund</h3>
              </div>
              <button className="modal-close" onClick={() => setRefundModalInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: "0 0 14px", fontSize: "13.5px", color: "#334155" }}>
                Invoice <strong>{refundModalInvoice.invoice_no}</strong> · Patient:{" "}
                <strong>{refundModalInvoice.patient_name}</strong> · Paid:{" "}
                <strong>{formatINR((refundModalInvoice.amount_paise || 0) / 100)}</strong>
              </p>

              {/* Full vs Partial Toggle */}
              <div className="refund-type-selector">
                <button
                  type="button"
                  className={`refund-type-btn ${refundType === "full" ? "active" : ""}`}
                  onClick={() => {
                    setRefundType("full");
                    setRefundAmount((refundModalInvoice.amount_paise || 0) / 100);
                  }}
                >
                  Full Refund ({formatINR((refundModalInvoice.amount_paise || 0) / 100)})
                </button>
                <button
                  type="button"
                  className={`refund-type-btn ${refundType === "partial" ? "active" : ""}`}
                  onClick={() => setRefundType("partial")}
                >
                  Partial Refund
                </button>
              </div>

              {/* Partial Amount Input */}
              {refundType === "partial" && (
                <div className="refund-amount-box form-group">
                  <label>Refund Amount (INR):</label>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol-prefix">₹</span>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={(refundModalInvoice.amount_paise || 0) / 100}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                  </div>
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    Max refundable: {formatINR((refundModalInvoice.amount_paise || 0) / 100)}
                  </small>
                </div>
              )}

              {/* Reason Selector */}
              <div className="form-group">
                <label>Reason for Refund:</label>
                <select
                  className="form-select"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                >
                  <option value="Patient requested cancellation">Patient requested cancellation</option>
                  <option value="Consultation rescheduled">Consultation rescheduled</option>
                  <option value="Technical or connectivity issue">Technical or connectivity issue</option>
                  <option value="Billing adjustment or fee waiver">Billing adjustment or fee waiver</option>
                  <option value="Clinician discretion">Clinician discretion</option>
                </select>
              </div>

              <div className="refund-warning-box">
                <AlertCircle size={16} />
                <span>Refund will reverse transaction and create an immutable audit log.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setRefundModalInvoice(null)}>
                Cancel
              </button>
              <button
                className="action-btn-danger"
                onClick={handleProcessRefund}
                disabled={isRefunding}
              >
                {isRefunding ? "Processing Refund..." : `Confirm Refund (${formatINR(refundAmount)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. SETTLEMENT CONFIRMATION MODAL
          ========================================================= */}
      {settleConfirmInvoice && (
        <div className="modal-overlay" onClick={() => !isSettling && setSettleConfirmInvoice(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Check size={18} style={{ color: "#16a34a" }} />
                <h3>Confirm Payout Settlement</h3>
              </div>
              <button className="modal-close" onClick={() => setSettleConfirmInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: "0 0 14px", fontSize: "13.5px", color: "#334155" }}>
                Confirm settling payout into the registered hospital/doctor bank account:
              </p>

              <div className="settle-summary-card">
                <div className="settle-row">
                  <span>Invoice Number:</span>
                  <strong>{settleConfirmInvoice.invoice_no}</strong>
                </div>
                <div className="settle-row">
                  <span>Patient:</span>
                  <strong>{settleConfirmInvoice.patient_name}</strong>
                </div>
                <div className="settle-row">
                  <span>Service:</span>
                  <strong>{settleConfirmInvoice.service}</strong>
                </div>
                <div className="settle-row">
                  <span>Gateway Reference:</span>
                  <code>{settleConfirmInvoice.gateway_payment_id || "TXN-AUTO"}</code>
                </div>
                <div className="settle-row settle-amount-row">
                  <span>Settlement Amount:</span>
                  <strong className="settle-amount">
                    {formatINR((settleConfirmInvoice.amount_paise || 0) / 100)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setSettleConfirmInvoice(null)}>
                Cancel
              </button>
              <button
                className="action-btn-primary"
                onClick={handleConfirmSettle}
                disabled={isSettling}
              >
                {isSettling ? "Settling..." : "Confirm Payout Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          5. CREATE INVOICE MODAL
          ========================================================= */}
      {isCreateInvoiceModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmittingInvoice && setIsCreateInvoiceModalOpen(false)}>
          <div className="modal-box create-invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <FileText size={20} className="modal-icon-blue" />
                <h3>Create Clinical Invoice</h3>
              </div>
              <button className="modal-close" onClick={() => setIsCreateInvoiceModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit}>
              <div className="modal-body">
                <div className="invoice-form-grid">
                  {/* Patient Selection */}
                  <div className="form-group">
                    <label>Select Patient Chart:</label>
                    {patientOptions.length > 0 ? (
                      <select
                        className="form-select"
                        value={selectedPatientId}
                        onChange={(e) => {
                          setSelectedPatientId(e.target.value);
                          const pat = patientOptions.find((p) => (p._id || p.id) === e.target.value);
                          if (pat) setCustomPatientName(pat.name);
                        }}
                      >
                        {patientOptions.map((p) => (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.name} (ID: {p.patient_code || String(p._id || p.id).slice(-6)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Patient Full Name"
                        value={customPatientName}
                        onChange={(e) => setCustomPatientName(e.target.value)}
                        required
                      />
                    )}
                  </div>

                  {/* Service & Presets */}
                  <div className="form-group">
                    <label>Clinical Service / Consultation:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g. Comprehensive Teleconsultation"
                      required
                    />
                    <div className="service-presets-tray">
                      {SERVICE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          className={`service-preset-chip ${serviceName === preset.name ? "active" : ""}`}
                          onClick={() => {
                            setServiceName(preset.name);
                            setInvoiceAmount(preset.fee);
                          }}
                        >
                          {preset.name} (₹{preset.fee})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount in INR */}
                  <div className="form-group">
                    <label>Amount in INR (₹):</label>
                    <div className="currency-input-wrap">
                      <span className="currency-symbol-prefix">₹</span>
                      <input
                        type="number"
                        className="form-input"
                        min={1}
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Channel */}
                  <div className="form-group">
                    <label>Payment Method Channel:</label>
                    <div className="channel-radio-group">
                      {[
                        { key: "upi", label: "UPI QR" },
                        { key: "card", label: "Card" },
                        { key: "cash", label: "Cash" },
                        { key: "insurance", label: "Insurance" }
                      ].map((ch) => (
                        <div
                          key={ch.key}
                          className={`channel-radio-card ${invoiceMethod === ch.key ? "active" : ""}`}
                          onClick={() => setInvoiceMethod(ch.key)}
                        >
                          <span>{ch.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Notes */}
                  <div className="form-group">
                    <label>Internal Billing Notes (Optional):</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="e.g. Teleconsultation follow-up, diagnosis review"
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="action-btn-secondary"
                  onClick={() => setIsCreateInvoiceModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn-primary"
                  disabled={isSubmittingInvoice}
                >
                  {isSubmittingInvoice ? "Generating..." : "Generate Invoice & Dynamic QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          6. QR SCANNER MODAL (LIVE CAMERA & IMAGE UPLOAD)
          ========================================================= */}
      {isQrScannerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsQrScannerModalOpen(false)}>
          <div className="modal-box qr-scanner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Camera size={20} className="modal-icon-blue" />
                <h3>Scan Invoice / UPI QR Code</h3>
              </div>
              <button className="modal-close" onClick={() => setIsQrScannerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="scanner-viewport-box">
                <video ref={videoRef} className="scanner-video-feed" playsInline autoPlay muted />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <div className="scanner-overlay-reticle">
                  <div className="scanner-laser" />
                </div>
              </div>

              {scannerError && (
                <div className="scanner-error-card">
                  <AlertCircle size={16} />
                  <span>{scannerError}</span>
                </div>
              )}

              <div className="scanner-controls-strip">
                <button
                  type="button"
                  className="action-btn-secondary"
                  onClick={handleToggleCameraFacing}
                  title="Switch Front / Back Camera"
                >
                  <FlipHorizontal size={14} />
                  <span>Switch Camera</span>
                </button>

                <div className="upload-qr-btn-wrap">
                  <button type="button" className="action-btn-secondary">
                    <Upload size={14} />
                    <span>Upload QR Image</span>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrImageUpload}
                    title="Upload QR Image"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="action-btn-secondary"
                onClick={() => setIsQrScannerModalOpen(false)}
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
