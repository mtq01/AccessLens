// 4 panels that show up depending on which tab you click
import ScanPanel from "../ScanPanel/ScanPanel";
import ToolsPanel from "../ToolsPanel/ToolsPanel";
import ContrastPanel from "../ContrastPanel/ContrastPanel";
import ChecklistPanel from "../ChecklistPanel/ChecklistPanel";

/* MainContent receives info from App.jsx and decides what to show based on the props passed:

  ready              — is the extension connected to the browser tab yet? (T/F)
  tab                — which tab is selected: scan, tools, contrast, or checklist
  scanData           — the results from the last accessibility scan
  runScan            — a function that starts a new scan when called
  pageUrl            — the web address of the page being inspected
  onViolationCount   — a function that updates the little number badge on the Scan tab */

export default function MainContent({ ready, tab, scanData, runScan, pageUrl, onViolationCount }) {
  return (
    <main className="main" id="main-content">

      {/* [check 1]: is the extension still connecting to the tab?
          If yes, show spinning loader. If no, move on to the next check. */}
      {!ready ? (
        <div className="empty-state">
          <div className="spinner" aria-label="Connecting…" />
          <p className="empty-text">Connecting to page…</p>
        </div>

      // [check 2]: which tab did the user click? (show the matching panel for that tab)

      ) : tab === "scan" ? (
        /* "scan" runs the accessibility checker and shows the results. we pass it everything it needs: the scan results, 
                   how to start a scan, the page address, and how to update the badge number. */
        <ScanPanel
          scanData={scanData}
          runScan={runScan}
          pageUrl={pageUrl}
          onViolationCount={onViolationCount}
        />
      ) : tab === "tools" ? (
        // "tools" shows extra accessibility tools using the scan results.
        <ToolsPanel scanData={scanData} />
      ) : tab === "contrast" ? (
        // "contrast" lets the user check if text colors are easy to read.
        <ContrastPanel />
      ) : (
        // if none of the above tabs matched, show the "checklist" tab by default.
        <ChecklistPanel />
      )}
    </main>
  );
}
