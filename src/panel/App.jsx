import { useState, useEffect, useRef } from "react";
import ScanPanel from "./ScanPanel";
import ContrastPanel from "./ContrastPanel";
import ChecklistPanel from "./ChecklistPanel";
import { Icon } from "./icons";

const INTERVALS = [
  { label: "10s",    value: 10 },
  { label: "30s",    value: 30 },
  { label: "60s",    value: 60 },
  { label: "Custom", value: "custom" },
];

// ── Onboarding screen ─────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    icon: "search",
    title: "Scan any page instantly",
    body: "Open AccessLens on any site and click Run Scan. It finds problems that affect real users, like people who use screen readers or keyboard navigation.",
  },
  {
    icon: "warning_amber",
    title: "See what's broken and why",
    body: "Issues are sorted by importance. The worst problems come first. Each one has a simple explanation and a code fix you can copy.",
  },
  {
    icon: "contrast",
    title: "Check colour contrast",
    body: "The Contrast tab checks every colour on the page. Bad contrast is one of the most common problems and one of the easiest to fix.",
  },
  {
    icon: "account_tree",
    title: "Test keyboard navigation",
    body: "Use the Focus tools to test your page without a mouse. The tab map shows every keyboard stop and flags anything confusing.",
  },
  {
    icon: "upload",
    title: "Share a report",
    body: "After scanning, click Export to get a PDF or CSV report. Share it with your team or client to show what needs to be fixed.",
  },
];

