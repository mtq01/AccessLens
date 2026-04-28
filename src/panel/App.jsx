import { useState, useEffect } from "react";
import ScanPanel from "./ScanPanel";
import ContrastPanel from "./ContrastPanel";
import ChecklistPanel from "./ChecklistPanel";
import { Icon } from "./icons";

const ONBOARDING_STEPS = [
  {
    icon: "search",
    title: "Scan a page",
    body: "Open any website and press Run scan. AccessLens finds accessibility problems for you.",
  },
  {
    icon: "warning_amber",
    title: "See what is wrong",
    body: "The most important problems are shown first. Click one to see what it means and how to fix it.",
  },
  {
    icon: "contrast",
    title: "Check colors",
    body: "The Colors tab checks if text is easy to read on its background.",
  },
  {
    icon: "account_tree",
    title: "Test keyboard use",
    body: "Use Focus tools to test without a mouse. It shows where the Tab key moves.",
  },
  {
    icon: "upload",
    title: "Share results",
    body: "Press Export to make a report you can share with your team.",
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
          <svg
            width="32"
            height="32"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <rect width="28" height="28" rx="7" fill="#166534" />
            <ellipse
              cx="14"
              cy="14"
              rx="8"
              ry="5.5"
              stroke="white"
              strokeWidth="1.8"
              fill="none"
            />
            <circle cx="14" cy="14" r="2.8" fill="white" />
            <circle cx="14" cy="14" r="1.1" fill="#166534" />
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
            <button
              className="onboarding-back"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          )}
          <button
            className="onboarding-next"
            onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
          >
            {isLast ? "Start" : "Next"}
          </button>
        </div>

        {!isLast && (
          <button className="onboarding-skip" onClick={onDone}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "scan", label: "Scan" },
  { id: "contrast", label: "Colors" },
  { id: "checklist", label: "Checklist" },
  { id: "tools", label: "Tools" },
];

export default function App() {
  const [tab, setTab] = useState("scan");
  const [ready, setReady] = useState(false);
  const [tabId, setTabId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem("al_onboarded");
    } catch {
      return true;
    }
  });

  function completeOnboarding() {
    try {
      localStorage.setItem("al_onboarded", "1");
    } catch {}
    setShowOnboarding(false);
  }

  useEffect(() => {
    let attempts = 0;
    function poll() {
      chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
        if (chrome.runtime.lastError) {
          if (attempts++ < 20) setTimeout(poll, 150);
          return;
        }
        if (response?.tabId) {
          setTabId(response.tabId);
          setReady(true);
        } else if (attempts++ < 20) setTimeout(poll, 150);
      });
    }
    poll();
  }, []);

  function openFeedback() {
    chrome.tabs.create({ url: "https://forms.gle/placeholder-feedback-form" });
  }

  return (
    <div className="app">
      {showOnboarding && <OnboardingScreen onDone={completeOnboarding} />}

      <header className="header">
        <div className="logo">
          <svg
            width="26"
            height="26"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            className="logo-svg"
          >
            <rect width="28" height="28" rx="7" fill="#166534" />
            <ellipse
              cx="14"
              cy="14"
              rx="8"
              ry="5.5"
              stroke="white"
              strokeWidth="1.8"
              fill="none"
            />
            <circle cx="14" cy="14" r="2.8" fill="white" />
            <circle cx="14" cy="14" r="1.1" fill="#166534" />
          </svg>
          <span className="logo-text">
            Access<span className="logo-accent">Lens</span>
          </span>
        </div>

        <div style={{ flex: 1 }} />
        <button
          className="header-icon-btn"
          onClick={openFeedback}
          title="Send feedback"
          aria-label="Send feedback"
        >
          <Icon name="feedback" size={16} />
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {!ready ? (
          <div className="empty-state">
            <div
              className="spinner"
              style={{ width: 18, height: 18, margin: "0 auto 8px" }}
            />
            <p>Connecting to page…</p>
          </div>
        ) : tab === "scan" || tab === "tools" ? (
          <ScanPanel
            tabId={tabId}
            onOpenChecklist={() => setTab("checklist")}
            view={tab === "tools" ? "tools" : "scan"}
          />
        ) : tab === "contrast" ? (
          <ContrastPanel tabId={tabId} />
        ) : (
          <ChecklistPanel />
        )}
      </main>

      <footer className="app-footer">
        <span className="footer-dot" aria-hidden="true" />
        <span>WCAG 2.2 AA</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          AccessLens v2
        </span>
      </footer>
    </div>
  );
}
