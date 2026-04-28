import { Icon } from "./icons";
import { useState, useEffect } from "react";
import { getViolationContext } from "./violationContext";
import ExportModal from "./ExportModal";

// ── Risk score (0–100, higher = safer) ───────────────────────────────────────

function calcRiskScore(violations) {
  const deductions = (violations || []).reduce((s, v) => {
    const w = { critical: 10, serious: 5, moderate: 2, minor: 0.5 }[v.impact] || 1;
    return s + w * (v.nodes?.length || 1);
  }, 0);
  const score = Math.max(0, Math.round(100 - deductions));
  if (score >= 90) return { score, label: "Low risk",      color: "#22c97a" };
  if (score >= 75) return { score, label: "Manageable",    color: "#65a30d" };
  if (score >= 50) return { score, label: "Moderate risk", color: "#EF9F27" };
  if (score >= 25) return { score, label: "High risk",     color: "#ea580c" };
  return                 { score, label: "Critical risk",  color: "#E24B4A" };
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
  "aria-allowed-attr":"Robust","aria-needd-attr":"Robust","aria-needd-children":"Robust",
  "aria-needd-parent":"Robust","aria-roles":"Robust","aria-valid-attr":"Robust",
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
        <span className="filter-label">Severity</span>
        {["All","critical","serious","moderate","minor"].map(v => (
          <button
            key={v}
            className={`filter-btn ${impactFilter===v ? "filter-btn--active" : ""}`}
            onClick={() => setImpactFilter(v)}
            style={v!=="All" ? { color: IMPACT_COLOURS[v] } : {}}
          >{v==="All" ? "All" : v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
      </div>
    </div>
  );
}

// ── Tab order panel ───────────────────────────────────────────────────────────

// ── Tab order issue guidance ───────────────────────────────────────────────────

const TAB_ISSUE_GUIDANCE = {
  positiveTabindex: {
    title: "Positive tabindex breaks tab order",
    why: "Positive tabindex values (tabindex=\"1\", tabindex=\"2\", etc.) create a custom tab sequence that overrides the natural DOM order. This creates a confusing experience where elements jump around instead of flowing in order.",
    fix: `<!-- Never use positive tabindex values -->
<button tabindex="2">This causes problems</button>
<button tabindex="1">Tab order is now unpredictable</button>

<!-- Fix: Remove tabindex entirely -->
<button>First in DOM = first in tab order</button>
<button>Second in DOM = second in tab order</button>

<!-- Only two valid tabindex values:
  tabindex="0"  — adds element to natural tab order
  tabindex="-1" — removes from tab order, focusable by JS only -->
<div role="button" tabindex="0">Custom interactive element</div>`,
    links: [
      { label: "WCAG 2.4.3", url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order" },
      { label: "MDN: tabindex", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex" },
    ]
  },
  ariaHiddenFocusable: {
    title: "aria-hidden element receives keyboard focus",
    why: "aria-hidden=\"true\" hides an element from screen readers, but keyboard focus can still land on it. This creates invisible \"ghost\" focus stops — a keyboard user presses Tab but the screen reader says nothing. Very confusing.",
    fix: `<!-- Problem: hidden from AT but still keyboard focusable -->
<div aria-hidden="true">
  <button>Ghost button — keyboard reaches it, screen reader ignores it</button>
</div>

<!-- Fix 1: Add inert attribute to block all interaction -->
<div aria-hidden="true" inert>
  <button>Now fully hidden from both keyboard and AT</button>
</div>

<!-- Fix 2: Add tabindex="-1" to all focusable children -->
<div aria-hidden="true">
  <button tabindex="-1">No longer keyboard reachable</button>
</div>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "MDN: inert", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert" },
    ]
  }
};

function getIssueType(stop) {
  if (stop.isAriaHiddenFocusable) return "ariaHiddenFocusable";
  if (stop.hasPositiveTabindex)   return "positiveTabindex";
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
  const [showInfo, setShowInfo] = useState(false);
  const [showIssues, setShowIssues] = useState(true);
  const [showNonIssues, setShowNonIssues] = useState(false);

  const issues    = stops.filter(s => s.hasPositiveTabindex || s.isAriaHiddenFocusable);
  const nonIssues = stops.filter(s => !s.hasPositiveTabindex && !s.isAriaHiddenFocusable);

  function getStopColour(stop) {
    if (stop.isAriaHiddenFocusable) return "#E24B4A";
    if (stop.hasPositiveTabindex)   return "#EF9F27";
    return "#4f8ef7";
  }

  function getIssueLabel(stop) {
    if (stop.isAriaHiddenFocusable) return "Hidden but keyboard reaches it";
    if (stop.hasPositiveTabindex)   return "Skips ahead in tab order";
    return "Normal stop";
  }

  function handleRowToggle(stop) {
    setExpandedStop(prev => prev === stop.index ? null : stop.index);
    onStopClick(stop);
  }

  function handleJump(e, stop) {
    e.stopPropagation();
    onStopClick(stop);
  }

  return (
    <div className="tab-order-panel">
      {/* Header */}
      <div className="tab-order-header">
        <div className="tab-order-header-left">
          <span className="tab-order-title">
            <Icon name="account_tree" size={16} style={{marginRight:6}} />
            Tab order map
          </span>
          <span className="tab-order-count">{stops.length} stops</span>
        </div>
        <button className="btn-stop" onClick={onClose} aria-label="Clear tab order map">Clear</button>
      </div>

      {/* Collapsible info */}
      <button
        className="tab-order-info-toggle"
        onClick={() => setShowInfo(p => !p)}
        aria-expanded={showInfo}
      >
        <Icon name="info_outline" size={16} />
        <span>Tab order map details</span>
        <Icon name={showInfo ? "expand_less" : "expand_more"} size={16} style={{marginLeft:'auto'}} />
      </button>

      {showInfo && (
        <div className="tab-order-info-panel">
          <p>
            When someone uses the keyboard, they press <kbd>Tab</kbd> to jump from one thing to the next. The order should match what they see on the page — top to bottom, left to right. If it skips around or lands on hidden things, it gets confusing.
          </p>
          <p>
            Numbered badges show on the page. Click any row to scroll to it, or click <strong>Details</strong> to see what's wrong and how to fix it.
          </p>
          <p>
            <strong>Important:</strong> Always double-check these results manually. Automated scans can miss issues that only show up when a real person tries to use the page. Tools like this are a starting point, not a complete check.
          </p>
          <p style={{margin:0}}>
            We also can't tell if focus rings are missing automatically. Use <strong>Test with keyboard</strong> from the Focus tab to check that yourself.
          </p>
        </div>
      )}

      {/* Status bar */}
      {issues.length > 0 ? (
        <div className="tab-order-issues-bar">
          ⚠ {issues.length} issue{issues.length !== 1 ? "s" : ""} found · {nonIssues.length} look fine
        </div>
      ) : (
        <div className="tab-order-ok-bar">✓ No tab order issues found in {stops.length} stops</div>
      )}

      {/* Issues group */}
      {issues.length > 0 && (
        <div className="tab-order-group">
          <button
            className="tab-order-group-header tab-order-group-header--issues"
            onClick={() => setShowIssues(p => !p)}
            aria-expanded={showIssues}
          >
            <Icon name="warning_amber" size={18} />
            <span className="tab-order-group-title">Issues to fix</span>
            <span className="tab-order-group-count tab-order-group-count--bad">{issues.length}</span>
            <Icon name={showIssues ? "expand_less" : "expand_more"} size={18} style={{marginLeft:'auto'}} />
          </button>
          {showIssues && (
            <div className="tab-order-rows">
              {issues.map(stop => (
                <TabStopRow
                  key={stop.index}
                  stop={stop}
                  selectedStop={selectedStop}
                  expandedStop={expandedStop}
                  isSelected={selectedStop === stop.index}
                  isExpanded={expandedStop === stop.index}
                  color={getStopColour(stop)}
                  issueLabel={getIssueLabel(stop)}
                  hasIssue={true}
                  onJump={(e) => handleJump(e, stop)}
                  onToggle={() => handleRowToggle(stop)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Non-issues group */}
      {nonIssues.length > 0 && (
        <div className="tab-order-group">
          <button
            className="tab-order-group-header tab-order-group-header--ok"
            onClick={() => setShowNonIssues(p => !p)}
            aria-expanded={showNonIssues}
          >
            <Icon name="check_circle" size={18} />
            <span className="tab-order-group-title">Looks fine</span>
            <span className="tab-order-group-count tab-order-group-count--ok">{nonIssues.length}</span>
            <Icon name={showNonIssues ? "expand_less" : "expand_more"} size={18} style={{marginLeft:'auto'}} />
          </button>
          {showNonIssues && (
            <div className="tab-order-rows">
              {nonIssues.map(stop => (
                <TabStopRow
                  key={stop.index}
                  stop={stop}
                  selectedStop={selectedStop}
                  expandedStop={expandedStop}
                  isSelected={selectedStop === stop.index}
                  isExpanded={expandedStop === stop.index}
                  color={getStopColour(stop)}
                  issueLabel={getIssueLabel(stop)}
                  hasIssue={false}
                  onJump={(e) => handleJump(e, stop)}
                  onToggle={() => handleRowToggle(stop)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single row for the tab order map
function TabStopRow({ stop, isSelected, isExpanded, color, issueLabel, hasIssue, onJump, onToggle }) {
  return (
    <div className={`tab-stop-card ${isSelected ? "tab-stop-card--selected" : ""}`}>
      <div className="tab-stop-card-header">
        <span className="tab-stop-num" style={{background: color}}>{stop.index}</span>
        <div className="tab-stop-card-info">
          <div className="tab-stop-card-label">{stop.label}</div>
          <div
            className="tab-stop-card-type"
            style={{color: hasIssue ? color : 'var(--text2)'}}
          >
            {hasIssue ? '⚠ ' : ''}{issueLabel}
          </div>
        </div>
        <div className="tab-stop-card-actions">
          <button
            className="element-row-btn element-row-btn--jump"
            onClick={onJump}
            aria-label={`Jump to stop ${stop.index} on the page`}
            title="Scroll to this element on the page"
          >
            <Icon name="open_in_new" size={14} />
            Jump to
          </button>
          <button
            className="element-row-btn"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={`Toggle details for stop ${stop.index}`}
          >
            {isExpanded ? 'Hide' : 'Details'}
            <Icon name={isExpanded ? "expand_less" : "expand_more"} size={14} />
          </button>
        </div>
      </div>
      {isExpanded && (
        hasIssue
          ? <TabStopDetail stop={stop} />
          : <TabStopOkDetail stop={stop} />
      )}
    </div>
  );
}

// Details for a passing (non-issue) stop — explains why it's fine
function TabStopOkDetail({ stop }) {
  return (
    <div className="tab-stop-ok-detail">
      <div className="tab-stop-ok-section">
        <div className="tab-stop-ok-label">Why this looks fine</div>
        <p className="tab-stop-ok-text">
          This element follows the natural tab order of the page. It does not use a positive <code>tabindex</code> value (which would skip ahead unexpectedly) and is not inside an <code>aria-hidden</code> container (which would hide it from screen readers).
        </p>
      </div>
      <div className="tab-stop-ok-section">
        <div className="tab-stop-ok-label">Still verify manually</div>
        <p className="tab-stop-ok-text">
          The scan only checks for the most common tab order problems. Manually press <kbd>Tab</kbd> on the page and confirm this element activates as expected — that the right thing happens when you press Enter or Space, that it is visible on screen, and that the focus ring is clear.
        </p>
      </div>
      {stop.tabindex && stop.tabindex !== "0" && (
        <div className="tab-stop-ok-section">
          <div className="tab-stop-ok-label">Technical detail</div>
          <p className="tab-stop-ok-text">
            <code>tabindex="{stop.tabindex}"</code> — this is fine. Only positive values like <code>tabindex="2"</code> cause problems.
          </p>
        </div>
      )}
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

  function statusIcon(hasRing) {
    if (hasRing === true)  return { icon: "check_circle", color: "#16a34a", label: "Visible focus ring" };
    if (hasRing === false) return { icon: "warning_amber", color: "#d97706", label: "Focus ring may be missing" };
    return { icon: "remove", color: "var(--text3)", label: "Detecting…" };
  }

  return (
    <div className="focus-mode-panel">
      <div className="focus-mode-header">
        <span className="focus-mode-title">
          <Icon name="keyboard" size={14} style={{marginRight:6}} />
          Test with keyboard
        </span>
        <button className="btn-stop" onClick={() => {
          chrome.runtime.sendMessage({ type: "STOP_FOCUS_MODE" });
        }}>Stop</button>
      </div>

      <div className="focus-mode-instructions">
        <div className="focus-mode-step">
          <span className="focus-step-num">1</span>
          <span>Click somewhere on the page so it has keyboard focus</span>
        </div>
        <div className="focus-mode-step">
          <span className="focus-step-num">2</span>
          <span>Press <kbd>Tab</kbd> to move forward, <kbd>Shift</kbd>+<kbd>Tab</kbd> to go back</span>
        </div>
        <div className="focus-mode-step">
          <span className="focus-step-num">3</span>
          <span>Watch the box below for each stop. Green = good, amber = look closer</span>
        </div>
      </div>

      {currentStop ? (
        (() => {
          const s = statusIcon(currentStop.hasFocusRing);
          return (
            <div className="focus-current-card" style={{borderColor: s.color}}>
              <div className="focus-current-top">
                <span className="focus-stop-num" style={{background: s.color}}>#{currentStop.stopCount}</span>
                <span className="focus-stop-tag">
                  &lt;{currentStop.tagName?.toLowerCase()}&gt;
                  {currentStop.id ? ` #${currentStop.id}` : ""}
                </span>
              </div>
              <div className="focus-status-row" style={{color: s.color}}>
                <Icon name={s.icon} size={16}/>
                <strong>{s.label}</strong>
              </div>
              {currentStop.hasFocusRing === false && (
                <p className="focus-status-note">
                  We didn't detect an outline or shadow change. Check the page visually — some sites use border or background colour for focus, which we can miss.
                </p>
              )}
            </div>
          );
        })()
      ) : (
        <div className="focus-current-empty">
          <Icon name="keyboard" size={32} style={{opacity:0.4}}/>
          <p>Press <kbd>Tab</kbd> on the page to start.</p>
        </div>
      )}

      {stops.length > 1 && (
        <div className="focus-stops-list">
          <div className="focus-stops-list-title">Recent stops</div>
          {stops.slice(-6).reverse().map((s, i) => {
            const status = statusIcon(s.hasFocusRing);
            return (
              <div key={i} className="focus-stop-row">
                <Icon name={status.icon} size={13} style={{color: status.color, flexShrink:0}}/>
                <span className="focus-stop-n">#{s.stopCount}</span>
                <span className="focus-stop-el">&lt;{s.tagName?.toLowerCase()}&gt;{s.id ? ` #${s.id}` : ""}</span>
              </div>
            );
          })}
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
            {violation.nodes.map((node, i) => (
              <ElementRow key={i} node={node} index={i} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Element row — collapsed by default, expandable for full details ──────────

function getElementType(node) {
  // Parse the element type from the HTML or selector for a friendly label
  const html = node.html || '';
  const match = html.match(/^<(\w+)/i);
  if (match) {
    const tag = match[1].toLowerCase();
    const tagLabels = {
      a: 'Link',
      button: 'Button',
      input: 'Input field',
      textarea: 'Text area',
      select: 'Dropdown',
      img: 'Image',
      svg: 'SVG image',
      h1: 'Heading 1',
      h2: 'Heading 2',
      h3: 'Heading 3',
      h4: 'Heading 4',
      h5: 'Heading 5',
      h6: 'Heading 6',
      p: 'Paragraph',
      div: 'Container',
      span: 'Inline text',
      ul: 'List',
      ol: 'Numbered list',
      li: 'List item',
      nav: 'Navigation',
      header: 'Header',
      footer: 'Footer',
      main: 'Main content',
      section: 'Section',
      article: 'Article',
      label: 'Label',
      form: 'Form',
      table: 'Table',
      iframe: 'Embedded frame',
    };
    return tagLabels[tag] || `<${tag}>`;
  }
  return 'Element';
}

function ElementRow({ node, index }) {
  const [open, setOpen] = useState(false);
  const elementType = getElementType(node);
  const selector = node.target?.[0];

  function handleJump(e) {
    e.stopPropagation();
    if (!selector) return;
    chrome.runtime.sendMessage({
      type: "SCROLL_TO_ELEMENT",
      selector,
    });
  }

  return (
    <div className={`element-row ${open ? 'element-row--open' : ''}`}>
      <div className="element-row-header">
        <span className="element-row-num">#{index + 1}</span>
        <span className="element-row-type">{elementType}</span>
        <div className="element-row-actions">
          {selector && (
            <button
              className="element-row-btn element-row-btn--jump"
              onClick={handleJump}
              aria-label={`Jump to element ${index + 1} on the page`}
              title="Scroll to this element on the page"
            >
              <Icon name="open_in_new" size={14} />
              Jump to
            </button>
          )}
          <button
            className="element-row-btn"
            onClick={() => setOpen(p => !p)}
            aria-expanded={open}
            aria-label={`Toggle details for element ${index + 1}`}
          >
            {open ? 'Hide' : 'Details'}
            <Icon name={open ? "expand_less" : "expand_more"} size={14} />
          </button>
        </div>
      </div>
      {open && (
        <div className="element-row-body">
          {selector && (
            <div className="element-row-section">
              <div className="element-row-label">Selector</div>
              <code className="element-row-code">{selector}</code>
            </div>
          )}
          {node.html && (
            <div className="element-row-section">
              <div className="element-row-label">HTML</div>
              <code className="element-row-code">{node.html.slice(0, 300)}{node.html.length > 300 ? '…' : ''}</code>
            </div>
          )}
          {node.failureSummary && (
            <div className="element-row-section">
              <div className="element-row-label">Why this fails</div>
              <p className="element-row-text">{node.failureSummary}</p>
            </div>
          )}
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
    if (grade <= 12) return `Grade ${grade} (High school level)`;
    return "University / post-secondary level";
  };

  const howToFix = `Your page scores at Grade ${data.grade} reading level. The goal is Grade 8 or below.

Why it matters:
About 1 in 5 adults read at Grade 8 level or lower. Many more read English as a second language. Hard text loses readers.

How to fix it:

1. Make sentences shorter.
   If a sentence has more than 20 words, split it in two.

   Hard:  "If you would like to update the email address that we use to send you notifications, please go to the account settings page where you can make this change."

   Easy:  "Want to change your email? Go to account settings."

2. Use simple words instead of fancy ones.

   Instead of           Use this
   ---------            --------
   utilize              use
   demonstrate          show
   purchase             buy
   commence             start
   subsequently         then
   facilitate           help
   require              need
   approximately        about
   in order to          to
   prior to             before

3. Talk to the reader. Use "you" not "users".

   Hard:  "Users must verify their identity."
   Easy:  "You need to verify it's you."

4. Use active voice.

   Hard:  "The form must be filled out by the user."
   Easy:  "Fill out the form."

5. Add a plain-English summary at the top of complex pages.
   2 or 3 short sentences that explain the page in simple words.

Note: Legal terms, medical words, and code names raise the score. If you must use them, add a plain-English version next to them.`;

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
          <p style={{marginTop:8}}>This score is based on the Flesch-Kincaid formula, applied to all readable text on this page. This includes paragraphs, headings, labels, and error messages. A Grade {data.grade} score means your content is written at a <strong>{gradeLabel(data.grade).toLowerCase()}</strong> reading level.</p>
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

export default function ScanPanel({ tabId, initialTab = "violations", onViolationCount }) {
  const [status, setStatus]         = useState("idle");
  const [errorMsg, setErrorMsg]     = useState("");
  const [violations, setViolations] = useState([]);
  const [passes, setPasses]         = useState([]);
  const [dynamicIssues, setDynamicIssues] = useState([]);
  const [activeTab, setActiveTab]   = useState(initialTab);
  const [impactFilter, setImpactFilter] = useState("All");
  const [expanded, setExpanded]     = useState({});
  const [activeDetailTab, setActiveDetailTab] = useState({});
  const [pageUrl, setPageUrl]       = useState("");
  const [history, setHistory]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [focusMode, setFocusMode]   = useState(false);
  const [tabOrderStops, setTabOrderStops] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [zoomStatus, setZoomStatus] = useState("idle");
  const [zoomViolations, setZoomViolations] = useState([]);
  const [highContrast, setHighContrast] = useState(false);
  const [hcChecklist, setHcChecklist] = useState({});
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [contentStatus, setContentStatus] = useState("idle");
  const [openElementRows, setOpenElementRows] = useState({});

  useEffect(() => {
    if (tabId) chrome.tabs.get(tabId, (t) => {
      if (!chrome.runtime.lastError && t?.url) setPageUrl(t.url);
    });
  }, [tabId]);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") {
        setStatus("idle"); setViolations([]); setPasses([]);
        setDynamicIssues([]); setExpanded({}); setActiveDetailTab({});
        setZoomStatus("idle"); setZoomViolations([]);
        setHighContrast(false); setFocusMode(false); setTabOrderStops(null);
        setContentAnalysis(null); setContentStatus("idle");
        if (msg.tabId) chrome.tabs.get(msg.tabId, (t) => {
          if (!chrome.runtime.lastError && t?.url) setPageUrl(t.url);
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Listen for export trigger from App.jsx
  useEffect(() => {
    const handler = () => setShowExport(true);
    window.addEventListener("al-open-export", handler);
    return () => window.removeEventListener("al-open-export", handler);
  }, []);

  useEffect(() => {
    if (pageUrl) loadHistory(getDomain(pageUrl)).then(setHistory);
  }, [pageUrl]);

  async function runScan() {
    setStatus("scanning");
    setViolations([]); setPasses([]); setDynamicIssues([]);
    setExpanded({}); setActiveDetailTab({});

    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        const err = response?.error || chrome.runtime.lastError?.message || "";
        setErrorMsg(err === "chrome_restricted" ? "chrome_restricted" : "inject_failed");
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
      setActiveTab("violations");

      if (onViolationCount) onViolationCount(sorted.length);

      const domain = getDomain(pageUrl);
      if (domain) {
        const entry = {
          date: new Date().toLocaleString(),
          total: sorted.length,
          critical: sorted.filter(v=>v.impact==="critical").length,
          serious:  sorted.filter(v=>v.impact==="serious").length,
          instances: sorted.reduce((s,v)=>s+v.nodes.length,0),
        };
        await saveHistory(domain, entry);
        loadHistory(domain).then(setHistory);
      }
    });
  }

  function runContentAnalysis() {
    setContentStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_CONTENT_ANALYSIS" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) { setContentStatus("error"); return; }
      setContentAnalysis(response);
      setContentStatus("done");
    });
  }

  function startFocusMode() {
    setFocusMode(true);
    setTabOrderStops(null);
    chrome.runtime.sendMessage({ type: "START_FOCUS_MODE" });
  }
  function stopFocusMode() { setFocusMode(false); }

  function showTabOrderMap() {
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

  function runZoomTest() {
    setZoomStatus("running");
    chrome.runtime.sendMessage({ type: "RUN_ZOOM_TEST" }, (response) => {
      if (!response?.success) { setZoomStatus("idle"); return; }
      const normalIds = new Set(violations.map(v => v.id));
      setZoomViolations(response.violations.filter(v => !normalIds.has(v.id)));
      setZoomStatus("done");
    });
  }

  function toggleHighContrast() {
    const next = !highContrast;
    setHighContrast(next);
    chrome.runtime.sendMessage({ type: next ? "ENABLE_HIGH_CONTRAST" : "DISABLE_HIGH_CONTRAST" });
  }

  function toggleExpanded(id) { setExpanded(p => ({ ...p, [id]: !p[id] })); }

  const filteredViolations = violations.filter(v =>
    impactFilter === "All" || v.impact === impactFilter
  );

  const critCount = violations.filter(v => v.impact === "critical").length;
  const serCount  = violations.filter(v => v.impact === "serious").length;
  const modCount  = violations.filter(v => v.impact === "moderate").length;
  const minCount  = violations.filter(v => v.impact === "minor").length;
  const passCount = passes.length;

  function getComplianceStatus() {
    if (critCount > 0) return { cls: "blocked", label: `${critCount} critical issue${critCount!==1?"s":""} — must fix before launch`, icon: "warning_amber" };
    if (serCount  > 0) return { cls: "atrisk",  label: `${serCount} serious issue${serCount!==1?"s":""} — fix as soon as possible`, icon: "error_outline" };
    if (violations.length > 0) return { cls: "atrisk", label: `${violations.length} minor issue${violations.length!==1?"s":""} found`, icon: "info_outline" };
    return { cls: "clear", label: "No violations found — looking good", icon: "check_circle" };
  }
  const compStatus = getComplianceStatus();

  const IMPACT_DOT_COLOURS = { critical:"#dc2626", serious:"#d97706", moderate:"#2563eb", minor:"#9ca3af" };

  // HC checklist items
  const HC_ITEMS = [
    "Can you still read all the text?",
    "Are buttons still easy to see?",
    "Are icons still visible?",
    "Are form fields still clear?",
    "Is colour-only information still understandable?",
  ];

  function setHcItem(i, val) { setHcChecklist(p => ({ ...p, [i]: { status: val, note: p[i]?.note || "" } })); }
  function setHcNote(i, note) { setHcChecklist(p => ({ ...p, [i]: { ...p[i], note } })); }

  return (
    <div className="scan-panel">

      {/* Error */}
      {status === "error" && (
        <div className="empty-state">
          <Icon name="warning_amber" size={28} style={{color: errorMsg==="chrome_restricted" ? "#5a6070" : "#dc2626", marginBottom:4}} />
          <p style={{fontWeight:600,fontSize:16}}>
            {errorMsg==="chrome_restricted" ? "Can't scan this page" : "Scan failed"}
          </p>
          <p className="empty-hint">
            {errorMsg==="chrome_restricted"
              ? "AccessLens can't run on Chrome's own pages. Go to any website and try again."
              : "Close this panel, navigate to the page, then click the AccessLens icon again."}
          </p>
          {errorMsg !== "chrome_restricted" && (
            <button className="btn-scan" style={{maxWidth:200,marginTop:8}} onClick={runScan}>Try again</button>
          )}
        </div>
      )}

      {/* Scanning */}
      {status === "scanning" && (
        <div className="empty-state">
          <div className="spinner" style={{width:20,height:20,border:"2px solid #e8eaef",borderTopColor:"#2563eb",margin:"0 auto 12px"}} />
          <p style={{fontWeight:600,fontSize:16}}>Scanning…</p>
          <p className="empty-hint">Checking against WCAG 2.2 AA rules</p>
        </div>
      )}

      {/* Idle */}
      {status === "idle" && (
        <div style={{padding:"20px 18px"}}>
          <button className="btn-scan" onClick={runScan} style={{marginBottom:16}}>
            <Icon name="search" size={16} />
            Run scan
          </button>
          <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"14px 16px"}}>
            <div style={{fontSize:16,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>What we check</div>
            {["Missing labels on forms and buttons","Images with no description","Headings in the wrong order","Colour contrast on all text","Keyboard navigation and focus order","30+ WCAG 2.2 AA rules"].map(t => (
              <div key={t} style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:8,fontSize:16,color:"var(--text2)",lineHeight:1.4}}>
                <span style={{color:"var(--green)",flexShrink:0,marginTop:2}}>✓</span>{t}
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
              <span className="summary-num" style={{color: critCount > 0 ? "#E24B4A" : "var(--text3)"}}>{critCount}</span>
              <span className="summary-label" style={{color:"var(--text2)"}}>Critical</span>
            </div>
            <div className="summary-stat">
              <span className="summary-num" style={{color: serCount > 0 ? "#EF9F27" : "var(--text3)"}}>{serCount}</span>
              <span className="summary-label" style={{color:"var(--text2)"}}>Serious</span>
            </div>
            <div className="summary-stat">
              <span className="summary-num" style={{color: passCount > 0 ? "var(--green)" : "var(--text3)"}}>{passCount}</span>
              <span className="summary-label" style={{color:"var(--text2)"}}>Passed</span>
            </div>
            <div className="summary-stat" style={{flexDirection:"row",alignItems:"center",gap:6,padding:"10px 12px"}}>
              <button className="tool-btn" style={{flex:"none",padding:"5px 12px"}} onClick={runScan}>Re-scan</button>
              <button className="tool-btn" style={{flex:"none",padding:"5px 12px"}} onClick={() => setShowExport(true)}>Export</button>
              {history.length > 0 && (
                <button className="tool-btn" style={{flex:"none",padding:"5px 8px"}} onClick={() => setShowHistory(p=>!p)} title="Scan history">⏱</button>
              )}
            </div>
          </div>

          {/* History */}
          {showHistory && (
            <div className="history-panel" style={{margin:"0 0 8px"}}>
              <div className="history-title">{getDomain(pageUrl)} — scan history</div>
              {history.map((h, i) => {
                const lbl = h.critical>0?"Blocked":h.serious>0?"At risk":h.total===0?"Clear":"Minor";
                const col = h.critical>0?"#E24B4A":h.serious>0?"#EF9F27":h.total===0?"var(--green)":"var(--text3)";
                return (
                  <div key={i} className="history-row">
                    <span className="history-status" style={{color:col}}>{lbl}</span>
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
              {id:"violations",label:"Issues",   count: violations.length > 0 ? violations.length : null},
              {id:"focus",     label:"Focus"},
              {id:"visuals",   label:"Visuals",  count: zoomViolations.length > 0 ? zoomViolations.length : null, amber:true},
              {id:"dynamic",   label:"Dynamic",  count: dynamicIssues.length > 0 ? dynamicIssues.length : null, amber:true},
              {id:"content",   label:"Content"},
            ].map(t => (
              <button
                key={t.id}
                className={`subtab ${activeTab===t.id?"subtab--active":""}`}
                onClick={() => { setActiveTab(t.id); if(t.id!=="focus") setFocusMode(false); }}
                role="tab"
                aria-selected={activeTab===t.id}
              >
                {t.label}
                {t.count != null && (
                  <span className={`subtab-count${t.amber?" subtab-count--amber":""}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── ISSUES ── */}
          {activeTab === "violations" && (
            <div>
              <div className="filter-bar">
                <div className="filter-group">
                  <span className="filter-label">Severity</span>
                  {["All","critical","serious","moderate","minor"].map(v => (
                    <button
                      key={v}
                      className={`filter-btn ${impactFilter===v?"filter-btn--active":""}`}
                      onClick={() => setImpactFilter(v)}
                      style={v!=="All" && impactFilter!==v ? {color:IMPACT_COLOURS[v]} : {}}
                    >{v==="All"?"All":v.charAt(0).toUpperCase()+v.slice(1)}</button>
                  ))}
                </div>
              </div>

              {filteredViolations.length === 0 && (
                <div className="empty-state">
                  <span style={{fontSize:28,color:"var(--green)"}}>✓</span>
                  <p style={{fontWeight:600,color:"var(--green)"}}>
                    {violations.length === 0 ? "No violations found" : "No issues match this filter"}
                  </p>
                  <p className="empty-hint">{violations.length===0 ? `${passCount} checks passed` : "Try a different filter"}</p>
                </div>
              )}

              <div className="violations">
                {filteredViolations.map(v => {
                  const isOpen = expanded[v.id];
                  const detailTab = activeDetailTab[v.id] || "why";
                  const ctx = getViolationContext(v.id);
                  const wcagRef = v.tags?.find(t => t.startsWith("wcag") && /\d{3}/.test(t));
                  const wcagLabel = wcagRef ? "WCAG "+wcagRef.replace("wcag","").replace(/(\d)(\d{2})$/,"$1.$2") : "";
                  const impact = v.impact || "minor";

                  return (
                    <div key={v.id} className={`violation violation--${impact} ${isOpen?"violation--active":""}`}>
                      <div className="violation-header" onClick={() => toggleExpanded(v.id)}>
                        <div className="violation-info">
                          <div className="violation-title-row">
                            <span className="violation-title">{v.description}</span>
                          </div>
                          <div className="violation-meta">
                            <span className="impact-badge" style={{color:IMPACT_COLOURS[impact]}}>{impact}</span>
                            <span className="node-count">{v.nodes.length}×</span>
                            {wcagLabel && <span className="wcag-version-badge">{wcagLabel}</span>}
                          </div>
                        </div>
                        <button
                          className="expand-btn"
                          onClick={e => { e.stopPropagation(); toggleExpanded(v.id); }}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? "Close" : "View"}
                          <Icon name={isOpen?"expand_less":"expand_more"} size={14} />
                        </button>
                      </div>

                      {/* Quick actions when closed */}
                      {!isOpen && (
                        <div style={{display:"flex",gap:6,padding:"0 14px 10px"}}>
                          <button className="tool-btn" style={{fontSize:16,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();setExpanded(p=>({...p,[v.id]:true}));setActiveDetailTab(p=>({...p,[v.id]:"why"}));}}>
                            Why it matters
                          </button>
                          <button className="tool-btn" style={{fontSize:16,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();setExpanded(p=>({...p,[v.id]:true}));setActiveDetailTab(p=>({...p,[v.id]:"fix"}));}}>
                            How to fix
                          </button>
                          <button className="tool-btn" style={{fontSize:16,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();const sel=v.nodes?.[0]?.target?.[0];if(sel)chrome.runtime.sendMessage({type:"SCROLL_TO_ELEMENT",selector:sel});}}>
                            Jump ↗
                          </button>
                        </div>
                      )}

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="violation-detail">
                          <div className="detail-tabs">
                            {[{id:"why",label:"Why it matters"},{id:"fix",label:"How to fix"},{id:"elements",label:`Elements (${v.nodes.length})`}].map(t => (
                              <button
                                key={t.id}
                                className={`detail-tab ${detailTab===t.id?"detail-tab--active":""}`}
                                onClick={e=>{e.stopPropagation();setActiveDetailTab(p=>({...p,[v.id]:t.id}));}}
                              >{t.label}</button>
                            ))}
                          </div>
                          <div className="detail-body" onClick={e=>e.stopPropagation()}>
                            {detailTab==="why" && (
                              <>
                                <p className="detail-why">{ctx?.why || v.help}</p>
                                {v.helpUrl && <a href={v.helpUrl} target="_blank" rel="noreferrer" className="violation-link">WCAG documentation ↗</a>}
                              </>
                            )}
                            {detailTab==="fix" && ctx?.fix && (
                              <div className="detail-code"><code>{ctx.fix}</code></div>
                            )}
                            {detailTab==="elements" && (
                              <div className="nodes-list">
                                {v.nodes.map((node, i) => {
                                  const key = v.id+"_"+i;
                                  const isElOpen = openElementRows[key];
                                  const html = node.html || "";
                                  const match = html.match(/^<(\w+)/i);
                                  const tag = match ? match[1].toLowerCase() : "element";
                                  const labels = {a:"Link",button:"Button",input:"Input field",textarea:"Text area",select:"Dropdown",img:"Image",svg:"SVG image",h1:"Heading 1",h2:"Heading 2",h3:"Heading 3",h4:"Heading 4",h5:"Heading 5",h6:"Heading 6",p:"Paragraph",div:"Container",span:"Inline text",nav:"Navigation",form:"Form",label:"Label",table:"Table",li:"List item"};
                                  const typeLabel = labels[tag] || `<${tag}>`;
                                  const selector = node.target?.[0];
                                  return (
                                    <div key={i} className={`element-row ${isElOpen?"element-row--open":""}`}>
                                      <div className="element-row-header">
                                        <span className="element-row-num">#{i+1}</span>
                                        <span className="element-row-type">{typeLabel}</span>
                                        <div className="element-row-actions">
                                          {selector && (
                                            <button className="element-row-btn element-row-btn--jump" onClick={()=>chrome.runtime.sendMessage({type:"SCROLL_TO_ELEMENT",selector})}>
                                              <Icon name="open_in_new" size={13}/> Jump
                                            </button>
                                          )}
                                          <button className="element-row-btn" onClick={()=>setOpenElementRows(p=>({...p,[key]:!p[key]}))}>
                                            {isElOpen?"Hide":"Details"}
                                            <Icon name={isElOpen?"expand_less":"expand_more"} size={13}/>
                                          </button>
                                        </div>
                                      </div>
                                      {isElOpen && (
                                        <div className="element-row-body">
                                          {selector && <div className="element-row-section"><span className="element-row-label">Selector</span><code className="element-row-code">{selector}</code></div>}
                                          {node.html && <div className="element-row-section"><span className="element-row-label">HTML</span><code className="element-row-code">{node.html.slice(0,300)}</code></div>}
                                          {node.failureSummary && <div className="element-row-section"><span className="element-row-label">Why this fails</span><p className="element-row-text">{node.failureSummary}</p></div>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FOCUS TAB ── */}
          {activeTab === "focus" && (
            <div>
              {focusMode ? (
                <FocusModePanel onStop={stopFocusMode} />
              ) : tabOrderStops !== null ? (
                <TabOrderPanel stops={tabOrderStops} selectedStop={selectedStop} onStopClick={handleStopClick} onClose={clearTabOrder} />
              ) : (
                <div className="focus-tab-home">
                  <p style={{fontSize:16,color:"var(--text2)",lineHeight:1.65,marginBottom:4}}>
                    People who can't use a mouse rely on the keyboard. Test that every element is reachable and in the right order.
                  </p>
                  <div className="focus-tool-grid">
                    <button className="focus-tool-card" onClick={startFocusMode}>
                      <div className="focus-tool-icon"><Icon name="keyboard" size={16}/></div>
                      <div className="focus-tool-title">Test with keyboard</div>
                      <div className="focus-tool-desc">Tab through the page and see focus ring detection live</div>
                    </button>
                    <button className="focus-tool-card" onClick={showTabOrderMap}>
                      <div className="focus-tool-icon"><Icon name="account_tree" size={16}/></div>
                      <div className="focus-tool-title">See the order</div>
                      <div className="focus-tool-desc">Number every keyboard stop and check the sequence</div>
                    </button>
                  </div>
                  <div className="info-callout">
                    <Icon name="info_outline" size={14}/>
                    <span>Focus rings can't be detected automatically. Tab through each stop to check manually.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VISUALS TAB ── */}
          {activeTab === "visuals" && (
            <div className="visuals-tab">
              {/* Zoom */}
              <div className="visuals-section">
                <div className="visuals-section-header">
                  <Icon name="zoom_in" size={16} style={{color:"var(--text3)"}}/>
                  <h2 className="visuals-section-title">Zoom test (400%)</h2>
                </div>
                <p className="visuals-section-desc">Some users zoom to 400% to read text. The page must work at that size without horizontal scrolling (WCAG 1.4.10).</p>
                {zoomStatus==="idle" && <button className="btn-scan" style={{maxWidth:220}} onClick={runZoomTest}>Run zoom test</button>}
                {zoomStatus==="running" && (
                  <div style={{display:"flex",alignItems:"center",gap:10,fontSize:16,color:"var(--text3)",padding:"8px 0"}}>
                    <div className="spinner" style={{width:14,height:14,border:"2px solid #e8eaef",borderTopColor:"#2563eb"}}/>
                    Resizing to 320px and scanning…
                  </div>
                )}
                {zoomStatus==="done" && zoomViolations.length===0 && (
                  <div className="visuals-result visuals-result--ok">
                    <Icon name="check_circle" size={16} style={{color:"var(--green)",flexShrink:0}}/>
                    <div><strong>No new issues at 400% zoom</strong><p style={{fontSize:16,color:"var(--text2)",marginTop:2}}>Content reflows correctly. WCAG 1.4.10 passes.</p></div>
                  </div>
                )}
                {zoomStatus==="done" && zoomViolations.length>0 && (
                  <div className="violations" style={{marginTop:8}}>
                    {zoomViolations.map(v => (
                      <div key={v.id} className={`violation violation--${v.impact||"minor"}`}>
                        <div className="violation-header">
                          <div className="violation-info">
                            <div className="violation-title-row"><span className="violation-title">{v.description}</span></div>
                            <div className="violation-meta"><span className="impact-badge" style={{color:IMPACT_COLOURS[v.impact||"minor"]}}>{v.impact}</span><span className="node-count">zoom only</span></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {zoomStatus==="done" && (
                  <button className="btn-rerun" style={{marginTop:8}} onClick={()=>{setZoomStatus("idle");setZoomViolations([]);}}>Run again</button>
                )}
              </div>

              {/* High contrast */}
              <div className="visuals-section">
                <div className="visuals-section-header">
                  <Icon name="contrast" size={16} style={{color:"var(--text3)"}}/>
                  <h2 className="visuals-section-title">High contrast preview</h2>
                </div>
                <p className="visuals-section-desc">Some users rely on high contrast mode. Turn this on and verify everything is still readable.</p>
                <button className="btn-scan" style={{maxWidth:240}} onClick={toggleHighContrast}>
                  {highContrast ? "Turn off high contrast" : "Turn on high contrast"}
                </button>
                {highContrast && (
                  <div className="hc-checklist">
                    <div className="hc-checklist-title">Check these items while HC mode is on:</div>
                    {HC_ITEMS.map((item, i) => {
                      const state = hcChecklist[i];
                      return (
                        <div key={i} className="hc-item">
                          <div className="hc-item-check-btns">
                            <button className={`hc-btn ${state?.status==="pass"?"pass":"unset"}`} onClick={()=>setHcItem(i,"pass")} aria-label={`${item} — pass`}>✓</button>
                            <button className={`hc-btn ${state?.status==="fail"?"fail":"unset"}`} onClick={()=>setHcItem(i,"fail")} aria-label={`${item} — fail`}>✗</button>
                          </div>
                          <div className="hc-item-body">
                            <div className="hc-item-label">{item}</div>
                            {state?.status==="fail" && (
                              <input className="hc-note-input" placeholder="Describe what's wrong…" value={state.note||""} onChange={e=>setHcNote(i,e.target.value)} aria-label={`Notes for: ${item}`}/>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="hc-checklist-hint">Tick ✓ for each item that works. Use ✗ and add a note for anything broken.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DYNAMIC TAB ── */}
          {activeTab === "dynamic" && (
            <div style={{padding:"14px 18px"}}>
              {dynamicIssues.length === 0 ? (
                <div className="tab-explainer">
                  <div className="tab-explainer-title">Form error detection</div>
                  <div className="tab-explainer-body">Catches form validation errors that JavaScript adds after submit. Those errors need <code>role="alert"</code> so screen readers hear them.</div>
                  <div className="tab-step"><span className="tab-step-num">1</span><span>Keep this panel open</span></div>
                  <div className="tab-step"><span className="tab-step-num">2</span><span>Submit a form with empty or invalid fields</span></div>
                  <div className="tab-step"><span className="tab-step-num">3</span><span>Issues appear here automatically</span></div>
                </div>
              ) : (
                <>
                  <div className="dynamic-summary">
                    <Icon name="info_outline" size={14}/>
                    <span><strong>{dynamicIssues.length}</strong> pattern{dynamicIssues.length!==1?"s":""} found. Fix each once to fix all copies.</span>
                  </div>
                  <div className="violations">
                    {(() => {
                      const groups = {};
                      dynamicIssues.forEach(i => { const c=i.category||i.description||"Content"; if(!groups[c])groups[c]=[];groups[c].push(i); });
                      return Object.entries(groups).slice(0,10).map(([cat,items]) => {
                        const total = items.reduce((s,i)=>s+(i.count||1),0);
                        return (
                          <div key={cat} className="violation violation--serious">
                            <div className="violation-header">
                              <div className="violation-info">
                                <div className="violation-title-row"><span className="violation-title">{cat}</span></div>
                                <div className="violation-meta"><span className="impact-badge" style={{color:IMPACT_COLOURS.serious}}>serious</span><span className="node-count">{total}×</span><span className="wcag-version-badge">Missing ARIA</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CONTENT TAB ── */}
          {activeTab === "content" && (
            <div style={{padding:"14px 18px"}}>
              {contentStatus==="idle" && (
                <div className="tab-explainer">
                  <div className="tab-explainer-title">Content analysis</div>
                  <div className="tab-explainer-body">Checks reading level, link text quality, and motion animations on the page.</div>
                  <button className="btn-scan" style={{maxWidth:200,marginTop:4}} onClick={runContentAnalysis}>Analyse content</button>
                </div>
              )}
              {contentStatus==="running" && (
                <div className="empty-state">
                  <div className="spinner" style={{width:18,height:18,border:"2px solid #e8eaef",borderTopColor:"#2563eb",margin:"0 auto 10px"}}/>
                  <p className="empty-hint">Analysing content…</p>
                </div>
              )}
              {contentStatus==="done" && contentAnalysis && (
                <ReadingLevelCard data={contentAnalysis.readingLevel} />
              )}
            </div>
          )}

          {/* Export modal */}
          {showExport && (
            <ExportModal
              scanData={{ violations, passes, dynamicIssues, url: pageUrl }}
              tabOrderStops={tabOrderStops}
              onClose={() => setShowExport(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
