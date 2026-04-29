import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import { TAB_ISSUE_GUIDANCE, getIssueType } from "../../data/tabIssueGuidance";

// ── Tab-stop detail (when row is expanded) ───────────────────────────────────

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

function TabStopRow({ stop, isSelected, isExpanded, variant, issueLabel, hasIssue, onJump, onToggle }) {
  return (
    <div className={`tab-stop-card tab-stop-card--${variant} ${isSelected ? "tab-stop-card--selected" : ""}`}>
      <div className="tab-stop-card-header">
        <span className={`tab-stop-num tab-stop-num--${variant}`}>{stop.index}</span>
        <div className="tab-stop-card-info">
          <div className="tab-stop-card-label">{stop.label}</div>
          <div className={`tab-stop-card-type ${hasIssue ? "tab-stop-card-type--issue" : ""}`}>
            {hasIssue ? "⚠ " : ""}{issueLabel}
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
            {isExpanded ? "Hide" : "Details"}
            <Icon name={isExpanded ? "expand_less" : "expand_more"} size={14} />
          </button>
        </div>
      </div>
      {isExpanded && (
        hasIssue ? <TabStopDetail stop={stop} /> : <TabStopOkDetail stop={stop} />
      )}
    </div>
  );
}

// ── Tab-order map panel ──────────────────────────────────────────────────────

function TabOrderPanel({ stops, selectedStop, onStopClick, onClose }) {
  const [expandedStop, setExpandedStop] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showIssues, setShowIssues] = useState(true);
  const [showNonIssues, setShowNonIssues] = useState(false);

  const issues    = stops.filter(s => s.hasPositiveTabindex || s.isAriaHiddenFocusable);
  const nonIssues = stops.filter(s => !s.hasPositiveTabindex && !s.isAriaHiddenFocusable);

  function getStopVariant(stop) {
    if (stop.isAriaHiddenFocusable) return "danger";
    if (stop.hasPositiveTabindex)   return "warn";
    return "ok";
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
      <div className="tab-order-header">
        <div className="tab-order-header-left">
          <span className="tab-order-title">
            <Icon name="account_tree" size={16} />
            Tab order map
          </span>
          <span className="tab-order-count">{stops.length} stops</span>
        </div>
        <button className="btn-stop" onClick={onClose} aria-label="Clear tab order map">Clear</button>
      </div>

      <button
        className="tab-order-info-toggle"
        onClick={() => setShowInfo(p => !p)}
        aria-expanded={showInfo}
      >
        <Icon name="info_outline" size={16} />
        <span>Tab order map details</span>
        <Icon name={showInfo ? "expand_less" : "expand_more"} size={16} className="icon-trailing" />
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
          <p>
            We also can't tell if focus rings are missing automatically. Use <strong>Test with keyboard</strong> from the Focus tab to check that yourself.
          </p>
        </div>
      )}

      {issues.length > 0 ? (
        <div className="tab-order-issues-bar">
          ⚠ {issues.length} issue{issues.length !== 1 ? "s" : ""} found · {nonIssues.length} look fine
        </div>
      ) : (
        <div className="tab-order-ok-bar">✓ No tab order issues found in {stops.length} stops</div>
      )}

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
            <Icon name={showIssues ? "expand_less" : "expand_more"} size={18} className="icon-trailing" />
          </button>
          {showIssues && (
            <div className="tab-order-rows">
              {issues.map(stop => (
                <TabStopRow
                  key={stop.index}
                  stop={stop}
                  isSelected={selectedStop === stop.index}
                  isExpanded={expandedStop === stop.index}
                  variant={getStopVariant(stop)}
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
            <Icon name={showNonIssues ? "expand_less" : "expand_more"} size={18} className="icon-trailing" />
          </button>
          {showNonIssues && (
            <div className="tab-order-rows">
              {nonIssues.map(stop => (
                <TabStopRow
                  key={stop.index}
                  stop={stop}
                  isSelected={selectedStop === stop.index}
                  isExpanded={expandedStop === stop.index}
                  variant={getStopVariant(stop)}
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

// ── Live keyboard test panel ─────────────────────────────────────────────────

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
  }, [stops, onStop]);

  function statusIcon(hasRing) {
    if (hasRing === true)  return { icon: "check_circle",  variant: "ok",      label: "Visible focus ring" };
    if (hasRing === false) return { icon: "warning_amber", variant: "warn",    label: "Focus ring may be missing" };
    return                        { icon: "remove",        variant: "pending", label: "Detecting…" };
  }

  return (
    <div className="focus-mode-panel">
      <div className="focus-mode-header">
        <span className="focus-mode-title">
          <Icon name="keyboard" size={14} />
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
            <div className={`focus-current-card focus-current-card--${s.variant}`}>
              <div className="focus-current-top">
                <span className={`focus-stop-num focus-stop-num--${s.variant}`}>#{currentStop.stopCount}</span>
                <span className="focus-stop-tag">
                  &lt;{currentStop.tagName?.toLowerCase()}&gt;
                  {currentStop.id ? ` #${currentStop.id}` : ""}
                </span>
              </div>
              <div className={`focus-status-row focus-status-row--${s.variant}`}>
                <Icon name={s.icon} size={16}/>
                <strong>{s.label}</strong>
              </div>
              {currentStop.hasFocusRing === false && (
                <p className="focus-status-note">
                  We didn't detect an outline or shadow change. Check the page visually — some sites use border or background color for focus, which we can miss.
                </p>
              )}
            </div>
          );
        })()
      ) : (
        <div className="focus-current-empty">
          <Icon name="keyboard" size={32} className="focus-empty-icon"/>
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
                <Icon name={status.icon} size={13} className={`focus-stop-icon focus-stop-icon--${status.variant}`}/>
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

// ── Focus tool home (the two cards) ──────────────────────────────────────────

export default function Focus() {
  const [focusMode, setFocusMode] = useState(false);
  const [tabOrderStops, setTabOrderStops] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);

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

  if (focusMode) return <FocusModePanel onStop={stopFocusMode} />;
  if (tabOrderStops !== null) {
    return (
      <TabOrderPanel
        stops={tabOrderStops}
        selectedStop={selectedStop}
        onStopClick={handleStopClick}
        onClose={clearTabOrder}
      />
    );
  }

  return (
    <div className="focus-tab-home">
      <p className="focus-tab-intro">
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
  );
}
