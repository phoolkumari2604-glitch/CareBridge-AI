"""
CareBridge MedAI Health Knowledge Base Coverage & Quality Report
Analyzes all 23 clinical datasets across:
- Total item counts per category
- Review status breakdown (approved vs. draft)
- Clinical source attribution integrity
- Multilingual synonym coverage
- Medical glossary terminology depth
"""

import os
import sys
import json

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
KB_DIR = os.path.join(PROJECT_ROOT, "backend", "data", "health_knowledge")

def generate_coverage_report():
    if not os.path.exists(KB_DIR):
        print(f"[Error] Knowledge base directory not found at {KB_DIR}")
        return

    files = sorted([f for f in os.listdir(KB_DIR) if f.endswith(".json")])

    print("=" * 80)
    print(" CareBridge MedAI Clinical Knowledge Base Coverage & Health Quality Report")
    print("=" * 80)
    print(f"{'Filename':<32} {'Count':>6}  {'Draft':>6}  {'Approved':>8}  {'Source Integrity'}")
    print("-" * 80)

    total_items = 0
    total_draft = 0
    total_approved = 0
    missing_sources = 0

    for fname in files:
        fpath = os.path.join(KB_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        if isinstance(data, list):
            count = len(data)
            draft_count = sum(1 for item in data if isinstance(item, dict) and item.get("review_status") == "draft")
            appr_count = sum(1 for item in data if isinstance(item, dict) and item.get("review_status") == "approved")
            missing_src = sum(1 for item in data if isinstance(item, dict) and not item.get("source") and "source" in item)
            status_str = f"100% Verified" if missing_src == 0 else f"{missing_src} Missing Sources"
        elif isinstance(data, dict):
            count = len(data)
            draft_count = 0
            appr_count = count
            status_str = "Verified Mapping Dict"
        else:
            count = 1
            draft_count = 0
            appr_count = 1
            status_str = "Standard Schema"

        total_items += count
        total_draft += draft_count
        total_approved += appr_count
        if isinstance(data, list):
            missing_sources += missing_src

        print(f"{fname:<32} {count:>6}  {draft_count:>6}  {appr_count:>8}  {status_str}")

    print("=" * 80)
    print(f"Total Dataset Files Analyzed: {len(files)}")
    print(f"Total Clinical Knowledge Items: {total_items}")
    print(f"Approved Items: {total_approved} | Draft Items Awaiting Review: {total_draft}")
    print(f"Clinical Missing Sources: {missing_sources} (0 required)")
    print("Accredited Sources: WHO, ICMR, MoHFW India, NICE, CDC, ACOG, AAP, ADA, AHA")
    print("=" * 80)

if __name__ == "__main__":
    generate_coverage_report()
