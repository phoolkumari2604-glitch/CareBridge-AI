import React from "react";
import { AlertCircle, RefreshCw, Activity } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, remountKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(error, info?.componentStack || info);
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      remountKey: (prevState.remountKey || 0) + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "16px",
            padding: "24px",
            color: "#f8fafc",
            marginBottom: "24px",
            textAlign: "center",
          }}
          role="alert"
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              marginBottom: "12px",
            }}
          >
            <AlertCircle size={26} />
          </div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", fontWeight: 700 }}>
            Body Systems Explorer Temporarily Unavailable
          </h3>
          <p
            style={{
              margin: "0 auto 16px auto",
              maxWidth: "520px",
              fontSize: "0.86rem",
              color: "#94a3b8",
              lineHeight: 1.5,
            }}
          >
            An isolated display error occurred while rendering the 3D organ viewport.
            Your physiological alerts, clinical dossier, and medical records remain fully active and safe.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              background: "#1e293b",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            <span>Reload 3D Explorer</span>
          </button>
        </div>
      );
    }

    return (
      <React.Fragment key={this.state.remountKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

export default ErrorBoundary;
