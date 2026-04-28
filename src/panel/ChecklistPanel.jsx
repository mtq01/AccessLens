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
  greenBtn: "var(--green)",
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
      className={
        open ? "checklist-chevron checklist-chevron--open" : "checklist-chevron"
      }
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

function pctClass(pct, total) {
  if (total === 0) return "checklist-panel__pct--empty";
  if (pct === 100) return "checklist-panel__pct--done";
  if (pct > 0) return "checklist-panel__pct--in-progress";
  return "checklist-panel__pct--empty";
}

function fillClass(pct) {
  if (pct === 100) return "checklist-panel__fill--success";
  return "checklist-panel__fill--in-progress";
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
    <div className="checklist-panel">
      <div className="checklist-panel__header">
        <div className="checklist-panel__progress-row">
          <span className="checklist-panel__count-text">
            {done} of {total} complete
          </span>
          <span className={`checklist-panel__pct ${pctClass(pct, total)}`}>
            {pct}%
          </span>
        </div>
        <div className="checklist-panel__track">
          <div
            className={`checklist-panel__fill ${fillClass(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="checklist-panel__list">
        {CHECKLIST_DATA.map(({ id, title, accent, items }) => {
          const secDone = items.filter((i) => checked[i.id]).length;
          const isOpen = openSecs[id];
          return (
            <div key={id} className="checklist-panel__section">
              <button
                type="button"
                className="checklist-panel__section-toggle"
                onClick={() => setOpenSecs((s) => ({ ...s, [id]: !s[id] }))}
              >
                <span
                  className="checklist-panel__section-bar"
                  style={{ background: accent }}
                  aria-hidden="true"
                />
                <span className="checklist-panel__section-title">{title}</span>
                <span className="checklist-panel__section-meta">
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
                      className={
                        isChecked
                          ? "checklist-panel__item checklist-panel__item--done"
                          : "checklist-panel__item"
                      }
                    >
                      <div
                        className="checklist-panel__item-row"
                        onClick={() => toggleItem(item.id)}
                      >
                        <div
                          className={
                            isChecked
                              ? "checklist-panel__check checklist-panel__check--on"
                              : "checklist-panel__check"
                          }
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
                        <div className="checklist-panel__item-body">
                          <div
                            className={
                              isChecked
                                ? "checklist-panel__item-text checklist-panel__item-text--done"
                                : "checklist-panel__item-text"
                            }
                          >
                            {item.text}
                          </div>
                          <div className="checklist-panel__meta-row">
                            <span className="checklist-panel__wcag">WCAG {item.wcag}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenGuide((s) => ({
                                  ...s,
                                  [item.id]: !s[item.id],
                                }));
                              }}
                              className="checklist-panel__guide-link"
                              aria-expanded={guideOpen}
                            >
                              {guideOpen ? "Hide guide ▲" : "How to test ▼"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {guideOpen && (
                        <div className="checklist-panel__guide">
                          {item.guide.map((step, si) => (
                            <div
                              key={si}
                              className={
                                si > 0
                                  ? "checklist-panel__guide-step checklist-panel__guide-step--spaced"
                                  : "checklist-panel__guide-step"
                              }
                            >
                              <span className="checklist-panel__guide-step-num">
                                {si + 1}
                              </span>
                              <span className="checklist-panel__guide-step-text">
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
