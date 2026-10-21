from datetime import datetime, timezone
from bson import ObjectId
from app.core.clinical_thresholds import (
    VALID_ORGAN_KEYS,
    CLINICAL_INDICATORS_CONFIG,
    evaluate_telemetry_severity,
)


def to_patient_id_filter(patient_id):
    """Normalize patient ID for robust querying across string or ObjectId representations."""
    pid_str = str(patient_id).strip()
    if ObjectId.is_valid(pid_str):
        return {"$in": [pid_str, ObjectId(pid_str)]}
    return pid_str


def compute_organ_status(patient_id, organ_id: str, db) -> tuple[str, str | None]:
    """
    Computes an organ's clinical status based on real telemetry, active findings, and doctor override.
    Returns: (computed_status, status_override)
    Status is strictly one of: 'no_data' | 'normal' | 'watch' | 'critical'
    """
    pid_filter = to_patient_id_filter(patient_id)

    # 1. Check doctor statusOverride in patient_organs
    organ_doc = db.patient_organs.find_one({"patientId": pid_filter, "organId": organ_id})
    override = organ_doc.get("statusOverride") if organ_doc else None
    if override in {"no_data", "normal", "watch", "critical"}:
        return override, override

    # 2. Query active findings (where resolvedAt is None)
    active_findings = list(
        db.patient_findings.find(
            {
                "patientId": pid_filter,
                "organId": organ_id,
                "$or": [{"resolvedAt": None}, {"resolvedAt": {"$exists": False}}],
            }
        )
    )

    # 3. Query telemetry indicators for this organ
    telemetry_records = list(
        db.patient_telemetry.find({"patientId": pid_filter, "organId": organ_id})
    )

    # Rule: no_data if no telemetry and no active findings
    if not active_findings and not telemetry_records:
        return "no_data", None

    # Check findings severity
    has_critical_finding = any(
        (f.get("severity") or "").lower() == "critical" for f in active_findings
    )
    has_watch_finding = any(
        (f.get("severity") or "").lower() == "watch" for f in active_findings
    )

    # Check telemetry indicators
    has_critical_telemetry = False
    has_watch_telemetry = False

    for t in telemetry_records:
        sev = evaluate_telemetry_severity(
            indicator_key=t.get("indicatorKey", ""),
            organ_id=organ_id,
            value=t.get("value"),
            safe_min=t.get("safeMin"),
            safe_max=t.get("safeMax"),
        )
        if sev == "critical":
            has_critical_telemetry = True
        elif sev == "watch":
            has_watch_telemetry = True

    if has_critical_finding or has_critical_telemetry:
        return "critical", None
    if has_watch_finding or has_watch_telemetry:
        return "watch", None

    return "normal", None


