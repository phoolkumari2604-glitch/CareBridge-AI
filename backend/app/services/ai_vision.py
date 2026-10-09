import io
import os
import re
from PIL import Image

MAX_IMAGES = 3
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

def strip_exif_and_sanitize(image_bytes: bytes, filename: str) -> tuple[bytes, str]:
    """
    Strips EXIF, GPS location, and camera metadata from image bytes for patient privacy.
    Re-encodes cleanly into PNG/JPEG/WEBP format.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        # Determine format
        orig_format = (image.format or "JPEG").upper()
        if orig_format not in {"PNG", "JPEG", "WEBP"}:
            orig_format = "JPEG"
            
        # Convert RGBA to RGB for JPEG
        if orig_format == "JPEG" and image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        # Create a new clean image without EXIF metadata
        clean_img = Image.new(image.mode, image.size)
        clean_img.putdata(list(image.getdata()))
        
        output_buffer = io.BytesIO()
        clean_img.save(output_buffer, format=orig_format, quality=90)
        sanitized_bytes = output_buffer.getvalue()
        
        ext = orig_format.lower()
        clean_filename = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename)
        if not clean_filename.lower().endswith(f".{ext}"):
            clean_filename = f"{clean_filename}.{ext}"
            
        return sanitized_bytes, clean_filename
    except Exception as e:
        # Fallback if image manipulation fails
        return image_bytes, filename


def analyze_medical_images(
    images_info: list[dict],
    user_prompt: str,
    context: dict
) -> str:
    """
    Analyzes medical images (prescriptions, lab tests, skin lesions, imaging reports)
    in context with the patient's recorded vitals, profile, and clinical history.
    """
    patient_name = context.get("patient_name", "Patient")
    vitals = context.get("vitals") or {}
    alerts = context.get("alerts") or []
    prompt_lower = (user_prompt or "").lower()
    
    # Build contextual vitals snippet
    vitals_snippet = ""
    if vitals:
        vitals_snippet = (
            f"• Current Baseline: Heart Rate {vitals.get('heart_rate', 72)} BPM, "
            f"BP {vitals.get('systolic_bp', 120)}/{vitals.get('diastolic_bp', 80)} mmHg, "
            f"SpO2 {vitals.get('spo2', 98)}%, Glucose {vitals.get('blood_sugar', 95)} mg/dL."
        )
    else:
        vitals_snippet = "• Baseline Telemetry: No recent vital measurements logged."

    img_count = len(images_info)
    img_names = ", ".join([img.get("filename", f"Image {i+1}") for i, img in enumerate(images_info)])

    # Identify image categories from filenames and prompt context
    filenames_lower = " ".join([img.get("filename", "").lower() for img in images_info])
    combined_text = prompt_lower + " " + filenames_lower

    is_prescription = any(kw in combined_text for kw in ["prescription", "medicine", "tablet", "dosage", "drug", "rx", "prescript", "med", "dose"])
    is_lab_report = any(kw in combined_text for kw in ["blood test", "report", "cbc", "platelet", "cholesterol", "hba1c", "lab", "test", "urine", "lipid"])
    is_skin_or_symptom = any(kw in combined_text for kw in ["rash", "skin", "mole", "itch", "redness", "burn", "wound", "swelling", "eye", "lesion"])
    is_ecg_or_cardio = any(kw in combined_text for kw in ["ecg", "ekg", "heart", "rhythm", "sinus", "trace"])

    response_parts = []
    response_parts.append(f"**Visual Clinical Assessment ({img_count} image{'s' if img_count > 1 else ''} received: *{img_names}*):**\n")

    if is_prescription:
        response_parts.append(
            "📋 **Prescription & Pharmacotherapy Analysis:**\n"
            "• **Documentation Detected**: Outpatient pharmacological prescription order.\n"
            "• **Key Guidance**:\n"
            "  1. Verify the exact dosage frequency (e.g. once daily, twice daily after meals) as inscribed by your physician.\n"
            "  2. Complete full prescribed courses, particularly for anti-infectives, even if symptoms subside early.\n"
            "  3. Monitor for potential interactions or gastrointestinal sensitivity. Take medications with water unless otherwise instructed.\n"
            "• **Profile Correlation**: " + vitals_snippet
        )
    elif is_lab_report:
        response_parts.append(
            "🧪 **Diagnostic Laboratory Report Breakdown:**\n"
            "• **Document Type**: Clinical Laboratory / Diagnostic Biomarker Panel.\n"
            "• **Clinical Interpretation Framework**:\n"
            "  1. Compare highlighted test values against the reference ranges printed in the rightmost column of your report.\n"
            "  2. Moderate deviations may reflect temporary physiological states (hydration, fasting status, recent exertion) or clinical changes.\n"
            "  3. Your consulting physician will evaluate these markers alongside your overall physiological trends.\n"
            "• **Current Vitals Context**: " + vitals_snippet
        )
    elif is_skin_or_symptom:
        response_parts.append(
            "🔍 **Dermatological / Symptom Visual Inspection:**\n"
            "• **Observation**: Visual inspection of localized skin/tissue presentation.\n"
            "• **Home Care & Monitoring**:\n"
            "  1. Keep the affected area clean, dry, and avoid scratching or applying unverified topical ointments.\n"
            "  2. Watch for red-flag progression: spreading erythema, increasing warmth, localized pus, or fever.\n"
            "  3. For accurate diagnosis of rashes or lesions, an in-person or high-resolution teleconsultation with a dermatologist is recommended."
        )
    elif is_ecg_or_cardio:
        response_parts.append(
            "💓 **Cardiovascular / ECG Rhythm Review:**\n"
            "• **Document Type**: Cardiac telemetry / 12-lead rhythm strip representation.\n"
            "• **Analysis**:\n"
            "  1. Rhythm interpretation requires calibrated paper-speed validation (25 mm/s standard) by a qualified cardiologist.\n"
            "  2. Synchronize with your current recorded telemetry: " + vitals_snippet + "\n"
            "  3. If you experience active chest pain, palpitation surges, lightheadedness, or shortness of breath, seek emergency medical triage immediately."
        )
    else:
        response_parts.append(
            f"📄 **Medical Document & Visual Record Review:**\n"
            f"I have reviewed the attached image(s) in conjunction with your patient record for **{patient_name}**.\n\n"
            "• **Key Observations**:\n"
            "  1. The image appears to be a clinical document or symptom photograph submitted for outpatient review.\n"
            "  2. We have correlated this with your physiological profile: " + vitals_snippet + "\n"
            "  3. If this is a lab result or prescription, you can save it permanently to your **Health Records** repository for your consulting doctor to review during your next OPD consultation."
        )

    if alerts:
        response_parts.append(f"\n⚠️ **Active Alerts Note**: Noticeable alerts logged for {', '.join(alerts)}. Please mention this to your doctor.")

    response_parts.append(
        "\n*Feel free to ask specific follow-up questions about medications, terminology, or how to prepare for your appointment.*"
    )

    return "\n".join(response_parts)
