import os
from app import create_app
from app.config import PORT, FLASK_ENV

app = create_app()

if __name__ == "__main__":
    debug_mode = FLASK_ENV == "development"
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[*] Starting CareBridge AI Flask Server on http://localhost:{PORT} and http://127.0.0.1:{PORT} (Host: {host}, Debug: {debug_mode})")
    print(f"API running on http://localhost:{PORT}")
    app.run(host=host, port=PORT, debug=debug_mode)

