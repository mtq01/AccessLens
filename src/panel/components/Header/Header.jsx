const TABS = [
  { id: "scan",      label: "Scan" },
  { id: "tools",     label: "Tools" },
  { id: "contrast",  label: "Colors" },
  { id: "checklist", label: "Checklist" },
];

export default function Header({ tab, setTab, scanBadge, onFeedback }) {
  return (
    <>
      <header className="header">
        <div className="logo">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="logo-svg" aria-hidden="true">
            <rect width="26" height="26" rx="6" fill="currentColor"/>
            <path d="M5 13s2.5-5 8-5 8 5 8 5-2.5 5-8 5-8-5-8-5z" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
            <circle cx="13" cy="13" r="2.2" fill="white"/>
          </svg>
          <span className="logo-text">Access<span className="logo-accent">Lens</span></span>
        </div>

        <button className="header-btn" onClick={onFeedback} aria-label="Send feedback">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <nav className="tabs" role="tablist" aria-label="Main sections">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "tab--active" : ""}`}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
            {t.id === "scan" && scanBadge != null && scanBadge > 0 && (
              <span className="tab-badge" aria-label={`${scanBadge} issues`}>{scanBadge}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
