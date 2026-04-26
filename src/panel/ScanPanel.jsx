import { Icon } from "./icons";
import { useState, useEffect } from "react";
import { getViolationContext } from "./violationContext";
import ExportModal from "./ExportModal";

// Main scan tab: run checks, show issues, and open export.

// ── Scan history ──────────────────────────────────────────────────────────────

const HISTORY_KEY = "accesslens_history";
const MAX_HISTORY = 5;

function loadHistory(domain) {
  return new Promise((resolve) => {
    chrome.storage.local.get(HISTORY_KEY, (result) => {
      const all = result[HISTORY_KEY] || {};
      resolve(all[domain] || []);
    });
  });
}

function saveHistory(domain, entry) {
  return new Promise((resolve) => {
    chrome.storage.local.get(HISTORY_KEY, (result) => {
      const all = result[HISTORY_KEY] || {};
      const prev = all[domain] || [];
      all[domain] = [entry, ...prev].slice(0, MAX_HISTORY);
      chrome.storage.local.set({ [HISTORY_KEY]: all }, resolve);
    });
  });
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "unknown";
  }
}
const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"];
const IMPACT_META = {
  critical: { label: "Critical", color: "var(--red)",        bg: "var(--red-bg)"   },
  serious:  { label: "Serious",  color: "var(--amber)",      bg: "var(--amber-bg)" },
  moderate: { label: "Moderate", color: "var(--blue)",       bg: "var(--blue-bg)"  },
  minor:    { label: "Minor",    color: "var(--text-muted)", bg: "var(--bg3)"      },
};

const RULE_TO_TYPE = {
  "image-alt": "Images",
  "input-image-alt": "Images",
  "area-alt": "Images",
  "object-alt": "Images",
  "video-caption": "Images",
  "audio-caption": "Images",

  label: "Forms",
  "label-content-name-mismatch": "Forms",
  "select-name": "Forms",
  "autocomplete-valid": "Forms",
  "error-message": "Forms",
  "link-name": "Forms",
  "button-name": "Forms",
  "identical-links-same-purpose": "Forms",
  "aria-input-field-name": "Forms",
  "aria-toggle-field-name": "Forms",
  "aria-command-name": "Forms",

  keyboard: "Keyboard",
  "focus-trap": "Keyboard",
  tabindex: "Keyboard",
  "scrollable-region-focusable": "Keyboard",
  "focus-visible": "Keyboard",
  "focus-order-semantics": "Keyboard",
  "target-size": "Keyboard",
  "target-size-2": "Keyboard",
  bypass: "Keyboard",
  "skip-link": "Keyboard",

  "html-has-lang": "Structure",
  "html-lang-valid": "Structure",
  "valid-lang": "Structure",
  "duplicate-id": "Structure",
  "duplicate-id-active": "Structure",
  "duplicate-id-aria": "Structure",
  "aria-allowed-attr": "Structure",
  "aria-needd-attr": "Structure",
  "aria-needd-children": "Structure",
  "aria-needd-parent": "Structure",
  "aria-roles": "Structure",
  "aria-valid-attr": "Structure",
  "aria-valid-attr-value": "Structure",
  "aria-hidden-body": "Structure",
  "aria-hidden-focus": "Structure",
  "document-title": "Structure",
  "heading-order": "Structure",
  region: "Structure",
  "landmark-one-main": "Structure",
  list: "Structure",
  listitem: "Structure",
  "definition-list": "Structure",
  dlitem: "Structure",
  "th-has-data-cells": "Structure",
  "td-headers-attr": "Structure",
  "scope-attr-valid": "Structure",
  "frame-title": "Structure",
  reflow: "Structure",
  "text-spacing": "Structure",
  "meta-viewport": "Structure",

  "color-contrast": "Color",
  "color-contrast-enhanced": "Color",
  "non-text-contrast": "Color",
};

function getViolationType(v) {
  return RULE_TO_TYPE[v.id] || "Other";
}

function getRelativeTime(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch {
    return dateStr;
  }
}

