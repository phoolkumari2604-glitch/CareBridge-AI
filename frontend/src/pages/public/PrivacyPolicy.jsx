import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Lock, Database, Eye, CheckCircle2 } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#07111f] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition">
            <ArrowLeft size={18} />
            <span>Return to CareBridge AI</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            DPDP Act 2023 & HIPAA Compliant
          </span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 grid place-items-center">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Clinical Data Protection & Privacy Governance</p>
          </div>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-slate-300">
          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Database size={18} className="text-cyan-400" />
              1. What Health & Personal Data We Collect
            </h2>
            <p>
              Under the Digital Personal Data Protection Act, 2023 (DPDP Act) and international healthcare data protection frameworks, CareBridge AI collects personal identifiers (name, email, phone number) and health metrics (vitals, OPD tokens, appointment histories, medical notes) exclusively for clinical workflow optimization, patient triage, and healthcare delivery.
            </p>
          </section>

          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Lock size={18} className="text-cyan-400" />
              2. Data Encryption and Biometrics Security
            </h2>
            <p>
              All personal data and Protected Health Information (PHI) are encrypted at rest (AES-256) and in transit (TLS 1.3). Biometric data (face verification descriptors and WebAuthn platform tokens) are converted to one-way mathematical embeddings and platform handles; raw biometric images are never permanently stored without explicit consent.
            </p>
          </section>

          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Eye size={18} className="text-cyan-400" />
              3. Data Principal Rights (Access, Correction, Erasure)
            </h2>
            <p>
              As a Data Principal under the DPDP Act 2023, you have the right to access a summary of your health data, request correction of inaccurate records, withdraw consent, and request account erasure, subject to mandatory medical statutory retention laws.
            </p>
          </section>

          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2">4. Data Protection Officer (DPO) Contact</h2>
            <p>
              To exercise any of your privacy rights or submit inquiries regarding clinical data handling:
            </p>
            <div className="mt-3 p-4 bg-slate-900 rounded-xl border border-slate-700 text-sm">
              <p className="font-semibold text-white">CareBridge AI Privacy & Compliance Office</p>
              <p className="text-slate-300">Data Protection Officer: Phool Kumari</p>
              <p className="text-cyan-400 mt-1">
                Email: <a href="mailto:phoolkumari2603@gmail.com" className="hover:underline">phoolkumari2603@gmail.com</a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} CareBridge AI. All rights reserved.</span>
          <Link to="/terms" className="text-cyan-400 hover:underline">
            Terms of Service &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
