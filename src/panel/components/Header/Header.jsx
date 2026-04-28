const TABS = [
  { id: "scan",      label: "Scan" },
  { id: "tools",     label: "Tools" },
  { id: "contrast",  label: "Colours" },
  { id: "checklist", label: "Checklist" },
];

export default function Header({ tab, setTab, scanBadge }) {
  return (
    <header className="header">
      <div className="logo">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="logo-svg" aria-hidden="true">
          <rect width="22" height="22" rx="5" fill="#2563eb"/>
          <path d="M6 11l3.5 3.5 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="logo-text">Access<span className="logo-accent">Lens</span></span>
      </div>

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
    </header>
  );
}
