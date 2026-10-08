import os
from app import create_app
from app.config import PORT, FLASK_ENV

app = create_app()

if __name__ == "__main__":
    debug_mode = FLASK_ENV == "development"
    print(f"[*] Starting CareBridge AI Flask Server on http://127.0.0.1:{PORT} (Debug: {debug_mode})")
    app.run(host="127.0.0.1", port=PORT, debug=debug_mode)
