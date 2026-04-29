import { useState } from "react";
import { Icon } from "../Icon";

const GROUP_LABELS = {
  text:    { label: "Text",     icon: "¶" },
  heading: { label: "Headings", icon: "H" },
  link:    { label: "Links",    icon: "↗" },
  button:  { label: "Buttons",  icon: "□" },
  input:   { label: "Inputs",   icon: "▭" },
};

// Conservative thresholds to reduce false positives.
// DOM-based contrast reading has inherent measurement error.
// Borderline cases are shown as warnings to check manually.
const FAIL_THRESHOLD = 3.0; // below this for normal text = definite failure

function getItemStatus(item) {
  if (!item.passesAA) {
    if (item.ratio < FAIL_THRESHOLD) return "fail";
    return "warn";
  }
  if (!item.passesAAA) return "warn";
  return "pass";
}

export default function ScanResults({ results, onRescan, onVerify }) {
  const [collapsed, setCollapsed] = useState({});
  const [filter, setFilter] = useState("failures");
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { summary, groups } = results;

  let definiteFails = 0;
  let warnings = 0;
  Object.values(groups).forEach(items => {
    items.forEach(item => {
      const status = getItemStatus(item);
      if (status === "fail") definiteFails++;
      else if (status === "warn") warnings++;
    });
  });

  const passingPairs = summary.total - definiteFails - warnings;

  function toggleCollapse(type) {
    setCollapsed(p => ({ ...p, [type]: !p[type] }));
  }

  return (
    <div className="contrast-scan-results">
      {/* Single hero section — stats + actions */}
      <section className="cscan-hero" aria-label="Contrast scan summary">
        <div className="cscan-hero-stats">
          <button
            className={`cscan-stat-card cscan-stat-card--fail ${filter==="failures"?"cscan-stat-card--active":""}`}
            onClick={() => setFilter("failures")}
            aria-pressed={filter==="failures"}
          >
            <span className="cscan-stat-num">{definiteFails}</span>
            <span className="cscan-stat-text">likely failing</span>
          </button>
          <button
            className={`cscan-stat-card cscan-stat-card--warn ${filter==="warnings"?"cscan-stat-card--active":""}`}
            onClick={() => setFilter("warnings")}
            aria-pressed={filter==="warnings"}
          >
            <span className="cscan-stat-num">{warnings}</span>
            <span className="cscan-stat-text">borderline</span>
          </button>
          <button
            className={`cscan-stat-card cscan-stat-card--pass ${filter==="all"?"cscan-stat-card--active":""}`}
            onClick={() => setFilter("all")}
            aria-pressed={filter==="all"}
          >
            <span className="cscan-stat-num">{passingPairs}</span>
            <span className="cscan-stat-text">passing</span>
          </button>
        </div>

        <div className="cscan-hero-actions">
          <button
            className="cscan-howto-toggle"
            onClick={() => setShowHowItWorks(p => !p)}
            aria-expanded={showHowItWorks}
            aria-label="Toggle how this works information"
          >
            <Icon name="info_outline" size={16} />
            How this works
            <Icon name={showHowItWorks ? "expand_less" : "expand_more"} size={16} />
          </button>
          <button className="btn-rerun" onClick={onRescan} aria-label="Rescan page contrast">
            <Icon name="refresh" size={16} />
            Rescan
          </button>
        </div>
      </section>

      {/* Collapsible explainer */}
      {showHowItWorks && (
        <section className="cscan-explainer" aria-label="How contrast scanning works">
          <p>
            <strong>These are candidates to review, not confirmed failures.</strong>
            {" "}Automated scanning reads CSS values but cannot see gradients, images, or overlapping elements.
          </p>
          <p>
            <strong>Results are grouped by color pair.</strong>
            {" "}If 50 elements use the same colors, they count as one pair. Fix the pair, fix all 50.
          </p>
          <p>
            To confirm any result, click <strong>Check</strong> next to it. The colors open in the eyedropper tab so you can verify visually.
          </p>
        </section>
      )}

      {/* Groups */}
      {Object.entries(groups).map(([type, items]) => {
        const filtered = items.filter(item => {
          const status = getItemStatus(item);
          if (filter === "failures") return status === "fail";
          if (filter === "warnings") return status === "warn";
          return true;
        });
        if (filtered.length === 0) return null;

        const failCount = filtered.filter(i => getItemStatus(i) === "fail").length;
        const warnCount = filtered.filter(i => getItemStatus(i) === "warn").length;
        const meta = GROUP_LABELS[type] || { label: type, icon: "•" };
        const isCollapsed = collapsed[type];

        return (
          <div key={type} className="cscan-group">
            <button className="cscan-group-header" onClick={() => toggleCollapse(type)}>
              <span className="cscan-group-icon">{meta.icon}</span>
              <span className="cscan-group-label">{meta.label}</span>
              <span className="cscan-group-counts">
                {failCount > 0 && <span className="cscan-fail-badge">{failCount} fail</span>}
                {warnCount > 0 && <span className="cscan-warn-badge">{warnCount} check</span>}
                <span className="cscan-total-badge">{filtered.length}</span>
              </span>
              <span className="principle-chevron-icon">
                <Icon name={isCollapsed ? "expand_more" : "expand_less"} size={18} />
              </span>
            </button>

            {!isCollapsed && (
              <div className="cscan-items">
                {filtered.map((item, i) => {
                  const status = getItemStatus(item);
                  const statusLabel = status === "fail" ? "Likely failing" : status === "warn" ? "Borderline — verify" : "Passing";
                  const reqText = item.isLargeText ? "needs 3.0:1 (large text)" : "needs 4.5:1 (normal text)";

                  return (
                    <div key={i} className={`cscan-item cscan-item--${status}`}>
                      <div className="cscan-preview-row">
                        <div className="cscan-color-preview" style={{ background: item.bg }}>
                          <span className="cscan-preview-text" style={{ color: item.fg }}>
                            {item.text ? `"${item.text}"` : "Sample text"}
                          </span>
                        </div>
                        <div className="cscan-preview-meta">
                          <div className="cscan-preview-top">
                            <span className={`cscan-ratio cscan-ratio--${status}`}>
                              {item.ratio}:1
                            </span>
                            <span className={`cscan-status-pill cscan-status-pill--${status}`}>{statusLabel}</span>
                          </div>
                          <div className="cscan-hex-row">
                            <div className="cscan-swatch-mini" style={{ background: item.fg }} />
                            <code className="cscan-hex">{item.fg}</code>
                            <span className="cscan-hex-on">on</span>
                            <div className="cscan-swatch-mini" style={{ background: item.bg }} />
                            <code className="cscan-hex">{item.bg}</code>
                          </div>
                          <div className="cscan-size-note">
                            {item.isLargeText ? "Large text" : "Normal text"} · {reqText}
                          </div>
                        </div>
                      </div>

                      <div className="cscan-actions">
                        {item.selector && (
                          <button
                            className="cscan-jump-btn"
                            title="Scroll to and highlight this element on the page"
                            onClick={() => chrome.runtime.sendMessage({
                              type: "SCROLL_TO_ELEMENT",
                              selector: item.selector,
                              text: item.text || null,
                            })}
                          >
                            <Icon name="open_in_new" size={12} /> Find on page
                          </button>
                        )}
                        <button
                          className="cscan-verify-btn"
                          title="Open these colors in Check colors tab to confirm"
                          onClick={() => onVerify(item.fg, item.bg)}
                        >
                          <Icon name="colorize" size={12} /> Check
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {definiteFails === 0 && warnings === 0 && (
        <div className="empty-state empty-state--success">
          <p>No contrast issues found.</p>
        </div>
      )}
    </div>
  );
}
