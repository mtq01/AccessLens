import { Icon } from "./icons";
import { useState, useEffect } from "react";

const C = {
  bg: "var(--bg)",
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
  blueBorder: "var(--blue-border)",
  surface: "var(--bg2)",
  surface2: "var(--bg3)",
};

const CONTRAST_GROUP_ORDER = ["heading", "text", "link", "button", "input"];
const CONTRAST_GROUP_LABELS = {
  heading: "Headings",
  text: "Text",
  link: "Links",
  button: "Buttons",
  input: "Inputs",
};
const CONTRAST_FILTERS = [
  { id: "all", label: "All" },
  { id: "failures", label: "Failures" },
  { id: "warnings", label: "Warnings" },
];

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function getRowStatus(row) {
  if (!row.aa) return "failures";
  if (!row.aaa) return "warnings";
  return "passes";
}

function getGroupLabel(type) {
  return CONTRAST_GROUP_LABELS[type] || "Other";
}

function getFallbackType(label) {
  const value = (label || "").toLowerCase();
  if (value.includes("heading") || value.includes("title")) return "heading";
  if (value.includes("button")) return "button";
  if (value.includes("link")) return "link";
  if (
    value.includes("input") ||
    value.includes("field") ||
    value.includes("placeholder")
  )
    return "input";
  return "text";
}

function groupRows(rows, filter) {
  const grouped = new Map();
  rows.forEach((row) => {
    const status = getRowStatus(row);
    if (filter !== "all" && status !== filter) return;
    const type = row.type || "text";
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push({ ...row, status });
  });

  const orderedTypes = [
    ...CONTRAST_GROUP_ORDER,
    ...Array.from(grouped.keys())
      .filter((type) => !CONTRAST_GROUP_ORDER.includes(type))
      .sort(),
  ].filter((type, index, types) => types.indexOf(type) === index);

  return orderedTypes
    .map((type) => ({
      type,
      label: getGroupLabel(type),
      rows: grouped.get(type) || [],
    }))
    .filter((group) => group.rows.length > 0);
}

