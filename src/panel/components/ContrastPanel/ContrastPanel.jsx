import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import ScanResults from "./ScanResults";
import { parseRgb, hexToRgb, rgbToHex, contrastRatio, getContrastResults } from "../../utils";

// ── Sub-components ────────────────────────────────────────────────────────────

function Pass({ pass }) {
  return (
    <span className={`pass-badge ${pass ? "pass-badge--pass" : "pass-badge--fail"}`}>
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

function RatioDisplay({ ratio, results }) {
  if (!ratio || !results) return null;
  return (
    <div className="ratio-display">
      <div className={`ratio-number ratio-number--${results.aa_normal ? "pass" : "fail"}`}>
        {ratio.toFixed(2)}:1
      </div>
      <div className="ratio-grid">
        {[
          { label: "AA normal text",  req: "≥ 4.5:1", pass: results.aa_normal },
          { label: "AA large text",   req: "≥ 3.0:1", pass: results.aa_large },
          { label: "AAA normal text", req: "≥ 7.0:1", pass: results.aaa_normal },
          { label: "AAA large text",  req: "≥ 4.5:1", pass: results.aaa_large },
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

function EyedropperBtn({ onPick, label }) {
  const [supported] = useState(() => "EyeDropper" in window);

  async function pick() {
    if (!supported) return;
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      onPick(result.sRGBHex);
    } catch {
      // user cancelled
    }
  }

  if (!supported) return null;

  return (
    <button
      className="eyedropper-btn"
      onClick={pick}
      title={`Pick ${label} color from screen`}
    >
      <Icon name="colorize" size={15} />
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ContrastPanel() {
  const [mode, setMode] = useState("scan");
  const [pickerState, setPickerState] = useState("idle");
  const [pickerResult, setPickerResult] = useState(null);
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanResults, setScanResults] = useState(null);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "PICKER_RESULT") {
        const fgRgb = parseRgb(msg.fg);
        const bgRgb = parseRgb(msg.bg);
        if (fgRgb && bgRgb) {
          setPickerResult({ fg: rgbToHex(fgRgb), bg: rgbToHex(bgRgb), fgRgb, bgRgb });
          setPickerState("done");
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  function startPicker() {
    setPickerState("waiting");
    setPickerResult(null);
    chrome.runtime.sendMessage({ type: "START_PICKER" });
  }

  function runContrastScan() {
    setScanStatus("running");
    setScanResults(null);
    chrome.runtime.sendMessage({ type: "SCAN_CONTRAST" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        setScanStatus("error");
        return;
      }
      setScanResults(response.results);
      setScanStatus("done");
    });
  }

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const manualRatio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : null;
  const manualResults = manualRatio ? getContrastResults(manualRatio) : null;

  const pickerRatio = pickerResult ? contrastRatio(pickerResult.fgRgb, pickerResult.bgRgb) : null;
  const pickerResults = pickerRatio ? getContrastResults(pickerRatio) : null;

  return (
    <div className="contrast-panel">
      {/* Mode tabs */}
      <div className="mode-toggle">
        {[
          { id: "scan",   label: "Page scan" },
          { id: "picker", label: "Pick element" },
          { id: "manual", label: "Check colors" },
        ].map(m => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? "mode-btn--active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Scan mode ── */}
      {mode === "scan" && (
        <div className="scan-mode">
          {scanStatus === "idle" && (
            <div className="tab-explainer">
              <div className="tab-explainer-icon"><Icon name="palette" size={24} /></div>
              <div className="tab-explainer-title">Check the colors on this page</div>
              <div className="tab-explainer-body">
                This tool looks at the text and background colors on the page. It tells you if the text is hard to read.
              </div>
              <div className="tab-explainer-section-label">What it can do:</div>
              <ul className="tab-explainer-list">
                <li>Find text that is too light to read</li>
                <li>Group results by type (links, buttons, headings)</li>
                <li>Show you where each problem is on the page</li>
              </ul>
              <div className="tab-explainer-section-label">What it can't do:</div>
              <ul className="tab-explainer-list">
                <li>See colors from images or photos</li>
                <li>See colors from backgrounds with patterns</li>
                <li>Always be 100% right (some results need a second look)</li>
              </ul>
              <div className="tab-explainer-steps">
                <div className="tab-step"><span className="tab-step-num">1</span>Click the button below to start</div>
                <div className="tab-step"><span className="tab-step-num">2</span>Look at the list of issues we found</div>
                <div className="tab-step"><span className="tab-step-num">3</span>Click <strong>Find on page</strong> to see where it is, or <strong>Check</strong> with the eyedropper to double-check</div>
              </div>
              <button className="btn-scan" onClick={runContrastScan}>
                Start the color check
              </button>
            </div>
          )}

          {scanStatus === "running" && (
            <div className="empty-state">
              <span className="spinner" />
              <p>Looking at all the colors…</p>
            </div>
          )}

          {scanStatus === "error" && (
            <div className="empty-state empty-state--error">
              <p>Could not scan this page.</p>
              <button className="btn-scan btn-scan--danger" onClick={runContrastScan}>
                Try again
              </button>
            </div>
          )}

          {scanStatus === "done" && scanResults && (
            <ScanResults
              results={scanResults}
              onRescan={runContrastScan}
              onVerify={(fg, bg) => { setFg(fg); setBg(bg); setMode("manual"); }}
            />
          )}
        </div>
      )}

      {/* ── Pick element mode ── */}
      {mode === "picker" && (
        <div className="picker-mode">
          {pickerState === "idle" && (
            <div className="picker-prompt">
              <p>Click any text element on the page to check its contrast ratio instantly.</p>
              <button className="btn-scan" onClick={startPicker}>Pick an element</button>
            </div>
          )}
          {pickerState === "waiting" && (
            <div className="picker-waiting">
              <div className="crosshair-icon"><Icon name="gps_fixed" size={36} /></div>
              <p>Click any element on the page…</p>
              <button className="btn-cancel" onClick={() => setPickerState("idle")}>Cancel</button>
            </div>
          )}
          {pickerState === "done" && pickerResult && (
            <div className="picker-result">
              <div className="swatch-row">
                <div className="swatch-item">
                  <div className="swatch" style={{ background: pickerResult.fg }} />
                  <span className="swatch-label">Text color</span>
                  <code className="swatch-hex">{pickerResult.fg}</code>
                </div>
                <div className="swatch-item">
                  <div className="swatch" style={{ background: pickerResult.bg }} />
                  <span className="swatch-label">Background</span>
                  <code className="swatch-hex">{pickerResult.bg}</code>
                </div>
              </div>
              <RatioDisplay ratio={pickerRatio} results={pickerResults} />
              <button className="btn-scan" onClick={startPicker}>
                Pick another element
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Check colors mode ── */}
      {mode === "manual" && (
        <div className="manual-mode">
          <p className="manual-intro">
            Type or paste hex colors below, or use the eyedropper to sample any color on your screen.
          </p>
          <div className="color-inputs">
            <div className="color-field">
              <label>Text color</label>
              <div className="color-input-row">
                <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="color-picker-input" />
                <input
                  type="text" value={fg}
                  onChange={e => setFg(e.target.value)}
                  className="hex-input" placeholder="#000000" maxLength={7}
                />
                <EyedropperBtn label="text" onPick={setFg} />
              </div>
            </div>
            <div className="color-field">
              <label>Background color</label>
              <div className="color-input-row">
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="color-picker-input" />
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
