import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import (
    APP_URL,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    EMAILS_FROM_EMAIL,
    EMAILS_FROM_NAME,
    SUPPORT_EMAIL,
)

def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Sends an email using configured SMTP credentials.
    If SMTP is not configured or fails, logs to server console safely.
    """
    if not text_content:
        # Simple text fallback
        text_content = html_content.replace("<br>", "\n").replace("</p>", "\n\n")
        import re
        text_content = re.sub(r"<[^>]+>", "", text_content)

    print(f"[Email Service] Sending '{subject}' to {to_email}...")

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print(f"[Email Service Notice] SMTP not configured in .env. Email content preview for {to_email}:")
        print(f"--- SUBJECT: {subject} ---")
        print(text_content.strip())
        print("--------------------------------------------------")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{EMAILS_FROM_NAME} <{EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.starttls()

        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(EMAILS_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        print(f"[Email Service] Email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[Email Service Error] Failed to send email to {to_email}: {e}")
        return False

def get_base_email_template(title: str, preheader: str, body_html: str, action_url: str = None, action_text: str = None) -> str:
    button_html = ""
    if action_url and action_text:
        button_html = f"""
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
            <tr>
                <td align="center" style="border-radius: 8px; background: #0ea5a8;">
                    <a href="{action_url}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 28px; border: 1px solid #0ea5a8; display: inline-block; font-weight: 700; letter-spacing: 0.2px;">
                        {action_text} &rarr;
                    </a>
                </td>
            </tr>
        </table>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px;">
            Or copy and paste this secure link into your browser:<br>
            <a href="{action_url}" style="color: #0ea5a8; word-break: break-all;">{action_url}</a>
        </p>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b1220; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b1220; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #111a2e; border: 1px solid #1f2a44; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 28px 32px; background: linear-gradient(135deg, rgba(14, 165, 168, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%); border-bottom: 1px solid #1f2a44;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td>
                                            <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                                                Care<span style="color: #22d3ee;">Bridge</span> AI
                                            </div>
                                            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px;">
                                                Clinical Healthcare Platform
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 32px 24px;">
                                <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.2px;">
                                    {title}
                                </h1>
                                <div style="font-size: 14.5px; color: #cbd5e1; line-height: 1.6;">
                                    {body_html}
                                </div>
                                {button_html}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 32px 28px; background-color: #0d1526; border-top: 1px solid #1f2a44; font-size: 12px; color: #64748b; line-height: 1.5;">
                                <p style="margin: 0 0 8px;">
                                    This is an automated clinical security notification from CareBridge AI. If you did not make this request, please contact support immediately at <a href="mailto:{SUPPORT_EMAIL}" style="color: #22d3ee;">{SUPPORT_EMAIL}</a>.
                                </p>
                                <p style="margin: 0;">
                                    &copy; 2026 CareBridge AI. All rights reserved. HIPAA & DPDP Act 2023 Compliant.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def send_admin_bootstrap_email(admin_email: str, admin_name: str, setup_token: str):
    """Sent when the initial primary admin account is bootstrapped."""
    setup_url = f"{APP_URL}/set-password?token={setup_token}"
    subject = "Action Required: Set Your CareBridge AI Admin Password"
    body_html = f"""
    <p>Hello <strong>{admin_name}</strong>,</p>
    <p>Your CareBridge AI primary System Administrator account has been provisioned.</p>
    <p>Please click the button below to set your master password and activate your administrative credentials. For security, this link will expire in <strong>1 hour</strong>.</p>
    """
    html = get_base_email_template(
        title="Welcome, Administrator",
        preheader="Set your CareBridge AI master admin password",
        body_html=body_html,
        action_url=setup_url,
        action_text="Set Admin Password",
    )
    return send_email(admin_email, subject, html)

def send_admin_2fa_otp(admin_email: str, admin_name: str, otp_code: str):
    """Sends 6-digit 2FA login verification code for admin login."""
    subject = f"CareBridge AI Admin 2FA Code: {otp_code}"
    body_html = f"""
    <p>Hello <strong>{admin_name}</strong>,</p>
    <p>Your one-time 2FA login verification code for CareBridge AI Administrative Portal is:</p>
    <div style="margin: 24px 0; padding: 16px 24px; background: #0b1220; border: 1px solid #1f2a44; border-radius: 12px; text-align: center;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #22d3ee; font-family: monospace;">{otp_code}</span>
    </div>
    <p>This code will expire in <strong>5 minutes</strong>. If you did not attempt to sign in, your credentials may be compromised. Please lock your account or reset your password immediately.</p>
    """
    html = get_base_email_template(
        title="Admin Two-Factor Authentication",
        preheader=f"Your verification code is {otp_code}",
        body_html=body_html,
    )
    return send_email(admin_email, subject, html)

def send_user_invite_email(to_email: str, full_name: str, role: str, invite_token: str, invited_by: str = "Administrator"):
    """Sends invitation to a new doctor, staff, or patient invited by admin."""
    invite_url = f"{APP_URL}/accept-invite?token={invite_token}"
    subject = f"You have been invited to CareBridge AI as {role.capitalize()}"
    body_html = f"""
    <p>Hello <strong>{full_name}</strong>,</p>
    <p>You have been invited by <strong>{invited_by}</strong> to join the <strong>CareBridge AI Clinical Platform</strong> with the role of <strong>{role.upper()}</strong>.</p>
    <p>Please click the button below to accept your invitation, create your password, and verify your clinical coordinates. This invitation link is valid for <strong>24 hours</strong>.</p>
    """
    html = get_base_email_template(
        title=f"Invitation to CareBridge AI ({role.capitalize()})",
        preheader=f"Accept your {role} account invitation",
        body_html=body_html,
        action_url=invite_url,
        action_text="Accept Invitation & Set Password",
    )
    return send_email(to_email, subject, html)

def send_patient_verification_email(patient_email: str, patient_name: str, verify_token: str):
    """Sends email verification link upon public patient registration."""
    verify_url = f"{APP_URL}/verify-email?token={verify_token}"
    subject = "Verify your email address — CareBridge AI"
    body_html = f"""
    <p>Hello <strong>{patient_name}</strong>,</p>
    <p>Thank you for registering on the CareBridge AI Patient Portal. Please verify your email address to activate your health dossier and appointment booking capabilities.</p>
    """
    html = get_base_email_template(
        title="Verify Your Email Address",
        preheader="Confirm your email on CareBridge AI",
        body_html=body_html,
        action_url=verify_url,
        action_text="Verify Email Address",
    )
    return send_email(patient_email, subject, html)

def send_password_reset_email(to_email: str, full_name: str, reset_token: str):
    """Sends password reset link."""
    reset_url = f"{APP_URL}/reset-password?token={reset_token}"
    subject = "CareBridge AI Password Reset Request"
    body_html = f"""
    <p>Hello <strong>{full_name}</strong>,</p>
    <p>We received a request to reset the password for your CareBridge AI account. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.</p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
    """
    html = get_base_email_template(
        title="Password Reset Request",
        preheader="Reset your CareBridge AI account password",
        body_html=body_html,
        action_url=reset_url,
        action_text="Reset Password",
    )
    return send_email(to_email, subject, html)
