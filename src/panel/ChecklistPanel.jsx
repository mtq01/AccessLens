import { useState } from "react";

const C = {
  border: "var(--border)",
  text: "var(--text)",
  textMid: "var(--text-mid)",
  textMuted: "var(--text-muted)",
  blue: "var(--blue)",
  blueBtn: "var(--blue-btn)",
  blueBg: "var(--blue-bg)",
  blueBorder: "var(--blue-border)",
  amber: "var(--amber)",
  green: "var(--green)",
  greenBg: "var(--green-bg)",
  greenBtn: "var(--green-btn)",
  purple: "var(--purple)",
  surface2: "var(--bg3)",
};

const CHECKLIST_DATA = [
  {
    id: "kb",
    title: "Keyboard Navigation",
    accent: C.blue,
    items: [
      {
        id: "k1",
        text: "Every link, button, and input reachable by Tab",
        wcag: "2.1.1",
        guide: [
          "Unplug or disable your mouse",
          "Press Tab to move forward, Shift+Tab to go back",
          "Every interactive element should receive focus - nothing skipped",
        ],
      },
      {
        id: "k2",
        text: "No keyboard traps anywhere on the page",
        wcag: "2.1.2",
        guide: [
          "Tab through the entire page - you should always be able to keep moving",
          "If a component seems to trap focus, try Escape, then Tab",
        ],
      },
      {
        id: "k3",
        text: "Focus returns to trigger element after closing dialogs",
        wcag: "2.4.3",
        guide: [
          "Open a modal or menu using the keyboard",
          "Close it with Escape",
          "Focus should land back on the button that opened it",
        ],
      },
      {
        id: "k4",
        text: "Focus indicator always clearly visible",
        wcag: "2.4.7",
        guide: [
          "Tab through the page and look for a visible ring or outline on each element",
          "It must be visible - never rely on color alone",
        ],
      },
    ],
  },
  {
    id: "sr",
    title: "Screen Reader",
    accent: C.amber,
    items: [
      {
        id: "s1",
        text: "Page <title> is descriptive and unique",
        wcag: "2.4.2",
        guide: [
          "Open VoiceOver (Mac: Cmd+F5) or NVDA (Windows, free)",
          "Load the page - the title should be announced",
          "It must describe the page content, not just your site name",
        ],
      },
      {
        id: "s2",
        text: "All images have meaningful alt text",
        wcag: "1.1.1",
        guide: [
          "Navigate to each image with the screen reader",
          "Listen to what is announced - it should describe the image's purpose",
          "Decorative images should be silent (alt='')",
        ],
      },
      {
        id: "s3",
        text: "Form fields announce their label when focused",
        wcag: "1.3.1",
        guide: [
          "Tab to each form input",
          "The screen reader should say the label, type, and any instructions",
          "Never rely only on placeholder text",
        ],
      },
      {
        id: "s4",
        text: "Error messages are automatically announced",
        wcag: "4.1.3",
        guide: [
          "Submit a form with missing or invalid data",
          "Without moving focus, the screen reader should announce the error",
          "Use role='alert' or aria-live='polite' for dynamic messages",
        ],
      },
    ],
  },
  {
    id: "vis",
    title: "Visual & Cognitive",
    accent: C.purple,
    items: [
      {
        id: "v1",
        text: "Page reflows at 400% zoom without horizontal scroll",
        wcag: "1.4.10",
        guide: [
          "Set browser zoom to 400%",
          "Content should stack into a single column",
          "Nothing should overflow or require horizontal scrolling",
        ],
      },
      {
        id: "v2",
        text: "No content flashes more than 3 times per second",
        wcag: "2.3.1",
        guide: [
          "Look for any animated or flashing content",
          "If anything flashes faster than 3 times per second, remove it or add a pause control",
        ],
      },
      {
        id: "v3",
        text: "Headings form a logical hierarchy (h1 - h2 - h3)",
        wcag: "1.3.1",
        guide: [
          "Install the HeadingsMap browser extension",
          "Check that headings nest logically - no skipped levels",
          "There should be exactly one h1 per page",
        ],
      },
    ],
  },
];

const STORAGE_KEY = "accesslens_checklist_v1";

function loadChecked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecked(checked) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  } catch {
    // ignore storage failures
  }
}

