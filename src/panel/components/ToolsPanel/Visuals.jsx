import { useState } from "react";
import { Icon } from "../Icon";

const HC_ITEMS = [
  "Can you still read all the text?",
  "Are buttons still easy to see?",
  "Are icons still visible?",
  "Are form fields still clear?",
  "Is color-only information still understandable?",
];

export default function Visuals({ violations = [] }) {
  const [zoomStatus, setZoomStatus] = useState("idle");
  const [zoomViolations, setZoomViolations] = useState([]);
  const [highContrast, setHighContrast] = useState(false);
  const [hcChecklist, setHcChecklist] = useState({});

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

  function setHcItem(i, val) {
    setHcChecklist(p => ({ ...p, [i]: { status: val, note: p[i]?.note || "" } }));
  }
  function setHcNote(i, note) {
    setHcChecklist(p => ({ ...p, [i]: { ...p[i], note } }));
  }

  return (
    <div className="visuals-tab">
      {/* Zoom */}
      <div className="visuals-section">
        <div className="visuals-section-header">
          <Icon name="zoom_in" size={16} className="visuals-section-icon"/>
          <h2 className="visuals-section-title">Zoom test (400%)</h2>
        </div>
        <p className="visuals-section-desc">Some users zoom to 400% to read text. The page must work at that size without horizontal scrolling (WCAG 1.4.10).</p>
        {zoomStatus === "idle" && <button className="btn-scan" onClick={runZoomTest}>Run zoom test</button>}
        {zoomStatus === "running" && (
          <div className="visuals-running">
            <div className="spinner spinner--sm"/>
            Resizing to 320px and scanning…
          </div>
        )}
        {zoomStatus === "done" && zoomViolations.length === 0 && (
          <div className="visuals-result visuals-result--ok">
            <Icon name="check_circle" size={16} className="visuals-result-icon"/>
            <div>
              <strong>No new issues at 400% zoom</strong>
              <p className="visuals-result-desc">Content reflows correctly. WCAG 1.4.10 passes.</p>
            </div>
          </div>
        )}
        {zoomStatus === "done" && zoomViolations.length > 0 && (
          <div className="violations">
            {zoomViolations.map(v => (
              <div key={v.id} className={`violation violation--${v.impact||"minor"}`}>
                <div className="violation-header">
                  <div className="violation-info">
                    <div className="violation-title-row"><span className="violation-title">{v.description}</span></div>
                    <div className="violation-meta">
                      <span className={`impact-badge impact-badge--${v.impact||"minor"}`}>{v.impact}</span>
                      <span className="node-count">zoom only</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {zoomStatus === "done" && (
          <button className="btn-rerun" onClick={() => { setZoomStatus("idle"); setZoomViolations([]); }}>
            Run again
          </button>
        )}
      </div>

      {/* High contrast */}
      <div className="visuals-section">
        <div className="visuals-section-header">
          <Icon name="contrast" size={16} className="visuals-section-icon"/>
          <h2 className="visuals-section-title">High contrast preview</h2>
        </div>
        <p className="visuals-section-desc">Some users rely on high contrast mode. Turn this on and verify everything is still readable.</p>
        <button className="btn-scan" onClick={toggleHighContrast}>
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
                    <button
                      className={`hc-btn ${state?.status==="pass"?"pass":"unset"}`}
                      onClick={() => setHcItem(i, "pass")}
                      aria-label={`${item} — pass`}
                    >✓</button>
                    <button
                      className={`hc-btn ${state?.status==="fail"?"fail":"unset"}`}
                      onClick={() => setHcItem(i, "fail")}
                      aria-label={`${item} — fail`}
                    >✗</button>
                  </div>
                  <div className="hc-item-body">
                    <div className="hc-item-label">{item}</div>
                    {state?.status === "fail" && (
                      <input
                        className="hc-note-input"
                        placeholder="Describe what's wrong…"
                        value={state.note || ""}
                        onChange={e => setHcNote(i, e.target.value)}
                        aria-label={`Notes for: ${item}`}
                      />
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
  );
}
