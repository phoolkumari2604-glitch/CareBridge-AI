import {
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  CalendarDays,
  Stethoscope,
  ShieldCheck,
  QrCode,
  Printer,
  Copy,
} from "lucide-react";

import "./DigitalOPDPass.css";

function DigitalOPDPass() {
  const passId = "CB-OPD-2026-10482";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passId);
      alert("OPD Pass ID copied");
    } catch {
      alert("Unable to copy Pass ID");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="opd-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="opd-header">

        <div>
          <span className="opd-kicker">
            PATIENT SERVICES
          </span>

          <h1>Digital OPD Pass</h1>

          <p>
            Your secure digital pass for today's hospital visit.
          </p>
        </div>

        <div className="opd-header-actions">

          <button
            className="opd-outline-btn"
            onClick={handlePrint}
          >
            <Printer size={17} />
            Print
          </button>

          <button className="opd-download-btn">
            <Download size={17} />
            Download
          </button>

        </div>

      </div>


      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="opd-layout">

        {/* ===================================================
            DIGITAL PASS
        =================================================== */}

        <section className="digital-pass-card">

          <div className="pass-top">

            <div className="pass-brand">

              <div className="pass-logo">
                C
              </div>

              <div>
                <strong>CareBridge AI</strong>
                <span>Digital OPD Pass</span>
              </div>

            </div>

            <div className="verified-badge">
              <ShieldCheck size={15} />
              Verified
            </div>

          </div>


          <div className="pass-divider" />


          <div className="pass-content">

            <div className="pass-status">
              <CheckCircle2 size={18} />
              Active OPD Pass
            </div>

            <h2>
              General Consultation
            </h2>

            <p className="pass-subtitle">
              Your appointment has been confirmed.
            </p>


            {/* APPOINTMENT INFO */}

            <div className="pass-info-grid">

              <div className="pass-info">

                <div className="pass-info-icon">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <span>Date</span>
                  <strong>02 October 2026</strong>
                </div>

              </div>


              <div className="pass-info">

                <div className="pass-info-icon">
                  <Clock3 size={18} />
                </div>

                <div>
                  <span>Time</span>
                  <strong>11:30 AM</strong>
                </div>

              </div>


              <div className="pass-info">

                <div className="pass-info-icon">
                  <Stethoscope size={18} />
                </div>

                <div>
                  <span>Doctor</span>
                  <strong>Dr. Ananya Sharma</strong>
                </div>

              </div>


              <div className="pass-info">

                <div className="pass-info-icon">
                  <MapPin size={18} />
                </div>

                <div>
                  <span>Hospital</span>
                  <strong>CareBridge City Hospital</strong>
                </div>

              </div>

            </div>


            {/* PASS ID */}

            <div className="pass-id-box">

              <div>
                <span>OPD Pass ID</span>

                <strong>
                  {passId}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy OPD Pass ID"
              >
                <Copy size={17} />
              </button>

            </div>

          </div>


          {/* QR AREA */}

          <div className="qr-section">

            <div className="qr-box">

              <div className="qr-pattern">
                <QrCode size={112} strokeWidth={1.5} />
              </div>

            </div>

            <div className="qr-text">

              <strong>
                Scan at hospital reception
              </strong>

              <p>
                Present this QR code to verify
                your appointment and OPD access.
              </p>

            </div>

          </div>


          <div className="pass-footer">

            <span>
              <ShieldCheck size={14} />
              Secure digital verification
            </span>

            <span>
              Valid for scheduled appointment
            </span>

          </div>

        </section>


        {/* ===================================================
            VISIT SUMMARY
        =================================================== */}

        <aside className="visit-sidebar">

          <div className="visit-card">

            <div className="visit-card-header">

              <div>
                <span className="small-label">
                  VISIT SUMMARY
                </span>

                <h3>
                  Today's appointment
                </h3>
              </div>

              <div className="visit-check">
                <CheckCircle2 size={20} />
              </div>

            </div>


            <div className="visit-timeline">

              <div className="timeline-item active">

                <div className="timeline-dot">
                  <CheckCircle2 size={14} />
                </div>

                <div>
                  <strong>Appointment confirmed</strong>
                  <span>02 Oct · 09:42 AM</span>
                </div>

              </div>


              <div className="timeline-line" />


              <div className="timeline-item">

                <div className="timeline-dot">
                  <Clock3 size={14} />
                </div>

                <div>
                  <strong>Arrive at hospital</strong>
                  <span>Before 11:15 AM</span>
                </div>

              </div>


              <div className="timeline-line" />


              <div className="timeline-item">

                <div className="timeline-dot">
                  <Stethoscope size={14} />
                </div>

                <div>
                  <strong>Consultation</strong>
                  <span>11:30 AM</span>
                </div>

              </div>

            </div>

          </div>


          {/* IMPORTANT INFO */}

          <div className="opd-help-card">

            <div className="help-icon">
              <ShieldCheck size={20} />
            </div>

            <div>

              <h3>
                Keep your pass ready
              </h3>

              <p>
                Show the QR code at reception.
                A valid OPD pass is required
                to access the appointment.
              </p>

            </div>

          </div>

        </aside>

      </div>

    </div>
  );
}

export default DigitalOPDPass;