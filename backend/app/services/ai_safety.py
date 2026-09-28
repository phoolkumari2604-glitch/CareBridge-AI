import re


EMERGENCY_KEYWORDS = [
    "chest pain",
    "difficulty breathing",
    "can't breathe",
    "cannot breathe",
    "severe bleeding",
    "unconscious",
    "fainted",
    "fainting",
    "stroke",
    "heart attack",
    "seizure",
    "convulsion",
    "suicide",
    "suicidal",
    "overdose",
    "poisoning",
]


def normalize_message(message: str) -> str:
    return re.sub(r"\s+", " ", message.lower().strip())


def detect_emergency(message: str) -> bool:
    normalized = normalize_message(message)

    return any(
        keyword in normalized
        for keyword in EMERGENCY_KEYWORDS
    )


def get_emergency_response() -> str:
    return (
        "This message may describe a medical emergency. "
        "Please seek immediate emergency medical care or contact "
        "your local emergency service now. Do not rely on this "
        "AI assistant for emergency diagnosis or treatment."
    )