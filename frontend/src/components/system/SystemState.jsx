import "./SystemState.css";

const STATE_CONFIG = {
  loading: {
    icon: "⏳",
    title: "Loading...",
    message: "Please wait while we prepare your information.",
    type: "loading",
  },

  empty: {
    icon: "📭",
    title: "Nothing here yet",
    message: "There is no information available to display right now.",
    type: "empty",
  },

  error: {
    icon: "⚠️",
    title: "Something went wrong",
    message: "We couldn't complete your request. Please try again.",
    type: "error",
  },

  offline: {
    icon: "📡",
    title: "You're offline",
    message: "Check your internet connection and try again.",
    type: "offline",
  },

  401: {
    icon: "🔐",
    title: "Authentication required",
    message: "Your session may have expired. Please log in again.",
    type: "unauthorized",
  },

  403: {
    icon: "🚫",
    title: "Access denied",
    message: "You don't have permission to access this resource.",
    type: "forbidden",
  },

  404: {
    icon: "🔎",
    title: "Page not found",
    message: "The page or resource you're looking for doesn't exist.",
    type: "not-found",
  },

  409: {
    icon: "⚡",
    title: "Conflict detected",
    message: "This action conflicts with the current state of the system.",
    type: "conflict",
  },

  422: {
    icon: "📝",
    title: "Invalid information",
    message: "Please check the information you entered and try again.",
    type: "validation",
  },

  500: {
    icon: "🛠️",
    title: "Server error",
    message: "Something went wrong on our side. Please try again later.",
    type: "server-error",
  },
};

function SystemState({
  state = "error",
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  compact = false,
}) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.error;

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <section
      className={`system-state system-state--${config.type} ${
        compact ? "system-state--compact" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="system-state__card">

        {/* Icon / Loading */}
        <div className="system-state__icon-wrapper">
          {state === "loading" ? (
            <div className="system-state__spinner"></div>
          ) : (
            <span className="system-state__icon" aria-hidden="true">
              {config.icon}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="system-state__content">
          <span className="system-state__label">
            {config.type === "server-error"
              ? "SYSTEM ERROR"
              : config.type.replace("-", " ").toUpperCase()}
          </span>

          <h2>{displayTitle}</h2>

          <p>{displayMessage}</p>
        </div>

        {/* Actions */}
        {(onAction || onSecondaryAction) && (
          <div className="system-state__actions">

            {onAction && (
              <button
                type="button"
                className="system-state__primary"
                onClick={onAction}
              >
                {actionLabel || "Try Again"}
              </button>
            )}

            {onSecondaryAction && (
              <button
                type="button"
                className="system-state__secondary"
                onClick={onSecondaryAction}
              >
                {secondaryLabel || "Go Back"}
              </button>
            )}

          </div>
        )}

      </div>
    </section>
  );
}

export default SystemState;