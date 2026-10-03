import {
  ArrowLeft,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  Bell,
  CheckCircle2,
  CalendarDays,
  Stethoscope,
} from "lucide-react";

import "./LiveQueue.css";

function LiveQueue() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="queue-page">

      {/* HEADER */}
      <div className="queue-header">

        <div>
          <span className="queue-kicker">
            PATIENT SERVICES
          </span>

          <h1>Live Queue</h1>

          <p>
            Track your position and estimated waiting time in real time.
          </p>
        </div>

        <button
          className="queue-refresh-btn"
          onClick={handleRefresh}
        >
          <RefreshCw size={17} />
          Refresh Queue
        </button>

      </div>


      {/* STATUS BANNER */}
      <div className="queue-live-banner">

        <div className="queue-live-left">

          <div className="live-pulse">
            <span />
          </div>

          <div>
            <strong>Queue is live</strong>
            <span>
              Last updated just now
            </span>
          </div>

        </div>

        <div className="queue-live-status">
          <CheckCircle2 size={16} />
          On schedule
        </div>

      </div>


      {/* MAIN GRID */}
      <div className="queue-main-grid">

        {/* CURRENT POSITION */}
        <section className="queue-position-card">

          <div className="position-top">

            <div>
              <span className="small-label">
                YOUR QUEUE STATUS
              </span>

              <h2>
                You're almost there
              </h2>
            </div>

            <div className="position-icon">
              <Users size={22} />
            </div>

          </div>


          <div className="queue-number-area">

            <div className="queue-number">
              08
            </div>

            <div className="queue-number-label">
              Current position
            </div>

          </div>


          <div className="queue-progress">

            <div className="queue-progress-header">
              <span>Queue progress</span>
              <strong>68%</strong>
            </div>

            <div className="queue-progress-track">
              <div
                className="queue-progress-fill"
                style={{ width: "68%" }}
              />
            </div>

            <div className="queue-progress-meta">
              <span>Now serving: 05</span>
              <span>Total: 25</span>
            </div>

          </div>


          <div className="queue-estimate">

            <div className="estimate-icon">
              <Clock3 size={20} />
            </div>

            <div>
              <span>Estimated waiting time</span>
              <strong>~ 24 minutes</strong>
            </div>

          </div>

        </section>


        {/* TOKEN CARD */}
        <section className="token-card">

          <div className="token-card-top">

            <div>
              <span className="small-label">
                YOUR TOKEN
              </span>

              <h2>CB-108</h2>
            </div>

            <div className="token-status">
              Waiting
            </div>

          </div>


          <div className="token-divider" />


          <div className="token-info">

            <div className="token-info-row">

              <Stethoscope size={17} />

              <div>
                <span>Doctor</span>
                <strong>Dr. Ananya Sharma</strong>
              </div>

            </div>


            <div className="token-info-row">

              <MapPin size={17} />

              <div>
                <span>Department</span>
                <strong>General Medicine</strong>
              </div>

            </div>


            <div className="token-info-row">

              <CalendarDays size={17} />

              <div>
                <span>Appointment</span>
                <strong>02 Oct · 11:30 AM</strong>
              </div>

            </div>

          </div>

        </section>

      </div>


      {/* QUEUE VISUALIZATION */}
      <section className="queue-visual-card">

        <div className="section-heading">

          <div>
            <span className="small-label">
              LIVE QUEUE
            </span>

            <h2>Queue activity</h2>
          </div>

          <span className="live-tag">
            <span />
            Live
          </span>

        </div>


        <div className="queue-track">

          <div className="queue-track-line">
            <div className="queue-track-progress" />
          </div>


          <div className="queue-step completed">

            <div className="queue-step-circle">
              <CheckCircle2 size={17} />
            </div>

            <strong>01–05</strong>
            <span>Completed</span>

          </div>


          <div className="queue-step current">

            <div className="queue-step-circle">
              06
            </div>

            <strong>06–10</strong>
            <span>Your group</span>

          </div>


          <div className="queue-step">

            <div className="queue-step-circle">
              11
            </div>

            <strong>11–15</strong>
            <span>Waiting</span>

          </div>


          <div className="queue-step">

            <div className="queue-step-circle">
              16
            </div>

            <strong>16–20</strong>
            <span>Waiting</span>

          </div>


          <div className="queue-step">

            <div className="queue-step-circle">
              21
            </div>

            <strong>21–25</strong>
            <span>Waiting</span>

          </div>

        </div>

      </section>


      {/* BOTTOM GRID */}
      <div className="queue-bottom-grid">

        {/* WHAT TO DO */}
        <section className="queue-info-card">

          <div className="info-card-icon">
            <Bell size={19} />
          </div>

          <div>
            <h3>Stay nearby</h3>

            <p>
              Please stay within the hospital premises.
              You will receive a notification when your
              token is approaching.
            </p>
          </div>

        </section>


        {/* QUICK INFO */}
        <section className="queue-summary-card">

          <div>
            <span>Currently serving</span>
            <strong>Token 05</strong>
          </div>

          <div>
            <span>People ahead</span>
            <strong>7</strong>
          </div>

          <div>
            <span>Avg. consultation</span>
            <strong>~ 3 min</strong>
          </div>

        </section>

      </div>

    </div>
  );
}

export default LiveQueue;