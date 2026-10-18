"""
CareBridge MedAI Conversation Manager
- Session Memory: Sliding window of last 10 turns
- Symptom-Checker State Machine: Interactive diagnostic ladder (max 5 questions)
- Multilingual Detection & Response Adapter (English, Hindi, Hinglish, Telugu, Tamil)
- Ambiguity & Clarification Engine
"""

import re
from typing import Dict, Any, List, Optional, Tuple

# Supported Languages
LANG_EN = "en"
LANG_HI = "hi"
LANG_HINGLISH = "hinglish"
LANG_TE = "te"
LANG_TA = "ta"

# Language Detection Patterns
TELUGU_SCRIPT = re.compile(r"[\u0C00-\u0C7F]")
TAMIL_SCRIPT = re.compile(r"[\u0B80-\u0BFF]")
DEVANAGARI_SCRIPT = re.compile(r"[\u0900-\u097F]")

TELUGU_ROMAN = [
    r"\b(jwaram|noppi|kadupu|thala|chali|aayasam|daggu|jalubu|vaanthulu|virechanaalu|manta|raktham|kallu|pillalu|mokaalla)\b",
    r"\b(undi|ledu|vastundi|unnadi|ela|cheyali|emi|cheppandi)\b"
]

TAMIL_ROMAN = [
    r"\b(suram|kaaichal|vali|vayiru|thalai|sali|irumal|vaanthi|bedhi|mayakkam|moochu|kadi|udal|eeru|kan)\b",
    r"\b(irukku|illai|varuthu|enna|seivathu|sollunga|eppadi)\b"
]

HINGLISH_PATTERNS = [
    r"\b(bukhar|dard|khansi|jukam|sardi|pet|sir|sar|seene|chhati|ulti|dast|chakkar|jalan|soojan|gale|saans|khoon|thakan)\b",
    r"\b(hai|hain|ho\s+raha|aa\s+raha|kya\s+kare|dawa|ilaj|batao|bataiye|lag\s+raha|mujhe|mera|meri|bachhe)\b"
]

def detect_language(text: str) -> str:
    """Detect language of user message: en, hi, hinglish, te, ta"""
    if not text:
        return LANG_EN

    # 1. Native script detection
    if TELUGU_SCRIPT.search(text):
        return LANG_TE
    if TAMIL_SCRIPT.search(text):
        return LANG_TA
    if DEVANAGARI_SCRIPT.search(text):
        return LANG_HI

    # 2. Romanized Indian languages detection
    lower = text.lower()
    
    # Telugu romanized
    for p in TELUGU_ROMAN:
        if re.search(p, lower):
            return LANG_TE

    # Tamil romanized
    for p in TAMIL_ROMAN:
        if re.search(p, lower):
            return LANG_TA

    # Hinglish
    for p in HINGLISH_PATTERNS:
        if re.search(p, lower):
            return LANG_HINGLISH

    return LANG_EN


