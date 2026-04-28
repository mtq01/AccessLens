import { Icon } from "./icons";
import { useState, useEffect, useRef } from "react";
import { getViolationContext } from "./violationContext";
import ExportModal from "./ExportModal";

// Main scan tab: run checks, show issues, and open export.

const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"];
const IMPACT_META = {
  critical: { label: "Critical", color: "var(--red)",        bg: "var(--red-bg)"   },
  serious:  { label: "Serious",  color: "var(--amber)",      bg: "var(--amber-bg)" },
  moderate: { label: "Moderate", color: "var(--blue)",       bg: "var(--blue-bg)"  },
  minor:    { label: "Minor",    color: "var(--text-muted)", bg: "var(--bg3)"      },
};

const PLAIN_ENGLISH = {
  "image-alt":                    "Images missing alt text",
  "input-image-alt":              "Image buttons missing alt text",
  "area-alt":                     "Image map areas missing alt text",
  "object-alt":                   "Embedded objects missing alt text",
  "video-caption":                "Videos missing captions",
  "audio-caption":                "Audio missing captions",
  label:                          "Form inputs without labels",
  "label-content-name-mismatch":  "Label text doesn't match accessible name",
  "select-name":                  "Dropdown menus without labels",
  "autocomplete-valid":           "Autocomplete attributes are incorrect",
  "link-name":                    "Links without a readable name",
  "button-name":                  "Buttons without a name",
  "identical-links-same-purpose": "Links with the same text go to different places",
  "aria-input-field-name":        "ARIA input fields without a name",
  "aria-toggle-field-name":       "ARIA toggle fields without a name",
  "aria-command-name":            "ARIA buttons without a name",
  keyboard:                       "Elements not usable by keyboard",
  "focus-trap":                   "Keyboard focus is trapped",
  tabindex:                       "Incorrect tabindex values",
  "scrollable-region-focusable":  "Scrollable area not keyboard accessible",
  "link-in-text-block":           "Links only tell apart by color",
  "focus-visible":                "Focus indicator not visible",
  "focus-order-semantics":        "Focus order doesn't make sense",
  "target-size":                  "Tap targets too small",
  "target-size-2":                "Tap targets too small",
  bypass:                         "No way to skip repeated content",
  "skip-link":                    "Skip link doesn't work",
  "html-has-lang":                "Page is missing a language",
  "html-lang-valid":              "Page language is invalid",
  "valid-lang":                   "Language attribute is invalid",
  "duplicate-id":                 "Duplicate element IDs",
  "duplicate-id-active":          "Duplicate IDs on interactive elements",
  "duplicate-id-aria":            "Duplicate IDs referenced by ARIA",
  "aria-allowed-attr":            "ARIA attributes not allowed on this element",
  "aria-required-attr":           "ARIA attributes missing required values",
  "aria-required-children":       "ARIA element missing required child elements",
  "aria-required-parent":         "ARIA element missing required parent",
  "aria-roles":                   "Invalid ARIA roles",
  "aria-valid-attr":              "Invalid ARIA attributes",
  "aria-valid-attr-value":        "Invalid ARIA attribute values",
  "aria-hidden-body":             "Page body is hidden from screen readers",
  "aria-hidden-focus":            "Hidden elements receiving keyboard focus",
  "document-title":               "Page is missing a title",
  "heading-order":                "Headings are in the wrong order",
  region:                         "Content outside landmark regions",
  "landmark-one-main":            "Page is missing a main landmark",
  list:                           "List elements used incorrectly",
  listitem:                       "List items outside a list",
  "definition-list":              "Definition list used incorrectly",
  dlitem:                         "Definition list items used incorrectly",
  "th-has-data-cells":            "Table headers without matching data cells",
  "td-headers-attr":              "Table cells with invalid header references",
  "scope-attr-valid":             "Table scope attributes are invalid",
  "frame-title":                  "Iframes missing a title",
  reflow:                         "Content doesn't reflow at small sizes",
  "text-spacing":                 "Content breaks with custom text spacing",
  "meta-viewport":                "Zoom is blocked on mobile",
  "color-contrast":               "Text with low color contrast",
  "color-contrast-enhanced":      "Text with low color contrast (AAA)",
  "non-text-contrast":            "UI elements with low contrast",
};

