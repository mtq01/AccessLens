import { Icon } from "./icons";
import { useState, useEffect } from "react";

// ── Colour math ───────────────────────────────────────────────────────────────

function parseRgb(str) {
  const m = str?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function luminance([r, g, b]) {
  return [r, g, b].reduce((sum, v, i) => {
    const s = v / 255;
    const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return sum + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function getResults(ratio) {
  return {
    aa_normal:  ratio >= 4.5,
    aa_large:   ratio >= 3.0,
    aaa_normal: ratio >= 7.0,
    aaa_large:  ratio >= 4.5,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pass({ pass }) {
  return (
    <span className={`pass-badge ${pass ? 'pass-badge--pass' : 'pass-badge--fail'}`}>
      {pass ? 'Pass' : 'Fail'}
    </span>
  );
}

function RatioDisplay({ ratio, results }) {
  if (!ratio || !results) return null;
  return (
    <div className="ratio-display">
      <div className="ratio-number" style={{ color: results.aa_normal ? 'var(--green)' : 'var(--red)' }}>
        {ratio.toFixed(2)}:1
      </div>
      <div className="ratio-grid">
        {[
          { label: 'AA normal text',  req: '≥ 4.5:1', pass: results.aa_normal },
          { label: 'AA large text',   req: '≥ 3.0:1', pass: results.aa_large },
          { label: 'AAA normal text', req: '≥ 7.0:1', pass: results.aaa_normal },
          { label: 'AAA large text',  req: '≥ 4.5:1', pass: results.aaa_large },
        ].map(row => (
          <div key={row.label} className="ratio-row">
            <span className="ratio-label">{row.label}</span>
            <span className="ratio-req">{row.req}</span>
            <Pass pass={row.pass} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Contrast scan results ─────────────────────────────────────────────────────

const GROUP_LABELS = {
  text:    { label: 'Text',     icon: '¶' },
  heading: { label: 'Headings', icon: 'H' },
  link:    { label: 'Links',    icon: '↗' },
  button:  { label: 'Buttons',  icon: '□' },
  input:   { label: 'Inputs',   icon: '▭' },
};

// Conservative thresholds to reduce false positives.
// DOM-based contrast reading has inherent measurement error.
// We only flag as definite failures when the ratio is clearly bad.
// Borderline cases are shown as warnings to check manually.
const FAIL_THRESHOLD    = 3.0; // below this for normal text = definite failure
const WARNING_THRESHOLD = 4.5; // below this = may fail, verify manually

function getItemStatus(item) {
  if (!item.passesAA) {
    // Only mark as definite fail if clearly below threshold
    if (item.ratio < FAIL_THRESHOLD) return 'fail';
    return 'warn'; // borderline — flag as warning not definite failure
  }
  if (!item.passesAAA) return 'warn';
  return 'pass';
}

function ContrastScanResults({ results, onRescan, onVerify }) {
  const [collapsed, setCollapsed] = useState({});
  const [filter, setFilter] = useState('failures');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { summary, groups } = results;

  let definiteFails = 0;
  let warnings = 0;
  Object.values(groups).forEach(items => {
    items.forEach(item => {
      const status = getItemStatus(item);
      if (status === 'fail') definiteFails++;
      else if (status === 'warn') warnings++;
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
            className={`cscan-stat-card cscan-stat-card--fail ${filter==='failures'?'cscan-stat-card--active':''}`}
            onClick={() => setFilter('failures')}
            aria-pressed={filter==='failures'}
          >
            <span className="cscan-stat-num">{definiteFails}</span>
            <span className="cscan-stat-text">likely failing</span>
          </button>
          <button
            className={`cscan-stat-card cscan-stat-card--warn ${filter==='warnings'?'cscan-stat-card--active':''}`}
            onClick={() => setFilter('warnings')}
            aria-pressed={filter==='warnings'}
          >
            <span className="cscan-stat-num">{warnings}</span>
            <span className="cscan-stat-text">borderline</span>
          </button>
          <button
            className={`cscan-stat-card cscan-stat-card--pass ${filter==='all'?'cscan-stat-card--active':''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter==='all'}
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
            <Icon name={showHowItWorks ? 'expand_less' : 'expand_more'} size={16} />
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
            {' '}Automated scanning reads CSS values but cannot see gradients, images, or overlapping elements.
          </p>
          <p>
            <strong>Results are grouped by colour pair.</strong>
            {' '}If 50 elements use the same colours, they count as one pair. Fix the pair, fix all 50.
          </p>
          <p>
            To confirm any result, click <strong>Check</strong> next to it. The colours open in the eyedropper tab so you can verify visually.
          </p>
        </section>
      )}

      {/* Groups */}
      {Object.entries(groups).map(([type, items]) => {
        const filtered = items.filter(item => {
          const status = getItemStatus(item);
          if (filter === 'failures') return status === 'fail';
          if (filter === 'warnings') return status === 'warn';
          return true;
        });
        if (filtered.length === 0) return null;

        const failCount = filtered.filter(i => getItemStatus(i) === 'fail').length;
        const warnCount = filtered.filter(i => getItemStatus(i) === 'warn').length;
        const meta = GROUP_LABELS[type] || { label: type, icon: '•' };
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
              <span className="principle-chevron-icon"><Icon name={isCollapsed ? "expand_more" : "expand_less"} size={18} /></span>
            </button>

            {!isCollapsed && (
              <div className="cscan-items">
                {filtered.map((item, i) => {
                  const status = getItemStatus(item);
                  const statusColor = status === 'fail' ? 'var(--red)' : status === 'warn' ? 'var(--amber)' : 'var(--green)';
                  const statusLabel = status === 'fail' ? 'Likely failing' : status === 'warn' ? 'Borderline — verify' : 'Passing';
                  const reqText = item.isLargeText ? 'needs 3.0:1 (large text)' : 'needs 4.5:1 (normal text)';

                  return (
                    <div key={i} className={`cscan-item cscan-item--${status}`}>
                      {/* Colour preview row — always visible */}
                      <div className="cscan-preview-row">
                        <div className="cscan-colour-preview" style={{ background: item.bg }}>
                          <span style={{ color: item.fg, fontSize: 16, fontWeight: 600 }}>
                            {item.text ? `"${item.text}"` : 'Sample text'}
                          </span>
                        </div>
                        <div className="cscan-preview-meta">
                          <div className="cscan-preview-top">
                            <span className="cscan-ratio" style={{ color: statusColor, fontWeight: 700 }}>
                              {item.ratio}:1
                            </span>
                            <span className="cscan-status-pill" style={{
                              background: status === 'fail' ? 'var(--red-bg)' : status === 'warn' ? 'var(--amber-bg)' : 'var(--green-bg)',
                              color: statusColor,
                            }}>{statusLabel}</span>
                          </div>
                          <div className="cscan-hex-row">
                            <div className="cscan-swatch-mini" style={{ background: item.fg }} />
                            <code className="cscan-hex">{item.fg}</code>
                            <span style={{ color: 'var(--text3)', fontSize: 16 }}>on</span>
                            <div className="cscan-swatch-mini" style={{ background: item.bg }} />
                            <code className="cscan-hex">{item.bg}</code>
                          </div>
                          <div style={{ fontSize: 16, color: 'var(--text3)', marginTop: 2 }}>
                            {item.isLargeText ? 'Large text' : 'Normal text'} · {reqText}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
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
                          title="Open these colours in Check colours tab to confirm"
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
        <div className="empty-state empty-state--success" style={{ padding: '24px 0' }}>
          <p>No contrast issues found.</p>
        </div>
      )}
    </div>
  );
}

// ── Eyedropper button ─────────────────────────────────────────────────────────

function EyedropperBtn({ onPick, label }) {
  const [supported] = useState(() => 'EyeDropper' in window);

  async function pick() {
    if (!supported) return;
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      onPick(result.sRGBHex);
    } catch(e) {
      // user cancelled
    }
  }

  if (!supported) return null;

  return (
    <button
      className="eyedropper-btn"
      onClick={pick}
      title={`Pick ${label} colour from screen`}
    >
      <Icon name="colorize" size={15} />
    </button>
  );
}

// ── Main ContrastPanel ────────────────────────────────────────────────────────

export default function ContrastPanel({ tabId }) {
  const [mode, setMode] = useState('scan');
  const [pickerState, setPickerState] = useState('idle');
  const [pickerResult, setPickerResult] = useState(null);
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanResults, setScanResults] = useState(null);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'PICKER_RESULT') {
        const fgRgb = parseRgb(msg.fg);
        const bgRgb = parseRgb(msg.bg);
        if (fgRgb && bgRgb) {
          setPickerResult({ fg: rgbToHex(fgRgb), bg: rgbToHex(bgRgb), fgRgb, bgRgb });
          setPickerState('done');
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  function startPicker() {
    setPickerState('waiting');
    setPickerResult(null);
    chrome.runtime.sendMessage({ type: 'START_PICKER' });
  }

  function runContrastScan() {
    setScanStatus('running');
    setScanResults(null);
    chrome.runtime.sendMessage({ type: 'SCAN_CONTRAST' }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        setScanStatus('error');
        return;
      }
      setScanResults(response.results);
      setScanStatus('done');
    });
  }

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const manualRatio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : null;
  const manualResults = manualRatio ? getResults(manualRatio) : null;

  const pickerRatio = pickerResult ? contrastRatio(pickerResult.fgRgb, pickerResult.bgRgb) : null;
  const pickerResults = pickerRatio ? getResults(pickerRatio) : null;

  return (
    <div className="contrast-panel">
      {/* Mode tabs — renamed for clarity */}
      <div className="mode-toggle">
        {[
          { id: 'scan',   label: 'Page scan' },
          { id: 'picker', label: 'Pick element' },
          { id: 'manual', label: 'Check colours' },
        ].map(m => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? 'mode-btn--active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Scan mode ── */}
      {mode === 'scan' && (
        <div className="scan-mode">
          {scanStatus === 'idle' && (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="palette" size={24} /></div>
              <div className="tab-explainer-title">Check the colours on this page</div>
              <div className="tab-explainer-body">
                This tool looks at the text and background colours on the page. It tells you if the text is hard to read.
              </div>
              <div className="tab-explainer-section-label">What it can do:</div>
              <ul className="tab-explainer-list">
                <li>Find text that is too light to read</li>
                <li>Group results by type (links, buttons, headings)</li>
                <li>Show you where each problem is on the page</li>
              </ul>
              <div className="tab-explainer-section-label">What it can't do:</div>
              <ul className="tab-explainer-list">
                <li>See colours from images or photos</li>
                <li>See colours from backgrounds with patterns</li>
                <li>Always be 100% right (some results need a second look)</li>
              </ul>
              <div className="tab-explainer-steps">
                <div className="tab-step"><span className="tab-step-num">1</span>Click the button below to start</div>
                <div className="tab-step"><span className="tab-step-num">2</span>Look at the list of issues we found</div>
                <div className="tab-step"><span className="tab-step-num">3</span>Click <strong>Find on page</strong> to see where it is, or <strong>Check</strong> with the eyedropper to double-check</div>
              </div>
              <button className="btn-scan" style={{ marginTop: 14, maxWidth: 220 }} onClick={runContrastScan}>
                Start the colour check
              </button>
            </div>
          )}

          {scanStatus === 'running' && (
            <div className="empty-state">
              <span className="spinner" style={{ width: 20, height: 20, margin: '0 auto 10px' }} />
              <p>Looking at all the colours…</p>
            </div>
          )}

          {scanStatus === 'error' && (
            <div className="empty-state empty-state--error">
              <p>Could not scan this page.</p>
              <button className="btn-scan" style={{ marginTop: 14, maxWidth: 160, background: 'var(--red)' }} onClick={runContrastScan}>
                Try again
              </button>
            </div>
          )}

          {scanStatus === 'done' && scanResults && (
            <ContrastScanResults results={scanResults} onRescan={runContrastScan} onVerify={(fg, bg) => { setFg(fg); setBg(bg); setMode("manual"); }} />
          )}
        </div>
      )}

      {/* ── Pick element mode ── */}
      {mode === 'picker' && (
        <div className="picker-mode">
          {pickerState === 'idle' && (
            <div className="picker-prompt">
              <p>Click any text element on the page to check its contrast ratio instantly.</p>
              <button className="btn-scan" onClick={startPicker}>Pick an element</button>
            </div>
          )}
          {pickerState === 'waiting' && (
            <div className="picker-waiting">
              <div className="crosshair-icon"><Icon name="gps_fixed" size={36} /></div>
              <p>Click any element on the page…</p>
              <button className="btn-cancel" onClick={() => setPickerState('idle')}>Cancel</button>
            </div>
          )}
          {pickerState === 'done' && pickerResult && (
            <div className="picker-result">
              <div className="swatch-row">
                <div className="swatch-item">
                  <div className="swatch" style={{ background: pickerResult.fg }} />
                  <span className="swatch-label">Text colour</span>
                  <code className="swatch-hex">{pickerResult.fg}</code>
                </div>
                <div className="swatch-item">
                  <div className="swatch" style={{ background: pickerResult.bg }} />
                  <span className="swatch-label">Background</span>
                  <code className="swatch-hex">{pickerResult.bg}</code>
                </div>
              </div>
              <RatioDisplay ratio={pickerRatio} results={pickerResults} />
              <button className="btn-scan" style={{ marginTop: 14 }} onClick={startPicker}>
                Pick another element
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Check colours mode (was "Manual") ── */}
      {mode === 'manual' && (
        <div className="manual-mode">
          <p className="manual-intro">
            Type or paste hex colours below, or use the eyedropper to sample any colour on your screen.
          </p>
          <div className="colour-inputs">
            <div className="colour-field">
              <label>Text colour</label>
              <div className="colour-input-row">
                <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="colour-picker-input" />
                <input
                  type="text" value={fg}
                  onChange={e => setFg(e.target.value)}
                  className="hex-input" placeholder="#000000" maxLength={7}
                />
                <EyedropperBtn label="text" onPick={setFg} />
              </div>
            </div>
            <div className="colour-field">
              <label>Background colour</label>
              <div className="colour-input-row">
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="colour-picker-input" />
                <input
                  type="text" value={bg}
                  onChange={e => setBg(e.target.value)}
                  className="hex-input" placeholder="#ffffff" maxLength={7}
                />
                <EyedropperBtn label="background" onPick={setBg} />
              </div>
            </div>
          </div>
          <div className="preview" style={{ background: bg, color: fg }}>
            <span className="preview-normal">Aa Normal text (16px)</span>
            <span className="preview-large">Aa Large text (24px)</span>
          </div>
          <RatioDisplay ratio={manualRatio} results={manualResults} />
        </div>
      )}
    </div>
  );
}