# Multilingual Prompt Templates for Clarifications & Step-by-Step Questioning
LOCALIZED_PROMPTS = {
    LANG_EN: {
        "step_intro": "To give you the safest and most accurate guidance, please help me with a few details:",
        "q_duration": "1. **Duration**: How many hours or days have you had this symptom?",
        "q_severity": "2. **Severity**: On a scale from 1 (mild) to 10 (unbearable), how intense is the discomfort?",
        "q_associated": "3. **Associated Symptoms**: Do you have any other symptoms like fever, vomiting, rash, or shortness of breath?",
        "q_age": "4. **Patient Age & History**: What is the age of the patient, and has this occurred before?",
        "q_meds": "5. **Medications & Conditions**: Do you have existing conditions (like high BP, diabetes) or take any regular medicines?",
        "ambiguity_intro": "Did you mean one of these specific health topics?",
        "disclaimer": "CareBridge MedAI provides clinical decision support and educational guidance. Always consult a healthcare professional for bedside physical diagnosis."
    },
    LANG_HI: {
        "step_intro": "आपको सबसे सुरक्षित और सटीक मार्गदर्शन देने के लिए, कृपया इन आवश्यक विवरणों का उत्तर दें:",
        "q_duration": "1. **अवधि**: आपको यह लक्षण कितने घंटों या दिनों से है?",
        "q_severity": "2. **तीव्रता**: 1 (हल्का) से 10 (असहनीय) के पैमाने पर यह कितना गंभीर है?",
        "q_associated": "3. **अन्य लक्षण**: क्या आपको बुखार, उल्टी, त्वचा पर दाने या सांस लेने में परेशानी जैसे कोई अन्य लक्षण हैं?",
        "q_age": "4. **आयु और इतिहास**: मरीज की उम्र क्या है, और क्या यह समस्या पहले भी हुई है?",
        "q_meds": "5. **दवाएं और पुरानी बीमारियां**: क्या आपको बीपी, शुगर जैसी कोई पुरानी बीमारी है या कोई नियमित दवा ले रहे हैं?",
        "ambiguity_intro": "क्या आप इनमें से किसी स्वास्थ्य विषय के बारे में पूछ रहे हैं?",
        "disclaimer": "केयरब्रिज मेदएआई केवल स्वास्थ्य मार्गदर्शन और प्राथमिक शिक्षा के लिए है। किसी भी गंभीर स्थिति में नजदीकी डॉक्टर से अवश्य संपर्क करें।"
    },
    LANG_HINGLISH: {
        "step_intro": "Aapko sabse sahi aur safe advice dene ke liye, kripya in zaroori baaton ka jawab dein:",
        "q_duration": "1. **Duration**: Yeh takleef kitne ghanto ya dino se ho rahi hai?",
        "q_severity": "2. **Severity**: 1 (halka) se 10 (bahut zyada) ke scale par dard kitna tez hai?",
        "q_associated": "3. **Other Symptoms**: Kya bukhar, ulti, chhati me dard, ya saans lene me takleef jaisa koi aur lakshan hai?",
        "q_age": "4. **Patient Age**: Mareez ki umra (age) kya hai, aur kya yeh pareshani pehle bhi hui hai?",
        "q_meds": "5. **Medications**: Kya aapko Sugar, BP jaisi koi purani bimari hai ya koi regular dawai le rahe hain?",
        "ambiguity_intro": "Kya aap inme se kisi vishay (topic) ke baare me pooch rahe hain?",
        "disclaimer": "CareBridge MedAI educational aur first-aid support ke liye hai. Kisi bhi gambhir takleef me turant doctor se consult karein."
    },
    LANG_TE: {
        "step_intro": "మీకు అత్యంత ఖచ్చితమైన మరియు సురక్షితమైన సలహా ఇవ్వడానికి, దయచేసి ఈ క్రింది వివరాలను తెలియజేయండి:",
        "q_duration": "1. **సమయం (Duration)**: ఈ లక్షణం ఎన్ని గంటలు లేదా రోజులుగా ఉంది?",
        "q_severity": "2. **తీవ్రత (Severity)**: 1 (స్వల్పం) నుండి 10 (అత్యధికం) స్కేలుపై నొప్పి లేదా ఇబ్బంది ఎంత తీవ్రంగా ఉంది?",
        "q_associated": "3. **ఇతర లక్షణాలు**: జ్వరం, వాంతులు, దద్దుర్లు లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది వంటి ఇతర సమస్యలు ఏమైనా ఉన్నాయా?",
        "q_age": "4. **వయస్సు మరియు మునుపటి చరిత్ర**: రోగి వయస్సు ఎంత, మరియు ఈ సమస్య గతంలో ఎప్పుడైనా వచ్చిందా?",
        "q_meds": "5. **మందులు మరియు ఆరోగ్య చరిత్ర**: మీకు బీపీ, షుగర్ వంటి దీర్ఘకాలిక సమస్యలు ఉన్నాయా లేదా ఏదైనా రెగ్యులర్ మందులు వాడుతున్నారా?",
        "ambiguity_intro": "మీరు ఈ క్రింది అంశాలలో దేని గురించి తెలుసుకోవాలనుకుంటున్నారు?",
        "disclaimer": "CareBridge MedAI ప్రాథమిక ఆరోగ్య సమాచారం మరియు మార్గదర్శకత్వం కోసం మాత్రమే. అత్యవసర పరిస్థితుల్లో వెంటనే వైద్యుడిని సంప్రదించండి."
    },
    LANG_TA: {
        "step_intro": "உங்களுக்கு மிகவும் துல்லியமான மற்றும் பாதுகாப்பான வழிகாட்டுதலை வழங்க, தயவுசெய்து இந்த விவரங்களை தெரிவிக்கவும்:",
        "q_duration": "1. **கால அளவு (Duration)**: இந்த அறிகுறி எத்தனை மணி நேரம் அல்லது நாட்களாக உள்ளது?",
        "q_severity": "2. **தீவிரம் (Severity)**: 1 (லேசானது) முதல் 10 (கடுமையானது) என்ற அளவில் அசௌகரியம் எவ்வளவு தீவிரமாக உள்ளது?",
        "q_associated": "3. **பிற அறிகுறிகள்**: காய்ச்சல், வாந்தி, மூச்சுத் திணறல் போன்ற பிற அறிகுறிகள் ஏதேனும் உள்ளதா?",
        "q_age": "4. **நோயாளியின் வயது**: நோயாளியின் வயது என்ன, இது முன்பு எப்போதாவது ஏற்பட்டிருக்கிறதா?",
        "q_meds": "5. **மருந்துகள்**: சர்க்கரை நோய், இரத்த அழுத்தம் போன்ற ஏதேனும் முந்தைய பாதிப்புகள் அல்லது வழக்கமான மருந்துகள் உட்கொள்கிறீர்களா?",
        "ambiguity_intro": "நீங்கள் பின்வரும் தலைப்புகளில் எதைப் பற்றி கேட்க விரும்புகிறீர்கள்?",
        "disclaimer": "CareBridge MedAI கல்வி மற்றும் முதலுதவி வழிகாட்டுதலுக்காக மட்டுமே. அவசர காலங்களில் உடனடியாக மருத்துவரை அணுகவும்."
    }
}

