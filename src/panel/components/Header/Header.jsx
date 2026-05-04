const TABS = [
  { id: "scan",      label: "Scan" },
  { id: "tools",     label: "Tools" },
  { id: "contrast",  label: "Colors" },
  { id: "checklist", label: "Checklist" },
];

export default function Header({ tab, setTab, scanBadge, isPopout, sidePanelWindowId }) {
  function popOut() {
    chrome.runtime.sendMessage({ type: "POPOUT" });
  }

  function dockBack() {
    chrome.runtime.sendMessage({ type: "POPIN" });
    chrome.windows.getCurrent(win => chrome.windows.remove(win.id));
  }

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

        <div className="header-actions">
          {!isPopout && (
            <button className="header-btn" onClick={popOut} aria-label="Pop out into window">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/>
              </svg>
            </button>
          )}
          {isPopout && (
            <button className="header-btn" onClick={dockBack} aria-label="Dock back to sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14zm-10-3h8v-2h-8v2zm0-4h8v-2h-8v2zm0-4h8V6h-8v2zM5 17h4V7H5v10z" fill="currentColor"/>
              </svg>
            </button>
          )}

        </div>
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
