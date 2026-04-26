import { Icon } from "./icons";
import { useState, useEffect } from "react";

const C = {
  border: "var(--border)",
  borderMid: "var(--border-mid)",
  text: "var(--text)",
  textMid: "var(--text-mid)",
  textMuted: "var(--text-muted)",
  red: "var(--red)",
  redBg: "var(--red-bg)",
  redBorder: "var(--red-border)",
  green: "var(--green)",
  greenBg: "var(--green-bg)",
  greenBtn: "var(--green-btn)",
  amber: "var(--amber)",
  amberBg: "var(--amber-bg)",
  blue: "var(--blue)",
  blueBg: "var(--blue-bg)",
  blueBtn: "var(--blue-btn)",
  surface: "var(--bg2)",
  surface2: "var(--bg3)",
};

const MODE_INFO = {
  auto: {
    label: "Auto scan",
    desc: "Checks every text + background pair on the whole page",
  },
  pick: {
    label: "Pick element",
    desc: "Click any text on the page to check its contrast",
  },
  type: {
    label: "Type colors",
    desc: "Enter hex values to test any color combination",
  },
};

const FALLBACK_CONTRAST_DATA = [
  {
    fg: "#ffffff",
    bg: "#1e40af",
    ratio: 8.59,
    aa: true,
    aaa: true,
    label: "Primary button",
  },
  {
    fg: "#111118",
    bg: "#ffffff",
    ratio: 19.4,
    aa: true,
    aaa: true,
    label: "Body text",
  },
  {
    fg: "#5e5c74",
    bg: "#ffffff",
    ratio: 6.4,
    aa: true,
    aaa: false,
    label: "Secondary text",
  },
  {
    fg: "#9896aa",
    bg: "#f8f7fb",
    ratio: 2.6,
    aa: false,
    aaa: false,
    label: "Caption / hint",
  },
  {
    fg: "#7f1d1d",
    bg: "#ffffff",
    ratio: 12.5,
    aa: true,
    aaa: true,
    label: "Error message",
  },
  {
    fg: "#9ca3af",
    bg: "#ffffff",
    ratio: 2.85,
    aa: false,
    aaa: false,
    label: "Placeholder text",
  },
];

