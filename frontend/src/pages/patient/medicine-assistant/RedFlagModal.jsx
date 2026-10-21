import React from "react";
import { Link } from "react-router-dom";
import {
  AlertOctagon,
  PhoneCall,
  Hospital,
  Stethoscope,
  X,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";

export default function RedFlagModal({ emergency, onClose, lang = "en", t }) {
  if (!emergency || !emergency.triggered) return null;

  return (
    <div className="med-emergency-modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="emergency-title">
      <div className="med-emergency-modal">
        <div className="med-emergency-modal-header">
          <div className="med-emergency-icon-wrap">
            <AlertOctagon size={36} className="med-pulse" />
          </div>
          <div>
            <span className="med-emergency-badge">RED-FLAG EMERGENCY TRIAGE</span>
            <h2 id="emergency-title">{emergency.title || t.emergencyHeader}</h2>
          </div>
          <button
            type="button"
            className="med-emergency-close-btn"
            onClick={onClose}
            aria-label="Close emergency alert"
          >
            <X size={20} />
          </button>
        </div>

        <div className="med-emergency-modal-body">
          <div className="med-emergency-reason-banner">
            <AlertTriangle size={20} />
            <div>
              <strong>Why OTC is blocked:</strong> {emergency.reason}
            </div>
          </div>

          <p className="med-emergency-action-lead">
            {emergency.actionText || t.emergencyDesc}
          </p>

          <div className="med-emergency-contacts-section">
            <h4>{t.emergencyHelplines}</h4>
            <div className="med-contacts-grid">
              <a href="tel:112" className="med-call-pill med-call-emergency">
                <PhoneCall size={18} />
                <div>
                  <strong>112</strong>
                  <small>National All-Emergency Helpline</small>
                </div>
              </a>
              <a href="tel:108" className="med-call-pill med-call-ambulance">
                <PhoneCall size={18} />
                <div>
                  <strong>108</strong>
                  <small>Disaster & Medical Ambulance</small>
                </div>
              </a>
              <a href="tel:102" className="med-call-pill med-call-102">
                <PhoneCall size={18} />
                <div>
                  <strong>102</strong>
                  <small>Maternity & Infant Emergency</small>
                </div>
              </a>
              <a href="tel:14416" className="med-call-pill med-call-telemanas">
                <PhoneCall size={18} />
                <div>
                  <strong>14416</strong>
                  <small>Tele-MANAS Mental Health Helpline</small>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="med-emergency-modal-footer">
          <div className="med-emergency-action-btns">
            <Link to="/patient/hospitals" className="med-btn-emergency-hospital">
              <Hospital size={18} />
              <span>{t.findNearbyHospital}</span>
            </Link>
            <Link to="/patient/doctors" className="med-btn-emergency-doctor">
              <Stethoscope size={18} />
              <span>{t.talkToDoctor}</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="med-btn-secondary med-dismiss-emergency-btn"
          >
            <ArrowLeft size={16} />
            <span>I entered an incorrect symptom (Revise)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
