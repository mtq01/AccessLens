import { useState } from "react";
import { Icon } from "../Icon";

const ONBOARDING_STEPS = [
  { icon: "search",        title: "Scan any page instantly",    body: "Open AccessLens on any website and click Run scan. It checks for problems affecting people who use screen readers or keyboard navigation." },
  { icon: "warning_amber", title: "See what's broken and why",  body: "Issues are sorted by importance. The worst problems come first. Each one has a plain-language explanation and a code fix you can copy." },
  { icon: "contrast",      title: "Check colour contrast",      body: "The Colours tab checks every text and background combination on the page. Bad contrast is one of the most common and easiest problems to fix." },
  { icon: "account_tree",  title: "Test keyboard navigation",   body: "Use the Tools tab to test without a mouse. The tab order map shows every keyboard stop and flags anything confusing." },
  { icon: "upload",        title: "Export a report",            body: "After scanning, use the Export button to get a PDF or CSV you can share with your team or client." },
];

export default function OnboardingPanel({ onDone }) {
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
            <button
              key={i}
              className={`onboarding-dot ${i === step ? "onboarding-dot--active" : ""}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>
        <div className="onboarding-actions">
          {step > 0 && <button className="onboarding-back" onClick={() => setStep(s => s - 1)}>Back</button>}
          <button className="onboarding-next" onClick={() => isLast ? onDone() : setStep(s => s + 1)}>
            {isLast ? "Start scanning" : "Next →"}
          </button>
        </div>
        {!isLast && <button className="onboarding-skip" onClick={onDone}>Skip intro</button>}
      </div>
    </div>
  );
}
