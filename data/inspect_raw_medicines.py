"""
CareBridge AI - Raw Medicine CSV Inspection Tool
Inspects any CSV file in data/raw/ and outputs:
- Column names
- Row count
- 5 sample rows
- Missing-value count per column
- Proposed column mapping for CareBridge database schema
"""

import os
import sys
import csv
from typing import List, Dict, Any

RAW_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")


def inspect_csv(file_path: str):
    print(f"\n{'='*80}")
    print(f"INSPECTING: {os.path.basename(file_path)}")
    print(f"FULL PATH:  {file_path}")
    print(f"{'='*80}")

    if not os.path.exists(file_path):
        print(f"[Error] File not found: {file_path}")
        return

    # Try utf-8, fallback to cp1252 / latin-1
    encoding_used = "utf-8"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            f.readline()
    except UnicodeDecodeError:
        encoding_used = "latin-1"

    with open(file_path, "r", encoding=encoding_used, errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            print("[Empty File] No rows found.")
            return

        header = [col.strip() for col in header]
        print(f"\n[1] COLUMNS ({len(header)}):")
        for idx, col in enumerate(header, 1):
            print(f"    {idx}. \"{col}\"")

        # Count rows, missing values, and capture 5 sample rows
        row_count = 0
        missing_counts = {col: 0 for col in header}
        samples = []

        for row in reader:
            row_count += 1
            if len(samples) < 5:
                samples.append(row)
            for idx, col in enumerate(header):
                val = row[idx].strip() if idx < len(row) else ""
                if not val or val.lower() in ["nan", "null", "none", "na", "-", ""]:
                    missing_counts[col] += 1

        print(f"\n[2] TOTAL ROW COUNT: {row_count:,} rows")

        print(f"\n[3] MISSING-VALUE COUNT PER COLUMN:")
        for col in header:
            count = missing_counts[col]
            pct = (count / row_count * 100) if row_count > 0 else 0
            print(f"    - \"{col}\": {count:,} missing ({pct:.1f}%)")

        print(f"\n[4] 5 SAMPLE ROWS:")
        for s_idx, sample in enumerate(samples, 1):
            print(f"\n  --- Sample Row {s_idx} ---")
            for col_idx, col in enumerate(header):
                val = sample[col_idx] if col_idx < len(sample) else "<MISSING>"
                if len(val) > 80:
                    val = val[:77] + "..."
                print(f"    {col}: {val}")


def main():
    if not os.path.exists(RAW_DIR):
        os.makedirs(RAW_DIR, exist_ok=True)

    csv_files = [
        os.path.join(RAW_DIR, f) for f in os.listdir(RAW_DIR)
        if f.lower().endswith(".csv")
    ]

    if not csv_files:
        print(f"\n[!] No CSV files found in: {RAW_DIR}")
        print("    Please place the Kaggle dataset CSV file(s) into this folder.")
        print("    Example names:")
        print("      - A_Z_medicines_dataset_of_India.csv")
        print("      - Medicine_Details.csv")
        return

    for f in csv_files:
        inspect_csv(f)


if __name__ == "__main__":
    main()
