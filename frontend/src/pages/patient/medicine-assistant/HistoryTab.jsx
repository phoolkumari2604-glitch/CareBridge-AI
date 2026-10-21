import React from "react";
import {
  Clock,
  Trash2,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Calendar,
  AlertCircle,
  Pill,
  HelpCircle
} from "lucide-react";

export default function HistoryTab({
  historyItems,
  onClearHistory,
  onReloadIntake,
  t
}) {
  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="med-history-empty-card med-fade-in">
        <HelpCircle size={40} className="med-text-muted" />
        <h3>{t.noHistory}</h3>
        <p>
          When you complete a symptom evaluation and click "Save to History", a permanent record of the clinical guidance and safety filters will appear here for future reference.
        </p>
      </div>
    );
  }

  return (
    <div className="med-history-container med-fade-in">
      <div className="med-history-header">
        <div>
          <h2>Evaluation History ({historyItems.length})</h2>
          <p className="med-card-subtitle">
            Past clinical symptom evaluations saved locally on this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="med-btn-clear-history"
          title={t.clearHistory}
        >
          <Trash2 size={15} />
          <span>{t.clearHistory}</span>
        </button>
      </div>

      <div className="med-history-list">
        {historyItems.map((item) => (
          <div key={item.id} className="med-history-card">
            <div className="med-history-card-top">
              <div className="med-history-date-row">
                <Calendar size={14} />
                <span>{item.dateFormatted || item.timestamp}</span>
              </div>
              <span className="med-history-badge">
                <ShieldCheck size={13} />
                <span>{item.suggestionsCount} Safe Options &middot; {item.excludedCount} Blocked</span>
              </span>
            </div>

            <div className="med-history-body">
              <div className="med-history-row">
                <strong>Symptoms Evaluated:</strong>
                <div className="med-history-symptom-tags">
                  {(item.intake?.symptoms || []).map((s) => (
                    <span key={s} className="med-history-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {item.suggestions && item.suggestions.length > 0 && (
                <div className="med-history-row">
                  <strong>Approved Medications:</strong>
                  <span className="med-history-meds-summary">
                    {item.suggestions.map((s) => s.generic_name).join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="med-history-footer">
              <button
                type="button"
                className="med-btn-reload-intake"
                onClick={() => onReloadIntake(item.intake)}
              >
                <RotateCcw size={14} />
                <span>Re-load Intake in Wizard</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
