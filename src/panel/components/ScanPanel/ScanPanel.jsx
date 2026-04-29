import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import Violations from "./Violations";
import ContentTab from "./ContentTab";
import ExportModal from "./ExportModal";
import { loadHistory, saveHistory, getDomain } from "../../utils";

/* ScanPanel is the main screen you see when the "Scan" tab is active.
It handles four states: idle (before scan), scanning, done, and error.

PROPS from MainContent to App:
   scanData        — object holding the current scan state and results
   runScan         — function that tells the background script to start a scan
   pageUrl         — the web address of the page being inspected
   onViolationCount — function that updates the badge number on the Scan tab */

export default function ScanPanel({ scanData, runScan, pageUrl, onViolationCount }) {

  // pulls whats needed from the scanData object
  const { status, errorMsg, violations, passes } = scanData;

  // selected sub-tab in results view:  "violations" (issues) or "content"
  const [activeTab, setActiveTab] = useState("violations");

  // past scan results for this domain, loaded from storage
  const [history, setHistory] = useState([]);

  // history panel open/closed
  const [showHistory, setShowHistory] = useState(false);

  // export modal open/closed
  const [showExport, setShowExport] = useState(false);

  // results from the content analysis (reading level, etc.), and its loading state
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [contentStatus, setContentStatus] = useState("idle");

  // listens for a custom event that can open the export modal from anywhere in the app
  useEffect(() => {
    const handler = () => setShowExport(true);
    window.addEventListener("al-open-export", handler);
    return () => window.removeEventListener("al-open-export", handler);
  }, []);

  // when the scan resets to "idle" (e.g. user navigated to a new page),
  // clear out any old content analysis so it doesn't show stale data
  useEffect(() => {
    if (status === "idle") {
      setContentAnalysis(null);
      setContentStatus("idle");
    }
  }, [status]);

  // Load this domain's scan history whenever the page URL changes or a scan finishes
  useEffect(() => {
    if (pageUrl) loadHistory(getDomain(pageUrl)).then(setHistory);
  }, [pageUrl, status]);

  // After a scan finishes:
  //   1. Tell the parent how many violations were found (updates the tab badge)
  //   2. Save this scan as a new history entry for the current domain
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

  // Sends a message to the background script to run the content analysis,
  // then stores the result so ContentTab can display it
  function runContentAnalysis() {
    setContentStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_CONTENT_ANALYSIS" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) { setContentStatus("error"); return; }
      setContentAnalysis(response);
      setContentStatus("done");
    });
  }

  // Pre-count the numbers we show in the summary bar so the JSX stays clean
  const critCount = violations.filter(v => v.impact === "critical").length;
  const serCount  = violations.filter(v => v.impact === "serious").length;
  const passCount = passes.length;

  return (
    <div className="scan-panel">

      {/* ── Error state ─────────────────────────────────────────────────
          Shown when the scan couldn't run. Two flavors:
            - "chrome_restricted": the user is on a Chrome system page (can't inject)
            - anything else: something went wrong, offer a retry button          */}
      {status === "error" && (
        <div className="empty-state">
          <Icon
            name="warning_amber"
            size={28}
            className={`empty-icon empty-icon--${errorMsg === "chrome_restricted" ? "muted" : "danger"}`}
          />
          <p className="empty-title">
            {errorMsg === "chrome_restricted" ? "Can't scan this page" : "Scan failed"}
          </p>
          <p className="empty-hint">
            {errorMsg === "chrome_restricted"
              ? "AccessLens can't run on Chrome's own pages. Go to any website and try again."
              : "Close this panel, navigate to the page, then click the AccessLens icon again."}
          </p>
          {errorMsg !== "chrome_restricted" && (
            <button className="btn-scan" onClick={runScan}>Try again</button>
          )}
        </div>
      )}

      {/* ── Scanning state ──────────────────────────────────────────────
          Shown while the scan is actively running in the background      */}
      {status === "scanning" && (
        <div className="empty-state">
          <div className="spinner" />
          <p className="empty-title">Scanning…</p>
          <p className="empty-hint">Checking against WCAG 2.2 AA rules</p>
        </div>
      )}

      {/* ── Idle state ──────────────────────────────────────────────────
          Shown before the first scan. Displays the Run Scan button and
          a card listing what AccessLens checks for.                      */}
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

      {/* ── Done state ──────────────────────────────────────────────────
          Shown after a scan completes. Contains four sections:
            1. Summary bar    — quick count of critical, serious, and passed
            2. History panel  — collapsible list of past scans for this domain
            3. Subtabs        — switch between "Issues" and "Content" views
            4. Active panel   — either Violations or ContentTab                */}
      {status === "done" && (
        <>
          {/* 1. Summary bar — three stat columns + action buttons */}
          <div className="summary">
            <div className="summary-stat">
              <span className={`summary-num ${critCount > 0 ? "summary-num--critical" : "summary-num--zero"}`}>
                {critCount}
              </span>
              <span className="summary-label">Critical</span>
            </div>
            <div className="summary-stat">
              <span className={`summary-num ${serCount > 0 ? "summary-num--serious" : "summary-num--zero"}`}>
                {serCount}
              </span>
              <span className="summary-label">Serious</span>
            </div>
            <div className="summary-stat">
              <span className={`summary-num ${passCount > 0 ? "summary-num--pass" : "summary-num--zero"}`}>
                {passCount}
              </span>
              <span className="summary-label">Passed</span>
            </div>
            <div className="summary-actions">
              <button className="tool-btn" onClick={runScan}>Re-scan</button>
              <button className="tool-btn" onClick={() => setShowExport(true)}>Export</button>
              {/* Only show the history button if there are past scans to display */}
              {history.length > 0 && (
                <button
                  className="tool-btn tool-btn--icon"
                  onClick={() => setShowHistory(p => !p)}
                  title="Scan history"
                >⏱</button>
              )}
            </div>
          </div>

          {/* 2. History panel — collapses in and out when the clock button is clicked */}
          {showHistory && (
            <div className="history-panel">
              <div className="history-title">{getDomain(pageUrl)} — scan history</div>
              {history.map((h, i) => {
                // Pick a human-readable label and a CSS modifier based on severity
                const lbl  = h.critical > 0 ? "Blocked" : h.serious > 0 ? "At risk" : h.total === 0 ? "Clear" : "Minor";
                const tier = h.critical > 0 ? "blocked" : h.serious > 0 ? "atrisk"  : h.total === 0 ? "clear"  : "minor";
                return (
                  <div key={i} className="history-row">
                    <span className={`history-status history-status--${tier}`}>{lbl}</span>
                    <div className="history-info">
                      <div className="history-date">{h.date}{i === 0 ? " (latest)" : ""}</div>
                      <div className="history-stats">
                        {h.critical > 0 ? `${h.critical} crit · ` : ""}
                        {h.serious  > 0 ? `${h.serious} serious · ` : ""}
                        {h.total} total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Subtabs — Issues shows violations, Content shows reading level etc. */}
          <div className="subtabs">
            {[
              { id: "violations", label: "Issues",  count: violations.length > 0 ? violations.length : null },
              { id: "content",    label: "Content" },
            ].map(t => (
              <button
                key={t.id}
                className={`subtab ${activeTab === t.id ? "subtab--active" : ""}`}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={activeTab === t.id}
              >
                {t.label}
                {/* Red count badge — only shown on the Issues tab when there are violations */}
                {t.count != null && (
                  <span className="subtab-count">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* 4. Active panel — swap between the two sub-views */}
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

          {/* Export modal — rendered on top of everything when showExport is true */}
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