function getPlainDescription(v) {
  return PLAIN_ENGLISH[v.id] || v.description;
}

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

export default function ScanPanel({ tabId, onOpenChecklist, view = "scan" }) {
  // UI state for scan results and helper tools.
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [violations, setViolations] = useState([]);
  const [dynamicIssues, setDynamicIssues] = useState([]);
  const [passes, setPasses] = useState([]);
  const [activeSelector, setActiveSelector] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [activeNodeIndex, setActiveNodeIndex] = useState({});
  const [impactFilter, setImpactFilter] = useState("all");
  const [jumped, setJumped] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusDropdown, setFocusDropdown] = useState(false);
  const [tabOrderStops, setTabOrderStops] = useState(null); // null=off, []=active
  const [selectedStop, setSelectedStop] = useState(null);
  const [zoomStatus, setZoomStatus] = useState("idle"); // idle|running|done
  const [zoomViolations, setZoomViolations] = useState([]);
  const [highContrast, setHighContrast] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const focusDropdownRef = useRef(null);

  const pageHostname = (() => { try { return new URL(pageUrl).hostname; } catch { return ""; } })();

  // Get the current page URL for the report
  useEffect(() => {
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (!chrome.runtime.lastError && tab?.url) setPageUrl(tab.url);
      });
    }
  }, [tabId]);

  // Listen for tab switches
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") {
        setStatus("idle");
        setViolations([]);
        setPasses([]);
        setDynamicIssues([]);
        setActiveSelector(null);
        setExpanded({});
        setZoomStatus("idle");
        setZoomViolations([]);
        setHighContrast(false);
        setFocusMode(false);
        setFocusDropdown(false);
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

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!focusDropdownRef.current) return;
      if (!focusDropdownRef.current.contains(event.target)) {
        setFocusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function runScan() {
    // #region agent log
    fetch('http://127.0.0.1:7817/ingest/35212118-868a-4f72-a15e-51eeec724bfa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45f8c8'},body:JSON.stringify({sessionId:'45f8c8',runId:'focus-redesign-pre',hypothesisId:'H1',location:'ScanPanel.jsx:runScan:start',message:'runScan clicked',data:{status,focusMode,hasTabOrderStops:tabOrderStops!==null,selectedStop},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // Full manual scan started by button click.
    chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHT" });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStatus("scanning");
    setViolations([]);
    setPasses([]);
    setDynamicIssues([]);
    setActiveSelector(null);
    setExpanded({});

    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        // #region agent log
        fetch('http://127.0.0.1:7817/ingest/35212118-868a-4f72-a15e-51eeec724bfa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45f8c8'},body:JSON.stringify({sessionId:'45f8c8',runId:'focus-redesign-pre',hypothesisId:'H2',location:'ScanPanel.jsx:runScan:error',message:'runScan failed',data:{chromeError:chrome.runtime.lastError?.message||null,responseError:response?.error||null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const err = response?.error || chrome.runtime.lastError?.message || "unknown";
        setErrorMsg(err);
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
      // #region agent log
      fetch('http://127.0.0.1:7817/ingest/35212118-868a-4f72-a15e-51eeec724bfa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45f8c8'},body:JSON.stringify({sessionId:'45f8c8',runId:'focus-redesign-pre',hypothesisId:'H3',location:'ScanPanel.jsx:runScan:success',message:'runScan completed',data:{violationCount:sorted.length,focusMode,hasTabOrderStops:tabOrderStops!==null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    });
  }

  function highlightNode(v, index) {
    const selector = v.nodes?.[index]?.target?.[0];
    if (!selector) return;
    setActiveSelector(selector);
    chrome.runtime.sendMessage({
      type: "HIGHLIGHT_ELEMENT",
      selector,
      showDimensions: v.id?.includes("target-size"),
    });
  }

  function handleViolationClick(v) {
    const isOpen = expanded[v.id];
    if (isOpen) {
      setActiveSelector(null);
      chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHT" });
    } else {
      setActiveNodeIndex((p) => ({ ...p, [v.id]: 0 }));
      highlightNode(v, 0);
    }
  }

  function cycleNode(v, dir, e) {
    e.stopPropagation();
    setActiveNodeIndex((prev) => {
      const current = prev[v.id] ?? 0;
      const next = (current + dir + v.nodes.length) % v.nodes.length;
      highlightNode(v, next);
      return { ...prev, [v.id]: next };
    });
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
    // #region agent log
    fetch('http://127.0.0.1:7817/ingest/35212118-868a-4f72-a15e-51eeec724bfa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45f8c8'},body:JSON.stringify({sessionId:'45f8c8',runId:'focus-redesign-pre',hypothesisId:'H4',location:'ScanPanel.jsx:startFocusMode',message:'startFocusMode called',data:{status,hasTabOrderStops:tabOrderStops!==null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setFocusDropdown(false);
    setFocusMode(true);
    setTabOrderStops(null);
    chrome.runtime.sendMessage({ type: "START_FOCUS_MODE" });
  }
  function stopFocusMode() {
    setFocusMode(false);
  }

  function showTabOrder() {
    // #region agent log
    fetch('http://127.0.0.1:7817/ingest/35212118-868a-4f72-a15e-51eeec724bfa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45f8c8'},body:JSON.stringify({sessionId:'45f8c8',runId:'focus-redesign-pre',hypothesisId:'H5',location:'ScanPanel.jsx:showTabOrder:start',message:'showTabOrder called',data:{status,focusMode,hasTabOrderStops:tabOrderStops!==null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setFocusDropdown(false);
    setFocusMode(false);
    setTabOrderStops(null);
    chrome.runtime.sendMessage({ type: "SHOW_TAB_ORDER" }, (response) => {
      // #region agent log
      fetch('http://127.0.0.1:7817/ingest/35212118-868a-4f72-a15e-51eeec724bfa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45f8c8'},body:JSON.stringify({sessionId:'45f8c8',runId:'focus-redesign-pre',hypothesisId:'H5',location:'ScanPanel.jsx:showTabOrder:response',message:'showTabOrder response',data:{success:!!response?.success,stopCount:response?.stops?.length||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
  const summaryLevel = criticalCount > 0 ? "critical" : violations.length > 0 ? "minor" : "clear";
  const summaryText = summaryLevel === "critical"
    ? `${criticalCount} critical · ${seriousCount} serious`
    : summaryLevel === "minor"
      ? `${violations.length} minor issue${violations.length === 1 ? "" : "s"} · nothing critical`
      : "All clear — no issues found";
  const summaryColors = {
    critical: { bg: "var(--red-bg)",   border: "var(--red-border)",   text: "var(--red)",   icon: "⚠️" },
    minor:    { bg: "var(--amber-bg)", border: "var(--amber-border)", text: "var(--amber)", icon: "⚠️" },
    clear:    { bg: "var(--green-bg)", border: "var(--green-border)", text: "var(--green)", icon: "✅" },
  }[summaryLevel];

  if (view === "tools") {
    return (
      <div className="scan-panel tools-tab">
        {tabOrderStops !== null && (
          <TabOrderPanel
            stops={tabOrderStops}
            selectedStop={selectedStop}
            onStopClick={handleStopClick}
            onClose={clearTabOrder}
          />
        )}

        {focusMode && <FocusModePanel onStop={stopFocusMode} />}

        <div className="tools-tab__head">
          <h3 className="tools-tab__title">Extra tools</h3>
          <p className="tools-tab__lede">
            Keyboard, zoom, and high-contrast checks live here.
          </p>
        </div>

        <div className="tools-stack">
          <section className="tool-surface">
            <div className="tool-surface__head">
              <span className="tool-surface__title">Keyboard</span>
              <span className="tool-surface__meta">
                {focusMode ? "Step mode active" : tabOrderStops !== null ? "All stops shown" : "Ready"}
              </span>
            </div>
            <div className="focus-menu-wrap" ref={focusDropdownRef}>
              <button
                type="button"
                className={`focus-menu-btn${focusMode || tabOrderStops !== null ? " focus-menu-btn--active" : ""}`}
                onClick={() => setFocusDropdown((prev) => !prev)}
              >
                <span className="focus-menu-btn__icon">⌨</span>
                <span className="focus-menu-btn__label">Focus tools</span>
                <span className="focus-menu-btn__chev">▾</span>
              </button>
              {focusDropdown && (
                <div className="focus-menu-dropdown">
                  <button
                    type="button"
                    className="focus-menu-item"
                    onClick={startFocusMode}
                  >
                    <span className="focus-menu-item__icon">⌨</span>
                    <span>
                      <span className="focus-menu-item__title">Step through</span>
                      <span className="focus-menu-item__desc">
                        Press Tab to step through stops one by one
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="focus-menu-item"
                    onClick={showTabOrder}
                  >
                    <span className="focus-menu-item__icon">⬡</span>
                    <span>
                      <span className="focus-menu-item__title">Show all stops</span>
                      <span className="focus-menu-item__desc">
                        Number every focusable element at once
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="tool-surface">
            <div className="tool-surface__head">
              <span className="tool-surface__title">Visual checks</span>
            </div>
            <div className="tools-grid-2">
              <button
                className={`tool-card tool-card--compact${zoomStatus !== "idle" ? " tool-card--active" : ""}`}
                onClick={runZoomTest}
              >
                <span className="tool-card__emoji">🔎</span>
                <span className="tool-card__label">Zoom</span>
                <span className="tool-card__desc">Test at 400%</span>
              </button>
              <button
                className={`tool-card tool-card--compact${highContrast ? " tool-card--active" : ""}`}
                onClick={toggleHighContrast}
              >
                <span className="tool-card__emoji">◐</span>
                <span className="tool-card__label">High contrast</span>
                <span className="tool-card__desc">{highContrast ? "On — click to off" : "Preview HC mode"}</span>
              </button>
            </div>
          </section>
        </div>

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
    );
  }

  return (
    <div className="scan-panel">
      {/* Export modal */}
      {showExport && (
        <ExportModal
          scanData={{ violations, passes, dynamicIssues, url: pageUrl }}
          tabOrderStops={tabOrderStops}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Summary */}
      {status === "done" && !focusMode && (
        <>
          <div
            style={{
              padding: "12px var(--px)",
              background: summaryColors.bg,
              borderBottom: `1px solid ${summaryColors.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: "1rem" }}>{summaryColors.icon}</span>
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: summaryColors.text,
                lineHeight: 1.4,
              }}
            >
              {summaryText}
            </span>
            <button
              className="btn-rerun"
              style={{
                marginLeft: "auto",
                borderColor: summaryColors.border,
                color: summaryColors.text,
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
          </div>
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
          ) : errorMsg === "no_tab" ? (
            <>
              <div className="error-icon">
                <Icon name="warning_amber" size={28} />
              </div>
              <p>Scan failed</p>
              <p className="empty-hint">
                The page may have navigated or reloaded. Try scanning again.
              </p>
              <button
                className="btn-scan"
                style={{ marginTop: 14, maxWidth: 180, background: "var(--red)" }}
                onClick={runScan}
              >
                ↺ Try again
              </button>
            </>
          ) : (
            <>
              <div className="error-icon">
                <Icon name="warning_amber" size={28} />
              </div>
              <p>Scan failed</p>
              <p className="empty-hint">
                Something went wrong. Reload the page and try again.
              </p>
              <button
                className="btn-scan"
                style={{ marginTop: 14, maxWidth: 180, background: "var(--red)" }}
                onClick={runScan}
              >
                ↺ Try again
              </button>
            </>
          )}
        </div>
      )}

      {/* Scanning progress bar */}
      {status === "scanning" && (
        <div className="scan-progress-bar">
          <div className="scan-progress-bar__fill" />
        </div>
      )}

      {/* Scanning */}
      {status === "scanning" && (
        <div className="empty-state">
          <p>Scanning with axe-core...</p>
          <p className="empty-hint">
            Checking your page for accessibility issues.
          </p>
        </div>
      )}

      {/* Idle */}
      {status === "idle" && !focusMode && (
        <div className="scan-idle">
          <div className="idle-explainer">
              <div className="idle-explainer__plus">+</div>
              <div className="idle-explainer__title">Ready to check this page</div>
              <p className="idle-explainer__body">
                Click <strong>Run scan</strong>. We will look for things that make the page hard to use for some people.
              </p>
              <div className="idle-explainer__checklist">
                <div className="idle-explainer__checklist-title">What we check:</div>
                <ul className="idle-explainer__list">
                  <li>Missing labels on buttons and forms</li>
                  <li>Pictures with no description</li>
                  <li>Links that say "click here"</li>
                  <li>Headings in the wrong order</li>
                  <li>Many other rules from WCAG</li>
                </ul>
              </div>
              <p className="idle-explainer__footer">
                After scanning, use <strong>Focus</strong> to test the keyboard, <strong>Zoom</strong> to test 400% size, or <strong>HC</strong> for high contrast.
              </p>
          </div>

          <button className="btn-scan-cta" onClick={runScan}>
            Run new scan
          </button>

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
          <p>No violations found. Nice work!</p>
          <p className="empty-hint" style={{ marginTop: 8 }}>
            No tool catches everything — try the{" "}
            <button className="link-btn" onClick={onOpenChecklist}>Checklist</button>{" "}
            for a manual review.
          </p>
        </div>
      )}

      {/* ── Violations list ── */}
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
              <div className="issues-header">
                <div>
                  <span className="issues-header__title">Open Issues</span>
                  {pageHostname && <span className="issues-header__url">{pageHostname}</span>}
                </div>
                <span className="issues-header__count">{filteredViolations.length} result{filteredViolations.length !== 1 ? "s" : ""}</span>
              </div>
              {filteredViolations.map((v) => {
                const isOpen = expanded[v.id];
                const isJumped = jumped === v.id;
                const impMeta = IMPACT_META[v.impact] || IMPACT_META.minor;
                const sc = v.tags
                  ?.filter((t) => /^\d+\.\d+\.\d+$/.test(t))
                  .join(", ");
                const nodeIdx = activeNodeIndex[v.id] ?? 0;
                return (
                  <div
                    key={v.id}
                    className={`violation-card${isOpen ? " violation-card--open" : ""}${isJumped ? " violation-card--jumped" : ""}`}
                    onClick={() => { toggleExpanded(v.id); handleViolationClick(v); }}
                  >
                    <div className="violation-card__main">
                      <span className="violation-dot" style={{ background: impMeta.color }} />
                      <div className="violation-card__body">
                        <div className="violation-card__title">{getPlainDescription(v)}</div>
                        <div className="violation-card__meta">
                          <span style={{ color: impMeta.color, fontWeight: 700 }}>{impMeta.label}</span>
                          {" · "}{v.nodes.length} element{v.nodes.length !== 1 ? "s" : ""}
                          {sc ? ` · WCAG ${sc}` : ""}
                        </div>
                      </div>
                      <ViolationChevron open={isOpen} />
                    </div>
                    {isOpen && v.nodes.length > 1 && (
                      <div className="node-navigator" onClick={(e) => e.stopPropagation()}>
                        <button className="node-nav-btn" onClick={(e) => cycleNode(v, -1, e)}>←</button>
                        <span className="node-nav-label">Element {nodeIdx + 1} of {v.nodes.length}</span>
                        <button className="node-nav-btn" onClick={(e) => cycleNode(v, 1, e)}>→</button>
                      </div>
                    )}
                    {isOpen && (
                      <div className="violation-card__detail" onClick={(e) => e.stopPropagation()}>
                        <ViolationDetail violation={v} />
                      </div>
                    )}
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