function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-logo">
          <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="#4f8ef7"/>
            <path d="M5 10.5L8.5 14L15 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="onboarding-brand">AccessLens</span>
        </div>

        <div className="onboarding-icon">
          <Icon name={current.icon} size={32} />
        </div>

        <div className="onboarding-title">{current.title}</div>
        <div className="onboarding-body">{current.body}</div>

        <div className="onboarding-dots">
          {ONBOARDING_STEPS.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot ${i === step ? "onboarding-dot--active" : ""}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="onboarding-back" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          <button
            className="onboarding-next"
            onClick={() => isLast ? onDone() : setStep(s => s + 1)}
          >
            {isLast ? "Start scanning" : "Next"}
          </button>
        </div>

        {!isLast && (
          <button className="onboarding-skip" onClick={onDone}>
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab]           = useState("scan");
  const [ready, setReady]       = useState(false);
  const [tabId, setTabId]       = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("al_theme") !== "light"; } catch { return true; }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("al_onboarded"); } catch { return true; }
  });

  function completeOnboarding() {
    try { localStorage.setItem("al_onboarded", "1"); } catch {}
    setShowOnboarding(false);
  }
  const [devMode, setDevMode]             = useState(false);
  const [devInterval, setDevInterval]     = useState(30);
  const [countdown, setCountdown]         = useState(null);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [customSeconds, setCustomSeconds] = useState("");
  const [showDevInfo, setShowDevInfo]     = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try { localStorage.setItem("al_theme", darkMode ? "dark" : "light"); } catch {}
  }, [darkMode]);

  useEffect(() => {
    let attempts = 0;
    function poll() {
      chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
        if (chrome.runtime.lastError) {
          if (attempts++ < 20) setTimeout(poll, 150);
          return;
        }
        if (response?.tabId) { setTabId(response.tabId); setReady(true); }
        else if (attempts++ < 20) setTimeout(poll, 150);
      });
    }
    poll();
  }, []);

  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") setDevMode(false);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowIntervalPicker(false);
        setShowDevInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (!devMode) { setCountdown(null); return; }
    setCountdown(devInterval);
    const ticker = setInterval(() => {
      setCountdown(prev => prev <= 1 ? devInterval : prev - 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, [devMode, devInterval]);

  function toggleDevMode() {
    setDevMode(p => {
      if (p) chrome.runtime.sendMessage({ type: "SET_BADGE", text: "" });
      return !p;
    });
    setShowIntervalPicker(false);
  }

  function selectInterval(value) {
    if (value === "custom") return; // handled by input
    setDevInterval(value);
    setShowIntervalPicker(false);
    if (devMode) setCountdown(value);
  }

  function applyCustom() {
    const n = parseInt(customSeconds, 10);
    if (n >= 5 && n <= 3600) {
      setDevInterval(n);
      setShowIntervalPicker(false);
      if (devMode) setCountdown(n);
    }
  }

  function openFeedback() {
    chrome.tabs.create({ url: "https://forms.gle/placeholder-feedback-form" });
  }

  const TABS = [
    { id: "scan",      label: "Scan",     icon: "search" },
    { id: "contrast",  label: "Contrast", icon: "contrast" },
    { id: "checklist", label: "Manual",   icon: "checklist" },
  ];

  const progressPct = countdown !== null ? ((devInterval - countdown) / devInterval) * 100 : 0;

  return (
    <div className="app">
      {showOnboarding && <OnboardingScreen onDone={completeOnboarding} />}

      <header className="header">
        <div className="logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="logo-svg">
            <rect width="20" height="20" rx="5" fill="#4f8ef7"/>
            <path d="M5 10.5L8.5 14L15 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="logo-text">Access<span className="logo-accent">Lens</span></span>
        </div>

        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab===t.id?"tab--active":""}`} onClick={()=>setTab(t.id)}>
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="header-icon-btn" onClick={()=>setDarkMode(p=>!p)}
            title={darkMode?"Switch to light mode":"Switch to dark mode"}
            aria-label={darkMode?"Switch to light mode":"Switch to dark mode"}>
            <Icon name={darkMode ? "light_mode" : "dark_mode"} size={16} />
          </button>
          <button className="header-icon-btn" onClick={openFeedback}
            title="Send feedback" aria-label="Send feedback">
            <Icon name="feedback" size={16} />
          </button>
        </div>
      </header>

      {/* Dev mode progress bar */}
      {devMode && (
        <div className="dev-progress-track">
          <div className="dev-progress-fill" style={{width: progressPct+"%"}}/>
        </div>
      )}

      <main className="main">
        {!ready ? (
          <div className="empty-state">
            <div className="spinner" style={{width:18,height:18,margin:"0 auto 8px"}}/>
            <p>Connecting to page…</p>
          </div>
        ) : tab === "scan" ? (
          <ScanPanel tabId={tabId} devMode={devMode} devInterval={devInterval} countdown={countdown} />
        ) : tab === "contrast" ? (
          <ContrastPanel tabId={tabId} />
        ) : (
          <ChecklistPanel />
        )}
      </main>

      <footer className="app-footer">
        <span>WCAG 2.2 AA</span>

        {/* Dev mode — right side of footer */}
        <div className="dev-mode-wrap" ref={pickerRef}>
          {showIntervalPicker && (
            <div className="dev-interval-picker dev-interval-picker--up">
              <div className="dev-interval-label">Auto-scan interval</div>
              {INTERVALS.map(iv => (
                iv.value === "custom" ? (
                  <div key="custom" className="dev-interval-custom">
                    <input
                      type="number" min="5" max="3600" placeholder="seconds"
                      value={customSeconds} onChange={e => setCustomSeconds(e.target.value)}
                      className="dev-custom-input"
                      onKeyDown={e => e.key === "Enter" && applyCustom()}
                    />
                    <button className="dev-custom-apply" onClick={applyCustom}>Apply</button>
                  </div>
                ) : (
                  <button
                    key={iv.value}
                    className={`dev-interval-option ${devInterval===iv.value?"dev-interval-option--active":""}`}
                    onClick={() => selectInterval(iv.value)}
                  >
                    {iv.label}
                    {devInterval===iv.value && <Icon name="check" size={13} style={{marginLeft:"auto"}}/>}
                  </button>
                )
              ))}
            </div>
          )}

          {/* Dev info tooltip */}
          {showDevInfo && (
            <div className="dev-info-tooltip">
              <div className="dev-info-title">Dev mode</div>
              <p className="dev-info-text">
                Auto-scans the page on a timer. See issues appear and disappear as you code, without clicking Run Scan each time.
              </p>
              <p className="dev-info-text">
                The extension badge updates with your score after each scan. Use it while running a local dev server to catch issues the moment they're introduced.
              </p>
              <div className="dev-info-tip">Try 30 seconds during active development.</div>
            </div>
          )}

          <div className="dev-btn-group">
            <button
              className={`dev-mode-btn ${devMode?"dev-mode-btn--active":""}`}
              onClick={toggleDevMode}
              title={devMode ? "Stop live scanning" : "Start live scanning"}
            >
              <span className={`dev-dot ${devMode?"dev-dot--active":""}`}/>
              Dev
              {devMode && countdown !== null && (
                <span className="dev-countdown">{countdown}s</span>
              )}
            </button>
            <button
              className="dev-interval-btn"
              onClick={() => setShowIntervalPicker(p=>!p)}
              title="Set scan interval"
              aria-label="Set scan interval"
            >
              <Icon name="timer" size={13} />
            </button>
            <button
              className="dev-info-btn"
              onClick={() => setShowDevInfo(p=>!p)}
              title="What is dev mode?"
              aria-label="What is dev mode?"
            >
              <Icon name="info_outline" size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