function parseRgb(str) {
  const m = str?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function luminance(hex) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return 0;
  return [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function ratio(h1, h2) {
  const [l1, l2] = [luminance(h1), luminance(h2)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

function validHex(h) {
  return /^#[0-9a-f]{6}$/i.test(h);
}

function PassBadge({ pass }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "3px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: pass ? C.greenBg : C.redBg,
        color: pass ? C.green : C.red,
      }}
    >
      {pass ? "✓ Pass" : "✕ Fail"}
    </span>
  );
}

function Pill({ count, label, color, bg }) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 8,
        padding: "7px 11px",
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <span style={{ fontSize: 19, fontWeight: 800, color, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

export default function ContrastPanel() {
  const [mode, setMode] = useState("auto");
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [picked, setPicked] = useState(false);
  const [pickedData, setPickedData] = useState(null);
  const [fg, setFg] = useState("#5e5c74");
  const [bg, setBg] = useState("#ffffff");
  const [rows, setRows] = useState(FALLBACK_CONTRAST_DATA);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type !== "PICKER_RESULT") return;
      const fgRgb = parseRgb(msg.fg);
      const bgRgb = parseRgb(msg.bg);
      if (!fgRgb || !bgRgb) return;
      const f = rgbToHex(fgRgb);
      const b = rgbToHex(bgRgb);
      setPickedData({
        fg: f,
        bg: b,
        selector: msg.selector || "<selected element>",
      });
      setPicked(true);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  function runScan() {
    setScanning(true);
    chrome.runtime.sendMessage({ type: "SCAN_CONTRAST" }, (response) => {
      if (
        !chrome.runtime.lastError &&
        response?.success &&
        response.results?.groups
      ) {
        const mapped = [];
        Object.values(response.results.groups).forEach((items) => {
          items.forEach((item) => {
            mapped.push({
              fg: item.fg,
              bg: item.bg,
              ratio: Number(item.ratio || 0),
              aa: !!item.passesAA,
              aaa: !!item.passesAAA,
              label: item.text || "Detected text",
              selector: item.selector || null,
            });
          });
        });
        if (mapped.length > 0) setRows(mapped.sort((a, b) => a.aa - b.aa));
      }
      setScanning(false);
      setScanned(true);
    });
  }

  function jumpToElement(selector) {
    if (!selector) return;
    chrome.runtime.sendMessage({ type: "HIGHLIGHT_ELEMENT", selector, showDimensions: false });
  }

  function activatePicker() {
    setPicked(false);
    setPickedData(null);
    chrome.runtime.sendMessage({ type: "START_PICKER" });
  }

  const manualRatio = validHex(fg) && validHex(bg) ? ratio(fg, bg) : null;
  const pickedRatio = pickedData ? ratio(pickedData.fg, pickedData.bg) : null;

  const aaFail = rows.filter((r) => !r.aa).length;
  const aaaWarn = rows.filter((r) => r.aa && !r.aaa).length;
  const passing = rows.filter((r) => r.aa).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}` }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(MODE_INFO).map(([k, { label }]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              style={{
                flex: 1,
                border: `1.5px solid ${mode === k ? C.borderMid : C.border}`,
                background: mode === k ? "#fff" : C.surface,
                borderRadius: 9,
                padding: "9px 12px",
                fontSize: 13.5,
                fontWeight: mode === k ? 800 : 600,
                color: mode === k ? C.text : C.textMuted,
                transition: "all .15s",
                boxShadow: mode === k ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
                fontFamily: "var(--font)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: C.textMuted,
            marginTop: 8,
            fontWeight: 600,
          }}
        >
          {MODE_INFO[mode].desc}
        </div>
      </div>

      {mode === "auto" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!scanned && !scanning && (
            <div
              style={{
                padding: "32px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: C.greenBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="palette" size={24} style={{ color: C.green }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: C.text,
                    marginBottom: 5,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Scan the whole page
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    lineHeight: 1.6,
                    maxWidth: 240,
                  }}
                >
                  Finds every text and background color combination. Failures
                  shown first.
                </div>
              </div>
              <button
                onClick={runScan}
                style={{
                  background: C.greenBtn,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 28px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(22,101,52,0.3)",
                  fontFamily: "var(--font)",
                }}
              >
                Scan colors
              </button>
            </div>
          )}

          {scanning && (
            <div style={{ padding: "48px 22px", textAlign: "center" }}>
              <div
                style={{
                  fontSize: 13.5,
                  color: C.textMuted,
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                Checking color pairs...
              </div>
              <div
                style={{
                  height: 5,
                  background: C.surface2,
                  borderRadius: 5,
                  overflow: "hidden",
                  maxWidth: 180,
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: C.greenBtn,
                    borderRadius: 5,
                    width: "65%",
                  }}
                />
              </div>
            </div>
          )}

          {scanned && !scanning && (
            <div
              style={{
                padding: "12px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${C.border}`,
                  marginBottom: 2,
                }}
              >
                <Pill
                  count={aaFail}
                  label="AA fail"
                  color={C.red}
                  bg={C.redBg}
                />
                <Pill
                  count={aaaWarn}
                  label="AAA warn"
                  color={C.amber}
                  bg={C.amberBg}
                />
                <Pill
                  count={passing}
                  label="Passing"
                  color={C.green}
                  bg={C.greenBg}
                />
                <button
                  onClick={() => setScanned(false)}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: `1.5px solid ${C.border}`,
                    color: C.textMid,
                    borderRadius: 7,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--font)",
                  }}
                >
                  Rescan
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 68px 46px 46px 32px",
                  gap: 8,
                  padding: "0 2px 4px",
                }}
              >
                {["", "Element", "Ratio", "AA", "AAA", ""].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
              {rows.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr 68px 46px 46px 32px",
                    gap: 8,
                    alignItems: "center",
                    background: "#fff",
                    border: `1.5px solid ${row.aa ? C.border : C.redBorder}`,
                    borderRadius: 9,
                    padding: "9px 10px",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 27,
                      borderRadius: 6,
                      background: row.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(0,0,0,0.07)",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{ color: row.fg, fontSize: 11.5, fontWeight: 800 }}
                    >
                      Aa
                    </span>
                  </div>
                  <span
                    style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: row.ratio >= 4.5 ? C.green : C.red,
                    }}
                  >
                    {row.ratio.toFixed(1)}:1
                  </span>
                  <PassBadge pass={row.aa} />
                  <PassBadge pass={row.aaa} />
                  <button
                    title="Jump to element"
                    onClick={() => jumpToElement(row.selector)}
                    disabled={!row.selector}
                    style={{
                      background: "none",
                      border: `1.5px solid ${C.border}`,
                      borderRadius: 6,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: row.selector ? "pointer" : "default",
                      opacity: row.selector ? 1 : 0.3,
                      color: C.textMuted,
                      fontSize: 13,
                      fontFamily: "var(--font)",
                    }}
                  >
                    ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "pick" && (
        <div
          style={{
            flex: 1,
            padding: "28px 22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: picked ? "flex-start" : "center",
            gap: 16,
          }}
        >
          {!picked || !pickedData ? (
            <>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 14,
                  background: C.blueBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="gps_fixed" size={26} style={{ color: C.blue }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: C.text,
                    marginBottom: 5,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Click any text
                </div>
                <div
                  style={{
                    fontSize: 14.5,
                    color: C.textMuted,
                    maxWidth: 240,
                    lineHeight: 1.65,
                  }}
                >
                  Activate the picker and click any element on the page to check
                  its contrast ratio.
                </div>
              </div>
              <button
                onClick={activatePicker}
                style={{
                  background: C.blueBtn,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 28px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(29,78,216,0.25)",
                  fontFamily: "var(--font)",
                }}
              >
                Activate picker
              </button>
            </>
          ) : (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 11,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  Selected element
                </div>
                <code style={{ fontSize: 13, color: C.text }}>
                  {pickedData.selector}
                </code>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  ["Text color", pickedData.fg],
                  ["Background", pickedData.bg],
                ].map(([l, h]) => (
                  <div
                    key={l}
                    style={{
                      background: "#fff",
                      border: `1.5px solid ${C.border}`,
                      borderRadius: 9,
                      padding: "9px 11px",
                      display: "flex",
                      gap: 9,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background: h,
                        border: "1px solid rgba(0,0,0,0.08)",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.textMuted,
                          fontWeight: 600,
                        }}
                      >
                        {l}
                      </div>
                      <code
                        style={{ fontSize: 12, color: C.text, fontWeight: 700 }}
                      >
                        {h}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: "#fff",
                  border: `1.5px solid ${(pickedRatio || 0) >= 4.5 ? C.green : C.redBorder}`,
                  borderRadius: 11,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    color: (pickedRatio || 0) >= 4.5 ? C.green : C.red,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    marginBottom: 4,
                  }}
                >
                  {(pickedRatio || 0).toFixed(1)}:1
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.textMuted,
                    marginBottom: 12,
                    fontWeight: 500,
                  }}
                >
                  Contrast ratio -{" "}
                  {(pickedRatio || 0) >= 4.5 ? "passes AA" : "fails AA"}
                </div>
                {[
                  ["AA normal text", ">= 4.5:1", (pickedRatio || 0) >= 4.5],
                  [
                    "AA large text (18px+)",
                    ">= 3.0:1",
                    (pickedRatio || 0) >= 3,
                  ],
                  ["AAA normal text", ">= 7.0:1", (pickedRatio || 0) >= 7],
                ].map(([l, r, p]) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: C.textMid }}>
                      {l} {r}
                    </span>
                    <PassBadge pass={p} />
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setPicked(false);
                  setPickedData(null);
                }}
                style={{
                  background: "none",
                  border: `1.5px solid ${C.border}`,
                  color: C.textMid,
                  borderRadius: 9,
                  padding: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font)",
                }}
              >
                Pick another element
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "type" && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {[
              ["Foreground", fg, setFg],
              ["Background", bg, setBg],
            ].map(([label, val, setter]) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <label
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: C.textMuted,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  {label}
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div
                    style={{
                      position: "relative",
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 7,
                        background: val,
                        border: `1.5px solid ${C.border}`,
                      }}
                    />
                    <input
                      type="color"
                      value={validHex(val) ? val : "#000000"}
                      onChange={(e) => setter(e.target.value)}
                      aria-label={`${label} color picker`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    maxLength={7}
                    aria-label={`${label} hex value`}
                    style={{
                      flex: 1,
                      border: `1.5px solid ${C.border}`,
                      borderRadius: 7,
                      padding: "6px 8px",
                      fontSize: 13,
                      fontFamily: "var(--mono)",
                      color: C.text,
                      background: "#fff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {manualRatio !== null && (
            <>
              <div
                style={{
                  background: bg,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span style={{ color: fg, fontSize: 15, fontWeight: 500 }}>
                  Normal text - 16px
                </span>
                <span style={{ color: fg, fontSize: 22, fontWeight: 700 }}>
                  Large text heading
                </span>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: `1.5px solid ${manualRatio >= 4.5 ? C.green : C.redBorder}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    color: manualRatio >= 4.5 ? C.green : C.red,
                    lineHeight: 1,
                    marginBottom: 10,
                  }}
                >
                  {manualRatio.toFixed(2)}:1
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {[
                    ["AA normal text (>= 4.5:1)", manualRatio >= 4.5],
                    ["AA large text (>= 3.0:1)", manualRatio >= 3],
                    ["AAA normal text (>= 7.0:1)", manualRatio >= 7],
                    ["AAA large text (>= 4.5:1)", manualRatio >= 4.5],
                  ].map(([l, p]) => (
                    <div
                      key={l}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 12.5, color: C.textMid }}>
                        {l}
                      </span>
                      <PassBadge pass={p} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
