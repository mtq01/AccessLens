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
  greenBtn: "var(--green)",
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
    desc: "Enter hex or use the eyedropper to sample a color from the screen",
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

async function pickColorFromScreen(setHex) {
  const EyeDropper = window.EyeDropper;
  if (!EyeDropper) return;
  try {
    const { sRGBHex } = await new EyeDropper().open();
    if (sRGBHex) setHex(sRGBHex.toLowerCase());
  } catch {
    /* user cancelled or dialog failed */
  }
}

function PassBadge({ pass }) {
  return (
    <span
      className={
        pass ? "contrast-pass-badge contrast-pass-badge--ok" : "contrast-pass-badge contrast-pass-badge--no"
      }
    >
      {pass ? "✓ Pass" : "✕ Fail"}
    </span>
  );
}

function Pill({ count, label, color, bg }) {
  return (
    <div className="contrast-pill" style={{ background: bg }}>
      <span className="contrast-pill__val" style={{ color }}>
        {count}
      </span>
      <span className="contrast-pill__lbl" style={{ color }}>
        {label}
      </span>
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
    chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHT" });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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
    <div className="contrast-panel">
      <div className="contrast-panel__header">
        <div className="contrast-panel__mode-row">
          {Object.entries(MODE_INFO).map(([k, { label }]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={
                mode === k
                  ? "contrast-mode-btn contrast-mode-btn--active"
                  : "contrast-mode-btn"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="contrast-panel__mode-desc">{MODE_INFO[mode].desc}</p>
      </div>

      {mode === "auto" && (
        <div className="contrast-panel__body">
          {!scanned && !scanning && (
            <div className="contrast-panel__centered">
              <div className="contrast-panel__hero">
                <Icon name="palette" size={24} style={{ color: C.green }} />
              </div>
              <div className="contrast-panel__center-text">
                <div className="contrast-panel__title">Scan the whole page</div>
                <div className="contrast-panel__muted-para">
                  Finds every text and background color combination. Failures
                  shown first.
                </div>
              </div>
              <button
                type="button"
                onClick={runScan}
                className="contrast-btn-primary"
              >
                Scan colors
              </button>
            </div>
          )}

          {scanning && (
            <div className="contrast-panel__scanning">
              <div className="contrast-panel__scanning-label">
                Checking color pairs...
              </div>
              <div className="contrast-bar">
                <div className="contrast-bar--fill-anim" />
              </div>
            </div>
          )}

          {scanned && !scanning && (
            <div className="contrast-panel__results">
              <div className="contrast-sticky">
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
                  type="button"
                  onClick={() => {
                    setContrastFilter("all");
                    runScan();
                  }}
                  className="contrast-btn-linkish"
                >
                  Rescan
                </button>
              </div>
              <div className="contrast-filters">
                <div className="contrast-filter-btns">
                  {CONTRAST_FILTERS.map((filter) => (
                    <button
                      type="button"
                      key={filter.id}
                      onClick={() => setContrastFilter(filter.id)}
                      className={
                        contrastFilter === filter.id
                          ? "contrast-filter-btn contrast-filter-btn--on"
                          : "contrast-filter-btn"
                      }
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="contrast-filter-meta">
                  {filteredRows.length} of {rows.length} items shown in{" "}
                  {getFilterLabel(contrastFilter).toLowerCase()}
                </div>
              </div>
              {filteredGroups.length === 0 ? (
                <div className="contrast-panel__empty">
                  No contrast results match this filter.
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isOpen = openGroups[group.type] !== false;
                  return (
                    <div key={group.type} className="contrast-group">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [group.type]: !isOpen,
                          }))
                        }
                        className="contrast-group__toggle"
                      >
                        <div className="contrast-group__left">
                          <span className="contrast-group__title">
                            {group.label}
                          </span>
                          <span className="contrast-group__count">
                            {group.rows.length}
                          </span>
                        </div>
                        <span
                          className={
                            isOpen
                              ? "contrast-group__chev contrast-group__chev--open"
                              : "contrast-group__chev"
                          }
                          aria-hidden
                        >
                          ⌄
                        </span>
                      </button>

                      {isOpen && (
                        <div className="contrast-group__content">
                          {group.rows.map((row, i) => (
                            <div
                              key={`${group.type}-${row.selector || row.label}-${i}`}
                              className={
                                row.aa
                                  ? "contrast-row contrast-row--ok"
                                  : "contrast-row contrast-row--issue"
                              }
                            >
                              <div className="contrast-row__top">
                                <div
                                  className="contrast-row__swatch"
                                  style={{ background: row.bg }}
                                >
                                  <span
                                    className="contrast-txt-aa"
                                    style={{
                                      color: row.fg,
                                    }}
                                  >
                                    Aa
                                  </span>
                                </div>
                                <div className="contrast-row__body">
                                  <div className="contrast-row__row">
                                    <span className="contrast-row__name">
                                      {row.label}
                                    </span>
                                    {row.isLargeText && (
                                      <span className="contrast-badge-large">
                                        Large text
                                      </span>
                                    )}
                                    <span className="contrast-row__tag">
                                      {row.tag || row.type}
                                    </span>
                                  </div>
                                  <div className="contrast-row__excerpt">
                                    {row.text}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  title="Jump to element"
                                  onClick={() => jumpToElement(row.selector)}
                                  disabled={!row.selector}
                                  className="contrast-row__jump"
                                >
                                  ↗
                                </button>
                              </div>
                              <div className="contrast-row__ratio-row">
                                <span
                                  className={
                                    row.ratio >= 4.5
                                      ? "contrast-row__ratio-val contrast-row__ratio-val--ok"
                                      : "contrast-row__ratio-val contrast-row__ratio-val--bad"
                                  }
                                >
                                  {row.ratio.toFixed(1)}:1
                                </span>
                                <div className="contrast-row__pass-row">
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
          className={
            !picked || !pickedData
              ? "contrast-pick contrast-pick--centered"
              : "contrast-pick contrast-pick--result"
          }
        >
          {!picked || !pickedData ? (
            <>
              <div className="contrast-pick__hero--blue">
                <Icon name="gps_fixed" size={26} style={{ color: C.blue }} />
              </div>
              <div className="contrast-panel__center-text">
                <div className="contrast-panel__title">Click any text</div>
                <div className="contrast-panel__lede">
                  Activate the picker and click any element on the page to check
                  its contrast ratio.
                </div>
              </div>
              <button
                type="button"
                onClick={activatePicker}
                className="contrast-btn-primary contrast-btn-primary--blue"
              >
                Activate picker
              </button>
            </>
          ) : (
            <div className="contrast-pick__form">
              <div className="contrast-card">
                <div className="contrast-pick__label">Selected element</div>
                <code className="contrast-pick__sel">{pickedData.selector}</code>
              </div>
              <div className="contrast-pick__type-grid">
                {[
                  ["Text color", pickedData.fg],
                  ["Background", pickedData.bg],
                ].map(([l, h]) => (
                  <div key={l} className="contrast-pick__swatch-line">
                    <div
                      className="contrast-pick__sw-dot"
                      style={{ background: h }}
                    />
                    <div>
                      <div className="contrast-pick__sm-label">{l}</div>
                      <code className="contrast-pick__hex">{h}</code>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={
                  (pickedRatio || 0) >= 4.5
                    ? "contrast-pick__ratio-block contrast-pick__ratio-block--ok"
                    : "contrast-pick__ratio-block contrast-pick__ratio-block--no"
                }
              >
                <div
                  className="contrast-pick__ratio-big"
                  style={{
                    color: (pickedRatio || 0) >= 4.5 ? C.green : C.red,
                  }}
                >
                  {(pickedRatio || 0).toFixed(1)}:1
                </div>
                <div className="contrast-pick__ratio-hint">
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
                  <div key={l} className="contrast-pick__criterion">
                    <span className="contrast-pick__criterion-text">
                      {l} {r}
                    </span>
                    <PassBadge pass={p} />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPicked(false);
                  setPickedData(null);
                }}
                className="contrast-btn-ghost"
              >
                Pick another element
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "type" && (
        <div className="contrast-type">
          <div className="contrast-type__grid-2-10">
            {[
              ["Foreground", "fg", fg, setFg],
              ["Background", "bg", bg, setBg],
            ].map(([label, idSuffix, val, setter]) => (
              <div key={idSuffix} className="contrast-type__field">
                <label
                  className="contrast-type__label-700-8-12"
                  htmlFor={`contrast-hex-${idSuffix}`}
                >
                  {label}
                </label>
                <div className="contrast-type__row">
                  <button
                    type="button"
                    className="contrast-type__eyedrop"
                    disabled={typeof window === "undefined" || !window.EyeDropper}
                    title={
                      typeof window !== "undefined" && window.EyeDropper
                        ? "Pick color from screen"
                        : "Screen eyedropper is not available in this browser"
                    }
                    aria-label={`Eyedropper: ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void pickColorFromScreen(setter);
                    }}
                  >
                    <Icon name="eyedropper" size={20} style={{ color: C.textMid }} />
                  </button>
                  <div className="contrast-type__sw-wrap contrast-type__sw-wrap--static">
                    <div
                      className="contrast-type__sw"
                      style={{
                        background: validHex(val) ? val : "transparent",
                      }}
                    />
                  </div>
                  <input
                    id={`contrast-hex-${idSuffix}`}
                    className="contrast-type__text-inp"
                    type="text"
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    maxLength={7}
                    aria-label={`${label} hex value`}
                  />
                </div>
              </div>
            ))}
          </div>

          {manualRatio !== null && (
            <>
              <div className="contrast-type__sample" style={{ background: bg }}>
                <span className="contrast-type__samp-16" style={{ color: fg }}>
                  Normal text - 16px
                </span>
                <span className="contrast-type__samp-22" style={{ color: fg }}>
                  Large text heading
                </span>
              </div>
              <div
                className={
                  manualRatio >= 4.5
                    ? "contrast-type__out contrast-type__out--ok"
                    : "contrast-type__out contrast-type__out--bad"
                }
              >
                <div
                  className={
                    manualRatio >= 4.5
                      ? "contrast-type__out-head contrast-type__out-head--ok"
                      : "contrast-type__out-head contrast-type__out-head--no"
                  }
                >
                  {manualRatio.toFixed(2)}:1
                </div>
                <div className="contrast-type__criterion-list">
                  {[
                    ["AA normal text (>= 4.5:1)", manualRatio >= 4.5],
                    ["AA large text (>= 3.0:1)", manualRatio >= 3],
                    ["AAA normal text (>= 7.0:1)", manualRatio >= 7],
                    ["AAA large text (>= 4.5:1)", manualRatio >= 4.5],
                  ].map(([l, p]) => (
                    <div key={l} className="contrast-type__criterion">
                      <span className="contrast-type__crit-812">{l}</span>
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
