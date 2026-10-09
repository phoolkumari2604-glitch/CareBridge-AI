# CareBridge AI — Clinical Intelligence & Hospital Operations Portal

CareBridge AI is an enterprise-grade, HIPAA and DPDP Act (India, 2023) compliant clinical operations platform. It integrates real-time patient queueing, automated OPD pass verification, AI triage, physiological vitals monitoring, doctor appointment management, and administrative governance.

---

## Key Architecture & Production Highlights

1. **Role-Based Access Control (RBAC)**
   - **Administrator (`ADMIN`)**: System-wide governance, professional invitations (Doctors/Staff), user lifecycle management, audit log inspection, and bulk CSV onboarding. Protected by mandatory 2FA (6-digit OTP).
   - **Doctor (`DOCTOR`)**: Patient telemetry inspection, appointment management, digital approvals, and health records review.
   - **Clinical Staff (`STAFF`)**: Live OPD queue control, hospital admissions triage, token verification, and vitals recording.
   - **Patient (`PATIENT`)**: Self-service registration with email verification, digital OPD passes, interactive physiological organ telemetry, AI healthcare assistant, and nearby hospital discovery.

2. **Security & Authentication**
   - **Password Requirements**: Minimum 10 characters with mixed-case letters, numbers, and special symbols (`validate_strong_password`).
   - **Account Lockout Protection**: 5 consecutive failed login attempts locks the account for 15 minutes.
   - **Two-Factor Authentication (2FA)**: Mandatory 6-digit email OTP for Admin accounts with 10-minute expiry and resend rate limiting.
   - **Biometrics (WebAuthn & Face Liveness)**: Platform fingerprint sensors (Windows Hello / Touch ID) and one-way vector face verification embeddings.
   - **No Hardcoded Demo Accounts**: Demo accounts and quick login shortcuts are strictly gated behind `VITE_DEMO_MODE=true` (disabled by default in production).

3. **India DPDP Act 2023 & Healthcare Compliance**
   - Explicit user consent for health profile processing at registration.
   - Audit logging for all authentication attempts, profile updates, and biometric credential actions.
   - Support and Data Protection Officer contact: `phoolkumari2603@gmail.com`.

---

## Environment Configuration

### Backend (`backend/.env`)
```ini
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=Cluster0
DATABASE_NAME=carebridge_ai
JWT_SECRET_KEY=your_secure_jwt_secret_key_32_bytes
PORT=5000
FLASK_ENV=production

# Admin & Compliance Settings
ADMIN_EMAIL=phoolkumari2603@gmail.com
ADMIN_NAME="Phool Kumari"
SUPPORT_EMAIL=phoolkumari2603@gmail.com
EMAILS_FROM_EMAIL=phoolkumari2603@gmail.com
EMAILS_FROM_NAME="CareBridge AI Clinical Portal"
APP_URL=https://carebridge.ai

# Transactional SMTP Settings (Gmail, SendGrid, Amazon SES)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```

### Frontend (`frontend/.env`)
```ini
VITE_API_BASE_URL=https://api.carebridge.ai/api
VITE_DEMO_MODE=false
```

---

## Getting Started

### 1. Database Cleanup & Admin Bootstrapping
Purge legacy placeholder data and initialize the primary administrator account:
```powershell
cd backend
.\.venv\Scripts\python.exe cleanup_demo_data.py
```

### 2. Starting the Backend API (Flask)
```powershell
cd backend
.\.venv\Scripts\python.exe run.py
```

### 3. Starting the Frontend (React + Vite)
```powershell
cd frontend
npm install
npm run build
npm run dev
```

---

## Production Verification Checklist

- [x] High-contrast WCAG AA login typography with dark autofill fix (`input:-webkit-autofill`).
- [x] 15-second `AbortController` timeout on all auth and admin requests.
- [x] Public registration strictly restricted to `PATIENT` with email verification token dispatch.
- [x] Admin login secured with mandatory 6-digit email OTP (2FA).
- [x] 5-attempt account lockout (15 minutes).
- [x] Admin management dashboard (`/admin`) with role-based routing guard, user search/filtering, status toggling, password reset, and bulk CSV import.
- [x] DPDP Act 2023 compliant Terms of Service (`/terms`) and Privacy Policy (`/privacy`).
- [x] OpenStreetMap tile layer integration on hospital radar map with 460px height.
- [x] Support contact `phoolkumari2603@gmail.com` linked throughout footers and emails.