# ============================================================================
# SYMPTOM CHECKER STATE MACHINE
# ============================================================================
class SymptomCheckerStateMachine:
    """
    Manages interactive symptom evaluation.
    Asks at most 5 sequential clarifying questions before concluding with synthesised advice.
    """
    VAGUE_TRIGGERS = [
        r"\b(i\s+feel\s+sick|not\s+feeling\s+well|unwell|body\s+pain|i\s+have\s+pain|sick)\b",
        r"\b(tabiyat\s+kharab|accha\s+nahi\s+lag\s+raha|dard\s+ho\s+raha|bura\s+lag\s+raha)\b",
        r"\b(bagoledu|ollu\s+noppulu|baaga\s+ledu|sari\s+ledu)\b",
        r"\b(udambu\s+sari\s+illai|udal\s+vali|nallaa\s+illai)\b"
    ]

    QUESTIONS_SEQUENCE = [
        "q_duration",
        "q_severity",
        "q_associated",
        "q_age",
        "q_meds"
    ]

    @classmethod
    def is_vague_query(cls, text: str) -> bool:
        lower = text.lower().strip()
        # If text is extremely short and generic
        if len(lower.split()) <= 4:
            for pat in cls.VAGUE_TRIGGERS:
                if re.search(pat, lower):
                    return True
        return False

    @classmethod
    def get_next_question(cls, current_step: int, lang: str = LANG_EN) -> Optional[Tuple[int, str]]:
        """Returns (next_step_number, question_text) or None if all 5 answered"""
        if current_step >= 5:
            return None
        q_key = cls.QUESTIONS_SEQUENCE[current_step]
        prompts = LOCALIZED_PROMPTS.get(lang, LOCALIZED_PROMPTS[LANG_EN])
        q_text = prompts.get(q_key, LOCALIZED_PROMPTS[LANG_EN][q_key])
        intro = prompts["step_intro"] if current_step == 0 else ""
        full_msg = f"{intro}\n\n{q_text}" if intro else q_text
        return (current_step + 1, full_msg)


# ============================================================================
# SESSION MEMORY (SLIDING WINDOW)
# ============================================================================
class SessionMemory:
    """In-memory sliding window cache for recent conversation turns (last 10)"""
    _sessions: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def get_turns(cls, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        if not session_id:
            return []
        turns = cls._sessions.get(session_id, [])
        return turns[-limit:]

    @classmethod
    def add_turn(cls, session_id: str, user_msg: str, ai_msg: str, metadata: Optional[Dict[str, Any]] = None):
        if not session_id:
            return
        if session_id not in cls._sessions:
            cls._sessions[session_id] = []
        cls._sessions[session_id].append({
            "user": user_msg,
            "assistant": ai_msg,
            "metadata": metadata or {}
        })
        # Maintain max 10
        if len(cls._sessions[session_id]) > 10:
            cls._sessions[session_id] = cls._sessions[session_id][-10:]

    @classmethod
    def clear_session(cls, session_id: str):
        if session_id in cls._sessions:
            cls._sessions.pop(session_id, None)

    @classmethod
    def get_step_count(cls, session_id: str) -> int:
        turns = cls._sessions.get(session_id, [])
        count = 0
        for t in reversed(turns):
            meta = t.get("metadata", {})
            if meta.get("symptom_checker_step"):
                count = max(count, meta.get("symptom_checker_step"))
        return count
