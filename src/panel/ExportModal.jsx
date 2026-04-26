import { useState } from "react";

const CHECKLIST_STORAGE_KEY = "accesslens_checklist_v1";

function loadChecklist() {
  // Read saved manual-checklist state from localStorage.
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ExportModal({ scanData, tabOrderStops, onClose }) {
  const { violations = [], passes = [], dynamicIssues = [], url } = scanData;

  // Track which sections should be included in the exported report.
  const [sections, setSections] = useState({
    violations: true,
    tabOrder: tabOrderStops !== null && tabOrderStops?.length > 0,
    dynamicErrors: dynamicIssues.length > 0,
    checklist: true,
    passed: false,
  });

  function toggle(key) {
    // Flip one section on/off.
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openPreview() {
    // Build a snapshot of data that the report page can render.
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
    };

    const reportUrl = chrome.runtime.getURL("report.html");

    // Save report payload for the preview tab to read.
    // chrome.storage.local is reliable across extension contexts.
    chrome.storage.local.set(
      { accesslens_report: JSON.stringify(reportData) },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Report save failed:",
            chrome.runtime.lastError.message,
          );
          return;
        }
        // Open the preview page only after data is saved.
        chrome.tabs.create({ url: reportUrl });
        onClose();
      },
    );
  }

  // UI metadata for each checkbox row in the export modal.
  const sectionOptions = [
    {
      key: "violations",
      label: "WCAG violations",
      desc: `${violations.length} rules · ${violations.reduce((s, v) => s + v.nodes.length, 0)} instances`,
    },
    {
      key: "tabOrder",
      label: "Tab order issues",
      desc:
        tabOrderStops?.length > 0
          ? `${tabOrderStops.filter((s) => s.hasPositiveTabindex || s.isAriaHiddenFocusable || !s.hasFocusRing).length} issues found`
          : "Run tab order map first",
      disabled: !tabOrderStops || tabOrderStops.length === 0,
    },
    {
      key: "dynamicErrors",
      label: "Dynamic ARIA errors",
      desc:
        dynamicIssues.length > 0
          ? `${dynamicIssues.length} issues detected`
          : "No dynamic issues detected",
      disabled: dynamicIssues.length === 0,
    },
    {
      key: "checklist",
      label: "Manual testing checklist",
      desc: (() => {
        // Show checklist progress in the modal.
        const cl = loadChecklist();
        const done = Object.values(cl).filter(Boolean).length;
        return `${done} of 22 items completed`;
      })(),
    },
    {
      key: "passed",
      label: "Passed checks",
      desc: `${passes.length} rules passed`,
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Export report</div>
            <div className="modal-sub">Choose what to include</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {sectionOptions.map((opt) => (
            <label
              key={opt.key}
              className={`export-option ${sections[opt.key] ? "export-option--checked" : ""} ${opt.disabled ? "export-option--disabled" : ""}`}
            >
              <input
                type="checkbox"
                checked={!!sections[opt.key]}
                disabled={opt.disabled}
                onChange={() => !opt.disabled && toggle(opt.key)}
                className="export-checkbox"
              />
              <div className="export-option-body">
                <div className="export-option-label">{opt.label}</div>
                <div className="export-option-desc">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="modal-footer">
          <p className="export-note">
            Opens a preview in a new tab. Use <strong>Save PDF</strong> or{" "}
            <strong>Download CSV</strong> from the top of that page.
          </p>
          <div className="modal-actions">
            <button className="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-scan"
              style={{ flex: 1 }}
              onClick={openPreview}
            >
              Open preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
