import { useState } from "react";
import { Icon } from "../Icon";
import { CHECKLIST } from "../../data/checklistData";

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
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(CHECKLIST.map(cat => [cat.id, true]))
  );

  const totalItems = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((totalChecked / totalItems) * 100);
  const pctTier = pct === 100 ? "complete" : pct > 50 ? "partial" : "low";

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
          <span className={`checklist-pct checklist-pct--${pctTier}`}>
            {pct}%
          </span>
        </div>
        <div className="checklist-bar-track">
          <div
            className={`checklist-bar-fill checklist-bar-fill--${pctTier}`}
            style={{ width: pct + "%" }}
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
                <span className={`checklist-cat-count ${catDone ? "checklist-cat-count--done" : ""}`}>
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