def get_patient_organ_dossier(patient_id, db) -> dict:
    """
    Aggregates full internal organ status, telemetry, findings, clinical state, and reports
    for all 6+ registered organs in one structured payload.
    """
    pid_filter = to_patient_id_filter(patient_id)
    organs_payload = {}
    now = datetime.now(timezone.utc)

    # Pre-fetch all findings, telemetry, clinical states, and reports for this patient
    all_findings = list(
        db.patient_findings.find(
            {
                "patientId": pid_filter,
                "$or": [{"resolvedAt": None}, {"resolvedAt": {"$exists": False}}],
            }
        ).sort("recordedAt", -1)
    )

    all_telemetry = list(
        db.patient_telemetry.find({"patientId": pid_filter}).sort("recordedAt", -1)
    )

    all_states = {
        doc["organId"]: {
            "text": doc.get("text", ""),
            "updatedAt": doc.get("updatedAt", now).isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt", ""))
        }
        for doc in db.patient_clinical_state.find({"patientId": pid_filter})
    }

    all_reports = list(
        db.patient_organ_reports.find({"patientId": pid_filter}).sort("uploadedAt", -1)
    )

    all_overrides = {
        doc["organId"]: doc.get("statusOverride")
        for doc in db.patient_organs.find({"patientId": pid_filter})
    }

    for organ_id in sorted(VALID_ORGAN_KEYS):
        # 1. Filter active findings for this organ
        organ_findings = [f for f in all_findings if f.get("organId") == organ_id]
        clean_findings = []
        for f in organ_findings:
            clean_findings.append({
                "id": str(f.get("_id") or f.get("id")),
                "organId": organ_id,
                "title": f.get("title") or f.get("label") or "Clinical Finding",
                "label": f.get("title") or f.get("label") or "Clinical Finding",
                "description": f.get("description") or f.get("note") or "",
                "note": f.get("description") or f.get("note") or "",
                "severity": (f.get("severity") or "watch").lower(),
                "x": float(f.get("x", 50.0)),
                "y": float(f.get("y", 50.0)),
                "recordedBy": f.get("recordedBy", "Attending Clinician"),
                "recordedAt": f.get("recordedAt", now).isoformat() if isinstance(f.get("recordedAt"), datetime) else str(f.get("recordedAt")),
                "resolvedAt": f.get("resolvedAt"),
            })

        # 2. Filter telemetry (deduplicate to latest reading per indicatorKey)
        organ_telemetry = [t for t in all_telemetry if t.get("organId") == organ_id]
        latest_indicators = {}
        for t in organ_telemetry:
            key = t.get("indicatorKey") or t.get("label")
            if key and key not in latest_indicators:
                rec_at = t.get("recordedAt", now)
                time_str = rec_at.strftime("%H:%M") if isinstance(rec_at, datetime) else "Recent"
                
                # Fetch default bounds if not in document
                ind_cfg = CLINICAL_INDICATORS_CONFIG.get(organ_id, {}).get(key, {})
                s_min = t.get("safeMin", ind_cfg.get("safeMin"))
                s_max = t.get("safeMax", ind_cfg.get("safeMax"))
                range_str = f"{s_min} – {s_max} {t.get('unit', '')}".strip() if s_min is not None and s_max is not None else ind_cfg.get("normalRange")

                latest_indicators[key] = {
                    "id": str(t.get("_id") or ""),
                    "indicatorKey": key,
                    "label": t.get("label") or ind_cfg.get("label") or key,
                    "value": t.get("value"),
                    "unit": t.get("unit") or ind_cfg.get("unit") or "",
                    "safeMin": s_min,
                    "safeMax": s_max,
                    "normalRange": range_str,
                    "note": t.get("note", ""),
                    "timestamp": time_str,
                    "recordedAt": rec_at.isoformat() if isinstance(rec_at, datetime) else str(rec_at),
                    "source": t.get("source", "Telemetry Gateway"),
                }

        # 3. Status computation
        override = all_overrides.get(organ_id)
        if override in {"no_data", "normal", "watch", "critical"}:
            status = override
        elif not clean_findings and not latest_indicators:
            status = "no_data"
        else:
            has_crit_f = any(f["severity"] == "critical" for f in clean_findings)
            has_watch_f = any(f["severity"] == "watch" for f in clean_findings)

            has_crit_t = False
            has_watch_t = False
            for ind in latest_indicators.values():
                sev = evaluate_telemetry_severity(
                    indicator_key=ind["indicatorKey"],
                    organ_id=organ_id,
                    value=ind["value"],
                    safe_min=ind["safeMin"],
                    safe_max=ind["safeMax"],
                )
                if sev == "critical":
                    has_crit_t = True
                elif sev == "watch":
                    has_watch_t = True

            if has_crit_f or has_crit_t:
                status = "critical"
            elif has_watch_f or has_watch_t:
                status = "watch"
            else:
                status = "normal"

        # 4. Clinical State
        clinical_state_obj = all_states.get(organ_id, {"text": "", "updatedAt": None})

        # 5. Reports for this organ
        organ_reports = [
            {
                "id": str(r.get("_id") or r.get("id")),
                "organId": organ_id,
                "title": r.get("title", "Clinical Diagnostic Report"),
                "fileUrl": r.get("fileUrl", ""),
                "uploadedAt": r.get("uploadedAt", now).isoformat() if isinstance(r.get("uploadedAt"), datetime) else str(r.get("uploadedAt")),
            }
            for r in all_reports
            if r.get("organId") == organ_id
        ]

        organs_payload[organ_id] = {
            "organId": organ_id,
            "status": status,
            "statusOverride": override,
            "findings": clean_findings,
            "telemetry": list(latest_indicators.values()),
            "clinicalState": clinical_state_obj,
            "reports": organ_reports,
            "reportsCount": len(organ_reports),
            "updatedAt": now.isoformat(),
        }

    return organs_payload


def log_organ_audit(db, user_id, user_role, action, organ_id, patient_id, details):
    """Audit logging for clinical findings, overrides, and notes."""
    try:
        db.audit_logs.insert_one({
            "user_id": str(user_id),
            "user_role": str(user_role),
            "action": action,
            "resource": "ORGAN_CLINICAL_DATA",
            "resource_id": f"{patient_id}:{organ_id}",
            "details": details,
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as e:
        print(f"[Audit Log Warning]: Could not log organ audit: {e}")
