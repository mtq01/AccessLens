import { useState } from "react";
import { Icon } from "../Icon";
import { CHECKLIST } from "../../data/checklistData";

// a nickname for where we save the checklist progress in the browser's memory.
const STORAGE_KEY = "accesslens_checklist_v1";

// opens a "shoebox" and reads which checkboxes the user already ticked.
function loadChecked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY); // Look inside the shoebox
    return raw ? JSON.parse(raw) : {}; // If there's something there, read it. If not, start fresh.
  } catch {
    return {}; // If something went wrong reading it, just start fresh
  }
}

// puts the updated list of checked boxes back into the shoebox so it's saved.
function saveChecked(checked) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); // Write the list into the shoebox
  } catch {} // If saving fails (rare), just move on — don't crash
}

// [main component] — it draws the whole checklist panel on screen
export default function ChecklistPanel() {
  // "checked" remembers which checkboxes are ticked. We start by reading the shoebox.
  // "setChecked" is how we update that memory when something changes.
  const [checked, setChecked] = useState(loadChecked);

  // "collapsed" remembers which category sections are folded up (hidden) or open.
  // We start with ALL categories collapsed (true = collapsed).
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(CHECKLIST.map((cat) => [cat.id, true])),
  );

  // Count how many checklist items exist in total (across all categories)
  const totalItems = CHECKLIST.reduce((s, c) => s + c.items.length, 0);

  // Count how many of those items are currently ticked
  const totalChecked = Object.values(checked).filter(Boolean).length;

  // Figure out what percentage is done, rounded to a whole number
  const pct = Math.round((totalChecked / totalItems) * 100);

  // Pick a color "tier" based on how far along the user is:
  // - "complete" if 100% done
  // - "partial" if more than half done
  // - "low" if less than half done
  const pctTier = pct === 100 ? "complete" : pct > 50 ? "partial" : "low";

  // This runs when the user clicks a single checkbox.
  // It flips that checkbox from off→on or on→off, then saves the new state.
  function toggle(id) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }; // Copy the old list, flip just this one item
      saveChecked(next); // Save the updated list to the shoebox
      return next; // Tell React to remember the new list
    });
  }

  // This runs when the user clicks a category header button.
  // It flips that category from open→closed or closed→open.
  function toggleCategory(id) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // This runs when the user clicks "Reset all".
  // It wipes everything — all checkboxes go back to unchecked.
  function resetAll() {
    setChecked({}); // Clear the memory
    saveChecked({}); // Clear the shoebox too
  }

  return (
    <section className="checklist-panel">

      {/* The top part: shows the progress bar and the note about human judgment */}
      <header className="checklist-header">

        {/* A row showing "X of Y completed" on the left and the percentage badge on the right */}
        <div className="checklist-progress-row">
          <span className="checklist-progress-text">
            {totalChecked} of {totalItems} completed
          </span>
          {/* The percentage badge — its color changes based on the tier (low/partial/complete) */}
          <span className={`checklist-pct checklist-pct--${pctTier}`}>
            {pct}%
          </span>
        </div>

        {/* The progress bar — a native HTML element that screen readers understand as a progress indicator.
            "value" is how far along we are. "max" is 100 (percent). */}
        <progress
          className={`checklist-bar-track checklist-bar-track--${pctTier}`}
          value={pct}
          max={100}
          aria-label={`${pct}% of checklist complete`}
        />

        {/* A short note reminding the user these checks require human eyes, not automation */}
        <p className="checklist-note">
          These checks need human judgment & they cannot be automated. Check off
          each item as you complete it. Progress is saved locally.
        </p>
      </header>

      {/* The list of categories — each category is one group of related checklist items */}
      <ul className="checklist-categories">
        {/* Loop through every category in the checklist data and draw each one */}
        {CHECKLIST.map((cat) => {
          // Count how many items inside THIS category are ticked
          const catChecked = cat.items.filter((i) => checked[i.id]).length;

          // Is every item in this category done?
          const catDone = catChecked === cat.items.length;

          // Is this category currently folded up (collapsed)?
          const isCollapsed = collapsed[cat.id];

          return (
            // Each category is a list item. If the whole category is done, add a "done" style.
            <li
              key={cat.id}
              className={`checklist-category ${catDone ? "checklist-category--done" : ""}`}
            >
              {/* The clickable header bar for this category.
                  aria-expanded tells screen readers whether the section is open or closed. */}
              <button
                className="checklist-cat-header"
                onClick={() => toggleCategory(cat.id)}
                aria-expanded={!isCollapsed}
              >
                {/* Small icon for the category */}
                <span className="checklist-cat-icon">
                  <Icon name={cat.icon} size={16} />
                </span>

                {/* The category name, like "Keyboard" or "Color Contrast" */}
                <span className="checklist-cat-name">{cat.category}</span>

                {/* A little badge showing "X/Y" items done for this category */}
                <span
                  className={`checklist-cat-count ${catDone ? "checklist-cat-count--done" : ""}`}
                >
                  {catChecked}/{cat.items.length}
                </span>

                {/* Only show the green checkmark icon if every item in this category is done */}
                {catDone && <Icon name="check_circle" size={16} />}

                {/* A little arrow — points right when collapsed, down when open */}
                <span className="principle-chevron">
                  {isCollapsed ? "▶" : "▼"}
                </span>
              </button>

              {/* Only show the items list if this category is NOT collapsed */}
              {!isCollapsed && (
                <ul className="checklist-items">
                  {/* Loop through every item in this category and draw a checkbox row */}
                  {cat.items.map((item) => (
                    <li key={item.id}>
                      {/* The label wraps the checkbox — clicking anywhere on the row ticks the box */}
                      <label
                        className={`checklist-item ${checked[item.id] ? "checklist-item--checked" : ""}`}
                      >
                        {/* The actual checkbox input — hidden visually but real for screen readers */}
                        <input
                          type="checkbox"
                          checked={!!checked[item.id]}
                          onChange={() => toggle(item.id)} // Call toggle when the user clicks it
                          className="checklist-checkbox"
                        />

                        {/* The text and WCAG reference for this checklist item */}
                        <div className="checklist-item-body">
                          {/* The human-readable description of what to check */}
                          <span className="checklist-item-text">
                            {item.text}
                          </span>

                          {/* Only show the WCAG badge if this item has a WCAG reference */}
                          {item.wcag !== "—" && (
                            <span className="checklist-item-wcag">
                              WCAG {item.wcag}
                            </span>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* The bottom area with the Reset button */}
      <footer className="checklist-footer">
        {/* Clicking this wipes all checkboxes back to zero */}
        <button className="checklist-reset" onClick={resetAll}>
          Reset all
        </button>
      </footer>
    </section>
  );
}
