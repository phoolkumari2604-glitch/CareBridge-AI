"""
SQLite database connection helper for CareBridge Medicine Assistant.
Resolves medicines.db from data/ or backend/data/.
"""

import os
import sqlite3

def get_medicines_db_path():
    # Candidates in order of priority
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "medicines.db"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "medicines.db"),
        os.path.join(os.getcwd(), "data", "medicines.db"),
        os.path.join(os.getcwd(), "backend", "data", "medicines.db")
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]

def get_medicines_db():
    path = get_medicines_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn
