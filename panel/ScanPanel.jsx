import { Icon } from "./icons";
import { useState, useEffect } from "react";
import { getViolationContext } from "./violationContext";
import ExportModal from "./ExportModal";

// ── Grade calculation ─────────────────────────────────────────────────────────

function calcGrade(violations) {
  const score = (violations || []).reduce((s, v) => {
    const w = { critical: 10, serious: 5, moderate: 2, minor: 1 }[v.impact] || 1;
    return s + w * (v.nodes?.length || 1);
  }, 0);
  if (score === 0)  return { grade: "A", color: "#22c97a", score };
  if (score < 10)  return { grade: "B", color: "#65a30d", score };
  if (score < 30)  return { grade: "C", color: "#EF9F27", score };
  if (score < 60)  return { grade: "D", color: "#ea580c", score };
  return              { grade: "F", color: "#E24B4A", score };
}

// ── Scan history ──────────────────────────────────────────────────────────────

const HISTORY_KEY = "accesslens_history";
const MAX_HISTORY = 5;

function loadHistory(domain) {
  return new Promise(resolve => {
    chrome.storage.local.get(HISTORY_KEY, result => {
      const all = result[HISTORY_KEY] || {};
      resolve(all[domain] || []);
    });
  });
}

function saveHistory(domain, entry) {
  return new Promise(resolve => {
    chrome.storage.local.get(HISTORY_KEY, result => {
      const all = result[HISTORY_KEY] || {};
      const prev = all[domain] || [];
      all[domain] = [entry, ...prev].slice(0, MAX_HISTORY);
      chrome.storage.local.set({ [HISTORY_KEY]: all }, resolve);
    });
  });
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url || "unknown"; }
}
const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"];
const IMPACT_COLOURS = { critical:"#E24B4A", serious:"#EF9F27", moderate:"#378ADD", minor:"#888780" };

const RULE_TO_PRINCIPLE = {
  "image-alt":"Perceivable","input-image-alt":"Perceivable","area-alt":"Perceivable",
  "object-alt":"Perceivable","video-caption":"Perceivable","audio-caption":"Perceivable",
  "color-contrast":"Perceivable","color-contrast-enhanced":"Perceivable","non-text-contrast":"Perceivable",
  "reflow":"Perceivable","text-spacing":"Perceivable","meta-viewport":"Perceivable",
  "keyboard":"Operable","focus-trap":"Operable","tabindex":"Operable",
  "scrollable-region-focusable":"Operable","focus-visible":"Operable","focus-order-semantics":"Operable",
  "target-size":"Operable","target-size-2":"Operable","bypass":"Operable","skip-link":"Operable",
  "link-name":"Operable","button-name":"Operable","frame-title":"Operable",
  "label":"Understandable","label-content-name-mismatch":"Understandable","select-name":"Understandable",
  "autocomplete-valid":"Understandable","html-has-lang":"Understandable","html-lang-valid":"Understandable",
  "valid-lang":"Understandable","error-message":"Understandable","identical-links-same-purpose":"Understandable",
  "duplicate-id":"Robust","duplicate-id-active":"Robust","duplicate-id-aria":"Robust",
  "aria-allowed-attr":"Robust","aria-required-attr":"Robust","aria-required-children":"Robust",
  "aria-required-parent":"Robust","aria-roles":"Robust","aria-valid-attr":"Robust",
  "aria-valid-attr-value":"Robust","aria-hidden-body":"Robust","aria-hidden-focus":"Robust",
  "aria-input-field-name":"Robust","aria-toggle-field-name":"Robust","aria-command-name":"Robust",
  "document-title":"Robust","heading-order":"Robust","region":"Robust","landmark-one-main":"Robust",
  "list":"Robust","listitem":"Robust","definition-list":"Robust","dlitem":"Robust",
  "th-has-data-cells":"Robust","td-headers-attr":"Robust","scope-attr-valid":"Robust",
};

const PRINCIPLES = ["Perceivable","Operable","Understandable","Robust"];
const PRINCIPLE_ICON_NAMES = { Perceivable:"visibility", Operable:"keyboard", Understandable:"chat_bubble_outline", Robust:"build" };
function PrincipleIcon({ name }) {
  return <Icon name={PRINCIPLE_ICON_NAMES[name] || "build"} size={14} />;
}
const PRINCIPLE_DESC = {
  Perceivable:"Content must be presentable in ways users can perceive",
  Operable:"Interface components must be operable by all users",
  Understandable:"Information and UI operation must be understandable",
  Robust:"Content must be robust enough for assistive technologies",
};

function getWcagVersion(tags) {
  if (!tags) return null;
  if (tags.some(t => t==="wcag22aa"||t==="wcag22a")) return "2.2";
  if (tags.some(t => t==="wcag21aa"||t==="wcag21a")) return "2.1";
  if (tags.some(t => t==="wcag2aa" ||t==="wcag2a"))  return "2.0";
  return null;
}

function getPrinciple(v) { return RULE_TO_PRINCIPLE[v.id] || "Robust"; }

function groupByPrinciple(violations) {
  const g = {}; PRINCIPLES.forEach(p => { g[p] = []; });
  violations.forEach(v => g[getPrinciple(v)].push(v));
  return g;
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ wcagFilter, setWcagFilter, impactFilter, setImpactFilter }) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <span className="filter-label">Standard</span>
        {["All","2.0","2.1","2.2"].map(v => (
          <button
            key={v}
            className={`filter-btn ${wcagFilter===v ? "filter-btn--active" : ""}`}
            onClick={() => setWcagFilter(v)}
          >{v}</button>
        ))}
      </div>
      <div className="filter-group">
        <span className="filter-label">Impact</span>
        {["All","critical","serious","moderate","minor"].map(v => (
          <button
            key={v}
            className={`filter-btn ${impactFilter===v ? "filter-btn--active" : ""}`}
            onClick={() => setImpactFilter(v)}
            style={v!=="All" ? { color: IMPACT_COLOURS[v] } : {}}
          >{v==="All"?"All":v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
      </div>
    </div>
  );
}

// ── Tab order panel ───────────────────────────────────────────────────────────

// ── Tab order issue guidance ───────────────────────────────────────────────────

const TAB_ISSUE_GUIDANCE = {
  noFocusRing: {
    title: "No visible focus ring",
    why: "Keyboard users rely on the focus ring to know which element is currently active. Without it, they're navigating blind — they can Tab through a page but have no idea where they are. This affects anyone who can't use a mouse.",
    fix: `/* Never do this — it removes the focus indicator entirely */
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
      { label: "WCAG 2.4.11 — Focus Appearance", url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance" },
      { label: "MDN — :focus-visible", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible" },
    ]
  },
  positiveTabindex: {
    title: "Positive tabindex breaks tab order",
    why: "Positive tabindex values (tabindex=\"1\", tabindex=\"2\", etc.) create a custom tab sequence that overrides the natural DOM order. This almost always creates a confusing, unpredictable experience — elements jump around instead of flowing logically through the page.",
    fix: `<!-- Never use positive tabindex values -->
<button tabindex="2">This causes problems</button>
<button tabindex="1">Tab order is now unpredictable</button>

<!-- Fix: Remove tabindex entirely — let DOM order control tab sequence -->
<button>First in DOM = first in tab order</button>
<button>Second in DOM = second in tab order</button>

<!-- Only two valid tabindex values:
  tabindex="0"  — adds a non-interactive element to tab order
  tabindex="-1" — removes from tab order, focusable by JS only -->
<div role="button" tabindex="0">Custom interactive element</div>`,
    links: [
      { label: "WCAG 2.4.3 — Focus Order", url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order" },
      { label: "MDN — tabindex", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex" },
    ]
  },
  ariaHiddenFocusable: {
    title: "aria-hidden element receives keyboard focus",
    why: "aria-hidden=\"true\" hides an element from screen readers, but keyboard focus can still land on it. This creates invisible \"ghost\" focus stops — a keyboard user presses Tab, focus moves somewhere, but the screen reader announces nothing. Deeply disorienting.",
    fix: `<!-- Problem: hidden from AT but still keyboard focusable -->
<div aria-hidden="true">
  <button>Ghost button — keyboard reaches it, screen reader ignores it</button>
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
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "MDN — inert attribute", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert" },
    ]
  }
};

function getIssueType(stop) {
  if (stop.isAriaHiddenFocusable) return "ariaHiddenFocusable";
  if (stop.hasPositiveTabindex)   return "positiveTabindex";
  if (!stop.hasFocusRing)         return "noFocusRing";
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
        <button className={`detail-tab ${detailTab==="why"?"detail-tab--active":""}`} onClick={e=>{e.stopPropagation();setDetailTab("why");}}>Why it matters</button>
        <button className={`detail-tab ${detailTab==="fix"?"detail-tab--active":""}`} onClick={e=>{e.stopPropagation();setDetailTab("fix");}}>How to fix</button>
      </div>
      {detailTab==="why" && (
        <div className="tab-stop-detail-body">
          <p className="detail-why">{guidance.why}</p>
          <div className="detail-links">
            {guidance.links.map((l,i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="detail-link" onClick={e=>e.stopPropagation()}>
                <span className="detail-link-icon">↗</span>{l.label}
              </a>
            ))}
          </div>
        </div>
      )}
      {detailTab==="fix" && (
        <div className="tab-stop-detail-body">
          <pre className="detail-code"><code>{guidance.fix}</code></pre>
        </div>
      )}
    </div>
  );
}

