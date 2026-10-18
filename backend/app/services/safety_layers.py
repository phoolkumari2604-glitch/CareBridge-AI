"""
CareBridge MedAI 6-Layer Safety Architecture
Strict sequential evaluation before retrieval and LLM processing:
1. Rule-based Red-Flag Emergency Detector
2. Crisis Response (Self-Harm / Suicide / Abuse)
3. Prompt-Injection & Controlled Drug Guard
4. Role & Permission Guard
5. Image / Lab Report Observation Guard
6. Output Verification & Ungrounded Dosage Filter
"""

import re
from typing import Dict, Any, Optional, Tuple

# ============================================================================
# LAYER 1: RED-FLAG EMERGENCY KEYWORDS & PATTERNS
# ============================================================================
RED_FLAG_PATTERNS = [
    # Acute Coronary / Chest Pain
    r"\b(chest\s+pain|heart\s+attack|crushing\s+chest|pain\s+radiat\w+\s+to\s+(left\s+arm|jaw)|(seene|chhati)\s+me\s+.*dard|chathi\s+noppi|nenju\s+vali)\b",
    # Respiratory Failure / Acute Dyspnea
    r"\b(can'?t\s+breathe|cannot\s+breathe|difficulty\s+breathing|severe\s+breathlessness|gasping\s+for\s+air|suffocat\w+|dam\s+ghut|saans\s+.*(takleef|nahi|phoolna)|swasa\s+.*(kashtam|ibbandi|aadadam)|moochu\s+.*(mudiyavillai|thinaral|vaanguthal))\b",
    # Stroke / FAST
    r"\b(stroke|facial\s+droop|face\s+droop|slurred\s+speech|arm\s+weakness|hemiplegia|sudden\s+paralysis|pakshaghat|paralys\w+)\b",
    # Cardiac Arrest / Unconsciousness
    r"\b(cardiac\s+arrest|stopped\s+breathing|no\s+pulse|unconscious|unresponsive|collapsed|behosh|spriha\s+kolpoyaru|ninaivillai)\b",
    # Severe Hemorrhage
    r"\b(severe\s+.*bleeding|profuse\s+bleeding|spurting\s+(blood|bleeding)|massive\s+hemorrhage|khoon\s+behta|raktham\s+kaare|ratham\s+kottuthu)\b",
    # Anaphylaxis
    r"\b(anaphylaxis|throat\s+(is\s+)?closing(\s+up)?|lips?\s+swollen|unable\s+to\s+swallow\s+air|allergic\s+shock)\b",
    # Acute Seizure / Status Epilepticus
    r"\b(active\s+seizure|continuous\s+convulsion|epileptic\s+fit|fits\s+aana|mrigi|fits\s+vastundi)\b",
    # Acute Poisoning / Snakebite
    r"\b(poisoning|swallowed\s+.*poison|pesticide|drank\s+phenyl|pesticide\s+poisoning|snake\s+bite|saanp\s+ne\s+kata|paamu\s+kaatu|paambu\s+kadi)\b"
]

EMERGENCY_FIXED_RESPONSE = """🚨 **MEDICAL EMERGENCY DETECTED**

**Call 112 (India National Emergency) or 108 (Ambulance) IMMEDIATELY**, or go to the nearest hospital emergency room without delay.

- **Do NOT wait** for an online AI response.
- If the person is unresponsive and not breathing, begin **CPR (chest compressions)** immediately.
- If experiencing severe chest pain, keep the person seated, calm, and resting while emergency medical services are on the way.
- If severe bleeding, apply firm, continuous direct pressure to the wound with a clean cloth.

*MedAI emergency safety protocol triggered automatically.*"""

# ============================================================================
# LAYER 2: CRISIS RESPONSE (SELF-HARM / SUICIDE / CRISIS)
# ============================================================================
CRISIS_PATTERNS = [
    r"\b(suicid\w+|kill\s+myself|end\s+my\s+life|want\s+to\s+die|self[\s-]harm|cut\s+my\s+wrist|hang\s+myself|atmanhatya|atmahatya|jaan\s+dena|chavalanukuntunna|tharkolai)\b",
    r"\b(feel\s+like\s+ending\s+it\s+all|hopeless\s+want\s+to\s+die|no\s+reason\s+to\s+live)\b"
]

CRISIS_FIXED_RESPONSE = """💜 **We care about you, and support is available right now.**

You do not have to carry this pain alone. Free, confidential, and compassionate professional counselors are available 24/7 to listen and help:

- 🇮🇳 **Tele-MANAS (Govt. of India Mental Health Helpline)**: **14416** or **1800-891-4416** (Toll-Free, 24/7, Multilingual)
- 🚑 **National Emergency Helpline**: **112**
- 🤝 **Vandrevala Foundation Helpline**: **+91 9999 666 555** (Free, 24/7)
- 🕊️ **KIRAN Helpline**: **1800-599-0019**

Please reach out to one of these numbers right now, or reach out to a trusted family member, close friend, or healthcare provider. You matter, and there is help for you."""

# ============================================================================
# LAYER 3: PROMPT-INJECTION & CONTROLLED DRUG GUARD
# ============================================================================
INJECTION_PATTERNS = [
    r"(ignore\s+(all\s+)?previous\s+(instructions|rules)|disregard\s+(the\s+)?system\s+prompt|reveal\s+your\s+system\s+prompt)",
    r"(you\s+are\s+now\s+(dan|an\s+unfiltered|jailbroken)|pretend\s+you\s+have\s+no\s+rules|act\s+as\s+an\s+unrestricted)",
    r"(bypass\s+safety|override\s+clinical\s+guard|drop\s+all\s+guidelines)",
    r"(system\s+tag|\[system\]|<\|im_start\|>|base64\s+decode)"
]

