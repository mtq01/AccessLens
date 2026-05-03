import { useState, useEffect } from "react";
import Header from "./components/Header/Header";
import OnboardingPanel from "./components/OnboardingPanel/OnboardingPanel";
import MainContent from "./components/MainContent/MainContent";
import { IMPACT_ORDER } from "./utils";

const INITIAL_SCAN_DATA = {
  status: "idle",
  errorMsg: "",
  violations: [],
  passes: [],
  dynamicIssues: [],
};

const _params   = new URLSearchParams(window.location.search);
const isPopout  = _params.get("popout") === "1";
const sidePanelWindowId = parseInt(_params.get("wid")) || null;

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

  const [poppedOut, setPoppedOut] = useState(false);

  // Reset state on tab change; track popout state
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === "TAB_CHANGED") {
        setScanBadge(null);
        setScanData(INITIAL_SCAN_DATA);
        if (msg.tabId) chrome.tabs.get(msg.tabId, (t) => {
          if (!chrome.runtime.lastError && t?.url) setPageUrl(t.url);
        });
      }
      if (msg.type === "POPOUT_CHANGED") {
        setPoppedOut(msg.value);
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

  if (poppedOut && !isPopout) {
    return (
      <div className="popout-placeholder">
        <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden="true">
          <rect width="26" height="26" rx="6" fill="#166534"/>
          <path d="M5 13s2.5-5 8-5 8 5 8 5-2.5 5-8 5-8-5-8-5z" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
          <circle cx="13" cy="13" r="2.2" fill="white"/>
        </svg>
        <p>AccessLens is open in a floating window.</p>
        <span>Use the <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{display:"inline",verticalAlign:"middle"}} aria-hidden="true"><path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14zm-10-3h8v-2h-8v2zm0-4h8v-2h-8v2zm0-4h8V6h-8v2zM5 17h4V7H5v10z" fill="currentColor"/></svg> button in that window to dock it back.</span>
      </div>
    );
  }

  return (
    <div className="app">
      {showOnboarding && <OnboardingPanel onDone={completeOnboarding} />}

      <Header tab={tab} setTab={setTab} scanBadge={scanBadge} isPopout={isPopout} sidePanelWindowId={sidePanelWindowId} />

      <MainContent
        ready={ready}
        tab={tab}
        scanData={scanData}
        runScan={runScan}
        pageUrl={pageUrl}
        onViolationCount={setScanBadge}
      />

      <footer className="app-footer">
        <span className="app-footer-dot" aria-hidden="true" />
        WCAG 2.2 AA
        <span className="app-footer-version">AccessLens v2</span>
      </footer>
    </div>
  );
}