function getFilterLabel(filter) {
  return CONTRAST_FILTERS.find((item) => item.id === filter)?.label || "All";
}

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
].map((row) => ({
  ...row,
  type: getFallbackType(row.label),
  text: row.label,
  isLargeText: row.label.toLowerCase().includes("heading"),
}));

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
        fontSize: "0.8125rem",
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
      <span style={{ fontSize: "1.1875rem", fontWeight: 800, color, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color }}>{label}</span>
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
  const [contrastFilter, setContrastFilter] = useState("all");
  const [openGroups, setOpenGroups] = useState({});

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
        const seenTypes = {};
        Object.entries(response.results.groups).forEach(([typeKey, items]) => {
          items.forEach((item) => {
            const type = item.type || typeKey || "text";
            seenTypes[type] = true;
            mapped.push({
              fg: item.fg,
              bg: item.bg,
              ratio: Number(item.ratio || 0),
              aa: !!item.passesAA,
              aaa: !!item.passesAAA,
              isLargeText: !!item.isLargeText,
              aaRequired: Number(item.aaRequired || 4.5),
              label: item.text || "Detected text",
              selector: item.selector || null,
              type,
              text: item.text || "(no visible text)",
              tag: item.tag || null,
            });
          });
        });
        if (mapped.length > 0) {
          setRows(mapped.sort((a, b) => a.aa - b.aa));
          setOpenGroups((prev) => {
            const next = { ...prev };
            Object.keys(seenTypes).forEach((type) => {
              if (next[type] === undefined) next[type] = true;
            });
            return next;
          });
        }
      }
      setScanning(false);
      setScanned(true);
    });
  }

  function jumpToElement(selector) {
    if (!selector) return;
    chrome.runtime.sendMessage({
      type: "HIGHLIGHT_ELEMENT",
      selector,
      showDimensions: false,
    });
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
  const filteredRows = rows.filter((row) => {
    const status = getRowStatus(row);
    return contrastFilter === "all" || status === contrastFilter;
  });
  const filteredGroups = groupRows(rows, contrastFilter);

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
                fontSize: "0.875rem",
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
            fontSize: "0.875rem",
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
                    fontSize: "1rem",
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
                    fontSize: "0.875rem",
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
                  fontSize: "0.875rem",
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
                  fontSize: "0.875rem",
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
                gap: 10,
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background:
                    "linear-gradient(to bottom, #fff 78%, rgba(255,255,255,0))",
                  paddingBottom: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  borderBottom: `1px solid ${C.border}`,
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
                  onClick={() => {
                    setScanned(false);
                    setContrastFilter("all");
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: `1.5px solid ${C.border}`,
                    color: C.textMid,
                    borderRadius: 7,
                    padding: "4px 10px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    fontFamily: "var(--font)",
                  }}
                >
                  Rescan
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    padding: 4,
                    borderRadius: 10,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    gap: 4,
                  }}
                >
                  {CONTRAST_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setContrastFilter(filter.id)}
                      style={{
                        border: "none",
                        background:
                          contrastFilter === filter.id ? "#fff" : "transparent",
                        color:
                          contrastFilter === filter.id ? C.text : C.textMuted,
                        borderRadius: 7,
                        padding: "6px 10px",
                        fontSize: "0.8125rem",
                        fontWeight: contrastFilter === filter.id ? 800 : 700,
                        fontFamily: "var(--font)",
                        boxShadow:
                          contrastFilter === filter.id
                            ? "0 1px 3px rgba(0,0,0,0.08)"
                            : "none",
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: C.textMuted,
                    fontWeight: 600,
                  }}
                >
                  {filteredRows.length} of {rows.length} items shown in{" "}
                  {getFilterLabel(contrastFilter).toLowerCase()}
                </div>
              </div>
              {filteredGroups.length === 0 ? (
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 11,
                    padding: "18px 16px",
                    color: C.textMuted,
                    fontSize: "0.875rem",
                    lineHeight: 1.6,
                  }}
                >
                  No contrast results match this filter.
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isOpen = openGroups[group.type] !== false;
                  return (
                    <div
                      key={group.type}
                      style={{
                        background: "#fff",
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}
                    >
                      <button
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [group.type]: !isOpen,
                          }))
                        }
                        style={{
                          width: "100%",
                          border: "none",
                          background: C.surface,
                          padding: "11px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          cursor: "pointer",
                          fontFamily: "var(--font)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 800,
                              color: C.text,
                            }}
                          >
                            {group.label}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              color: C.textMuted,
                              background: C.bg,
                              border: `1px solid ${C.border}`,
                              borderRadius: 999,
                              padding: "3px 8px",
                            }}
                          >
                            {group.rows.length}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "1.125rem",
                            color: C.textMuted,
                            transform: isOpen ? "rotate(180deg)" : "none",
                            transition: "transform .16s",
                            lineHeight: 1,
                          }}
                        >
                          ⌄
                        </span>
                      </button>

                      {isOpen && (
                        <div
                          style={{
                            padding: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {group.rows.map((row, i) => (
                            <div
                              key={`${group.type}-${row.selector || row.label}-${i}`}
                              style={{
                                background: "#fff",
                                border: `1.5px solid ${row.aa ? C.border : C.redBorder}`,
                                borderRadius: 10,
                                padding: 12,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "flex-start",
                                }}
                              >
                                <div
                                  style={{
                                    width: 42,
                                    height: 30,
                                    borderRadius: 7,
                                    background: row.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(0,0,0,0.07)",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      color: row.fg,
                                      fontSize: "0.8125rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    Aa
                                  </span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      flexWrap: "wrap",
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.875rem",
                                        fontWeight: 700,
                                        color: C.text,
                                      }}
                                    >
                                      {row.label}
                                    </span>
                                    {row.isLargeText && (
                                      <span
                                        style={{
                                          fontSize: "0.8125rem",
                                          fontWeight: 800,
                                          color: C.blue,
                                          background: C.blueBg,
                                          border: `1px solid ${C.blueBorder}`,
                                          borderRadius: 999,
                                          padding: "3px 8px",
                                        }}
                                      >
                                        Large text
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: "0.8125rem",
                                        fontWeight: 700,
                                        color: C.textMuted,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                      }}
                                    >
                                      {row.tag || row.type}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.8125rem",
                                      color: C.textMuted,
                                      lineHeight: 1.5,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {row.text}
                                  </div>
                                </div>
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
                                    cursor: row.selector
                                      ? "pointer"
                                      : "default",
                                    opacity: row.selector ? 1 : 0.3,
                                    color: C.textMuted,
                                    fontSize: "0.875rem",
                                    fontFamily: "var(--font)",
                                    flexShrink: 0,
                                  }}
                                >
                                  ↗
                                </button>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  paddingTop: 2,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.9375rem",
                                    fontWeight: 800,
                                    color: row.ratio >= 4.5 ? C.green : C.red,
                                  }}
                                >
                                  {row.ratio.toFixed(1)}:1
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 6,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <PassBadge pass={row.aa} />
                                  <PassBadge pass={row.aaa} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
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
                    fontSize: "1rem",
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
                    fontSize: "0.9375rem",
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
                  fontSize: "0.875rem",
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
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  Selected element
                </div>
                <code style={{ fontSize: "0.875rem", color: C.text }}>
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
                          fontSize: "0.8125rem",
                          color: C.textMuted,
                          fontWeight: 600,
                        }}
                      >
                        {l}
                      </div>
                      <code
                        style={{ fontSize: "0.8125rem", color: C.text, fontWeight: 700 }}
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
                    fontSize: "2.125rem",
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
                    fontSize: "0.8125rem",
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
                    <span style={{ fontSize: "0.8125rem", color: C.textMid }}>
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
                  fontSize: "0.875rem",
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
                    fontSize: "0.875rem",
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
                      fontSize: "0.875rem",
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
                <span style={{ color: fg, fontSize: "0.9375rem", fontWeight: 500 }}>
                  Normal text - 16px
                </span>
                <span style={{ color: fg, fontSize: "1.375rem", fontWeight: 700 }}>
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
                    fontSize: "2.25rem",
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
                      <span style={{ fontSize: "0.8125rem", color: C.textMid }}>
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