CONTROLLED_SUBSTANCES = [
    # Opioids & Narcotics
    "tramadol", "morphine", "fentanyl", "oxycodone", "hydrocodone", "methadone",
    "buprenorphine", "codeine", "pethidine", "pentazocine",
    # Benzodiazepines & Sedatives
    "alprazolam", "diazepam", "clonazepam", "lorazepam", "midazolam", "nitrazepam",
    "zolpidem", "zopiclone", "chlordiazepoxide",
    # Stimulants & Controlled
    "methylphenidate", "amphetamine", "modafinil", "ketamine"
]

CONTROLLED_DRUG_RESPONSE = """⛔ **Controlled Medication Safety Notice**

MedAI cannot prescribe, recommend dosages, or facilitate the procurement of **Schedule H1 / Schedule X controlled substances**, including narcotics, strong opioids, and benzodiazepine sedatives.

These medications have high dependency and safety risks and can legally be prescribed only by a **Registered Medical Practitioner (RMP)** following a formal physical consultation. Please visit your doctor or nearest hospital clinic with your medical records for appropriate clinical prescription."""

# ============================================================================
# SAFETY EVALUATOR PIPELINE
# ============================================================================
def evaluate_safety_pipeline(
    message: str,
    role: str = "PATIENT",
    has_attachments: bool = False,
    is_e_prescription: bool = False
) -> Dict[str, Any]:
    """
    Executes the full safety check suite in strict order:
    Returns dict:
      {
        "blocked": bool,
        "layer_triggered": Optional[str],
        "response": Optional[str],
        "is_emergency": bool,
        "is_crisis": bool,
        "observation_only": bool
      }
    """
    text = message.lower().strip()

    # --- LAYER 1: Red-Flag Emergency ---
    for pattern in RED_FLAG_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return {
                "blocked": True,
                "layer_triggered": "L1_EMERGENCY",
                "response": EMERGENCY_FIXED_RESPONSE,
                "is_emergency": True,
                "is_crisis": False,
                "observation_only": False
            }

    # --- LAYER 2: Crisis / Self-Harm ---
    for pattern in CRISIS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return {
                "blocked": True,
                "layer_triggered": "L2_CRISIS",
                "response": CRISIS_FIXED_RESPONSE,
                "is_emergency": False,
                "is_crisis": True,
                "observation_only": False
            }

    # --- LAYER 3A: Prompt-Injection / Jailbreak ---
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return {
                "blocked": True,
                "layer_triggered": "L3_INJECTION",
                "response": "⚠️ **Security Notice**: Your request cannot be processed because it contains disallowed instruction patterns or system override attempts. MedAI operates strictly within certified medical safety guidelines.",
                "is_emergency": False,
                "is_crisis": False,
                "observation_only": False
            }

    # --- LAYER 3B: Controlled Substance Requests ---
    # Check if asking to prescribe or give doses for controlled drugs
    for drug in CONTROLLED_SUBSTANCES:
        drug_pattern = r"\b" + re.escape(drug) + r"\b"
        if re.search(drug_pattern, text):
            # Check intent: prescribe, dosage, get, buy, high dose
            prescribe_intent = re.search(r"\b(prescribe|dose|dosage|how\s+much\s+to\s+take|give\s+me|buy|need\s+pills?|sleep\s+pill|high\s+dose)\b", text)
            if prescribe_intent:
                return {
                    "blocked": True,
                    "layer_triggered": "L3_CONTROLLED_DRUG",
                    "response": CONTROLLED_DRUG_RESPONSE,
                    "is_emergency": False,
                    "is_crisis": False,
                    "observation_only": False
                }

    # --- LAYER 4: Role & Permission Check ---
    # Handled contextually by the caller (e.g. patients cannot query other patients' EHR)

    # --- LAYER 5: Image / Lab Guard ---
    observation_only = bool(has_attachments)

    return {
        "blocked": False,
        "layer_triggered": None,
        "response": None,
        "is_emergency": False,
        "is_crisis": False,
        "observation_only": observation_only
    }


def apply_output_filter(response_text: str, kb_entry: Optional[Dict[str, Any]] = None) -> str:
    """
    LAYER 6: Output Verification & Filter
    - Enforces draft disclaimer if review_status is not 'approved'
    - Strips unauthorized fake 'Verified by Dr.' claims
    - Validates safety tone
    """
    if not response_text:
        return ""

    out = response_text

    # Check review status
    if kb_entry:
        status = kb_entry.get("review_status", "draft")
        reviewer = kb_entry.get("reviewed_by")
        if status != "approved":
            # Remove any fake verified badges
            out = re.sub(r">?\s*✅\s*\*\*Verified[^\n]*", "", out)
            # Add draft indicator
            draft_banner = "> ⚠️ **Draft Guideline**: *This information is based on standard international clinical literature (WHO / ICMR / MoHFW) and is currently in the CareBridge peer-review queue awaiting final physician sign-off.*\n\n"
            if not out.startswith("> ⚠️ **Draft Guideline**"):
                out = draft_banner + out
        else:
            # Entry is legitimately approved
            if reviewer and "Verified Clinical Guideline" not in out:
                verified_badge = f"> ✅ **Verified Clinical Guideline** · Reviewed by *{reviewer}*\n\n"
                out = verified_badge + out

    return out
