import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import Violations from "./Violations";
import ContentTab from "./ContentTab";
import ExportModal from "./ExportModal";
import { loadHistory, saveHistory, getDomain } from "../../utils";

export default function ScanPanel({ scanData, runScan, pageUrl, onViolationCount }) {
  const { status, errorMsg, violations, passes } = scanData;

  const [activeTab, setActiveTab]   = useState("violations");
  const [history, setHistory]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [contentStatus, setContentStatus] = useState("idle");

  // Listen for export trigger (could come from a future button elsewhere)
  useEffect(() => {
    const handler = () => setShowExport(true);
    window.addEventListener("al-open-export", handler);
    return () => window.removeEventListener("al-open-export", handler);
  }, []);

  // Reset content analysis when tab/page changes (parent resets scanData)
  useEffect(() => {
    if (status === "idle") {
      setContentAnalysis(null);
      setContentStatus("idle");
    }
  }, [status]);

  // Load history when domain changes / scan completes
  useEffect(() => {
    if (pageUrl) loadHistory(getDomain(pageUrl)).then(setHistory);
  }, [pageUrl, status]);

  // Save history + report violation count when scan finishes
  useEffect(() => {
    if (status !== "done") return;
    if (onViolationCount) onViolationCount(violations.length);

    const domain = getDomain(pageUrl);
    if (!domain) return;
    const entry = {
      date: new Date().toLocaleString(),
      total: violations.length,
      critical: violations.filter(v => v.impact === "critical").length,
      serious:  violations.filter(v => v.impact === "serious").length,
      instances: violations.reduce((s, v) => s + v.nodes.length, 0),
    };
    saveHistory(domain, entry).then(() => loadHistory(domain).then(setHistory));
  }, [status, violations, pageUrl, onViolationCount]);

  function runContentAnalysis() {
    setContentStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_CONTENT_ANALYSIS" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) { setContentStatus("error"); return; }
      setContentAnalysis(response);
      setContentStatus("done");
    });
  }

  const critCount = violations.filter(v => v.impact === "critical").length;
  const serCount  = violations.filter(v => v.impact === "serious").length;
  const passCount = passes.length;

  return (
    <div className="scan-panel">

      {/* Error */}
      {status === "error" && (
        <div className="empty-state">
          <Icon name="warning_amber" size={28} className={`empty-icon empty-icon--${errorMsg==="chrome_restricted" ? "muted" : "danger"}`} />
          <p className="empty-title">
            {errorMsg==="chrome_restricted" ? "Can't scan this page" : "Scan failed"}
          </p>
          <p className="empty-hint">
            {errorMsg==="chrome_restricted"
              ? "AccessLens can't run on Chrome's own pages. Go to any website and try again."
              : "Close this panel, navigate to the page, then click the AccessLens icon again."}
          </p>
          {errorMsg !== "chrome_restricted" && (
            <button className="btn-scan" onClick={runScan}>Try again</button>
          )}
        </div>
      )}

      {/* Scanning */}
      {status === "scanning" && (
        <div className="empty-state">
          <div className="spinner" />
          <p className="empty-title">Scanning…</p>
          <p className="empty-hint">Checking against WCAG 2.2 AA rules</p>
        </div>
      )}

      {/* Idle */}
      {status === "idle" && (
        <div className="scan-idle">
          <button className="btn-scan" onClick={runScan}>
            <Icon name="search" size={16} />
            Run scan
          </button>
          <div className="scan-info-card">
            <div className="scan-info-title">What we check</div>
            {[
              "Missing labels on forms and buttons",
              "Images with no description",
              "Headings in the wrong order",
              "Colour contrast on all text",
              "Keyboard navigation and focus order",
              "30+ WCAG 2.2 AA rules",
            ].map(t => (
              <div key={t} className="scan-info-item">
                <span className="scan-info-check">✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {status === "done" && (
        <>
          {/* Summary bar */}
          <div className="summary">
            <div className="summary-stat">
              <span className={`summary-num ${critCount > 0 ? "summary-num--critical" : "summary-num--zero"}`}>{critCount}</span>
              <span className="summary-label">Critical</span>
            </div>
            <div className="summary-stat">
              <span className={`summary-num ${serCount > 0 ? "summary-num--serious" : "summary-num--zero"}`}>{serCount}</span>
              <span className="summary-label">Serious</span>
            </div>
            <div className="summary-stat">
              <span className={`summary-num ${passCount > 0 ? "summary-num--pass" : "summary-num--zero"}`}>{passCount}</span>
              <span className="summary-label">Passed</span>
            </div>
            <div className="summary-actions">
              <button className="tool-btn" onClick={runScan}>Re-scan</button>
              <button className="tool-btn" onClick={() => setShowExport(true)}>Export</button>
              {history.length > 0 && (
                <button className="tool-btn tool-btn--icon" onClick={() => setShowHistory(p=>!p)} title="Scan history">⏱</button>
              )}
            </div>
          </div>

          {/* History */}
          {showHistory && (
            <div className="history-panel">
              <div className="history-title">{getDomain(pageUrl)} — scan history</div>
              {history.map((h, i) => {
                const lbl = h.critical>0?"Blocked":h.serious>0?"At risk":h.total===0?"Clear":"Minor";
                const tier = h.critical>0?"blocked":h.serious>0?"atrisk":h.total===0?"clear":"minor";
                return (
                  <div key={i} className="history-row">
                    <span className={`history-status history-status--${tier}`}>{lbl}</span>
                    <div className="history-info">
                      <div className="history-date">{h.date}{i===0?" (latest)":""}</div>
                      <div className="history-stats">{h.critical>0?`${h.critical} crit · `:""}{h.serious>0?`${h.serious} serious · `:""}{h.total} total</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subtabs */}
          <div className="subtabs">
            {[
              { id: "violations", label: "Issues",  count: violations.length > 0 ? violations.length : null },
              { id: "content",    label: "Content" },
            ].map(t => (
              <button
                key={t.id}
                className={`subtab ${activeTab===t.id?"subtab--active":""}`}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={activeTab===t.id}
              >
                {t.label}
                {t.count != null && (
                  <span className="subtab-count">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "violations" && (
            <Violations violations={violations} passCount={passCount} />
          )}

          {activeTab === "content" && (
            <ContentTab
              contentStatus={contentStatus}
              contentAnalysis={contentAnalysis}
              runContentAnalysis={runContentAnalysis}
            />
          )}

          {/* Export modal */}
          {showExport && (
            <ExportModal
              scanData={{
                violations,
                passes,
                dynamicIssues: scanData.dynamicIssues || [],
                url: pageUrl,
              }}
              tabOrderStops={null}
              onClose={() => setShowExport(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