function TabOrderPanel({ stops, selectedStop, onStopClick, onClose }) {
  const [expandedStop, setExpandedStop] = useState(null);
  const issues = stops.filter(s => s.hasPositiveTabindex || s.isAriaHiddenFocusable || !s.hasFocusRing);

  function getStopColour(stop) {
    if (stop.isAriaHiddenFocusable) return "#E24B4A";
    if (stop.hasPositiveTabindex)   return "#EF9F27";
    if (!stop.hasFocusRing)         return "#C2410C";
    return "#4f8ef7";
  }

  function getStopFlag(stop) {
    if (stop.isAriaHiddenFocusable) return "⚠ aria-hidden but focusable";
    if (stop.hasPositiveTabindex)   return `⚠ tabindex="${stop.tabindex}" — breaks tab order`;
    if (!stop.hasFocusRing)         return "⚠ no visible focus ring";
    return null;
  }

  function handleRowClick(stop) {
    const issueType = getIssueType(stop);
    if (issueType) {
      // Toggle detail panel; also scroll to element
      setExpandedStop(prev => prev === stop.index ? null : stop.index);
    }
    onStopClick(stop);
  }

  return (
    <div className="tab-order-panel">
      <div className="tab-order-header">
        <div className="tab-order-header-left">
          <span className="tab-order-title"><Icon name="account_tree" size={14} style={{marginRight:4}} />Tab order map</span>
          <span className="tab-order-count">{stops.length} focusable elements</span>
        </div>
        <button className="btn-stop" onClick={onClose}>Clear</button>
      </div>

      <div className="tab-order-howto">
        <span className="howto-icon"><Icon name="lightbulb" size={16} /></span>
        <span>Numbered badges are on the page. <strong>Click a flagged row</strong> to scroll to the element and see how to fix it.</span>
      </div>

      {issues.length > 0 ? (
        <div className="tab-order-issues-bar">
          ⚠ {issues.length} issue{issues.length !== 1 ? "s" : ""} — click any flagged row for guidance
        </div>
      ) : (
        <div className="tab-order-ok-bar">✓ No tab order issues detected</div>
      )}

      <div className="tab-order-legend">
        <span className="legend-item"><span className="legend-dot" style={{background:"#4f8ef7"}}/>Normal</span>
        <span className="legend-item"><span className="legend-dot" style={{background:"#EF9F27"}}/>Positive tabindex</span>
        <span className="legend-item"><span className="legend-dot" style={{background:"#E24B4A"}}/>aria-hidden bug</span>
        <span className="legend-item"><span className="legend-dot" style={{background:"#C2410C"}}/>No focus ring</span>
      </div>

      <div className="tab-order-list">
        {stops.map(stop => {
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
                title={hasIssue ? "Click to see how to fix this issue" : "Click to scroll to this element"}
              >
                <span className="tab-stop-num" style={{background: color}}>{stop.index}</span>
                <div className="tab-stop-info">
                  <span className="tab-stop-label">{stop.label}</span>
                  {flag && <span className="tab-stop-flag" style={{color}}>{flag}</span>}
                </div>
                {hasIssue
                  ? <span className="tab-stop-arrow" style={{color}}>{isExpanded ? "▲" : "▼"}</span>
                  : <span className="tab-stop-arrow">↗</span>
                }
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
        setStops(prev => [...prev, msg]);
      }
      if (msg.type === "FOCUS_MODE_STOPPED") onStop(stops);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [stops]);

  return (
    <div className="focus-mode-panel">
      <div className="focus-mode-header">
        <span className="focus-mode-title"><Icon name="keyboard" size={14} style={{marginRight:4}} />Focus mode active</span>
        <button className="btn-stop" onClick={() => {
          chrome.runtime.sendMessage({ type: "STOP_FOCUS_MODE" });
        }}>Stop</button>
      </div>
      <p className="focus-mode-hint">Press <kbd>Tab</kbd> on the page to step through focus stops. Green = focus ring visible. Red = missing.</p>
      {currentStop && (
        <div className="focus-current">
          <span className="focus-stop-num">Stop #{currentStop.stopCount}</span>
          <span className="focus-stop-tag">{currentStop.tagName.toLowerCase()}{currentStop.id ? "#"+currentStop.id : ""}</span>
          <span className={`focus-ring-status ${currentStop.hasFocusRing ? "focus-ring--ok" : "focus-ring--bad"}`}>
            {currentStop.hasFocusRing ? "✓ Focus ring" : "✗ No focus ring"}
          </span>
        </div>
      )}
      {stops.length > 0 && (
        <div className="focus-stops-list">
          {stops.slice(-8).map((s, i) => (
            <div key={i} className="focus-stop-row">
              <span className="focus-stop-n">#{s.stopCount}</span>
              <span className="focus-stop-el">{s.tagName.toLowerCase()}{s.id ? "#"+s.id : ""}</span>
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
        {["why", "fix", "elements"].map(t => (
          <button
            key={t}
            className={`detail-tab ${activeTab === t ? "detail-tab--active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "why" ? "Why it matters" : t === "fix" ? "How to fix" : `Elements (${violation.nodes.length})`}
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
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className="detail-link">
                  <span className="detail-link-icon">↗</span>
                  {l.label}
                </a>
              ))}
              {violation.helpUrl && (
                <a href={violation.helpUrl} target="_blank" rel="noreferrer" className="detail-link">
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
          <pre className="detail-code"><code>{ctx.fix}</code></pre>
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
                    <span className="node-selector">{node.target[0].slice(0, 60)}</span>
                  )}
                </div>
                <code>{node.html?.slice(0, 200)}{node.html?.length > 200 ? "…" : ""}</code>
              </div>
            ))}
            {violation.nodes.length > 5 && (
              <p className="nodes-more">+{violation.nodes.length - 5} more instances</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Reading level card ────────────────────────────────────────────────────────

function ReadingLevelCard({ data }) {
  const [tab, setTab] = useState("what");
  const gradeTarget = 8;

  const gradeLabel = (grade) => {
    if (grade <= 5)  return "Elementary school level";
    if (grade <= 8)  return "Middle school level";
    if (grade <= 12) return `Grade ${grade} — High school level`;
    return "University / post-secondary level";
  };

  const howToFix = `Your page scores at a Grade ${data.grade} reading level (${gradeLabel(data.grade)}). WCAG 3.1.5 recommends Grade 8 or below for the main content of your page.

What this means:
This score is calculated using the Flesch-Kincaid formula, applied to ALL readable text on the page — paragraphs, headings, labels, and error messages. A Grade ${data.grade} score means the average reader needs a ${gradeLabel(data.grade).toLowerCase()} education to comfortably understand your content.

Target: Grade 8 or below (readable by most adults)

How to fix it:
• Break long sentences into two shorter ones. If a sentence has more than 20 words, split it.
• Replace complex words with simpler ones:
    "Utilise" → "Use"
    "Subsequently" → "Then"
    "Endeavour" → "Try"
    "Facilitate" → "Help"
• Write in active voice:
    Before: "The form must be completed by the user prior to submission."
    After:  "Fill out the form before you submit it."
• Add a plain-language summary at the top of complex pages — a 2–3 sentence TL;DR that anyone can understand without specialist knowledge.

Example rewrite:
  Before (Grade 14): "Users must authenticate their credentials via the secure login portal prior to accessing personalised account functionality."
  After  (Grade 5):  "Sign in to your account to see your settings."

Note: Legal terms, medical names, and technical jargon will inflate the score. If your content must use specialist language, add a plain-English explanation or glossary alongside it.`;

  return (
    <div className="reading-card">
      <div className="reading-header">
        <div>
          <div className="reading-grade" style={{color: data.color}}>Grade {data.grade}</div>
          <div className="reading-label" style={{color: data.color}}>{data.label}</div>
        </div>
        <div className="reading-meta-right">
          <span className="reading-meta">{data.wordCount} words</span>
          <span className="reading-meta">{data.sentenceCount} sentences</span>
          <span className={`pass-badge ${data.passesWcag ? "pass-badge--pass" : "pass-badge--fail"}`}>
            WCAG 3.1.5
          </span>
        </div>
      </div>

      <div className="detail-tabs" style={{marginTop:8}}>
        <button className={`detail-tab ${tab==="what"?"detail-tab--active":""}`} onClick={()=>setTab("what")}>What this means</button>
        <button className={`detail-tab ${tab==="fix"?"detail-tab--active":""}`} onClick={()=>setTab("fix")}>How to fix</button>
      </div>

      {tab==="what" && (
        <div className="reading-body">
          <p>{data.explanation}</p>
          <p style={{marginTop:8}}>This score is based on the Flesch-Kincaid formula, applied to all readable text on this page — paragraphs, headings, labels, and error messages. A Grade {data.grade} score means your content is written at a <strong>{gradeLabel(data.grade).toLowerCase()}</strong> reading level.</p>
          {!data.passesWcag && (
            <div className="content-flag" style={{marginTop:10}}>
              ⚠ WCAG 3.1.5 recommends Grade 8 or below. Consider simplifying your content or adding a plain-language summary.
            </div>
          )}
        </div>
      )}

      {tab==="fix" && (
        <pre className="detail-code" style={{marginTop:0,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
          <code>{howToFix}</code>
        </pre>
      )}
    </div>
  );
}

export default function ScanPanel({ tabId, devMode, devInterval, countdown }) {
  const [status, setStatus]         = useState("idle");
  const [errorMsg, setErrorMsg]     = useState("");
  const [violations, setViolations] = useState([]);
  const [dynamicIssues, setDynamicIssues] = useState([]);
  const [passes, setPasses]         = useState([]);
  const [activeSelector, setActiveSelector] = useState(null);
  const [expanded, setExpanded]     = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [wcagFilter, setWcagFilter] = useState("All");
  const [impactFilter, setImpactFilter] = useState("All");
  const [focusMode, setFocusMode]   = useState(false);
  const [focusDropdown, setFocusDropdown] = useState(false);
  const [tabOrderStops, setTabOrderStops] = useState(null); // null=off, []=active
  const [selectedStop, setSelectedStop] = useState(null);
  const [zoomStatus, setZoomStatus] = useState("idle"); // idle|running|done
  const [zoomViolations, setZoomViolations] = useState([]);
  const [highContrast, setHighContrast] = useState(false);
  const [activeTab, setActiveTab]   = useState("violations"); // violations|zoom|dynamic

  const [showExport, setShowExport] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [delta, setDelta] = useState(null); // {added, fixed}
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [contentStatus, setContentStatus] = useState("idle");

  // Get the current page URL for the report
  useEffect(() => {
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (!chrome.runtime.lastError && tab?.url) setPageUrl(tab.url);
      });
    }
  }, [tabId]);

  // Listen for tab switches — reset scan state when user switches tabs
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
        setContentAnalysis(null);
        setContentStatus("idle");
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
    setStatus("scanning");
    setViolations([]); setPasses([]); setDynamicIssues([]);
    setActiveSelector(null); setExpanded({});
    setDelta(null);

    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        const err = response?.error || chrome.runtime.lastError?.message || "";
        setErrorMsg(err === "chrome_restricted"
          ? "chrome_restricted"
          : "inject_failed"
        );
        setStatus("error");
        return;
      }
      const sorted = [...response.violations].sort(
        (a,b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
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
        const currIds = new Set(sorted.map(v => v.id));
        const added = [...currIds].filter(id => !prevIds.has(id)).length;
        const fixed = [...prevIds].filter(id => !currIds.has(id)).length;
        if (added > 0 || fixed > 0) setDelta({ added, fixed });
      }

      const entry = {
        date: new Date().toLocaleString(),
        total: sorted.length,
        instances: sorted.reduce((s,v) => s+v.nodes.length, 0),
        grade: calcGrade(sorted).grade,
        violationIds: sorted.map(v => v.id),
      };
      await saveHistory(domain, entry);
      const updated = await loadHistory(domain);
      setHistory(updated);
    });
  }

  const [devDelta, setDevDelta]     = useState(null); // {added, fixed} from auto-scan
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
      setDevDelta(null);
      chrome.runtime.sendMessage({ type: "SET_BADGE", text: "" });
    }
  }, [devMode]);

  function triggerAutoScan() {
    setLastAutoScan(Date.now());
    // Silent scan — update results without full loading state reset
    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) return;
      const sorted = [...response.violations].sort(
        (a,b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
      );

      // Compute delta vs current violations
      setViolations(prev => {
        const prevIds = new Set(prev.map(v => v.id));
        const currIds = new Set(sorted.map(v => v.id));
        const added = [...currIds].filter(id => !prevIds.has(id)).length;
        const fixed = [...prevIds].filter(id => !currIds.has(id)).length;
        setDevDelta({ added, fixed, clean: added === 0 && fixed === 0 });
        return sorted;
      });
      setPasses(response.passes || []);
      setStatus("done");

      // Update extension badge with critical/serious count
      const critical = sorted.filter(v => v.impact === "critical" || v.impact === "serious").length;
      if (critical > 0) {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text: String(critical), color: "#E24B4A" });
      } else if (sorted.length > 0) {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text: String(sorted.length), color: "#EF9F27" });
      } else {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text: "✓", color: "#22c97a" });
      }

      // Save to history
      const domain = getDomain(pageUrl);
      const entry = {
        date: new Date().toLocaleString(),
        total: sorted.length,
        instances: sorted.reduce((s,v) => s+v.nodes.length, 0),
        grade: calcGrade(sorted).grade,
        violationIds: sorted.map(v => v.id),
      };
      await saveHistory(domain, entry);
      const updated = await loadHistory(domain);
      setHistory(updated);
    });
  }

  // Load history when URL is known
  useEffect(() => {
    if (pageUrl) {
      loadHistory(getDomain(pageUrl)).then(setHistory);
    }
  }, [pageUrl]);

  function runContentAnalysis() {
    setContentStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_CONTENT_ANALYSIS" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        setContentStatus("error");
        return;
      }
      setContentAnalysis(response);
      setContentStatus("done");
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
      chrome.runtime.sendMessage({ type: "HIGHLIGHT_ELEMENT", selector, showDimensions: isTargetSize });
    }
  }

  function toggleExpanded(id) { setExpanded(p => ({ ...p, [id]: !p[id] })); }
  function toggleGroup(p) { setCollapsedGroups(prev => ({ ...prev, [p]: !prev[p] })); }

  function startFocusMode() {
    setFocusMode(true);
    setTabOrderStops(null);
    setFocusDropdown(false);
    chrome.runtime.sendMessage({ type: "START_FOCUS_MODE" });
  }
  function stopFocusMode() { setFocusMode(false); }

  function showTabOrder() {
    setFocusDropdown(false);
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
    chrome.runtime.sendMessage({ type: "SCROLL_TO_STOP", stopIndex: stop.index });
  }

  async function runZoomTest() {
    setZoomStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_ZOOM_TEST" }, (response) => {
      if (!response?.success) { setZoomStatus("idle"); return; }
      // Only show NEW violations not in the normal scan
      const normalIds = new Set(violations.map(v => v.id));
      const newViolations = response.violations.filter(v => !normalIds.has(v.id));
      setZoomViolations(newViolations);
      setZoomStatus("done");
      setActiveTab("zoom");
    });
  }

  function toggleHighContrast() {
    const next = !highContrast;
    setHighContrast(next);
    chrome.runtime.sendMessage({ type: next ? "ENABLE_HIGH_CONTRAST" : "DISABLE_HIGH_CONTRAST" });
  }

  // Apply filters
  const filteredViolations = violations.filter(v => {
    const version = getWcagVersion(v.tags);
    const wcagOk = wcagFilter === "All" || version === wcagFilter;
    const impactOk = impactFilter === "All" || v.impact === impactFilter;
    return wcagOk && impactOk;
  });

  const grouped = groupByPrinciple(filteredViolations);
  const totalIssues = violations.reduce((sum, v) => sum + v.nodes.length, 0);

  return (
    <div className="scan-panel">
      {/* Dev mode status bar */}
      {devMode && (
        <div className="dev-status-bar">
          <span className="dev-status-icon"><Icon name="bolt" size={14} /></span>
          <span className="dev-status-text">
            Dev mode active — auto-scanning every {devInterval}s
          </span>
          {devDelta && (
            devDelta.clean ? (
              <span className="dev-status-clean">✓ No changes</span>
            ) : (
              <span className="dev-status-delta">
                {devDelta.added > 0 && <span className="delta-added">↑{devDelta.added} new</span>}
                {devDelta.fixed > 0 && <span className="delta-fixed">↓{devDelta.fixed} fixed</span>}
              </span>
            )
          )}
        </div>
      )}

      {/* Tool buttons row */}
      <div className="tool-row">
        <button className="btn-scan" onClick={runScan} disabled={status==="scanning"}>
          {status==="scanning" ? <><span className="spinner"/> Scanning…</> : "Run scan"}
        </button>
        <div className="focus-dropdown-wrap">
          <button
            className={`tool-btn ${focusMode || tabOrderStops !== null ? "tool-btn--active" : ""}`}
            onClick={() => setFocusDropdown(p => !p)}
            title="Keyboard focus tools"
          >⌨ Focus ▾</button>
          {focusDropdown && (
            <div className="focus-dropdown">
              <button className="focus-dropdown-item" onClick={startFocusMode}>
                <span className="fdi-icon">⌨</span>
                <div>
                  <div className="fdi-title">Step through</div>
                  <div className="fdi-desc">Press Tab to step through stops one by one</div>
                </div>
              </button>
              <button className="focus-dropdown-item" onClick={showTabOrder}>
                <span className="fdi-icon">⬡</span>
                <div>
                  <div className="fdi-title">Show all stops</div>
                  <div className="fdi-desc">Number every focusable element at once</div>
                </div>
              </button>
            </div>
          )}
        </div>
        <button
          className={`tool-btn ${zoomStatus==="running" ? "tool-btn--loading" : ""}`}
          onClick={runZoomTest}
          disabled={zoomStatus==="running" || status!=="done"}
          title="Test 400% zoom / reflow"
        >🔍 Zoom</button>
        <button
          className={`tool-btn ${highContrast ? "tool-btn--active" : ""}`}
          onClick={toggleHighContrast}
          title="Simulate high contrast mode"
        >◑ HC</button>
      </div>

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
      {status==="done" && !focusMode && (
        <>
          <div className="summary">
            {/* Grade */}
            {(() => { const {grade,color} = calcGrade(violations); return (
              <div className="summary-stat summary-stat--grade">
                <span className="summary-grade" style={{color}}>{grade}</span>
                <span className="summary-label">grade</span>
              </div>
            );})()}
            <div className="summary-stat">
              <span className="summary-num" style={{color: violations.length>0?"#E24B4A":"#1D9E75"}}>{violations.length}</span>
              <span className="summary-label">violations</span>
            </div>
            <div className="summary-stat">
              <span className="summary-num" style={{color:"#888780"}}>{totalIssues}</span>
              <span className="summary-label">instances</span>
            </div>
            <div className="summary-stat">
              <span className="summary-num" style={{color:"#1D9E75"}}>{passes.length}</span>
              <span className="summary-label">passed</span>
            </div>
            <button
              className={`summary-history-btn ${showHistory?"summary-history-btn--active":""}`}
              onClick={() => setShowHistory(p=>!p)}
              title="Scan history"
            ><Icon name="history" size={16} /></button>
          </div>

          {/* Delta bar */}
          {delta && (
            <div className="delta-bar">
              {delta.added > 0 && <span className="delta-added">↑ {delta.added} new</span>}
              {delta.fixed > 0 && <span className="delta-fixed">↓ {delta.fixed} fixed</span>}
              <span className="delta-label">since last scan</span>
            </div>
          )}

          {/* History panel */}
          {showHistory && history.length > 0 && (
            <div className="history-panel">
              <div className="history-title">Scan history — {getDomain(pageUrl)}</div>
              {history.map((h, i) => {
                const gradeColor = {A:"#22c97a",B:"#65a30d",C:"#EF9F27",D:"#ea580c",F:"#E24B4A"}[h.grade] || "#E24B4A";
                return (
                  <div key={i} className={`history-row ${i===0?"history-row--current":""}`}>
                    <span className="history-grade" style={{color: gradeColor}}>{h.grade}</span>
                    <div className="history-info">
                      <span className="history-date">{h.date}{i===0?" (latest)":""}</span>
                      <span className="history-stats">{h.total} violations · {h.instances} instances</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showHistory && history.length === 0 && (
            <div className="history-panel">
              <p style={{fontSize:11,color:"var(--text3)",padding:"8px 0"}}>No previous scans on this domain.</p>
            </div>
          )}
          <button className="btn-export" onClick={() => setShowExport(true)}>
            ↗ Export report
          </button>

          {/* Sub-tabs */}
          <div className="subtabs">
            <button className={`subtab ${activeTab==="violations"?"subtab--active":""}`} onClick={()=>setActiveTab("violations")}>
              Violations {violations.length > 0 && <span className="subtab-count">{violations.length}</span>}
            </button>
            <button className={`subtab ${activeTab==="zoom"?"subtab--active":""}`} onClick={()=>setActiveTab("zoom")}>
              Zoom {zoomViolations.length > 0 && <span className="subtab-count subtab-count--amber">{zoomViolations.length}</span>}
            </button>
            <button className={`subtab ${activeTab==="dynamic"?"subtab--active":""}`} onClick={()=>setActiveTab("dynamic")}>
              Dynamic {dynamicIssues.length > 0 && <span className="subtab-count subtab-count--amber">{dynamicIssues.length}</span>}
            </button>
            <button className={`subtab ${activeTab==="content"?"subtab--active":""}`} onClick={()=>setActiveTab("content")}>
              Content {contentAnalysis && contentAnalysis.linkResults?.issues?.length > 0 && <span className="subtab-count subtab-count--amber">{contentAnalysis.linkResults.issues.length}</span>}
            </button>
          </div>
        </>
      )}

      {/* Error */}
      {status==="error" && (
        <div className="empty-state empty-state--error">
          {errorMsg === "chrome_restricted" ? (
            <>
              <div className="error-icon"><Icon name="block" size={28} /></div>
              <p>Can't scan Chrome's own pages</p>
              <p className="empty-hint">Navigate to any regular website (http:// or https://) then click the AccessLens icon to open a fresh panel on that page.</p>
            </>
          ) : (
            <>
              <div className="error-icon"><Icon name="warning_amber" size={28} /></div>
              <p>Scan failed</p>
              <p className="empty-hint">This can happen if you switched tabs while the panel was open. <strong>Close this panel</strong>, navigate to the page you want to scan, then click the AccessLens icon again.</p>
              <button className="btn-scan" style={{marginTop:14,maxWidth:180,background:"var(--red)"}} onClick={runScan}>
                ↺ Try again
              </button>
            </>
          )}
        </div>
      )}

      {/* Idle */}
      {status==="idle" && !focusMode && (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            </svg>
          </div>
          <p>Click <strong>Run scan</strong> to check for WCAG violations.</p>
          <p className="empty-hint" style={{marginTop:8}}>Use <strong>Focus</strong> to test keyboard navigation, <strong>Zoom</strong> to test 400% reflow, <strong>HC</strong> to preview high contrast mode.</p>
        </div>
      )}

      {/* All clear */}
      {status==="done" && violations.length===0 && activeTab==="violations" && (
        <div className="empty-state empty-state--success">
          <div className="empty-icon" style={{color:"#1D9E75"}}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p>No violations found. Nice work.</p>
        </div>
      )}

      {/* ── Violations tab ── */}
      {status==="done" && activeTab==="violations" && violations.length>0 && (
        <>
          <FilterBar wcagFilter={wcagFilter} setWcagFilter={setWcagFilter} impactFilter={impactFilter} setImpactFilter={setImpactFilter}/>
          {filteredViolations.length === 0 ? (
            <div className="empty-state"><p>No violations match the current filters.</p></div>
          ) : (
            <div className="violation-groups">
              {PRINCIPLES.map(principle => {
                const group = grouped[principle];
                if (!group.length) return null;
                const isCollapsed = collapsedGroups[principle];
                const instances = group.reduce((s,v)=>s+v.nodes.length,0);
                return (
                  <div key={principle} className="principle-group">
                    <button className="principle-header" onClick={()=>toggleGroup(principle)}>
                      <span className="principle-icon"><PrincipleIcon name={principle} /></span>
                      <span className="principle-name">{principle}</span>
                      <span className="principle-count">{group.length} rule{group.length!==1?"s":""} · {instances} instance{instances!==1?"s":""}</span>
                      <span className="principle-chevron">{isCollapsed?"▶":"▼"}</span>
                    </button>
                    {!isCollapsed && <div className="principle-desc">{PRINCIPLE_DESC[principle]}</div>}
                    {!isCollapsed && (
                      <div className="violations">
                        {group.map(v => {
                          const selector = v.nodes[0]?.target?.[0];
                          const isActive = activeSelector===selector;
                          const isExp = expanded[v.id];
                          const wcagVer = getWcagVersion(v.tags);
                          const isNew22 = wcagVer==="2.2";
                          const sc = v.tags.filter(t=>/^\d+\.\d+\.\d+$/.test(t)).join(", ");
                          return (
                            <div key={v.id} className={`violation ${isActive?"violation--active":""}`}>
                              <div className="violation-header" onClick={()=>handleViolationClick(v)}>
                                <span className="impact-bar" style={{background:IMPACT_COLOURS[v.impact]||"#888"}}/>
                                <div className="violation-info">
                                  <div className="violation-title-row">
                                    <span className="violation-title">{v.description}</span>
                                    {isNew22 && <span className="badge-new22">New in 2.2</span>}
                                  </div>
                                  <div className="violation-meta">
                                    <span className="impact-badge" style={{color:IMPACT_COLOURS[v.impact]}}>{v.impact}</span>
                                    {wcagVer && <span className="wcag-version-badge">WCAG {wcagVer}</span>}
                                    {sc && <span className="wcag-badge">{sc}</span>}
                                    <span className="node-count">{v.nodes.length} {v.nodes.length===1?"instance":"instances"}</span>
                                  </div>
                                </div>
                                <button className="expand-btn" onClick={e=>{e.stopPropagation();toggleExpanded(v.id);}}>
                                  {isExp?"▲":"▼"}
                                </button>
                              </div>
                              {isExp && (
                                <ViolationDetail violation={v} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Zoom test tab ── */}
      {activeTab==="zoom" && (
        <div className="zoom-tab">
          {zoomStatus==="idle" && status==="done" && (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="zoom_in" size={24} /></div>
              <div className="tab-explainer-title">400% zoom / reflow test</div>
              <div className="tab-explainer-body">
                WCAG 1.4.10 requires that content can be viewed at 400% zoom without horizontal scrolling. This test temporarily resizes the page to 320px wide — equivalent to a 1280px screen at 400% — and flags any <em>new</em> violations that only appear at that width.
              </div>
              <div className="tab-explainer-steps">
                <div className="tab-step"><span className="tab-step-num">1</span>Run a normal scan first (already done)</div>
                <div className="tab-step"><span className="tab-step-num">2</span>Click the button below — the page will resize briefly</div>
                <div className="tab-step"><span className="tab-step-num">3</span>Results show only issues introduced by the narrow viewport</div>
              </div>
              <button className="btn-scan" style={{marginTop:14,maxWidth:200}} onClick={runZoomTest}>Run zoom test</button>
            </div>
          )}
          {zoomStatus==="idle" && status!=="done" && (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="zoom_in" size={24} /></div>
              <div className="tab-explainer-title">400% zoom / reflow test</div>
              <div className="tab-explainer-body">Run a scan first using the <strong>Run scan</strong> button, then come back to this tab to test 400% zoom reflow.</div>
            </div>
          )}
          {zoomStatus==="running" && (
            <div className="empty-state">
              <span className="spinner" style={{width:20,height:20,margin:"0 auto 8px"}}/>
              <p>Resizing to 320px and scanning…</p>
              <p className="empty-hint">The page will briefly reflow. This takes a few seconds.</p>
            </div>
          )}
          {zoomStatus==="done" && zoomViolations.length===0 && (
            <div className="empty-state empty-state--success">
              <div className="empty-icon" style={{color:"#1D9E75"}}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p>No new violations at 400% zoom.</p>
              <p className="empty-hint">Content reflows correctly at narrow viewports. WCAG 1.4.10 satisfied.</p>
            </div>
          )}
          {zoomStatus==="done" && zoomViolations.length>0 && (
            <div className="violations">
              <p className="zoom-intro">These violations only appear at 400% zoom / 320px width:</p>
              {zoomViolations.map(v=>(
                <div key={v.id} className="violation">
                  <div className="violation-header" onClick={()=>handleViolationClick(v)}>
                    <span className="impact-bar" style={{background:IMPACT_COLOURS[v.impact]||"#888"}}/>
                    <div className="violation-info">
                      <div className="violation-title">{v.description}</div>
                      <div className="violation-meta">
                        <span className="impact-badge" style={{color:IMPACT_COLOURS[v.impact]}}>{v.impact}</span>
                        <span className="wcag-version-badge" style={{background:"rgba(194,64,12,0.15)",color:"#F0997B"}}>zoom only</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dynamic errors tab ── */}
      {activeTab==="dynamic" && (
        <div className="dynamic-tab">
          {dynamicIssues.length===0 ? (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="bolt" size={24} /></div>
              <div className="tab-explainer-title">Dynamic ARIA error detection</div>
              <div className="tab-explainer-body">
                axe-core only scans the DOM at one point in time. Forms that inject error messages <em>after</em> a failed submission — the most common pattern in React and Vue apps — are invisible to a static scan. This tab watches for those dynamically added elements and flags any that are missing proper ARIA associations.
              </div>
              <div className="tab-explainer-steps">
                <div className="tab-step"><span className="tab-step-num">1</span>Keep AccessLens open — the watcher is already running</div>
                <div className="tab-step"><span className="tab-step-num">2</span>Submit a form on this page with empty or invalid fields</div>
                <div className="tab-step"><span className="tab-step-num">3</span>If error messages appear without <code>role="alert"</code> or <code>aria-live</code>, they'll be flagged here automatically</div>
              </div>
              <div className="tab-explainer-note">
                <strong>Nothing found yet</strong> — either no dynamic errors exist on this page, or no forms have been submitted. Try triggering a form validation error and check back.
              </div>
            </div>
          ) : (
            <div className="violations">
              {dynamicIssues.map((issue,i)=>(
                <div key={i} className="violation">
                  <div className="violation-header">
                    <span className="impact-bar" style={{background:IMPACT_COLOURS.serious}}/>
                    <div className="violation-info">
                      <div className="violation-title-row">
                        <span className="violation-title">{issue.description}</span>
                        <span className="badge-new22" style={{background:"rgba(239,159,39,0.18)",color:"#EF9F27"}}>Dynamic</span>
                      </div>
                      <div className="violation-meta">
                        <span className="impact-badge" style={{color:IMPACT_COLOURS.serious}}>serious</span>
                        <span className="wcag-badge">ARIA live region</span>
                      </div>
                    </div>
                  </div>
                  <div className="violation-detail">
                    {issue.issues.map((msg,j)=>(
                      <p key={j} className="violation-help" style={{marginBottom:4}}>• {msg}</p>
                    ))}
                    <div className="node-snippet" style={{marginTop:8}}>
                      <code>{issue.html}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content analysis tab ── */}
      {activeTab==="content" && (
        <div className="content-tab">
          {contentStatus==="idle" && (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="edit_note" size={24} /></div>
              <div className="tab-explainer-title">Content accessibility analysis</div>
              <div className="tab-explainer-body">
                Checks three things axe-core doesn't cover: ambiguous link text that's meaningless to screen reader users navigating by link list, the reading level of your page content (WCAG 3.1.5), and CSS animations running without pause controls (WCAG 2.2.2).
              </div>
              <button className="btn-scan" style={{marginTop:14,maxWidth:220}} onClick={runContentAnalysis}>
                Analyse content
              </button>
            </div>
          )}

          {contentStatus==="running" && (
            <div className="empty-state">
              <span className="spinner" style={{width:20,height:20,margin:"0 auto 8px"}}/>
              <p>Analysing content…</p>
            </div>
          )}

          {contentStatus==="error" && (
            <div className="empty-state empty-state--error">
              <p>Could not analyse this page.</p>
            </div>
          )}

          {contentStatus==="done" && contentAnalysis && (
            <div className="content-results">

              {/* Reading level */}
              <div className="content-section">
                <div className="content-section-title"><Icon name="menu_book" size={16} style={{marginRight:6}} />Reading level</div>
                {contentAnalysis.readingLevel?.grade ? (
                  <ReadingLevelCard data={contentAnalysis.readingLevel} />
                ) : (
                  <p className="content-empty">{contentAnalysis.readingLevel?.message || "Not enough text to analyse."}</p>
                )}
              </div>

              {/* Link text */}
              <div className="content-section">
                <div className="content-section-title">
                  🔗 Link text
                  <span className="content-section-meta">{contentAnalysis.linkResults?.total} links total</span>
                </div>
                {contentAnalysis.linkResults?.issues?.length === 0 ? (
                  <p className="content-ok">✓ All link text is descriptive</p>
                ) : (
                  <div className="content-issues">
                    {contentAnalysis.linkResults.issues.map((issue, i) => (
                      <div key={i} className="content-issue">
                        <div className="content-issue-head">
                          <span className={`content-issue-type ${issue.type==="empty"?"content-issue-type--red":"content-issue-type--amber"}`}>
                            {issue.type === "empty" ? "Empty" : "Ambiguous"}
                          </span>
                          <code className="content-issue-text">"{issue.text}"</code>
                          <button
                            className="cscan-jump-btn"
                            onClick={() => chrome.runtime.sendMessage({
                              type: "SCROLL_TO_ELEMENT",
                              selector: issue.selector || null,
                              text: issue.type !== "empty" ? issue.text : null,
                            })}
                          ><Icon name="open_in_new" size={12} /> Jump</button>
                        </div>
                        <p className="content-issue-msg">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Motion */}
              <div className="content-section">
                <div className="content-section-title"><Icon name="movie_filter" size={16} style={{marginRight:6}} />Animations</div>
                {contentAnalysis.motionIssues?.length === 0 ? (
                  <p className="content-ok">✓ No problematic animations detected</p>
                ) : (
                  <div className="content-issues">
                    {contentAnalysis.motionIssues.map((issue, i) => (
                      <div key={i} className="content-issue">
                        <div className="content-issue-head">
                          <span className="content-issue-type content-issue-type--amber">
                            {issue.type === "infinite" ? "Infinite" : "Long"}
                          </span>
                          <code className="content-issue-text">{issue.animName} · {issue.duration}</code>
                        </div>
                        <p className="content-issue-msg">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn-rerun" onClick={runContentAnalysis}><Icon name="refresh" size={14} style={{marginRight:4}} />Re-analyse</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
