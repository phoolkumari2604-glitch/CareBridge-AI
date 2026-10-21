#!/usr/bin/env python3
"""
CareBridge AI - Dev Stream Telemetry Simulator
Simulates periodic patient telemetry readings (every 10s or --once)
targeting /api/patients/:id/telemetry.
"""

import os
import sys
import time
import random
import argparse
from datetime import datetime, timezone
import requests

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_database

DEVICE_INDICATOR_POOL = [
    {
        "organId": "pancreas",
        "indicatorKey": "blood_glucose",
        "label": "Blood Glucose (Fasting / Random)",
        "unit": "mg/dL",
        "safeMin": 70,
        "safeMax": 140,
        "scenarios": [
            {"val": lambda: round(random.uniform(85, 125), 1), "note": "Post-prandial stabilizing"},
            {"val": lambda: round(random.uniform(145, 185), 1), "note": "Elevated post-meal blood glucose spike"},
            {"val": lambda: round(random.uniform(280, 330), 1), "note": "Severe hyperglycemia warning"},
        ]
    },
    {
        "organId": "intestines",
        "indicatorKey": "arterial_perfusion_bp",
        "label": "Mesenteric Arterial Perfusion Pressure",
        "unit": "mmHg",
        "safeMin": 90,
        "safeMax": 130,
        "scenarios": [
            {"val": lambda: round(random.uniform(110, 128), 0), "note": "Hemodynamically stable mesenteric tone"},
            {"val": lambda: round(random.uniform(138, 158), 0), "note": "Mild vascular resistance spike"},
            {"val": lambda: round(random.uniform(180, 205), 0), "note": "Critical mesenteric hypertensive crisis"},
        ]
    },
    {
        "organId": "thyroid",
        "indicatorKey": "tsh",
        "label": "Thyroid Stimulating Hormone (TSH)",
        "unit": "mIU/L",
        "safeMin": 0.4,
        "safeMax": 4.0,
        "scenarios": [
            {"val": lambda: round(random.uniform(1.2, 3.4), 2), "note": "Euthyroid steady-state"},
            {"val": lambda: round(random.uniform(4.5, 6.8), 2), "note": "Subclinical hypothyroidism drift"},
            {"val": lambda: round(random.uniform(12.0, 18.5), 2), "note": "Severe hypothyroid surge"},
        ]
    },
    {
        "organId": "kidneys",
        "indicatorKey": "creatinine",
        "label": "Serum Creatinine",
        "unit": "mg/dL",
        "safeMin": 0.6,
        "safeMax": 1.2,
        "scenarios": [
            {"val": lambda: round(random.uniform(0.7, 1.1), 2), "note": "Normal glomerulo-tubular clearance"},
            {"val": lambda: round(random.uniform(1.4, 1.9), 2), "note": "Azotemia trend - watch hydration"},
            {"val": lambda: round(random.uniform(2.8, 4.2), 2), "note": "Acute renal impairment signal"},
        ]
    }
]


def resolve_patient_id(arg_id=None):
    if arg_id:
        return arg_id
    try:
        db = get_database()
        patient = db.patients.find_one({"name": "Manjusha"})
        if patient:
            return str(patient["_id"])
    except Exception as e:
        print(f"[Warning] Could not look up Manjusha from DB: {e}")
    return "6ad74791bab1d0fdb9dbb23d"


def send_reading(base_url, patient_id, auth_token=None):
    choice = random.choice(DEVICE_INDICATOR_POOL)
    # 60% normal, 30% watch, 10% critical
    roll = random.random()
    if roll < 0.60:
        scenario = choice["scenarios"][0]
    elif roll < 0.90:
        scenario = choice["scenarios"][1]
    else:
        scenario = choice["scenarios"][2]

    val = scenario["val"]()
    payload = {
        "organId": choice["organId"],
        "indicatorKey": choice["indicatorKey"],
        "label": choice["label"],
        "value": val,
        "unit": choice["unit"],
        "safeMin": choice["safeMin"],
        "safeMax": choice["safeMax"],
        "note": scenario["note"],
        "source": "Simulator (dev_stream_telemetry)"
    }

    url = f"{base_url.rstrip('/')}/api/patients/{patient_id}/telemetry"
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
        if res.status_code in (200, 201):
            data = res.json()
            organ_status = data.get("organStatus", "unknown")
            print(f"[{now_str}] POST {choice['organId'].upper():<10} | {choice['label'][:24]:<24} = {val} {choice['unit']} -> Status: {organ_status.upper()}")
            return True
        else:
            print(f"[{now_str}] HTTP {res.status_code} Error: {res.text}")
            return False
    except Exception as e:
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"[{now_str}] Request failed to {url}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="CareBridge AI Phase 2 Telemetry Stream Simulator")
    parser.add_argument("--patient-id", help="Target patient ID", default=None)
    parser.add_argument("--host", help="Base backend URL", default="http://127.0.0.1:5000")
    parser.add_argument("--interval", type=int, default=10, help="Seconds between telemetry pulses (default: 10)")
    parser.add_argument("--once", action="store_true", help="Send a single reading and exit")
    parser.add_argument("--token", help="JWT bearer token if required", default=None)
    args = parser.parse_args()

    patient_id = resolve_patient_id(args.patient_id)
    print("=" * 60)
    print("CareBridge AI - Dev Telemetry Stream Simulator")
    print(f"Target Patient ID: {patient_id}")
    print(f"Backend Host:      {args.host}")
    print(f"Interval:          {args.interval}s (Mode: {'Single pulse (--once)' if args.once else 'Continuous loop'})")
    print("=" * 60)

    if args.once:
        success = send_reading(args.host, patient_id, args.token)
        sys.exit(0 if success else 1)

    try:
        while True:
            send_reading(args.host, patient_id, args.token)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[Stopped] Telemetry simulation ended by user.")


if __name__ == "__main__":
    main()
