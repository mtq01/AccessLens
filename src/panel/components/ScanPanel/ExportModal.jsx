import { useState } from "react";
import { Icon } from "../Icon";

const CHECKLIST_STORAGE_KEY = "accesslens_checklist_v1";
const FOCUS_LOG_KEY = "accesslens_focus_log_v1";

function loadChecklist() {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function loadFocusLog() {
  try {
    const raw = localStorage.getItem(FOCUS_LOG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function ExportModal({ scanData, tabOrderStops, onClose }) {
  const { violations = [], passes = [], dynamicIssues = [], url } = scanData;
  const focusLog = loadFocusLog();

  // Default sensible: include things that have data
  const [sections, setSections] = useState({
    violations: violations.length > 0,
    tabOrder: tabOrderStops !== null && tabOrderStops?.length > 0,
    dynamicErrors: dynamicIssues.length > 0,
    focusLog: focusLog !== null && focusLog.length > 0,
    checklist: true,
    passed: false,
  });

  function toggle(key) {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function openPreview() {
    const checklist = loadChecklist();
    const reportData = {
      url: url || document.title || "Unknown page",
      scanDate: new Date().toLocaleString(),
      sections,
      violations,
      passes,
      tabOrderStops: tabOrderStops || [],
      dynamicIssues,
      checklist,
      focusLog: focusLog || [],
    };

    const reportUrl = chrome.runtime.getURL("report.html");
    chrome.storage.local.set({ accesslens_report: JSON.stringify(reportData) }, () => {
      if (chrome.runtime.lastError) {
        console.error("Report save failed:", chrome.runtime.lastError.message);
        return;
      }
      chrome.tabs.create({ url: reportUrl });
      onClose();
    });
  }

  const checklistDone = Object.values(loadChecklist()).filter(Boolean).length;
  const violationInstances = violations.reduce((s,v) => s + v.nodes.length, 0);

  const sectionOptions = [
    {
      key: "violations",
      label: "WCAG violations",
      detail: violations.length > 0
        ? `${violations.length} ${violations.length === 1 ? 'rule' : 'rules'} · ${violationInstances} ${violationInstances === 1 ? 'instance' : 'instances'}`
        : "No violations to include",
      disabled: violations.length === 0,
      icon: "warning_amber",
    },
    {
      key: "tabOrder",
      label: "Tab order issues",
      detail: tabOrderStops?.length > 0
        ? `${tabOrderStops.length} keyboard stops mapped`
        : "Run tab order map first to include this",
      disabled: !tabOrderStops || tabOrderStops.length === 0,
      icon: "account_tree",
    },
    {
      key: "dynamicErrors",
      label: "Dynamic ARIA errors",
      detail: dynamicIssues.length > 0
        ? `${dynamicIssues.length} ${dynamicIssues.length === 1 ? 'issue' : 'issues'} detected`
        : "No dynamic issues detected",
      disabled: dynamicIssues.length === 0,
      icon: "bolt",
    },
    {
      key: "focusLog",
      label: "Focus ring test log",
      detail: focusLog && focusLog.length > 0
        ? `${focusLog.length} keyboard stop${focusLog.length === 1 ? "" : "s"} recorded`
        : "Run a keyboard focus test first to include this",
      disabled: !focusLog || focusLog.length === 0,
      icon: "keyboard",
    },
    {
      key: "checklist",
      label: "Manual testing checklist",
      detail: `${checklistDone} of 22 items completed`,
      icon: "checklist",
    },
    {
      key: "passed",
      label: "Passed checks",
      detail: `${passes.length} ${passes.length === 1 ? 'rule' : 'rules'} passed automated checks`,
      icon: "check_circle",
    },
  ];

  const includedCount = Object.values(sections).filter(Boolean).length;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="modal modal--export" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="modal-header">
          <div>
            <h2 id="export-modal-title" className="modal-title">Build your report</h2>
            <p className="modal-sub">Pick what to include. We'll open a preview you can save as PDF or CSV.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close export dialog">
            <Icon name="close" size={20} />
          </button>
        </header>

        {/* Body — sections */}
        <div className="modal-body">
          <div className="export-sections" role="group" aria-label="Report sections">
            {sectionOptions.map(opt => {
              const checked = !!sections[opt.key];
              const disabled = opt.disabled;
              return (
                <label
                  key={opt.key}
                  className={`export-row ${checked ? "export-row--checked" : ""} ${disabled ? "export-row--disabled" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => !disabled && toggle(opt.key)}
                    className="export-checkbox"
                    aria-describedby={`export-${opt.key}-detail`}
                  />
                  <div className="export-row-icon">
                    <Icon name={opt.icon} size={20} />
                  </div>
                  <div className="export-row-text">
                    <div className="export-row-label">{opt.label}</div>
                    <div className="export-row-detail" id={`export-${opt.key}-detail`}>{opt.detail}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="modal-footer">
          <span className="modal-counter">
            {includedCount} of {sectionOptions.length} sections selected
          </span>
          <div className="modal-actions">
            <button className="btn-cancel-modal" onClick={onClose}>Cancel</button>
            <button
              className="btn-scan"
              onClick={openPreview}
              disabled={includedCount === 0}
              aria-label={`Open report preview with ${includedCount} sections`}
            >
              Open preview
              <Icon name="open_in_new" size={16} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
