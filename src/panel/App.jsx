import { useState, useEffect } from "react";
import ScanPanel from "./ScanPanel";
import ContrastPanel from "./ContrastPanel";
import ChecklistPanel from "./ChecklistPanel";
import { Icon } from "./icons";

const ONBOARDING_STEPS = [
  { icon: "search",        title: "Scan any page instantly",    body: "Open AccessLens on any website and click Run scan. It checks for problems affecting people who use screen readers or keyboard navigation." },
  { icon: "warning_amber", title: "See what's broken and why",  body: "Issues are sorted by importance. The worst problems come first. Each one has a plain-language explanation and a code fix you can copy." },
  { icon: "contrast",      title: "Check colour contrast",      body: "The Colours tab checks every text and background combination on the page. Bad contrast is one of the most common and easiest problems to fix." },
  { icon: "account_tree",  title: "Test keyboard navigation",   body: "Use the Focus tab to test without a mouse. The tab order map shows every keyboard stop and flags anything confusing." },
  { icon: "upload",        title: "Export a report",            body: "After scanning, use the Export button to get a PDF or CSV you can share with your team or client." },
];

function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const cur = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-logo">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="6" fill="#2563eb"/>
            <path d="M7 13l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="onboarding-brand">AccessLens</span>
        </div>
        <div className="onboarding-icon"><Icon name={cur.icon} size={32} /></div>
        <div className="onboarding-title">{cur.title}</div>
        <div className="onboarding-body">{cur.body}</div>
        <div className="onboarding-dots">
          {ONBOARDING_STEPS.map((_, i) => (
            <button key={i} className={`onboarding-dot ${i===step?"onboarding-dot--active":""}`} onClick={() => setStep(i)} aria-label={`Step ${i+1}`} />
          ))}
        </div>
        <div className="onboarding-actions">
          {step > 0 && <button className="onboarding-back" onClick={() => setStep(s => s-1)}>Back</button>}
          <button className="onboarding-next" onClick={() => isLast ? onDone() : setStep(s => s+1)}>
            {isLast ? "Start scanning" : "Next →"}
          </button>
        </div>
        {!isLast && <button className="onboarding-skip" onClick={onDone}>Skip intro</button>}
      </div>
    </div>
  );
}

const TABS = [
  { id: "scan",      label: "Scan" },
  { id: "contrast",  label: "Colours" },
  { id: "focus",     label: "Focus" },
  { id: "checklist", label: "Checklist" },
];

export default function App() {
  const [tab, setTab]       = useState("scan");
  const [ready, setReady]   = useState(false);
  const [tabId, setTabId]   = useState(null);
  const [scanBadge, setScanBadge] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("al_onboarded"); } catch { return true; }
  });

  function completeOnboarding() {
    try { localStorage.setItem("al_onboarded", "1"); } catch {}
    setShowOnboarding(false);
  }

  useEffect(() => {
    let attempts = 0;
    function poll() {
      chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
        if (chrome.runtime.lastError) { if (attempts++ < 20) setTimeout(poll, 150); return; }
        if (response?.tabId) { setTabId(response.tabId); setReady(true); }
        else if (attempts++ < 20) setTimeout(poll, 150);
      });
    }
    poll();
  }, []);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") setScanBadge(null);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  function openFeedback() {
    chrome.tabs.create({ url: "https://forms.gle/placeholder-feedback-form" });
  }

  return (
    <div className="app">
      {showOnboarding && <OnboardingScreen onDone={completeOnboarding} />}

      {/* Header — uses CSS class names from the design system */}
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
              className={`tab ${tab===t.id?"tab--active":""}`}
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={tab===t.id}
            >
              {t.label}
              {t.id==="scan" && scanBadge != null && scanBadge > 0 && (
                <span style={{fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:10,background:"#dc2626",color:"#fff",marginLeft:4}} aria-label={`${scanBadge} issues`}>{scanBadge}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="main" id="main-content">
        {!ready ? (
          <div className="empty-state">
            <div className="spinner" style={{width:20,height:20,border:"2px solid #e8eaef",borderTopColor:"#2563eb",margin:"0 auto 12px"}} aria-label="Connecting…"/>
            <p style={{fontSize:16,color:"#5a6070"}}>Connecting to page…</p>
          </div>
        ) : tab==="scan" || tab==="focus" ? (
          <ScanPanel
            tabId={tabId}
            initialTab={tab==="focus" ? "focus" : "violations"}
            onViolationCount={setScanBadge}
          />
        ) : tab==="contrast" ? (
          <ContrastPanel tabId={tabId} />
        ) : (
          <ChecklistPanel />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>● WCAG 2.2 AA</span>
        <button
          onClick={openFeedback}
          style={{background:"none",border:"none",color:"#5a6070",cursor:"pointer",fontFamily:"var(--mono)",fontSize:16}}
        >
          Send feedback
        </button>
      </footer>
    </div>
  );
}
