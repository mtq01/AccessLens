import { Icon } from "./icons";
import { useState, useEffect } from "react";

const CHECKLIST = [
  {
    id: "keyboard",
    category: "Keyboard Navigation",
    icon: "keyboard",
    items: [
      { id: "kb-1", text: "Unplug your mouse. Try to use the whole page with only Tab, Enter, Space, and arrow keys.", wcag: "2.1.1" },
      { id: "kb-2", text: "Every link, button, input, and modal works with keyboard only.", wcag: "2.1.1" },
      { id: "kb-3", text: "You can always Tab away from any part of the page. No dead ends.", wcag: "2.1.2" },
      { id: "kb-4", text: "After closing a modal, focus goes back to where you were.", wcag: "2.4.3" },
      { id: "kb-5", text: "Tab order follows the reading order of the page. No unexpected jumps.", wcag: "2.4.3" },
    ]
  },
  {
    id: "screen-reader",
    category: "Screen Reader",
    icon: "hearing",
    items: [
      { id: "sr-1", text: "Test with VoiceOver (Mac: Cmd+F5) or NVDA (Windows, free). Try navigating by headings and links.", wcag: "4.1.2" },
      { id: "sr-2", text: "Page title is announced correctly when the page loads.", wcag: "2.4.2" },
      { id: "sr-3", text: "All images have alt text that describes what they mean, not just what they look like.", wcag: "1.1.1" },
      { id: "sr-4", text: "Form fields say their name and type out loud when focused.", wcag: "1.3.1" },
      { id: "sr-5", text: "New content like errors and success messages is read out loud automatically.", wcag: "4.1.3" },
      { id: "sr-6", text: "Modals are announced correctly. Focus stays inside while the modal is open.", wcag: "4.1.2" },
    ]
  },
  {
    id: "visual",
    category: "Visual & Cognitive",
    icon: "visibility",
    items: [
      { id: "vi-1", text: "Zoom to 200% (Cmd/Ctrl +). All content is still readable with no overlap.", wcag: "1.4.4" },
      { id: "vi-2", text: "Zoom to 400%. Content reflows to a single column with no horizontal scrolling needd.", wcag: "1.4.10" },
      { id: "vi-3", text: "All error messages explain the problem in words. Not just a red border.", wcag: "3.3.1" },
      { id: "vi-4", text: "Instructions don't rely on colour or position alone. Avoid saying 'click the green button.'", wcag: "1.3.3" },
      { id: "vi-5", text: "Animation can be paused or stopped. Test with the Reduce Motion setting on your OS.", wcag: "2.3.3" },
    ]
  },
  {
    id: "user-testing",
    category: "User Testing",
    icon: "people",
    items: [
      { id: "ut-1", text: "Someone who uses assistive technology has tested the main user flow.", wcag: "—" },
      { id: "ut-2", text: "Someone with low vision has tested the page at their preferred zoom level.", wcag: "—" },
      { id: "ut-3", text: "A disabled user has completed the main flows like checkout and sign-up.", wcag: "—" },
    ]
  },
  {
    id: "documentation",
    category: "Documentation",
    icon: "description",
    items: [
      { id: "doc-1", text: "An Accessibility Statement is in the footer with a contact email for users who need help.", wcag: "—" },
      { id: "doc-2", text: "An ACR or VPAT has been made for enterprise or government clients.", wcag: "—" },
      { id: "doc-3", text: "Known issues are written down with fix dates. Nothing is silently ignored.", wcag: "—" },
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
          These checks need human judgment — they cannot be automated. Check off each item as you complete it. Progress is saved locally.
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
