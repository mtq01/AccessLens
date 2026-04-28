import { useState, useEffect } from "react";
import Header from "./components/Header/Header";
import OnboardingPanel from "./components/OnboardingPanel/OnboardingPanel";
import ScanPanel from "./components/ScanPanel/ScanPanel";
import ToolsPanel from "./components/ToolsPanel/ToolsPanel";
import ContrastPanel from "./components/ContrastPanel/ContrastPanel";
import ChecklistPanel from "./components/ChecklistPanel/ChecklistPanel";
import { IMPACT_ORDER } from "./utils";

const INITIAL_SCAN_DATA = {
  status: "idle",
  errorMsg: "",
  violations: [],
  passes: [],
  dynamicIssues: [],
};

export default function App() {
  const [tab, setTab]       = useState("scan");
  const [ready, setReady]   = useState(false);
  const [tabId, setTabId]   = useState(null);
  const [scanBadge, setScanBadge] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("al_onboarded"); } catch { return true; }
  });

  // Lifted scan state — shared between ScanPanel and ToolsPanel
  const [scanData, setScanData] = useState(INITIAL_SCAN_DATA);
  const [pageUrl, setPageUrl]   = useState("");

  function completeOnboarding() {
    try { localStorage.setItem("al_onboarded", "1"); } catch {}
    setShowOnboarding(false);
  }

  // Connect to background, get tabId
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

  // Fetch page URL when tabId changes
  useEffect(() => {
    if (!tabId) return;
    chrome.tabs.get(tabId, (t) => {
      if (!chrome.runtime.lastError && t?.url) setPageUrl(t.url);
    });
  }, [tabId]);

  // Reset state on tab change
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") {
        setScanBadge(null);
        setScanData(INITIAL_SCAN_DATA);
        if (msg.tabId) chrome.tabs.get(msg.tabId, (t) => {
          if (!chrome.runtime.lastError && t?.url) setPageUrl(t.url);
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  function runScan() {
    setScanData(d => ({ ...d, status: "scanning", errorMsg: "" }));
    chrome.runtime.sendMessage({ type: "RUN_SCAN" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        const err = response?.error || chrome.runtime.lastError?.message || "";
        setScanData({
          ...INITIAL_SCAN_DATA,
          status: "error",
          errorMsg: err === "chrome_restricted" ? "chrome_restricted" : "inject_failed",
        });
        return;
      }
      const sorted = [...response.violations].sort(
        (a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
      );
      setScanData({
        status: "done",
        errorMsg: "",
        violations: sorted,
        passes: response.passes || [],
        dynamicIssues: response.dynamicIssues || [],
      });
    });
  }

  function openFeedback() {
    chrome.tabs.create({ url: "https://forms.gle/placeholder-feedback-form" });
  }

  return (
    <div className="app">
      {showOnboarding && <OnboardingPanel onDone={completeOnboarding} />}

      <Header tab={tab} setTab={setTab} scanBadge={scanBadge} onFeedback={openFeedback} />

      <main className="main" id="main-content">
        {!ready ? (
          <div className="empty-state">
            <div className="spinner" aria-label="Connecting…" />
            <p className="empty-text">Connecting to page…</p>
          </div>
        ) : tab === "scan" ? (
          <ScanPanel
            scanData={scanData}
            runScan={runScan}
            pageUrl={pageUrl}
            onViolationCount={setScanBadge}
          />
        ) : tab === "tools" ? (
          <ToolsPanel scanData={scanData} />
        ) : tab === "contrast" ? (
          <ContrastPanel />
        ) : (
          <ChecklistPanel />
        )}
      </main>

      <footer className="app-footer">
        <span className="app-footer-meta">● WCAG 2.2 AA</span>
        <button className="app-footer-btn" onClick={openFeedback}>
          Send feedback
        </button>
      </footer>
    </div>
  );
}
