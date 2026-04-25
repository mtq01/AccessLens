import { Icon } from "./icons";
import { useState, useEffect } from "react";

const CHECKLIST = [
  {
    id: "keyboard",
    category: "Keyboard Navigation",
    icon: "keyboard",
    items: [
      { id: "kb-1", text: "Unplug your mouse. Navigate the entire page using only Tab, Shift+Tab, Enter, Space, and arrow keys.", wcag: "2.1.1" },
      { id: "kb-2", text: "Every interactive element (links, buttons, inputs, dropdowns, modals) is reachable and operable by keyboard.", wcag: "2.1.1" },
      { id: "kb-3", text: "No keyboard traps — you can always Tab away from any component.", wcag: "2.1.2" },
      { id: "kb-4", text: "Focus is never lost (e.g. after closing a modal, focus returns to the trigger button).", wcag: "2.4.3" },
      { id: "kb-5", text: "Tab order follows the logical reading order of the page — not jumping around unexpectedly.", wcag: "2.4.3" },
    ]
  },
  {
    id: "screen-reader",
    category: "Screen Reader",
    icon: "hearing",
    items: [
      { id: "sr-1", text: "Test with VoiceOver (Mac: Cmd+F5) or NVDA (Windows: free download). Navigate using screen reader shortcuts.", wcag: "4.1.2" },
      { id: "sr-2", text: "Page title is announced correctly when the page loads.", wcag: "2.4.2" },
      { id: "sr-3", text: "All images have meaningful alt text that conveys the image's purpose, not just its appearance.", wcag: "1.1.1" },
      { id: "sr-4", text: "Form fields announce their label, type, and any error messages when focused.", wcag: "1.3.1" },
      { id: "sr-5", text: "Dynamic content changes (loading states, success messages, errors) are announced without requiring focus.", wcag: "4.1.3" },
      { id: "sr-6", text: "Modals and dialogs are announced correctly, and focus is trapped inside while open.", wcag: "4.1.2" },
    ]
  },
  {
    id: "visual",
    category: "Visual & Cognitive",
    icon: "visibility",
    items: [
      { id: "vi-1", text: "Zoom to 200% in the browser (Cmd/Ctrl +). All content is still readable and usable, no overlap.", wcag: "1.4.4" },
      { id: "vi-2", text: "Zoom to 400%. Content reflows to a single column with no horizontal scrolling required.", wcag: "1.4.10" },
      { id: "vi-3", text: "All error messages describe the problem in text — not just a red border or colour change.", wcag: "3.3.1" },
      { id: "vi-4", text: "Instructions do not rely on shape, colour, size, or position alone ('click the green button').", wcag: "1.3.3" },
      { id: "vi-5", text: "Animation and motion can be paused, stopped, or hidden. Test with Reduce Motion OS setting.", wcag: "2.3.3" },
    ]
  },
  {
    id: "user-testing",
    category: "User Testing",
    icon: "people",
    items: [
      { id: "ut-1", text: "At least one person who uses assistive technology has tested the primary user flow end-to-end.", wcag: "—" },
      { id: "ut-2", text: "A user with low vision has tested the page at their preferred zoom/text size.", wcag: "—" },
      { id: "ut-3", text: "Critical flows (checkout, form submission, sign-up) have been completed successfully by a disabled user.", wcag: "—" },
    ]
  },
  {
    id: "documentation",
    category: "Documentation",
    icon: "description",
    items: [
      { id: "doc-1", text: "An Accessibility Statement is published and linked in the footer, stating the standard targeted and a contact method.", wcag: "—" },
      { id: "doc-2", text: "An ACR (Accessibility Conformance Report / VPAT) has been generated for enterprise or government procurement.", wcag: "—" },
      { id: "doc-3", text: "Known accessibility issues are documented with planned fix dates, not silently ignored.", wcag: "—" },
    ]
  },
];

const STORAGE_KEY = "accesslens_checklist_v1";

function loadChecked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveChecked(checked) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
}

export default function ChecklistPanel() {
  const [checked, setChecked] = useState(loadChecked);
  const [collapsed, setCollapsed] = useState({});

  const totalItems = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((totalChecked / totalItems) * 100);

  function toggle(id) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecked(next);
      return next;
    });
  }

  function toggleCategory(id) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function resetAll() {
    setChecked({});
    saveChecked({});
  }

  return (
    <div className="checklist-panel">
      {/* Progress header */}
      <div className="checklist-header">
        <div className="checklist-progress-row">
          <span className="checklist-progress-text">
            {totalChecked} of {totalItems} completed
          </span>
          <span className="checklist-pct" style={{ color: pct === 100 ? "#1D9E75" : pct > 50 ? "#EF9F27" : "#E24B4A" }}>
            {pct}%
          </span>
        </div>
        <div className="checklist-bar-track">
          <div
            className="checklist-bar-fill"
            style={{
              width: pct + "%",
              background: pct === 100 ? "#1D9E75" : pct > 50 ? "#EF9F27" : "#4f8ef7",
            }}
          />
        </div>
        <p className="checklist-note">
          These checks require human judgment — they cannot be automated. Check off each item as you complete it. Progress is saved locally.
        </p>
      </div>

      {/* Categories */}
      <div className="checklist-categories">
        {CHECKLIST.map(cat => {
          const catChecked = cat.items.filter(i => checked[i.id]).length;
          const catDone = catChecked === cat.items.length;
          const isCollapsed = collapsed[cat.id];

          return (
            <div key={cat.id} className={`checklist-category ${catDone ? "checklist-category--done" : ""}`}>
              <button className="checklist-cat-header" onClick={() => toggleCategory(cat.id)}>
                <span className="checklist-cat-icon"><Icon name={cat.icon} size={16} /></span>
                <span className="checklist-cat-name">{cat.category}</span>
                <span className="checklist-cat-count" style={{ color: catDone ? "#1D9E75" : "var(--text3)" }}>
                  {catChecked}/{cat.items.length}
                </span>
                {catDone && <Icon name="check_circle" size={16} />}
                <span className="principle-chevron">{isCollapsed ? "▶" : "▼"}</span>
              </button>

              {!isCollapsed && (
                <div className="checklist-items">
                  {cat.items.map(item => (
                    <label key={item.id} className={`checklist-item ${checked[item.id] ? "checklist-item--checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={() => toggle(item.id)}
                        className="checklist-checkbox"
                      />
                      <div className="checklist-item-body">
                        <span className="checklist-item-text">{item.text}</span>
                        {item.wcag !== "—" && (
                          <span className="checklist-item-wcag">WCAG {item.wcag}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="checklist-reset" onClick={resetAll}>Reset all</button>
    </div>
  );
}
