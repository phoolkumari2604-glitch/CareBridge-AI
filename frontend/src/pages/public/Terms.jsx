import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2 } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#07111f] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition">
            <ArrowLeft size={18} />
            <span>Return to CareBridge AI</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Effective Date: October 2026
          </span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 grid place-items-center">
            <FileText size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Terms of Service</h1>
            <p className="text-sm text-slate-400">Clinical Platform Governance & Usage Agreement</p>
          </div>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-slate-300">
          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Shield size={18} className="text-cyan-400" />
              1. Overview and Acceptance
            </h2>
            <p>
              These Terms of Service govern your access to and use of CareBridge AI clinical decision support, hospital triage, digital OPD queueing, and health records management services. By accessing or registering for an account, you agree to be bound by these terms in accordance with applicable healthcare information and digital data governance regulations, including India's Digital Personal Data Protection Act, 2023 (DPDP Act).
            </p>
          </section>

          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Lock size={18} className="text-cyan-400" />
              2. Medical Disclaimer & AI Decision Support
            </h2>
            <p>
              CareBridge AI provides artificial intelligence assisted triage, physiological vitals monitoring, digital queue estimation, and preliminary symptom analysis. <strong>CareBridge AI is not a replacement for emergency medical intervention, clinical diagnosis, or immediate physician consultation.</strong> In life-threatening emergencies, patients and staff must immediately call local emergency services or visit the nearest emergency trauma center.
            </p>
          </section>

          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-cyan-400" />
              3. User Accounts and Role-Based Access Control (RBAC)
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. Staff, Doctors, and Administrators must adhere to hospital security protocols and multi-factor authentication requirements. Unauthorized access or sharing of clinical credentials is strictly prohibited and subject to immediate termination.
            </p>
          </section>

          <section className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-2">4. Data Governance & Contact</h2>
            <p>
              If you have any questions regarding these Terms or wish to exercise your data rights under the DPDP Act 2023, please contact our Data Protection Officer and Administrator:
            </p>
            <div className="mt-3 p-4 bg-slate-900 rounded-xl border border-slate-700 text-sm">
              <p className="font-semibold text-white">CareBridge AI Compliance & Support</p>
              <p className="text-slate-300">Admin Lead: Phool Kumari</p>
              <p className="text-cyan-400 mt-1">
                Email: <a href="mailto:phoolkumari2603@gmail.com" className="hover:underline">phoolkumari2603@gmail.com</a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} CareBridge AI. All rights reserved.</span>
          <Link to="/privacy" className="text-cyan-400 hover:underline">
            Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