function Chevron({ open }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      style={{
        color: "var(--text-faint)",
        transition: "transform .2s",
        transform: open ? "rotate(180deg)" : "none",
        flexShrink: 0,
      }}
    >
      <path
        d="M2.5 4.5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ChecklistPanel() {
  const total = CHECKLIST_DATA.reduce((s, sec) => s + sec.items.length, 0);
  const allItemIds = new Set(CHECKLIST_DATA.flatMap((sec) => sec.items.map((i) => i.id)));
  const [checked, setChecked] = useState(loadChecked);
  const [openSecs, setOpenSecs] = useState({ kb: true, sr: false, vis: false });
  const [openGuide, setOpenGuide] = useState({});

  const done = Object.entries(checked).filter(([id, val]) => allItemIds.has(id) && val).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  function toggleItem(itemId) {
    setChecked((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      saveChecked(next);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{ padding: "13px 22px", borderBottom: `1px solid ${C.border}` }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 9,
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: C.text }}>
            {done} of {total} complete
          </span>
          <span
            style={{
              fontSize: "1.375rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: pct === 100 ? C.green : pct > 0 ? C.amber : C.textMuted,
            }}
          >
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 7,
            background: C.surface2,
            borderRadius: 7,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: pct === 100 ? C.greenBtn : C.blueBtn,
              borderRadius: 7,
              transition: "width .4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {CHECKLIST_DATA.map(({ id, title, accent, items }) => {
          const secDone = items.filter((i) => checked[i.id]).length;
          const isOpen = openSecs[id];
          return (
            <div
              key={id}
              style={{
                borderRadius: 11,
                border: `1.5px solid ${C.border}`,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <button
                onClick={() => setOpenSecs((s) => ({ ...s, [id]: !s[id] }))}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontFamily: "var(--font)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: accent,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: C.text,
                    textAlign: "left",
                  }}
                >
                  {title}
                </span>
                <span
                  style={{ fontSize: "0.8125rem", color: C.textMuted, fontWeight: 700 }}
                >
                  {secDone}/{items.length}
                </span>
                <Chevron open={isOpen} />
              </button>

              {isOpen &&
                items.map((item) => {
                  const isChecked = !!checked[item.id];
                  const guideOpen = !!openGuide[item.id];
                  return (
                    <div
                      key={item.id}
                      style={{
                        borderTop: `1px solid ${C.border}`,
                        background: isChecked ? C.greenBg : "#fff",
                        transition: "background .15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 11,
                          padding: "12px 14px",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 5,
                            flexShrink: 0,
                            marginTop: 1,
                            border: `2px solid ${isChecked ? C.green : "var(--border-mid)"}`,
                            background: isChecked ? C.greenBtn : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all .15s",
                          }}
                          role="checkbox"
                          aria-checked={isChecked}
                        >
                          {isChecked && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M1.5 5L4 7.5L8.5 2.5"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "0.9375rem",
                              fontWeight: 500,
                              color: isChecked ? C.textMuted : C.text,
                              lineHeight: 1.5,
                              textDecoration: isChecked
                                ? "line-through"
                                : "none",
                              transition: "all .15s",
                            }}
                          >
                            {item.text}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginTop: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.8125rem",
                                color: C.textMuted,
                                fontFamily: "var(--mono)",
                                fontWeight: 600,
                              }}
                            >
                              WCAG {item.wcag}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenGuide((s) => ({
                                  ...s,
                                  [item.id]: !s[item.id],
                                }));
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                fontSize: "0.875rem",
                                color: C.blue,
                                fontWeight: 800,
                                padding: 0,
                                textDecoration: "underline",
                                textUnderlineOffset: 2,
                                fontFamily: "var(--font)",
                                cursor: "pointer",
                              }}
                              aria-expanded={guideOpen}
                            >
                              {guideOpen ? "Hide guide ▲" : "How to test ▼"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {guideOpen && (
                        <div
                          style={{
                            margin: "0 14px 12px",
                            background: C.blueBg,
                            border: `1px solid ${C.blueBorder}`,
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          {item.guide.map((step, si) => (
                            <div
                              key={si}
                              style={{
                                display: "flex",
                                gap: 9,
                                marginTop: si > 0 ? 7 : 0,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: 800,
                                  color: C.blue,
                                  minWidth: 18,
                                  marginTop: 1,
                                }}
                              >
                                {si + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.8125rem",
                                  color: C.textMid,
                                  lineHeight: 1.55,
                                }}
                              >
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
