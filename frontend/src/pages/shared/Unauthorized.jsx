function Unauthorized() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "var(--background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "40px",
          textAlign: "center",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h1>Access Denied</h1>

        <p
          style={{
            marginTop: "10px",
            color: "var(--text-muted)",
          }}
        >
          You do not have permission to access this page.
        </p>

        <button
          className="btn btn-primary"
          style={{ marginTop: "24px" }}
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default Unauthorized;