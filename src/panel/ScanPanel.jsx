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
        critical: sorted.filter(v=>v.impact==='critical').length,
        serious:  sorted.filter(v=>v.impact==='serious').length,
        instances: sorted.reduce((s,v) => s+v.nodes.length, 0),
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
        critical: sorted.filter(v=>v.impact==='critical').length,
        serious:  sorted.filter(v=>v.impact==='serious').length,
        instances: sorted.reduce((s,v) => s+v.nodes.length, 0),
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
      setActiveTab("visuals");
    });
  }

  function toggleHighContrast() {
    const next = !highContrast;
    setHighContrast(next);
    chrome.runtime.sendMessage({ type: next ? "ENABLE_HIGH_CONTRAST" : "DISABLE_HIGH_CONTRAST" });
  }

  // Apply filters
  const filteredViolations = violations.filter(v => {
    const principle = getPrinciple(v.id);
    const wcagOk = wcagFilter === "All" || principle === wcagFilter;
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
            Dev mode on. Auto-scanning every {devInterval}s
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

      {/* Tool buttons row — clean: only the primary scan action */}
      <div className="tool-row">
        <button className="btn-scan" onClick={runScan} disabled={status==="scanning"} style={{flex:1}}>
          {status==="scanning" ? <><span className="spinner"/> Scanning…</> : "Run scan"}
        </button>
      </div>

      {/* Export modal */}
      {showExport && (
        <ExportModal
          scanData={{ violations, passes, dynamicIssues, url: pageUrl }}
          tabOrderStops={tabOrderStops}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Summary */}
      {status==="done" && !focusMode && (
        <>
          <div className="summary">
            {/* Status — plain language, no score */}
            {(() => {
              const critical = violations.filter(v=>v.impact==='critical').length;
              const serious  = violations.filter(v=>v.impact==='serious').length;
              const moderate = violations.filter(v=>v.impact==='moderate').length;
              const minor    = violations.filter(v=>v.impact==='minor').length;

              let statusLabel, statusColor, statusBg;
              if (violations.length === 0) {
                statusLabel = 'No violations'; statusColor = '#16a34a'; statusBg = 'rgba(22,163,74,0.1)';
              } else if (critical > 0) {
                statusLabel = 'Fix now'; statusColor = '#E24B4A'; statusBg = 'rgba(226,75,74,0.1)';
              } else if (serious > 0) {
                statusLabel = 'Needs work'; statusColor = '#EF9F27'; statusBg = 'rgba(239,159,39,0.1)';
              } else if (moderate > 0) {
                statusLabel = 'Minor issues'; statusColor = '#4f8ef7'; statusBg = 'rgba(79,142,247,0.1)';
              } else {
                statusLabel = 'Almost clean'; statusColor = '#65a30d'; statusBg = 'rgba(101,163,13,0.1)';
              }

              return (
                <div className="summary-status" style={{background: statusBg, borderColor: statusColor+'33'}}>
                  <span className="summary-status-label" style={{color: statusColor}}>{statusLabel}</span>
                  <div className="summary-impact-row">
                    {critical > 0 && <span className="summary-impact-chip" style={{color:'#E24B4A'}}>{critical} critical</span>}
                    {serious  > 0 && <span className="summary-impact-chip" style={{color:'#EF9F27'}}>{serious} serious</span>}
                    {moderate > 0 && <span className="summary-impact-chip" style={{color:'#4f8ef7'}}>{moderate} moderate</span>}
                    {minor    > 0 && <span className="summary-impact-chip" style={{color:'#888780'}}>{minor} minor</span>}
                    {violations.length === 0 && <span className="summary-impact-chip" style={{color:'#16a34a'}}>All checks passed</span>}
                  </div>
                </div>
              );
            })()}

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
              <div className="history-title">Scan history for {getDomain(pageUrl)}</div>
              {history.map((h, i) => {
                const critical = h.critical || 0;
                const serious  = h.serious  || 0;
                const statusColor = critical>0?"#E24B4A":serious>0?"#EF9F27":h.total===0?"#16a34a":"#4f8ef7";
                const statusLabel = critical>0?"Fix now":serious>0?"Needs work":h.total===0?"No violations":"Minor issues";
                return (
                  <div key={i} className={`history-row ${i===0?"history-row--current":""}`}>
                    <span className="history-grade" style={{color: statusColor, fontSize:16, fontWeight:600}}>{statusLabel}</span>
                    <div className="history-info">
                      <span className="history-date">{h.date}{i===0?" (latest)":""}</span>
                      <span className="history-stats">
                        {critical>0 && <span style={{color:"#E24B4A"}}>{critical} critical </span>}
                        {serious>0  && <span style={{color:"#EF9F27"}}>{serious} serious </span>}
                        <span style={{color:"var(--text3)"}}>{h.total} total</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showHistory && history.length === 0 && (
            <div className="history-panel">
              <p style={{fontSize:16,color:"var(--text3)",padding:"8px 0"}}>No previous scans on this domain.</p>
            </div>
          )}
          <button className="btn-export" onClick={() => setShowExport(true)}>
            ↗ Export report
          </button>
        </>
      )}

      {/* Sub-tabs — render whenever we have any data, not gated to status===done */}
      {(status==="done" || zoomStatus==="done" || zoomViolations.length>0) && !focusMode && (
        <div className="subtabs">
          <button className={`subtab ${activeTab==="violations"?"subtab--active":""}`} onClick={()=>setActiveTab("violations")}>
            Issues {violations.length > 0 && <span className="subtab-count">{violations.length}</span>}
          </button>
          <button className={`subtab ${activeTab==="focus"?"subtab--active":""}`} onClick={()=>setActiveTab("focus")}>
            Focus
          </button>
          <button className={`subtab ${activeTab==="visuals"?"subtab--active":""}`} onClick={()=>setActiveTab("visuals")}>
            Visuals {zoomViolations.length > 0 && <span className="subtab-count subtab-count--amber">{zoomViolations.length}</span>}
          </button>
          <button className={`subtab ${activeTab==="dynamic"?"subtab--active":""}`} onClick={()=>setActiveTab("dynamic")}>
            Dynamic {dynamicIssues.length > 0 && <span className="subtab-count subtab-count--amber">{dynamicIssues.length}</span>}
          </button>
          <button className={`subtab ${activeTab==="content"?"subtab--active":""}`} onClick={()=>setActiveTab("content")}>
            Content {contentAnalysis && contentAnalysis.linkResults?.issues?.length > 0 && <span className="subtab-count subtab-count--amber">{contentAnalysis.linkResults.issues.length}</span>}
          </button>
        </div>
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
          <p style={{fontSize:16, fontWeight:600, color:'var(--text)'}}>Ready to check this page</p>
          <p className="empty-hint" style={{marginTop:8}}>
            Click <strong>Run scan</strong>. We will look for things that make the page hard to use for some people.
          </p>
          <div className="empty-hint" style={{marginTop:14, padding:'12px 14px', background:'var(--bg3)', borderRadius:8, textAlign:'left'}}>
            <strong>What we check:</strong>
            <ul style={{margin:'6px 0 0 0', paddingLeft:18, lineHeight:1.7}}>
              <li>Missing labels on buttons and forms</li>
              <li>Pictures with no description</li>
              <li>Links that say "click here"</li>
              <li>Headings in the wrong order</li>
              <li>Many other rules from WCAG</li>
            </ul>
          </div>
          <p className="empty-hint" style={{marginTop:10}}>
            After scanning, use <strong>Focus</strong> to test the keyboard, <strong>Zoom</strong> to test 400% size, or <strong>HC</strong> for high contrast.
          </p>
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
                      <span className="principle-chevron-icon"><Icon name={isCollapsed?"expand_more":"expand_less"} size={18} /></span>
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
                            <div key={v.id} className={`violation violation--${v.impact || 'minor'} ${isActive?"violation--active":""}`}>
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
                                  <Icon name={isExp ? "expand_less" : "expand_more"} size={16} />
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

      {/* ── Focus tab — all keyboard tools live here ── */}
      {activeTab==="focus" && status==="done" && (
        <div className="focus-tab">
          {/* Tab order map (when active) */}
          {tabOrderStops !== null ? (
            <TabOrderPanel
              stops={tabOrderStops}
              selectedStop={selectedStop}
              onStopClick={handleStopClick}
              onClose={clearTabOrder}
            />
          ) : focusMode ? (
            <FocusModePanel onStop={stopFocusMode} />
          ) : (
            <div className="focus-tab-home">
              <div className="tab-explainer-icon"><Icon name="keyboard" size={24} /></div>
              <div className="tab-explainer-title">Keyboard testing</div>
              <div className="tab-explainer-body">
                People who can't use a mouse rely on the keyboard to use the page. These tools help you check if your page works without a mouse.
              </div>

              <div className="focus-tool-grid">
                <button className="focus-tool-card" onClick={startFocusMode}>
                  <div className="focus-tool-icon"><Icon name="keyboard" size={22} /></div>
                  <div className="focus-tool-title">Test with keyboard</div>
                  <div className="focus-tool-desc">Watch where focus goes as you press Tab. Shows pass or fail for each focus ring.</div>
                </button>

                <button className="focus-tool-card" onClick={showTabOrder}>
                  <div className="focus-tool-icon"><Icon name="account_tree" size={22} /></div>
                  <div className="focus-tool-title">See the order</div>
                  <div className="focus-tool-desc">Shows numbered badges on every keyboard stop so you can spot wrong order or hidden problems.</div>
                </button>
              </div>

              <div className="info-callout">
                <Icon name="info_outline" size={14} />
                <span><strong>Tip:</strong> Test with keyboard works best. It shows real Tab key behaviour and detects most missing focus rings.</span>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab==="focus" && status!=="done" && (
        <div className="tab-explainer">
          <div className="tab-explainer-icon"><Icon name="keyboard" size={24} /></div>
          <div className="tab-explainer-title">Keyboard testing</div>
          <div className="tab-explainer-body">Run a scan first, then come back here to test keyboard navigation.</div>
        </div>
      )}

      {/* ── Visuals tab — zoom test + high contrast preview ── */}
      {activeTab==="visuals" && (
        <div className="visuals-tab">
          {status!=="done" && zoomStatus==="idle" ? (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="zoom_in" size={24} /></div>
              <div className="tab-explainer-title">Visual tests</div>
              <div className="tab-explainer-body">Run a scan first, then come back here to test zoom and high contrast mode.</div>
            </div>
          ) : (
            <>
              {/* Zoom test section */}
              <div className="visuals-section">
                <div className="visuals-section-header">
                  <Icon name="zoom_in" size={18} />
                  <h3 className="visuals-section-title">Zoom test (400%)</h3>
                </div>
                <p className="visuals-section-desc">
                  Some people zoom their browser to read text. The page must still work at 400% zoom (about 320px wide). This test shrinks the page to that size and looks for new problems.
                </p>

                {zoomStatus==="idle" && (
                  <button className="btn-scan" style={{marginTop:8, maxWidth:220}} onClick={runZoomTest}>
                    Run zoom test
                  </button>
                )}
                {zoomStatus==="running" && (
                  <div className="empty-state">
                    <span className="spinner" style={{width:20,height:20,margin:"0 auto 8px"}}/>
                    <p>Resizing to 320px and scanning…</p>
                  </div>
                )}
                {zoomStatus==="done" && zoomViolations.length===0 && (
                  <div className="visuals-result visuals-result--ok">
                    <Icon name="check_circle" size={18} style={{color:"#1D9E75"}}/>
                    <div>
                      <strong>No new problems at 400% zoom.</strong>
                      <p style={{margin:"3px 0 0 0", fontSize:16, color:"var(--text2)"}}>The page reflows correctly. WCAG 1.4.10 passes.</p>
                    </div>
                  </div>
                )}
                {zoomStatus==="done" && zoomViolations.length>0 && (
                  <div className="violations" style={{marginTop:10}}>
                    <p className="zoom-intro">These problems only show up at 400% zoom:</p>
                    {zoomViolations.map(v=>(
                      <div key={v.id} className={`violation violation--${v.impact || 'minor'}`}>
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

              {/* High contrast section */}
              <div className="visuals-section">
                <div className="visuals-section-header">
                  <Icon name="contrast" size={18} />
                  <h3 className="visuals-section-title">High contrast preview</h3>
                </div>
                <p className="visuals-section-desc">
                  Some people turn on high contrast mode to read better. This button copies what they see. When it's on, look at the page and check the list below.
                </p>

                <button
                  className={`btn-scan ${highContrast ? "btn-stop" : ""}`}
                  style={{marginTop:8, maxWidth:220}}
                  onClick={toggleHighContrast}
                >
                  {highContrast ? "Turn off high contrast" : "Turn on high contrast"}
                </button>

                {highContrast && (
                  <div className="hc-checklist">
                    <div className="hc-checklist-title">Look at the page now and check:</div>
                    <ul className="hc-checklist-list">
                      <li>Can you still read all the text?</li>
                      <li>Are buttons still easy to see?</li>
                      <li>Are icons still visible?</li>
                      <li>Are form fields still clear?</li>
                      <li>Is colour-only info still understandable?</li>
                    </ul>
                    <p className="hc-checklist-hint">If anything is missing or invisible, it's a problem for users who rely on high contrast.</p>
                  </div>
                )}
              </div>
            </>
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
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="bolt" size={24} /></div>
              <div className="tab-explainer-title">Form error detection</div>
              <div className="tab-explainer-body">
                This tab catches a specific problem: when a form shows an error message after you submit it, screen readers often never hear it. That's because the error was added to the page by JavaScript <em>after</em> the screen reader already read the page.
              </div>
              <div className="tab-explainer-steps">
                <div className="tab-step"><span className="tab-step-num">1</span>Keep this panel open</div>
                <div className="tab-step"><span className="tab-step-num">2</span>Find a form on the page and submit it with empty or invalid fields</div>
                <div className="tab-step"><span className="tab-step-num">3</span>If error messages appear without <code>role="alert"</code>, they show up here</div>
              </div>
              <div className="tab-explainer-note">
                <strong>Nothing here yet.</strong> This tab only shows issues when JavaScript adds new content to the page. It does not scan existing page content.
              </div>
            </div>
            </div>
          ) : (
            <div className="violations">
              {/* Summary */}
              {(() => {
                const total = dynamicIssues.reduce((s,i) => s + (i.count||1), 0);
                return (
                  <div className="dynamic-summary">
                    <Icon name="info_outline" size={14} />
                    <span>
                      <strong>{dynamicIssues.length}</strong> unique pattern{dynamicIssues.length!==1?"s":""} found
                      {total > dynamicIssues.length ? ` across ${total} elements` : ''}.
                      Fix each pattern once to fix all copies.
                    </span>
                  </div>
                );
              })()}

              {/* Group by category — cap at 10 shown */}
              {(() => {
                const groups = {};
                dynamicIssues.forEach(issue => {
                  const cat = issue.category || issue.description || 'Content';
                  if (!groups[cat]) groups[cat] = [];
                  groups[cat].push(issue);
                });

                const entries = Object.entries(groups).slice(0, 10);
                const hiddenCount = Object.keys(groups).length - entries.length;

                return (
                  <>
                    {entries.map(([category, catIssues]) => {
                      const totalCount = catIssues.reduce((s, i) => s + (i.count || 1), 0);
                      const samples = catIssues.slice(0, 2).map(i => i.sampleText).filter(t => t && t.length > 2);
                      const firstIssue = catIssues[0];

                      return (
                        <div key={category} className="violation">
                          <div className="violation-header">
                            <span className="impact-bar" style={{background:IMPACT_COLOURS.serious}}/>
                            <div className="violation-info">
                              <div className="violation-title-row">
                                <span className="violation-title">{category}</span>
                                <span className="badge-new22" style={{background:"rgba(239,159,39,0.18)",color:"#EF9F27",fontFamily:"var(--mono)",fontSize:16,padding:"2px 7px",borderRadius:4}}>
                                  {totalCount}x
                                </span>
                              </div>
                              <div className="violation-meta">
                                <span className="impact-badge" style={{color:IMPACT_COLOURS.serious}}>serious</span>
                                <span className="wcag-badge">Missing ARIA</span>
                              </div>
                            </div>
                          </div>
                          <div className="violation-detail">
                            <div className="tab-stop-detail-body">
                              {firstIssue.issues.slice(0,1).map((msg, j) => {
                                const isLiveRegion = msg.includes("aria-live") || msg.includes("role=alert");
                                const why = isLiveRegion
                                  ? "Screen readers only read new content inside a live region. Without role=\"alert\" or aria-live, blind users never hear this."
                                  : "Link error messages to inputs using aria-describedby so screen readers read the error when the user focuses the field.";
                                const fix = isLiveRegion
                                  ? `<!-- Errors and alerts -->\n<div role="alert">Something went wrong</div>\n\n<!-- Status updates -->\n<div aria-live="polite">Changes saved</div>`
                                  : `<!-- Give the message an ID -->\n<div id="field-error">Enter a valid email</div>\n\n<!-- Link it to the input -->\n<input type="email" aria-describedby="field-error">`;
                                return (
                                  <div key={j} style={{marginBottom:10}}>
                                    <p className="detail-why" style={{marginBottom:4}}><strong>What is wrong:</strong> {msg}</p>
                                    <p className="detail-why" style={{marginBottom:6}}>{why}</p>
                                    <pre className="detail-code"><code>{fix}</code></pre>
                                  </div>
                                );
                              })}
                              {samples.length > 0 && (
                                <div style={{marginTop:8}}>
                                  <div className="detail-label" style={{marginBottom:6}}>
                                    <Icon name="search" size={12} /> Found on this page
                                  </div>
                                  {samples.map((s, i) => (
                                    <div key={i} className="node-snippet" style={{marginBottom:4}}>
                                      <span className="node-num">#{i+1}</span>
                                      <code style={{fontSize:16,color:"var(--text2)"}}>{s}</code>
                                    </div>
                                  ))}
                                  {totalCount > 2 && (
                                    <p className="nodes-more">+{totalCount - 2} more of this type</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <div className="dynamic-summary" style={{justifyContent:"center",marginTop:6}}>
                        <span style={{color:"var(--text3)",fontSize:16}}>
                          +{hiddenCount} more pattern types. Fix the ones above first.
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
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
                  <Icon name="link" size={16} style={{marginRight:6}} /> Link text
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