function ViolationChevron({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      style={{ color: "var(--text-faint)", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}>
      <path d="M2.5 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Tab order panel ───────────────────────────────────────────────────────────

// ── Tab order issue guidance ───────────────────────────────────────────────────

const TAB_ISSUE_GUIDANCE = {
  noFocusRing: {
    title: "No visible focus ring",
    why: "Keyboard users rely on the focus ring to know which element is currently active. Without it, keyboard users have no way to tell which element is active. This affects anyone who can't use a mouse.",
    fix: `/* Never do this - this removes the focus indicator */
:focus { outline: none; }

/* Option 1: Use a custom styled focus ring */
:focus-visible {
  outline: 3px solid #4f8ef7;
  outline-offset: 3px;
  border-radius: 2px;
}

/* Option 2: Use box-shadow instead of outline (works with border-radius) */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px #4f8ef7;
}

/* Note: Use :focus-visible not :focus so the ring only
   shows for keyboard users, not mouse clicks */`,
    links: [
      {
        label: "WCAG 2.4.11",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance",
      },
      {
        label: "MDN: :focus-visible",
        url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible",
      },
    ],
  },
  positiveTabindex: {
    title: "Positive tabindex breaks tab order",
    why: 'Positive tabindex values (tabindex="1", tabindex="2", etc.) create a custom tab sequence that overrides the natural DOM order. This almost always creates a confusing, unpredictable experience — elements jump around instead of flowing in order.',
    fix: `<!-- Never use positive tabindex values -->
<button tabindex="2">This causes problems</button>
<button tabindex="1">Tab order is now unpredictable</button>

<!-- Fix: Remove tabindex entirely -->
<button>First in DOM = first in tab order</button>
<button>Second in DOM = second in tab order</button>

<!-- Only two valid tabindex values:
  tabindex="0" 
  tabindex="-1" -->
<div role="button" tabindex="0">Custom interactive element</div>`,
    links: [
      {
        label: "WCAG 2.4.3",
        url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order",
      },
      {
        label: "MDN",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex",
      },
    ],
  },
  ariaHiddenFocusable: {
    title: "aria-hidden element receives keyboard focus",
    why: 'aria-hidden="true" hides an element from screen readers, but keyboard focus can still land on it. This creates invisible "ghost" focus stops — a keyboard user presses Tab but the screen reader says nothing. Very confusing.',
    fix: `<!-- Problem: hidden from AT but still keyboard focusable -->
<div aria-hidden="true">
  <button>Ghost button. Keyboard can reach it but screen reader ignores it</button>
</div>

<!-- Fix 1: Add inert attribute to block all interaction -->
<div aria-hidden="true" inert>
  <button>Now fully hidden from both keyboard and AT</button>
</div>

<!-- Fix 2: Also add tabindex="-1" to all focusable children -->
<div aria-hidden="true">
  <button tabindex="-1">No longer keyboard reachable</button>
</div>

<!-- Fix 3: If content should be accessible, remove aria-hidden -->
<div>
  <button>Fully visible and accessible</button>
</div>`,
    links: [
      {
        label: "WCAG 4.1.2",
        url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value",
      },
      {
        label: "MDN",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert",
      },
    ],
  },
};

function getIssueType(stop) {
  if (stop.isAriaHiddenFocusable) return "ariaHiddenFocusable";
  if (stop.hasPositiveTabindex) return "positiveTabindex";
  if (!stop.hasFocusRing) return "noFocusRing";
  return null;
}

function TabStopDetail({ stop }) {
  const [detailTab, setDetailTab] = useState("why");
  const issueType = getIssueType(stop);
  if (!issueType) return null;
  const guidance = TAB_ISSUE_GUIDANCE[issueType];

  return (
    <div className="tab-stop-detail">
      <div className="detail-tabs">
        <button
          className={`detail-tab ${detailTab === "why" ? "detail-tab--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setDetailTab("why");
          }}
        >
          Why it matters
        </button>
        <button
          className={`detail-tab ${detailTab === "fix" ? "detail-tab--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setDetailTab("fix");
          }}
        >
          How to fix
        </button>
      </div>
      {detailTab === "why" && (
        <div className="tab-stop-detail-body">
          <p className="detail-why">{guidance.why}</p>
          <div className="detail-links">
            {guidance.links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="detail-link-icon">↗</span>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
      {detailTab === "fix" && (
        <div className="tab-stop-detail-body">
          <pre className="detail-code">
            <code>{guidance.fix}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function TabOrderPanel({ stops, selectedStop, onStopClick, onClose }) {
  const [expandedStop, setExpandedStop] = useState(null);
  const issues = stops.filter(
    (s) => s.hasPositiveTabindex || s.isAriaHiddenFocusable || !s.hasFocusRing,
  );

  function getStopColour(stop) {
    if (stop.isAriaHiddenFocusable) return "#E24B4A";
    if (stop.hasPositiveTabindex) return "#EF9F27";
    if (!stop.hasFocusRing) return "#C2410C";
    return "#4f8ef7";
  }

  function getStopFlag(stop) {
    if (stop.isAriaHiddenFocusable) return "⚠ aria-hidden but focusable";
    if (stop.hasPositiveTabindex)
      return `⚠ tabindex="${stop.tabindex}": breaks tab order`;
    if (!stop.hasFocusRing) return "⚠ no visible focus ring";
    return null;
  }

  function handleRowClick(stop) {
    const issueType = getIssueType(stop);
    if (issueType) {
      // Toggle detail panel; also scroll to element
      setExpandedStop((prev) => (prev === stop.index ? null : stop.index));
    }
    onStopClick(stop);
  }

  return (
    <div className="tab-order-panel">
      <div className="tab-order-header">
        <div className="tab-order-header-left">
          <span className="tab-order-title">
            <Icon name="account_tree" size={14} style={{ marginRight: 4 }} />
            Tab order map
          </span>
          <span className="tab-order-count">
            {stops.length} focusable elements
          </span>
        </div>
        <button className="btn-stop" onClick={onClose}>
          Clear
        </button>
      </div>

      <div className="tab-order-howto">
        <span className="howto-icon">
          <Icon name="lightbulb" size={16} />
        </span>
        <span>
          Numbered badges are on the page. <strong>Click a flagged row</strong>{" "}
          to scroll to the element and see how to fix it.
        </span>
      </div>

      {issues.length > 0 ? (
        <div className="tab-order-issues-bar">
          ⚠ {issues.length} issue{issues.length !== 1 ? "s" : ""}. Click any
          flagged row for help
        </div>
      ) : (
        <div className="tab-order-ok-bar">✓ No tab order issues detected</div>
      )}

      <div className="tab-order-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#4f8ef7" }} />
          Normal
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#EF9F27" }} />
          Positive tabindex
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#E24B4A" }} />
          aria-hidden bug
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#C2410C" }} />
          No focus ring
        </span>
      </div>

      <div className="tab-order-list">
        {stops.map((stop) => {
          const flag = getStopFlag(stop);
          const color = getStopColour(stop);
          const isSelected = selectedStop === stop.index;
          const isExpanded = expandedStop === stop.index;
          const hasIssue = !!getIssueType(stop);

          return (
            <div key={stop.index} className="tab-stop-item">
              <button
                className={`tab-stop-row ${isSelected ? "tab-stop-row--active" : ""} ${flag ? "tab-stop-row--issue" : ""}`}
                onClick={() => handleRowClick(stop)}
                title={
                  hasIssue
                    ? "Click to see how to fix this issue"
                    : "Click to scroll to this element"
                }
              >
                <span className="tab-stop-num" style={{ background: color }}>
                  {stop.index}
                </span>
                <div className="tab-stop-info">
                  <span className="tab-stop-label">{stop.label}</span>
                  {flag && (
                    <span className="tab-stop-flag" style={{ color }}>
                      {flag}
                    </span>
                  )}
                </div>
                {hasIssue ? (
                  <span className="tab-stop-arrow" style={{ color }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                ) : (
                  <span className="tab-stop-arrow">↗</span>
                )}
              </button>
              {isExpanded && <TabStopDetail stop={stop} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Focus mode panel ──────────────────────────────────────────────────────────
function FocusModePanel({ onStop }) {
  const [stops, setStops] = useState([]);
  const [currentStop, setCurrentStop] = useState(null);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "FOCUS_UPDATE") {
        setCurrentStop(msg);
        setStops((prev) => [...prev, msg]);
      }
      if (msg.type === "FOCUS_MODE_STOPPED") onStop(stops);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [stops]);

  return (
    <div className="focus-mode-panel">
      <div className="focus-mode-header">
        <span className="focus-mode-title">
          <Icon name="keyboard" size={14} style={{ marginRight: 4 }} />
          Focus mode active
        </span>
        <button
          className="btn-stop"
          onClick={() => {
            chrome.runtime.sendMessage({ type: "STOP_FOCUS_MODE" });
          }}
        >
          Stop
        </button>
      </div>
      <p className="focus-mode-hint">
        Press <kbd>Tab</kbd> on the page to step through focus stops. Green =
        focus ring visible. Red = missing.
      </p>
      {currentStop && (
        <div className="focus-current">
          <span className="focus-stop-num">Stop #{currentStop.stopCount}</span>
          <span className="focus-stop-tag">
            {currentStop.tagName.toLowerCase()}
            {currentStop.id ? "#" + currentStop.id : ""}
          </span>
          <span
            className={`focus-ring-status ${currentStop.hasFocusRing ? "focus-ring--ok" : "focus-ring--bad"}`}
          >
            {currentStop.hasFocusRing ? "✓ Focus ring" : "✗ No focus ring"}
          </span>
        </div>
      )}
      {stops.length > 0 && (
        <div className="focus-stops-list">
          {stops.slice(-8).map((s, i) => (
            <div key={i} className="focus-stop-row">
              <span className="focus-stop-n">#{s.stopCount}</span>
              <span className="focus-stop-el">
                {s.tagName.toLowerCase()}
                {s.id ? "#" + s.id : ""}
              </span>
              <span className={s.hasFocusRing ? "focus-ok" : "focus-bad"}>
                {s.hasFocusRing ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// ── Rich violation detail ─────────────────────────────────────────────────────

function ViolationDetail({ violation }) {
  const ctx = getViolationContext(violation.id);
  const [activeTab, setActiveTab] = useState("why");

  return (
    <div className="violation-detail">
      {/* Detail tabs */}
      <div className="detail-tabs">
        {["why", "fix", "elements"].map((t) => (
          <button
            key={t}
            className={`detail-tab ${activeTab === t ? "detail-tab--active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "why"
              ? "Why it matters"
              : t === "fix"
                ? "How to fix"
                : `Elements (${violation.nodes.length})`}
          </button>
        ))}
      </div>

      {/* Why it matters */}
      {activeTab === "why" && (
        <div className="detail-body">
          <p className="detail-why">{ctx.why}</p>
          {ctx.links.length > 0 && (
            <div className="detail-links">
              {ctx.links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="detail-link"
                >
                  <span className="detail-link-icon">↗</span>
                  {l.label}
                </a>
              ))}
              {violation.helpUrl && (
                <a
                  href={violation.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="detail-link"
                >
                  <span className="detail-link-icon">↗</span>
                  axe-core rule documentation
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* How to fix */}
      {activeTab === "fix" && (
        <div className="detail-body">
          <pre className="detail-code">
            <code>{ctx.fix}</code>
          </pre>
        </div>
      )}

      {/* Affected elements */}
      {activeTab === "elements" && (
        <div className="detail-body">
          <div className="nodes-list">
            {violation.nodes.slice(0, 5).map((node, i) => (
              <div key={i} className="node-snippet">
                <div className="node-snippet-header">
                  <span className="node-num">#{i + 1}</span>
                  {node.target?.[0] && (
                    <span className="node-selector">
                      {node.target[0].slice(0, 60)}
                    </span>
                  )}
                </div>
                <code>
                  {node.html?.slice(0, 200)}
                  {node.html?.length > 200 ? "…" : ""}
                </code>
              </div>
            ))}
            {violation.nodes.length > 5 && (
              <p className="nodes-more">
                +{violation.nodes.length - 5} more instances
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScanPanel({
  tabId,
  devMode,
  devInterval,
  countdown,
  onToggleDevMode,
  onSelectInterval,
}) {
  // UI state for scan results and helper tools.
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [violations, setViolations] = useState([]);
  const [dynamicIssues, setDynamicIssues] = useState([]);
  const [passes, setPasses] = useState([]);
  const [activeSelector, setActiveSelector] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [impactFilter, setImpactFilter] = useState("all");
  const [jumped, setJumped] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [tabOrderStops, setTabOrderStops] = useState(null); // null=off, []=active
  const [selectedStop, setSelectedStop] = useState(null);
  const [zoomStatus, setZoomStatus] = useState("idle"); // idle|running|done
  const [zoomViolations, setZoomViolations] = useState([]);
  const [highContrast, setHighContrast] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [delta, setDelta] = useState(null); // {added, fixed}

  // Get the current page URL for the report
  useEffect(() => {
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (!chrome.runtime.lastError && tab?.url) setPageUrl(tab.url);
      });
    }
  }, [tabId]);

  // Pre-load history for the idle state once we know the domain
  useEffect(() => {
    if (pageUrl) {
      loadHistory(getDomain(pageUrl)).then(setHistory);
    }
  }, [pageUrl]);

  // Listen for tab switches
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") {
        setStatus("idle");
        setViolations([]);
        setPasses([]);
        setDynamicIssues([]);
        setDelta(null);
        setActiveSelector(null);
        setExpanded({});
        setZoomStatus("idle");
        setZoomViolations([]);
        setHighContrast(false);
        setFocusMode(false);
        setTabOrderStops(null);
        // Update URL for new tab
        if (msg.tabId) {
          chrome.tabs.get(msg.tabId, (tab) => {
            if (!chrome.runtime.lastError && tab?.url) setPageUrl(tab.url);
          });
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  async function runScan() {
    // Full manual scan started by button click.
    setStatus("scanning");
    setViolations([]);
    setPasses([]);
    setDynamicIssues([]);
    setActiveSelector(null);
    setExpanded({});
    setDelta(null);

    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        const err = response?.error || chrome.runtime.lastError?.message || "";
        setErrorMsg(
          err === "chrome_restricted" ? "chrome_restricted" : "inject_failed",
        );
        setStatus("error");
        return;
      }
      const sorted = [...response.violations].sort(
        (a, b) =>
          IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact),
      );
      setViolations(sorted);
      setPasses(response.passes || []);
      setDynamicIssues(response.dynamicIssues || []);
      setStatus("done");

      // Save history + compute delta
      const domain = getDomain(pageUrl);
      const prev = await loadHistory(domain);
      if (prev.length > 0) {
        const prevIds = new Set(prev[0].violationIds || []);
        const currIds = new Set(sorted.map((v) => v.id));
        const added = [...currIds].filter((id) => !prevIds.has(id)).length;
        const fixed = [...prevIds].filter((id) => !currIds.has(id)).length;
        if (added > 0 || fixed > 0) setDelta({ added, fixed });
      }

      const entry = {
        date: new Date().toLocaleString(),
        total: sorted.length,
        critical: sorted.filter((v) => v.impact === "critical").length,
        serious: sorted.filter((v) => v.impact === "serious").length,
        passes: (response.passes || []).length,
        instances: sorted.reduce((s, v) => s + v.nodes.length, 0),
        violationIds: sorted.map((v) => v.id),
      };
      await saveHistory(domain, entry);
      const updated = await loadHistory(domain);
      setHistory(updated);
    });
  }

  const [lastAutoScan, setLastAutoScan] = useState(null);

  // Auto-scan when countdown resets to devInterval (meaning it just ticked over)
  useEffect(() => {
    if (!devMode || countdown === null) return;
    // Fire when countdown equals devInterval (just reset) but not on first mount
    if (countdown === devInterval && lastAutoScan !== null) {
      triggerAutoScan();
    }
  }, [countdown, devMode]);

  // First auto-scan when dev mode turns on
  useEffect(() => {
    if (devMode) {
      setLastAutoScan(Date.now());
      triggerAutoScan();
    } else {
      chrome.runtime.sendMessage({ type: "SET_BADGE", text: "" });
    }
  }, [devMode]);

  function triggerAutoScan() {
    // Silent background scan used by Dev mode timer.
    setLastAutoScan(Date.now());
    // Silent scan — update results without full loading state reset
    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) return;
      const sorted = [...response.violations].sort(
        (a, b) =>
          IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact),
      );

      // Compute delta vs current violations
      setViolations((prev) => {
        const prevIds = new Set(prev.map((v) => v.id));
        const currIds = new Set(sorted.map((v) => v.id));
        const added = [...currIds].filter((id) => !prevIds.has(id)).length;
        const fixed = [...prevIds].filter((id) => !currIds.has(id)).length;
        return sorted;
      });
      setPasses(response.passes || []);
      setStatus("done");

      // Update extension badge with critical/serious count
      const critical = sorted.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      ).length;
      if (critical > 0) {
        chrome.runtime.sendMessage({
          type: "SET_BADGE",
          text: String(critical),
          color: "#E24B4A",
        });
      } else if (sorted.length > 0) {
        chrome.runtime.sendMessage({
          type: "SET_BADGE",
          text: String(sorted.length),
          color: "#EF9F27",
        });
      } else {
        chrome.runtime.sendMessage({
          type: "SET_BADGE",
          text: "✓",
          color: "#22c97a",
        });
      }

      // Save to history
      const domain = getDomain(pageUrl);
      const entry = {
        date: new Date().toLocaleString(),
        total: sorted.length,
        critical: sorted.filter((v) => v.impact === "critical").length,
        serious: sorted.filter((v) => v.impact === "serious").length,
        passes: (response.passes || []).length,
        instances: sorted.reduce((s, v) => s + v.nodes.length, 0),
        violationIds: sorted.map((v) => v.id),
      };
      await saveHistory(domain, entry);
      const updated = await loadHistory(domain);
      setHistory(updated);
    });
  }

  function handleViolationClick(v) {
    const selector = v.nodes?.[0]?.target?.[0];
    if (!selector) return;
    const isTargetSize = v.id?.includes("target-size");
    if (activeSelector === selector) {
      setActiveSelector(null);
      chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHT" });
    } else {
      setActiveSelector(selector);
      chrome.runtime.sendMessage({
        type: "HIGHLIGHT_ELEMENT",
        selector,
        showDimensions: isTargetSize,
      });
    }
  }

  function toggleExpanded(id) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  function handleJump(v, e) {
    e.stopPropagation();
    setJumped(v.id);
    setTimeout(() => setJumped(null), 2000);
    const selector = v.nodes?.[0]?.target?.[0];
    if (selector) {
      chrome.runtime.sendMessage({ type: "HIGHLIGHT_ELEMENT", selector, showDimensions: false });
    }
  }

  function startFocusMode() {
    setFocusMode(true);
    setTabOrderStops(null);
    chrome.runtime.sendMessage({ type: "START_FOCUS_MODE" });
  }
  function stopFocusMode() {
    setFocusMode(false);
  }

  function showTabOrder() {
    setFocusMode(false);
    setTabOrderStops(null);
    chrome.runtime.sendMessage({ type: "SHOW_TAB_ORDER" }, (response) => {
      if (response?.success) setTabOrderStops(response.stops);
    });
  }

  function clearTabOrder() {
    setTabOrderStops(null);
    setSelectedStop(null);
    chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHT" });
  }

  function handleStopClick(stop) {
    setSelectedStop(stop.index);
    chrome.runtime.sendMessage({
      type: "SCROLL_TO_STOP",
      stopIndex: stop.index,
    });
  }

  async function runZoomTest() {
    setZoomStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_ZOOM_TEST" }, (response) => {
      if (!response?.success) {
        setZoomStatus("idle");
        return;
      }
      // Only show NEW violations not in the normal scan
      const normalIds = new Set(violations.map((v) => v.id));
      const newViolations = response.violations.filter(
        (v) => !normalIds.has(v.id),
      );
      setZoomViolations(newViolations);
      setZoomStatus("done");
    });
  }

  function toggleHighContrast() {
    const next = !highContrast;
    setHighContrast(next);
    chrome.runtime.sendMessage({
      type: next ? "ENABLE_HIGH_CONTRAST" : "DISABLE_HIGH_CONTRAST",
    });
  }

  // Apply filters
  const filteredViolations = violations.filter((v) => {
    return impactFilter === "all" || v.impact === impactFilter;
  });

  const criticalCount = violations.filter(
    (v) => v.impact === "critical",
  ).length;
  const seriousCount = violations.filter((v) => v.impact === "serious").length;
  const likelyScreenReader = violations.filter((v) =>
    ["image-alt", "label", "button-name", "heading-order"].includes(v.id),
  ).length;
  const likelyKeyboard = violations.filter((v) =>
    ["bypass", "link-name", "keyboard", "focus-visible"].includes(v.id),
  ).length;
  const summaryUrgent = criticalCount > 0;
  const summaryText = summaryUrgent
    ? `${likelyScreenReader} issue${likelyScreenReader === 1 ? "" : "s"} blocking screen readers · ${likelyKeyboard} keyboard problem${likelyKeyboard === 1 ? "" : "s"}`
    : `No critical blockers - ${violations.length} lower-priority issue${violations.length === 1 ? "" : "s"} found`;

  return (
    <div className="scan-panel">
      {/* Tab order panel */}
      {tabOrderStops !== null && (
        <TabOrderPanel
          stops={tabOrderStops}
          selectedStop={selectedStop}
          onStopClick={handleStopClick}
          onClose={clearTabOrder}
        />
      )}

      {/* Export modal */}
      {showExport && (
        <ExportModal
          scanData={{ violations, passes, dynamicIssues, url: pageUrl }}
          tabOrderStops={tabOrderStops}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Focus mode panel */}
      {focusMode && <FocusModePanel onStop={stopFocusMode} />}

      {/* Summary */}
      {status === "done" && !focusMode && (
        <>
          <div
            style={{
              padding: "12px var(--px)",
              background: summaryUrgent ? "var(--red-bg)" : "var(--green-bg)",
              borderBottom: `1px solid ${summaryUrgent ? "var(--red-border)" : "var(--green-border)"}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>{summaryUrgent ? "⚠️" : "✅"}</span>
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: summaryUrgent ? "var(--red)" : "var(--green)",
                lineHeight: 1.4,
              }}
            >
              {summaryText}
            </span>
            <button
              className="btn-rerun"
              style={{
                marginLeft: "auto",
                borderColor: summaryUrgent
                  ? "var(--red-border)"
                  : "var(--green-border)",
                color: summaryUrgent ? "var(--red)" : "var(--green)",
              }}
              onClick={runScan}
            >
              Re-scan
            </button>
          </div>

          <div
            style={{
              padding: "10px var(--px)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              className="summary-pill"
              style={{
                background: "var(--red-bg)",
                borderColor: "var(--red-border)",
              }}
            >
              <span
                className="summary-pill__count"
                style={{ color: "var(--red)" }}
              >
                {criticalCount}
              </span>
              <span
                className="summary-pill__label"
                style={{ color: "var(--red)" }}
              >
                Critical
              </span>
            </div>
            <div
              className="summary-pill"
              style={{
                background: "var(--amber-bg)",
                borderColor: "var(--amber-border)",
              }}
            >
              <span
                className="summary-pill__count"
                style={{ color: "var(--amber)" }}
              >
                {seriousCount}
              </span>
              <span
                className="summary-pill__label"
                style={{ color: "var(--amber)" }}
              >
                Serious
              </span>
            </div>
            <div
              className="summary-pill"
              style={{
                background: "var(--green-bg)",
                borderColor: "var(--green-border)",
              }}
            >
              <span
                className="summary-pill__count"
                style={{ color: "var(--green)" }}
              >
                {passes.length}
              </span>
              <span
                className="summary-pill__label"
                style={{ color: "var(--green)" }}
              >
                Passed
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              className="btn-export"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowExport(true)}
            >
              Export
            </button>
            <button
              className={`summary-history-btn ${showHistory ? "summary-history-btn--active" : ""}`}
              onClick={() => setShowHistory((p) => !p)}
              title="Scan history"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                alignSelf: "auto",
                padding: "6px 9px",
              }}
            >
              <Icon name="history" size={16} />
            </button>
          </div>

          {delta && (
            <div className="delta-bar">
              {delta.added > 0 && (
                <span className="delta-added">↑ {delta.added} new</span>
              )}
              {delta.fixed > 0 && (
                <span className="delta-fixed">↓ {delta.fixed} fixed</span>
              )}
              <span className="delta-label">since last scan</span>
            </div>
          )}

          {/* History panel */}
          {showHistory && history.length > 0 && (
            <div className="history-panel">
              <div className="history-title">
                Past scans for {getDomain(pageUrl)}
              </div>
              {history.map((h, i) => {
                const critical = h.critical || 0;
                const serious = h.serious || 0;
                const statusColor =
                  critical > 0
                    ? "#E24B4A"
                    : serious > 0
                      ? "#EF9F27"
                      : h.total === 0
                        ? "#16a34a"
                        : "#4f8ef7";
                const statusLabel =
                  critical > 0
                    ? "Fix now"
                    : serious > 0
                      ? "Needs work"
                      : h.total === 0
                        ? "No violations"
                        : "Minor issues";
                return (
                  <div
                    key={i}
                    className={`history-row ${i === 0 ? "history-row--current" : ""}`}
                  >
                    <span
                      className="history-grade"
                      style={{
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {statusLabel}
                    </span>
                    <div className="history-info">
                      <span className="history-date">
                        {h.date}
                        {i === 0 ? " (newest)" : ""}
                      </span>
                      <span className="history-stats">
                        {critical > 0 && (
                          <span style={{ color: "#E24B4A" }}>
                            {critical} critical{" "}
                          </span>
                        )}
                        {serious > 0 && (
                          <span style={{ color: "#EF9F27" }}>
                            {serious} serious{" "}
                          </span>
                        )}
                        <span style={{ color: "var(--text3)" }}>
                          {h.total} problems
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showHistory && history.length === 0 && (
            <div className="history-panel">
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  padding: "8px 0",
                }}
              >
                No past scans for this site yet.
              </p>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="empty-state empty-state--error">
          {errorMsg === "chrome_restricted" ? (
            <>
              <div className="error-icon">
                <Icon name="block" size={28} />
              </div>
              <p>Can't scan Chrome's own pages</p>
              <p className="empty-hint">
                Open a normal website first, then click the AccessLens icon.
              </p>
            </>
          ) : (
            <>
              <div className="error-icon">
                <Icon name="warning_amber" size={28} />
              </div>
              <p>Scan failed</p>
              <p className="empty-hint">
                This can happen if the tab changed. Close this panel, go to the
                page you want, then open AccessLens again.
              </p>
              <button
                className="btn-scan"
                style={{
                  marginTop: 14,
                  maxWidth: 180,
                  background: "var(--red)",
                }}
                onClick={runScan}
              >
                ↺ Try again
              </button>
            </>
          )}
        </div>
      )}

      {/* Scanning */}
      {status === "scanning" && (
        <div className="empty-state">
          <span
            className="spinner"
            style={{ width: 20, height: 20, margin: "0 auto 8px" }}
          />
          <p>Scanning with axe-core...</p>
          <p className="empty-hint">
            Checking your page for accessibility issues.
          </p>
        </div>
      )}

      {/* Idle */}
      {status === "idle" && !focusMode && (
        <div className="scan-idle">
          {history.length > 0 && (
            <div className="history-card">
              <div className="history-card__header">
                <div>
                  <div className="history-card__ago">
                    Last scan · {getRelativeTime(history[0]?.date)}
                  </div>
                  <div className="history-card__url">{getDomain(pageUrl)}</div>
                </div>
                <button
                  className="history-card-view"
                  onClick={() => setShowHistory((p) => !p)}
                >
                  {showHistory ? "Hide" : "View"}
                </button>
              </div>
              <div className="history-card__pills">
                <div className="summary-pill">
                  <span
                    className="summary-pill__count"
                    style={{ color: "var(--red)" }}
                  >
                    {history[0]?.critical || 0}
                  </span>
                  <span className="summary-pill__label">Critical</span>
                </div>
                <div className="summary-pill">
                  <span
                    className="summary-pill__count"
                    style={{ color: "var(--amber)" }}
                  >
                    {history[0]?.serious || 0}
                  </span>
                  <span className="summary-pill__label">Serious</span>
                </div>
                <div className="summary-pill">
                  <span
                    className="summary-pill__count"
                    style={{ color: "var(--green)" }}
                  >
                    {history[0]?.passes || 0}
                  </span>
                  <span className="summary-pill__label">Passed</span>
                </div>
              </div>
            </div>
          )}

          <div className={`dev-card ${devMode ? "dev-card--active" : ""}`}>
            <div className="dev-card__header">
              <div>
                <div className="dev-card__title">Live scanning</div>
                <div className="dev-card__subtitle">
                  Auto-scan while you build
                </div>
              </div>
              <button
                className={`dev-toggle ${devMode ? "dev-toggle--active" : ""}`}
                onClick={onToggleDevMode}
              >
                <span className="dev-toggle__dot" />
                {devMode ? `Live · ${countdown}s` : "Off"}
              </button>
            </div>
            {devMode && (
              <div className="dev-intervals">
                <div className="dev-intervals__label">Scan every</div>
                <div className="dev-intervals__row">
                  {[10, 30, 60].map((seconds) => (
                    <button
                      key={seconds}
                      className={`dev-interval-pill ${devInterval === seconds ? "dev-interval-pill--active" : ""}`}
                      onClick={() => onSelectInterval(seconds)}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="btn-scan-cta" onClick={runScan}>
            Run new scan
          </button>

          <div className="idle-tools-section">
            <div className="idle-tools-label">Extra tools</div>
            <div className="tools-row">
              <button
                className={`tool-card${tabOrderStops !== null ? " tool-card--active" : ""}`}
                onClick={tabOrderStops !== null ? clearTabOrder : showTabOrder}
              >
                <span className="tool-card__emoji">⌨️</span>
                <span className="tool-card__label">Focus</span>
                <span className="tool-card__desc">{tabOrderStops !== null ? "On — click to clear" : "See where Tab goes"}</span>
              </button>
              <button
                className={`tool-card${zoomStatus !== "idle" ? " tool-card--active" : ""}`}
                onClick={runZoomTest}
              >
                <span className="tool-card__emoji">🔎</span>
                <span className="tool-card__label">Zoom</span>
                <span className="tool-card__desc">Test at 400%</span>
              </button>
              <button
                className={`tool-card${highContrast ? " tool-card--active" : ""}`}
                onClick={toggleHighContrast}
              >
                <span className="tool-card__emoji">◐</span>
                <span className="tool-card__label">HC</span>
                <span className="tool-card__desc">{highContrast ? "On — click to off" : "High contrast view"}</span>
              </button>
            </div>
          </div>

          {/* Zoom results — inline below tools */}
          {zoomStatus === "running" && (
            <div className="zoom-inline">
              <span className="spinner spinner--dark" style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span>Scanning at 320px width…</span>
            </div>
          )}
          {zoomStatus === "done" && (
            <div className="zoom-inline-results">
              <div className="zoom-inline-header">
                <span className="zoom-inline-title">
                  {zoomViolations.length === 0
                    ? "✓ No extra issues at 400% zoom"
                    : `${zoomViolations.length} issue${zoomViolations.length !== 1 ? "s" : ""} only at 400% zoom`}
                </span>
                <button className="zoom-inline-close" onClick={() => { setZoomStatus("idle"); setZoomViolations([]); }}>
                  Clear
                </button>
              </div>
              {zoomViolations.map((v) => {
                const impMeta = IMPACT_META[v.impact] || IMPACT_META.minor;
                return (
                  <div key={v.id} className="violation-card" onClick={() => handleViolationClick(v)}>
                    <div className="violation-card__inner">
                      <div className="violation-card__accent" style={{ background: impMeta.color }} />
                      <div className="violation-card__body">
                        <div className="violation-card__row1">
                          <span className="violation-badge" style={{ color: impMeta.color, background: impMeta.bg }}>
                            {impMeta.label}
                          </span>
                          <span className="violation-card__title">{v.description}</span>
                        </div>
                        <div className="violation-card__row2">zoom only</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* All clear */}
      {status === "done" && violations.length === 0 && (
        <div className="empty-state empty-state--success">
          <div className="empty-icon" style={{ color: "#1D9E75" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 16l4 4 8-8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p>No violations found. Nice work.</p>
        </div>
      )}

      {/* ── Violations tab ── */}
      {status === "done" && violations.length > 0 && (
        <>
          {/* Filter pills */}
          <div className="filter-bar">
            {[
              ["all", `All (${violations.length})`],
              ["critical", `Critical (${criticalCount})`],
              ["serious", `Serious (${seriousCount})`],
            ].map(([k, l]) => (
              <button
                key={k}
                className={`filter-btn ${impactFilter === k ? "filter-btn--active" : ""}`}
                onClick={() => setImpactFilter(k)}
              >
                {l}
              </button>
            ))}
          </div>

          {filteredViolations.length === 0 ? (
            <div className="empty-state">
              <p>No violations match the current filters.</p>
            </div>
          ) : (
            <div className="violations-list">
              {filteredViolations.map((v) => {
                const isOpen = expanded[v.id];
                const isJumped = jumped === v.id;
                const impMeta = IMPACT_META[v.impact] || IMPACT_META.minor;
                const sc = v.tags
                  ?.filter((t) => /^\d+\.\d+\.\d+$/.test(t))
                  .join(", ");
                return (
                  <div
                    key={v.id}
                    className={`violation-card${isOpen ? " violation-card--open" : ""}${isJumped ? " violation-card--jumped" : ""}`}
                    onClick={() => toggleExpanded(v.id)}
                  >
                    <div className="violation-card__inner">
                      <div
                        className="violation-card__accent"
                        style={{ background: impMeta.color }}
                      />
                      <div className="violation-card__body">
                        <div className="violation-card__row1">
                          <span
                            className="violation-badge"
                            style={{ color: impMeta.color, background: impMeta.bg }}
                          >
                            {impMeta.label}
                          </span>
                          <span className="violation-card__title">
                            {v.description}
                          </span>
                          <span className="violation-count">{v.nodes.length}×</span>
                          {isOpen && (
                            <button
                              className={`btn-jump${isJumped ? " btn-jump--jumped" : ""}`}
                              onClick={(e) => handleJump(v, e)}
                            >
                              {isJumped ? "✓ Jumped" : "Jump →"}
                            </button>
                          )}
                          <ViolationChevron open={isOpen} />
                        </div>
                        <div className="violation-card__row2">
                          {getViolationType(v)}{sc ? ` · WCAG ${sc}` : ""}
                        </div>
                        {isOpen && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <ViolationDetail violation={v} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
