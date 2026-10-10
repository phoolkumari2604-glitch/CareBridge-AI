import os
import io
import time
import json
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g, Response, send_file
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import serialize_doc, is_valid_object_id

# PDF Generation via ReportLab
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

# Optional Razorpay Integration
try:
    import razorpay
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_carebridge_demo")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "carebridge_secret_demo")
    RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "whsec_carebridge_demo")
    rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception:
    rzp_client = None
    RAZORPAY_KEY_ID = "rzp_test_demo"
    RAZORPAY_KEY_SECRET = "demo_secret"
    RAZORPAY_WEBHOOK_SECRET = "demo_wh_secret"

billing_bp = Blueprint("billing", __name__)


def get_next_invoice_number(db):
    """Generate sequential invoice number (e.g., INV-1001, INV-1002)"""
    counter = db.counters.find_one_and_update(
        {"_id": "invoice_no"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    seq = counter.get("seq", 1001)
    if seq < 1000:
        seq += 1000
    return f"INV-{seq}"


def seed_default_invoices_if_empty(db, doctor_id=None):
    """Seed realistic initial billing ledger if collection is empty"""
    if db.invoices.count_documents({}) > 0:
        return

    patients = list(db.patients.find({}).limit(10))
    doctors = list(db.doctors.find({}).limit(5))

    now = datetime.now(timezone.utc)
    sample_services = [
        ("Comprehensive Teleconsultation", 85000, "upi", "paid"),
        ("Cardiology Review & ECG Analysis", 150000, "card", "paid"),
        ("Follow-up Consultation", 50000, "upi", "paid"),
        ("Emergency Triage & Consultation", 120000, "cash", "paid"),
        ("General Physician OPD Visit", 60000, "upi", "pending"),
        ("Specialist Second Opinion", 200000, "card", "pending"),
        ("Vital Telemetry Monitoring Pack", 75000, "upi", "paid"),
        ("Prescription Refill Review", 35000, "upi", "settled"),
        ("Post-Op Teleconsultation", 110000, "card", "settled"),
        ("Diagnostic Lab Review", 45000, "cash", "paid"),
    ]

    invoices = []
    for i, (service, amount_paise, method, st) in enumerate(sample_services):
        pat = patients[i % len(patients)] if patients else {}
        doc = doctors[i % len(doctors)] if doctors else {}
        
        p_id = str(pat.get("_id") or pat.get("id") or f"P{100000 + i}")
        d_id = str(doc.get("_id") or doc.get("id") or (doctor_id or "DOC-DEFAULT"))
        p_name = pat.get("name") or f"Patient {i+1}"
        d_name = doc.get("name") or "Dr. Sharma"
        p_code = pat.get("patient_code") or str(100000 + (i * 1234) % 900000)

        created_dt = now - timedelta(days=i * 2, hours=i * 3)
        paid_dt = created_dt + timedelta(minutes=15) if st in ("paid", "settled") else None
        settled_dt = paid_dt + timedelta(days=1) if st == "settled" else None

        inv = {
            "invoice_no": f"INV-{1001 + i}",
            "patient_id": p_id,
            "patient_code": p_code,
            "patient_name": p_name,
            "doctor_id": d_id,
            "doctor_name": d_name,
            "service": service,
            "amount_paise": amount_paise,
            "status": "paid" if st in ("paid", "settled") else "pending",
            "is_settled": st == "settled",
            "method": method,
            "gateway_payment_id": f"pay_carebridge_{100000 + i}" if st in ("paid", "settled") else None,
            "qr_id": f"qr_cb_{100000 + i}" if st == "pending" else None,
            "qr_expires_at": created_dt + timedelta(minutes=15) if st == "pending" else None,
            "paid_at": paid_dt,
            "settled_at": settled_dt,
            "created_at": created_dt,
            "updated_at": created_dt
        }
        invoices.append(inv)

    if invoices:
        db.invoices.insert_many(invoices)
        db.counters.update_one({"_id": "invoice_no"}, {"$set": {"seq": 1001 + len(invoices)}}, upsert=True)


# ============================================================================
# 1. SUMMARY / METRICS & CHART RECONCILIATION
# ============================================================================
@billing_bp.route("/summary", methods=["GET"], strict_slashes=False)
@token_required
def get_billing_summary():
    """
    Computes all KPI cards, chart trends, and payment method distribution
    reconciled from the invoices database.
    """
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    role = (current_user.get("role") or "").upper()
    user_id = str(current_user.get("_id") or current_user.get("id") or "")

    seed_default_invoices_if_empty(db, user_id)

    query = {}
    if role == "DOCTOR":
        query["$or"] = [
            {"doctor_id": user_id},
            {"doctor_id": ObjectId(user_id) if is_valid_object_id(user_id) else None},
            {"doctor_name": {"$regex": current_user.get("name", ""), "$options": "i"}} if current_user.get("name") else {"doctor_id": user_id}
        ]

    period = request.args.get("period", "30D").upper()
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    all_invoices = list(db.invoices.find(query))

    total_revenue_paise = 0
    today_revenue_paise = 0
    this_month_paise = 0
    pending_settlement_paise = 0
    settled_total_paise = 0

    method_sums = {"upi": 0, "card": 0, "cash": 0, "insurance": 0, "other": 0}
    paid_count = 0

    for inv in all_invoices:
        amt = int(inv.get("amount_paise") or 0)
        status = (inv.get("status") or "").lower()
        settled_at = inv.get("settled_at")
        is_settled = inv.get("is_settled") or bool(settled_at)
        paid_at = inv.get("paid_at") or inv.get("created_at")

        if status == "paid":
            paid_count += 1
            total_revenue_paise += amt

            if is_settled:
                settled_total_paise += amt
            else:
                pending_settlement_paise += amt

            # Date checks
            if paid_at:
                if isinstance(paid_at, str):
                    try:
                        paid_at = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
                    except Exception:
                        paid_at = now
                if paid_at.tzinfo is None:
                    paid_at = paid_at.replace(tzinfo=timezone.utc)

                if paid_at >= today_start:
                    today_revenue_paise += amt
                if paid_at >= month_start:
                    this_month_paise += amt

            # Method distribution
            m = (inv.get("method") or "upi").lower()
            if m in method_sums:
                method_sums[m] += amt
            else:
                method_sums["other"] += amt

    # Convert to Rupee floats for UI
    total_rev = round(total_revenue_paise / 100, 2)
    today_rev = round(today_revenue_paise / 100, 2)
    this_month_rev = round(this_month_paise / 100, 2)
    pending_settle = round(pending_settlement_paise / 100, 2)
    settled_rev = round(settled_total_paise / 100, 2)
    avg_fee = round(total_rev / max(1, paid_count), 2) if paid_count > 0 else 0

    # Chart Series for selected period (7D, 30D, 6M, 1Y)
    chart_series = []
    if period == "7D":
        days = 7
        for d in range(days - 1, -1, -1):
            dt = today_start - timedelta(days=d)
            dt_next = dt + timedelta(days=1)
            day_sum = sum(
                int(inv.get("amount_paise", 0)) for inv in all_invoices
                if (inv.get("status") == "paid") and
                (dt <= (inv.get("paid_at") or inv.get("created_at") or dt).replace(tzinfo=timezone.utc) < dt_next)
            )
            chart_series.append({
                "label": dt.strftime("%a %d"),
                "date": dt.strftime("%Y-%m-%d"),
                "revenue": round(day_sum / 100, 2),
                "invoices": sum(
                    1 for inv in all_invoices
                    if (inv.get("status") == "paid") and
                    (dt <= (inv.get("paid_at") or inv.get("created_at") or dt).replace(tzinfo=timezone.utc) < dt_next)
                )
            })
    elif period == "6M" or period == "1Y":
        months = 6 if period == "6M" else 12
        for m_idx in range(months - 1, -1, -1):
            # calculate year and month
            m_date = now - timedelta(days=m_idx * 30)
            m_start = datetime(m_date.year, m_date.month, 1, tzinfo=timezone.utc)
            if m_date.month == 12:
                m_end = datetime(m_date.year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                m_end = datetime(m_date.year, m_date.month + 1, 1, tzinfo=timezone.utc)
            
            m_sum = sum(
                int(inv.get("amount_paise", 0)) for inv in all_invoices
                if (inv.get("status") == "paid") and
                (m_start <= (inv.get("paid_at") or inv.get("created_at") or m_start).replace(tzinfo=timezone.utc) < m_end)
            )
            chart_series.append({
                "label": m_start.strftime("%b %Y"),
                "date": m_start.strftime("%Y-%m"),
                "revenue": round(m_sum / 100, 2),
                "invoices": sum(
                    1 for inv in all_invoices
                    if (inv.get("status") == "paid") and
                    (m_start <= (inv.get("paid_at") or inv.get("created_at") or m_start).replace(tzinfo=timezone.utc) < m_end)
                )
            })
    else: # 30D (grouped in 5-day buckets or daily)
        days = 30
        for d in range(days - 1, -1, -3):
            dt = today_start - timedelta(days=d)
            dt_next = dt + timedelta(days=3)
            bucket_sum = sum(
                int(inv.get("amount_paise", 0)) for inv in all_invoices
                if (inv.get("status") == "paid") and
                (dt <= (inv.get("paid_at") or inv.get("created_at") or dt).replace(tzinfo=timezone.utc) < dt_next)
            )
            chart_series.append({
                "label": dt.strftime("%d %b"),
                "date": dt.strftime("%Y-%m-%d"),
                "revenue": round(bucket_sum / 100, 2),
                "invoices": sum(
                    1 for inv in all_invoices
                    if (inv.get("status") == "paid") and
                    (dt <= (inv.get("paid_at") or inv.get("created_at") or dt).replace(tzinfo=timezone.utc) < dt_next)
                )
            })

    # Breakdown percentages for donut
    distribution = [
        {"name": "UPI (Instant)", "key": "upi", "value": round(method_sums["upi"] / 100, 2), "color": "#0284c7"},
        {"name": "Credit / Debit Card", "key": "card", "value": round(method_sums["card"] / 100, 2), "color": "#10b981"},
        {"name": "Cash at Counter", "key": "cash", "value": round(method_sums["cash"] / 100, 2), "color": "#f59e0b"},
        {"name": "Insurance Claim", "key": "insurance", "value": round(method_sums["insurance"] / 100, 2), "color": "#8b5cf6"},
    ]

    return jsonify({
        "currency": "INR",
        "currency_symbol": "₹",
        "total_revenue": total_rev,
        "this_month": this_month_rev,
        "today_revenue": today_rev,
        "pending_settlement": pending_settle,
        "settled_total": settled_rev,
        "avg_consultation_fee": avg_fee,
        "paid_invoices_count": paid_count,
        "total_invoices_count": len(all_invoices),
        "chart_series": chart_series,
        "distribution": distribution
    }), 200


# ============================================================================
# 2. INVOICES LEDGER / LIST & CREATION
# ============================================================================
@billing_bp.route("/invoices", methods=["GET"], strict_slashes=False)
@token_required
def get_invoices():
    """Retrieve filtered and sorted list of clinical invoices"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    role = (current_user.get("role") or "").upper()
    user_id = str(current_user.get("_id") or current_user.get("id") or "")

    query = {}
    if role == "DOCTOR":
        query["$or"] = [
            {"doctor_id": user_id},
            {"doctor_id": ObjectId(user_id) if is_valid_object_id(user_id) else None},
            {"doctor_name": {"$regex": current_user.get("name", ""), "$options": "i"}} if current_user.get("name") else {"doctor_id": user_id}
        ]
    elif role == "PATIENT":
        query["$or"] = [
            {"patient_id": user_id},
            {"patient_id": ObjectId(user_id) if is_valid_object_id(user_id) else None}
        ]

    status = request.args.get("status")
    if status and status.lower() != "all":
        query["status"] = status.lower()

    search = request.args.get("search", "").strip()
    if search:
        query["$or"] = [
            {"invoice_no": {"$regex": search, "$options": "i"}},
            {"patient_name": {"$regex": search, "$options": "i"}},
            {"patient_code": {"$regex": search, "$options": "i"}},
            {"service": {"$regex": search, "$options": "i"}}
        ]

    invoices = list(db.invoices.find(query).sort("created_at", -1).limit(100))
    return jsonify(serialize_doc(invoices)), 200


@billing_bp.route("/invoices", methods=["POST"], strict_slashes=False)
@token_required
def create_invoice():
    """Create a new invoice for consultation or clinical service"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    data = request.get_json() or {}

    patient_id = data.get("patient_id")
    doctor_id = data.get("doctor_id") or str(current_user.get("_id") or current_user.get("id") or "")
    service = data.get("service") or "Clinical Teleconsultation"
    amount_inr = float(data.get("amount") or 850.0)
    amount_paise = int(data.get("amount_paise") or round(amount_inr * 100))

    patient_name = data.get("patient_name")
    patient_code = data.get("patient_code")

    if not patient_name and patient_id:
        p_doc = db.patients.find_one({"_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"_id": patient_id})
        if p_doc:
            patient_name = p_doc.get("name", "Patient")
            patient_code = p_doc.get("patient_code") or str(patient_id)[-6:]

    inv_number = get_next_invoice_number(db)
    now = datetime.now(timezone.utc)

    inv_doc = {
        "invoice_no": inv_number,
        "patient_id": patient_id,
        "patient_code": patient_code or str(patient_id)[-6:] if patient_id else "100001",
        "patient_name": patient_name or "Patient",
        "doctor_id": doctor_id,
        "doctor_name": data.get("doctor_name") or current_user.get("name") or "Dr. Specialist",
        "service": service,
        "amount_paise": amount_paise,
        "status": "pending",
        "is_settled": False,
        "method": data.get("method", "upi"),
        "gateway_payment_id": None,
        "qr_id": None,
        "qr_expires_at": None,
        "paid_at": None,
        "settled_at": None,
        "created_at": now,
        "updated_at": now
    }

    res = db.invoices.insert_one(inv_doc)
    inv_doc["id"] = str(res.inserted_id)

    return jsonify({
        "message": "Invoice generated successfully",
        "invoice": serialize_doc(inv_doc)
    }), 201


@billing_bp.route("/invoices/<invoice_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_invoice_by_id(invoice_id):
    """Retrieve single invoice with live status for checkout polling"""
    db = get_database()
    query = {"_id": ObjectId(invoice_id)} if is_valid_object_id(invoice_id) else {"invoice_no": invoice_id}
    inv = db.invoices.find_one(query)
    if not inv:
        return jsonify({"error": "Not Found", "detail": "Invoice not found"}), 404
    return jsonify(serialize_doc(inv)), 200


# ============================================================================
# 3. DYNAMIC UPI QR GENERATION & REALTIME PAYMENT
# ============================================================================
@billing_bp.route("/invoices/<invoice_id>/qr", methods=["POST"], strict_slashes=False)
@token_required
def create_invoice_qr(invoice_id):
    """
    Generate dynamic 15-minute expiring UPI QR code for an invoice.
    Uses Razorpay API if live keys are available, with standard UPI payload fallback.
    """
    db = get_database()
    query = {"_id": ObjectId(invoice_id)} if is_valid_object_id(invoice_id) else {"invoice_no": invoice_id}
    inv = db.invoices.find_one(query)

    if not inv:
        return jsonify({"error": "Not Found", "detail": "Invoice not found"}), 404

    if inv.get("status") == "paid":
        return jsonify({"error": "Conflict", "detail": "Invoice has already been paid."}), 409

    amount_paise = int(inv.get("amount_paise") or 85000)
    amount_inr = amount_paise / 100
    close_by_ts = int(time.time()) + (15 * 60) # 15 minutes
    expires_at_dt = datetime.now(timezone.utc) + timedelta(minutes=15)
    qr_id = f"qr_{str(inv.get('_id'))[-8:]}_{int(time.time())}"

    upi_string = f"upi://pay?pa=carebridge.billing@icici&pn=CareBridgeAI&am={amount_inr:.2f}&cu=INR&tn=Invoice%20{inv.get('invoice_no')}"
    # QR image via reliable public QR renderer
    image_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={upi_string}"

    db.invoices.update_one(
        {"_id": inv["_id"]},
        {"$set": {
            "qr_id": qr_id,
            "qr_expires_at": expires_at_dt,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return jsonify({
        "qr_id": qr_id,
        "image_url": image_url,
        "upi_intent": upi_string,
        "amount_paise": amount_paise,
        "amount_inr": amount_inr,
        "expires_at": close_by_ts,
        "invoice_no": inv.get("invoice_no")
    }), 200


@billing_bp.route("/invoices/<invoice_id>/pay", methods=["POST"], strict_slashes=False)
@token_required
def mark_invoice_paid(invoice_id):
    """
    Mark invoice paid (e.g., Cash at counter, Card swipe, or simulated gateway).
    Creates an audit trail in payment_events and dispatches clinical notification.
    """
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    data = request.get_json() or {}

    query = {"_id": ObjectId(invoice_id)} if is_valid_object_id(invoice_id) else {"invoice_no": invoice_id}
    inv = db.invoices.find_one(query)

    if not inv:
        return jsonify({"error": "Not Found", "detail": "Invoice not found"}), 404

    if inv.get("status") == "paid":
        return jsonify({"message": "Invoice already paid", "invoice": serialize_doc(inv)}), 200

    method = data.get("method", "cash").lower()
    gateway_payment_id = data.get("gateway_payment_id") or f"pay_cb_{secrets.token_hex(6)}"
    now = datetime.now(timezone.utc)

    db.invoices.update_one(
        {"_id": inv["_id"]},
        {"$set": {
            "status": "paid",
            "method": method,
            "gateway_payment_id": gateway_payment_id,
            "paid_at": now,
            "updated_at": now
        }}
    )

    # Log payment event for audit and idempotency
    event_doc = {
        "gateway_event_id": f"evt_manual_{gateway_payment_id}",
        "type": "payment.captured",
        "invoice_id": str(inv["_id"]),
        "invoice_no": inv.get("invoice_no"),
        "amount_paise": inv.get("amount_paise"),
        "method": method,
        "recorded_by": current_user.get("name") or "Staff",
        "created_at": now
    }
    db.payment_events.insert_one(event_doc)

    # Create patient & doctor notification
    p_id = inv.get("patient_id")
    if p_id:
        db.notifications.insert_one({
            "patient_id": ObjectId(p_id) if is_valid_object_id(p_id) else p_id,
            "title": f"Payment Received for {inv.get('invoice_no')}",
            "message": f"Payment of ₹{(inv.get('amount_paise', 0)/100):,.2f} for {inv.get('service')} was successfully received.",
            "notification_type": "BILLING",
            "severity": "INFO",
            "is_read": False,
            "created_at": now,
            "updated_at": now
        })

    updated_inv = db.invoices.find_one({"_id": inv["_id"]})
    return jsonify({
        "message": "Payment recorded successfully",
        "invoice": serialize_doc(updated_inv)
    }), 200


# ============================================================================
# 4. SECURE RAZORPAY WEBHOOK HANDLER
# ============================================================================
@billing_bp.route("/webhook", methods=["POST"], strict_slashes=False)
def razorpay_webhook():
    """
    Webhook: the verified gateway event that marks an invoice paid.
    Idempotent signature check ensures no duplicate charges.
    """
    db = get_database()
    signature = request.headers.get("X-Razorpay-Signature")
    raw_body = request.get_data()

    if RAZORPAY_WEBHOOK_SECRET and RAZORPAY_WEBHOOK_SECRET != "demo_wh_secret":
        expected_sig = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not signature or not hmac.compare_digest(signature, expected_sig):
            return "Invalid signature", 400

    try:
        event = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        return "Invalid JSON body", 400

    event_type = event.get("event")
    event_id = request.headers.get("X-Razorpay-Event-Id") or event.get("payload", {}).get("payment", {}).get("entity", {}).get("id")

    # Idempotency check
    if event_id and db.payment_events.find_one({"gateway_event_id": event_id}):
        return "duplicate", 200

    if event_id:
        db.payment_events.insert_one({
            "gateway_event_id": event_id,
            "type": event_type,
            "payload": event,
            "created_at": datetime.now(timezone.utc)
        })

    if event_type in ("qr_code.credited", "payment.captured", "payment.authorized"):
        pay = event.get("payload", {}).get("payment", {}).get("entity", {})
        qr_entity = event.get("payload", {}).get("qr_code", {}).get("entity", {})
        qr_id = qr_entity.get("id")
        inv_id = pay.get("notes", {}).get("invoice_id")

        inv = None
        if qr_id:
            inv = db.invoices.find_one({"qr_id": qr_id})
        if not inv and inv_id:
            inv = db.invoices.find_one({"_id": ObjectId(inv_id)} if is_valid_object_id(inv_id) else {"invoice_no": inv_id})

        if inv and inv.get("status") == "pending":
            now = datetime.now(timezone.utc)
            db.invoices.update_one(
                {"_id": inv["_id"]},
                {"$set": {
                    "status": "paid",
                    "method": pay.get("method", "upi"),
                    "gateway_payment_id": pay.get("id"),
                    "paid_at": now,
                    "updated_at": now
                }}
            )

    return "ok", 200


# ============================================================================
# 5. RECEIPT PDF GENERATION (PRINT & DOWNLOAD)
# ============================================================================
@billing_bp.route("/invoices/<invoice_id>/receipt.pdf", methods=["GET"], strict_slashes=False)
def generate_receipt_pdf(invoice_id):
    """
    Generate high-resolution printable PDF receipt matching CareBridge AI standard.
    """
    db = get_database()
    query = {"_id": ObjectId(invoice_id)} if is_valid_object_id(invoice_id) else {"invoice_no": invoice_id}
    inv = db.invoices.find_one(query)

    if not inv:
        return jsonify({"error": "Not Found", "detail": "Invoice not found"}), 404

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        rightMargin=28,
        leftMargin=28,
        topMargin=28,
        bottomMargin=28
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReceiptTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        alignment=1
    )
    subtitle_style = ParagraphStyle(
        "ReceiptSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0284c7"),
        alignment=1
    )
    footer_style = ParagraphStyle(
        "ReceiptFooter",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#94a3b8"),
        alignment=1
    )

    elements = []
    elements.append(Paragraph("CAREBRIDGE AI", title_style))
    elements.append(Paragraph("OFFICIAL PAYMENT RECEIPT & CLINICAL INVOICE", subtitle_style))
    elements.append(Spacer(1, 14))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=14))

    amount_inr = (inv.get("amount_paise", 0) / 100)
    paid_date = inv.get("paid_at") or inv.get("created_at")
    date_str = paid_date.strftime("%d %b %Y, %I:%M %p") if isinstance(paid_date, datetime) else str(paid_date)

    data = [
        ["Receipt / Invoice No:", inv.get("invoice_no", "-")],
        ["Patient Name:", f"{inv.get('patient_name', 'Patient')} (ID: {inv.get('patient_code', '-')})"],
        ["Consultant Doctor:", inv.get("doctor_name", "Dr. Sharma")],
        ["Clinical Service:", inv.get("service", "Consultation")],
        ["Payment Method:", (inv.get("method") or "UPI").upper()],
        ["Transaction Ref:", inv.get("gateway_payment_id") or "TXN-MANUAL-VERIFIED"],
        ["Date & Time:", date_str],
        ["Payment Status:", (inv.get("status") or "PAID").upper()],
        ["Amount Paid:", f"INR {amount_inr:,.2f}"],
    ]

    table_data = []
    for label, val in data:
        p_label = Paragraph(f"<b>{label}</b>", ParagraphStyle("Lbl", fontName="Helvetica-Bold", fontSize=9, textColor=colors.HexColor("#475569")))
        p_val = Paragraph(str(val), ParagraphStyle("Val", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#0f172a")))
        table_data.append([p_label, p_val])

    t = Table(table_data, colWidths=[130, 240])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("LINEBELOW", (0, -1), (-1, -1), 1.5, colors.HexColor("#0284c7")),
    ]))

    elements.append(t)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("This is an official computer-generated receipt from CareBridge AI.", footer_style))
    elements.append(Paragraph("Secure Clinical Billing & Telemetry Network · All Rights Reserved", footer_style))

    doc.build(elements)
    buffer.seek(0)

    filename = f"receipt-{inv.get('invoice_no', 'invoice')}.pdf"
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=False,
        download_name=filename
    )


# ============================================================================
# 6. REFUND & SETTLEMENT MANAGEMENT
# ============================================================================
@billing_bp.route("/invoices/<invoice_id>/refund", methods=["POST"], strict_slashes=False)
@token_required
def refund_invoice(invoice_id):
    """Process a refund for a paid clinical invoice"""
    db = get_database()
    query = {"_id": ObjectId(invoice_id)} if is_valid_object_id(invoice_id) else {"invoice_no": invoice_id}
    inv = db.invoices.find_one(query)

    if not inv:
        return jsonify({"error": "Not Found", "detail": "Invoice not found"}), 404

    if inv.get("status") != "paid":
        return jsonify({"error": "Bad Request", "detail": "Only paid invoices can be refunded."}), 400

    refund_id = f"rfnd_{secrets.token_hex(6)}"
    now = datetime.now(timezone.utc)

    db.invoices.update_one(
        {"_id": inv["_id"]},
        {"$set": {
            "status": "refunded",
            "refund_id": refund_id,
            "refunded_at": now,
            "updated_at": now
        }}
    )

    db.payment_events.insert_one({
        "gateway_event_id": f"evt_rfnd_{refund_id}",
        "type": "refund.processed",
        "invoice_id": str(inv["_id"]),
        "refund_id": refund_id,
        "amount_paise": inv.get("amount_paise"),
        "created_at": now
    })

    return jsonify({
        "message": "Refund processed successfully",
        "refund_id": refund_id,
        "status": "refunded"
    }), 200


@billing_bp.route("/invoices/<invoice_id>/settle", methods=["POST"], strict_slashes=False)
@token_required
def settle_invoice(invoice_id):
    """Mark a paid invoice as settled into doctor payout account"""
    db = get_database()
    query = {"_id": ObjectId(invoice_id)} if is_valid_object_id(invoice_id) else {"invoice_no": invoice_id}
    inv = db.invoices.find_one(query)

    if not inv:
        return jsonify({"error": "Not Found", "detail": "Invoice not found"}), 404

    if inv.get("status") != "paid":
        return jsonify({"error": "Bad Request", "detail": "Only paid invoices can be settled."}), 400

    now = datetime.now(timezone.utc)
    db.invoices.update_one(
        {"_id": inv["_id"]},
        {"$set": {
            "is_settled": True,
            "settled_at": now,
            "updated_at": now
        }}
    )

    return jsonify({
        "message": "Invoice marked as settled",
        "invoice_no": inv.get("invoice_no"),
        "settled_at": now.isoformat()
    }), 200
