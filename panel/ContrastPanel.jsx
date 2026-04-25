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
  text:    { label: 'Text',    icon: '¶' },
  heading: { label: 'Headings', icon: 'H' },
  link:    { label: 'Links',   icon: '↗' },
  button:  { label: 'Buttons', icon: '□' },
  input:   { label: 'Inputs',  icon: '▭' },
};

function ContrastScanResults({ results, onRescan }) {
  const [collapsed, setCollapsed] = useState({});
  const [filter, setFilter] = useState('failures'); // all|failures|warnings|passes

  const { summary, groups } = results;

  function toggleCollapse(type) {
    setCollapsed(p => ({ ...p, [type]: !p[type] }));
  }

  return (
    <div className="contrast-scan-results">
      {/* Summary bar */}
      <div className="cscan-summary">
        <div className="cscan-stat">
          <span className="cscan-num" style={{ color: summary.failures > 0 ? 'var(--red)' : 'var(--green)' }}>
            {summary.failures}
          </span>
          <span className="cscan-label">AA failures</span>
        </div>
        <div className="cscan-stat">
          <span className="cscan-num" style={{ color: summary.warnings > 0 ? 'var(--amber)' : 'var(--text3)' }}>
            {summary.warnings}
          </span>
          <span className="cscan-label">AAA warnings</span>
        </div>
        <div className="cscan-stat">
          <span className="cscan-num" style={{ color: 'var(--green)' }}>
            {summary.total - summary.failures - summary.warnings}
          </span>
          <span className="cscan-label">passing</span>
        </div>
        <button className="btn-rerun" onClick={onRescan}><Icon name="refresh" size={14} style={{marginRight:4}} />Rescan</button>
      </div>

      {/* Filter */}
      <div className="cscan-filter">
        {['failures', 'warnings', 'all'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Groups */}
      {Object.entries(groups).map(([type, items]) => {
        const filtered = items.filter(item => {
          if (filter === 'failures') return !item.passesAA;
          if (filter === 'warnings') return item.passesAA && !item.passesAAA;
          return true;
        });
        if (filtered.length === 0) return null;

        const failCount = filtered.filter(i => !i.passesAA).length;
        const warnCount = filtered.filter(i => i.passesAA && !i.passesAAA).length;
        const meta = GROUP_LABELS[type] || { label: type, icon: '•' };
        const isCollapsed = collapsed[type];

        return (
          <div key={type} className="cscan-group">
            <button className="cscan-group-header" onClick={() => toggleCollapse(type)}>
              <span className="cscan-group-icon">{meta.icon}</span>
              <span className="cscan-group-label">{meta.label}</span>
              <span className="cscan-group-counts">
                {failCount > 0 && <span className="cscan-fail-badge">{failCount} fail</span>}
                {warnCount > 0 && <span className="cscan-warn-badge">{warnCount} warn</span>}
                <span className="cscan-total-badge">{filtered.length}</span>
              </span>
              <span className="principle-chevron">{isCollapsed ? '▶' : '▼'}</span>
            </button>

            {!isCollapsed && (
              <div className="cscan-items">
                {filtered.map((item, i) => (
                  <div
                    key={i}
                    className={`cscan-item ${!item.passesAA ? 'cscan-item--fail' : item.passesAAA ? 'cscan-item--pass' : 'cscan-item--warn'}`}
                  >
                    <div className="cscan-swatches">
                      <div className="cscan-swatch" style={{ background: item.fg }} title={item.fg} />
                      <span className="cscan-on">on</span>
                      <div className="cscan-swatch" style={{ background: item.bg }} title={item.bg} />
                    </div>
                    <div className="cscan-item-info">
                      <div className="cscan-item-top">
                        <span className="cscan-ratio" style={{
                          color: !item.passesAA ? 'var(--red)' : !item.passesAAA ? 'var(--amber)' : 'var(--green)'
                        }}>
                          {item.ratio}:1
                        </span>
                        <span className="cscan-hex">{item.fg} / {item.bg}</span>
                        {(item.selector || item.text) && (
                          <button
                            className="cscan-jump-btn"
                            title="Jump to this element on the page"
                            onClick={() => chrome.runtime.sendMessage({
                              type: "SCROLL_TO_ELEMENT",
                              selector: item.selector || null,
                              text: item.text || null,
                            })}
                          ><Icon name="open_in_new" size={12} /> Jump</button>
                        )}
                      </div>
                      <div className="cscan-item-badges">
                        <span className={`pass-badge ${item.passesAA ? 'pass-badge--pass' : 'pass-badge--fail'}`}>AA</span>
                        <span className={`pass-badge ${item.passesAAA ? 'pass-badge--pass' : 'pass-badge--fail'}`}>AAA</span>
                        {item.isLargeText && <span className="cscan-large-badge">Large text</span>}
                      </div>
                      {item.text && <div className="cscan-item-text">"{item.text}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {summary.failures === 0 && summary.warnings === 0 && (
        <div className="empty-state empty-state--success" style={{ padding: '24px 0' }}>
          <p>All colour combinations pass WCAG AAA.</p>
        </div>
      )}
    </div>
  );
}

// ── Main ContrastPanel ────────────────────────────────────────────────────────

export default function ContrastPanel({ tabId }) {
  const [mode, setMode] = useState('scan'); // scan|picker|manual
  const [pickerState, setPickerState] = useState('idle');
  const [pickerResult, setPickerResult] = useState(null);
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [scanStatus, setScanStatus] = useState('idle'); // idle|running|done|error
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
      {/* Mode toggle — now three modes */}
      <div className="mode-toggle">
        {[
          { id: 'scan',   label: 'Page scan' },
          { id: 'picker', label: 'Pick element' },
          { id: 'manual', label: 'Manual' },
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
              <div className="tab-explainer-title">Full page contrast scan</div>
              <div className="tab-explainer-body">
                Checks every unique colour combination on the page — text, headings, links, buttons, and inputs — and groups them by element type. Results are sorted with failures first so you can fix the most critical issues quickly.
              </div>
              <div className="tab-explainer-steps">
                <div className="tab-step"><span className="tab-step-num">1</span>Click the button below to scan all elements</div>
                <div className="tab-step"><span className="tab-step-num">2</span>Results show AA/AAA pass/fail per colour combination</div>
                <div className="tab-step"><span className="tab-step-num">3</span>Filter by failures, warnings, or view all</div>
              </div>
              <button className="btn-scan" style={{ marginTop: 14, maxWidth: 200 }} onClick={runContrastScan}>
                Scan page contrast
              </button>
            </div>
          )}

          {scanStatus === 'running' && (
            <div className="empty-state">
              <span className="spinner" style={{ width: 20, height: 20, margin: '0 auto 10px' }} />
              <p>Scanning colour combinations…</p>
              <p className="empty-hint">Checking every unique foreground/background pair on the page.</p>
            </div>
          )}

          {scanStatus === 'error' && (
            <div className="empty-state empty-state--error">
              <p>Could not scan this page.</p>
              <button className="btn-scan" style={{ marginTop: 14, maxWidth: 160, background: 'var(--red)' }} onClick={runContrastScan}>
                ↺ Try again
              </button>
            </div>
          )}

          {scanStatus === 'done' && scanResults && (
            <ContrastScanResults results={scanResults} onRescan={runContrastScan} />
          )}
        </div>
      )}

      {/* ── Picker mode ── */}
      {mode === 'picker' && (
        <div className="picker-mode">
          {pickerState === 'idle' && (
            <div className="picker-prompt">
              <p>Click any text element on the page to instantly check its contrast ratio.</p>
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
                  <span className="swatch-label">Foreground</span>
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

      {/* ── Manual mode ── */}
      {mode === 'manual' && (
        <div className="manual-mode">
          <div className="colour-inputs">
            <div className="colour-field">
              <label>Foreground colour</label>
              <div className="colour-input-row">
                <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="colour-picker-input" />
                <input type="text" value={fg} onChange={e => setFg(e.target.value)} className="hex-input" placeholder="#000000" maxLength={7} />
              </div>
            </div>
            <div className="colour-field">
              <label>Background colour</label>
              <div className="colour-input-row">
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="colour-picker-input" />
                <input type="text" value={bg} onChange={e => setBg(e.target.value)} className="hex-input" placeholder="#ffffff" maxLength={7} />
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
