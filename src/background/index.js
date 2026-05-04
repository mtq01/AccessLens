var panelWindowId   = null;
var trackedTabId    = null;
var trackedWindowId = null;

// ── Tell Chrome to open the side panel when the toolbar icon is clicked ───────
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function() {});

// ── Track which tab/window is active when the panel opens ────────────────────
chrome.action.onClicked.addListener(function(tab) {
  trackedTabId    = tab.id;
  trackedWindowId = tab.windowId;
});

// ── Track tab switches ────────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (panelWindowId !== null) {
    // Popup mode: ignore activations inside the popup window itself
    chrome.windows.get(panelWindowId, function(panelWin) {
      if (chrome.runtime.lastError) { panelWindowId = null; return; }
      if (activeInfo.windowId !== panelWin.id) {
        trackedTabId = activeInfo.tabId;
        forwardToPanel({ type: "TAB_CHANGED", tabId: activeInfo.tabId });
      }
    });
  } else {
    // Side panel mode: only follow tabs in the window where the panel lives
    if (trackedWindowId !== null && activeInfo.windowId !== trackedWindowId) return;
    trackedTabId = activeInfo.tabId;
    forwardToPanel({ type: "TAB_CHANGED", tabId: activeInfo.tabId });
  }
});

// ── Restore side panel state when popup window is closed ─────────────────────
chrome.windows.onRemoved.addListener(function(windowId) {
  if (windowId === panelWindowId) {
    panelWindowId = null;
    forwardToPanel({ type: "POPOUT_CHANGED", value: false });
  }
});

// ── Send to content script with auto-inject fallback ─────────────────────────
function sendToTab(message, sendResponse) {
  if (trackedTabId === null || trackedTabId === undefined) {
    if (sendResponse) sendResponse({ success: false, error: "No tab tracked" });
    return;
  }

  var tabId = parseInt(trackedTabId, 10);
  if (isNaN(tabId)) {
    if (sendResponse) sendResponse({ success: false, error: "Invalid tab ID" });
    return;
  }

  chrome.tabs.get(tabId, function(tab) {
    if (chrome.runtime.lastError || !tab) {
      if (sendResponse) sendResponse({ success: false, error: "Tab not found — click the extension icon on the page you want to scan" });
      return;
    }

    if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:"))) {
      if (sendResponse) sendResponse({ success: false, error: "chrome_restricted" });
      return;
    }

    chrome.tabs.sendMessage(tabId, message, function(response) {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId: tabId }, files: ["content.js"] },
          function() {
            if (chrome.runtime.lastError) {
              if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            setTimeout(function() {
              chrome.tabs.sendMessage(tabId, message, function(r) {
                if (chrome.runtime.lastError) {
                  if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  if (sendResponse) sendResponse(r || { success: true });
                }
              });
            }, 400);
          }
        );
      } else {
        if (sendResponse) sendResponse(response || { success: true });
      }
    });
  });
}

// ── Forward messages to panel (side panel or popup window) ────────────────────
function forwardToPanel(message) {
  // runtime.sendMessage reaches all extension pages: side panel, popup window, etc.
  chrome.runtime.sendMessage(message, function() {
    if (chrome.runtime.lastError) {} // suppress "no receiver" when panel is closed
  });
}

// ── Message router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // Reject any message that didn't originate from this extension's own pages or content scripts
  if (sender.id !== chrome.runtime.id) return;

  if (message.type === "GET_TAB_ID") {
    if (trackedTabId !== null) {
      sendResponse({ tabId: trackedTabId });
      return true;
    }
    // Service worker restarted or onClicked didn't fire — query the active tab directly
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
      if (tabs && tabs[0]) {
        trackedTabId    = tabs[0].id;
        trackedWindowId = tabs[0].windowId;
      }
      sendResponse({ tabId: trackedTabId });
    });
    return true;
  }

  if (message.type === "POPOUT") {
    forwardToPanel({ type: "POPOUT_CHANGED", value: true });
    var wid = trackedWindowId || "";
    chrome.windows.create({
      url: chrome.runtime.getURL("panel.html") + "?popout=1&wid=" + wid,
      type: "popup",
      width: 420,
      height: 800,
    }, function(win) { panelWindowId = win.id; });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "POPIN") {
    panelWindowId = null;
    forwardToPanel({ type: "POPOUT_CHANGED", value: false });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "SET_BADGE") {
    if (message.text) {
      chrome.action.setBadgeText({ text: message.text });
      chrome.action.setBadgeBackgroundColor({ color: message.color || "#E24B4A" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
    return true;
  }

  var toContentScript = [
    "RUN_SCAN", "HIGHLIGHT_ELEMENT", "CLEAR_HIGHLIGHT",
    "START_PICKER", "START_FOCUS_MODE", "STOP_FOCUS_MODE",
    "RUN_ZOOM_TEST", "ENABLE_HIGH_CONTRAST", "DISABLE_HIGH_CONTRAST",
    "SHOW_TAB_ORDER", "SCROLL_TO_STOP", "RUN_CONTENT_ANALYSIS",
    "SCAN_CONTRAST", "SCROLL_TO_ELEMENT",
    "START_FOCUS_RING_TESTER", "STOP_FOCUS_RING_TESTER",
  ];

  if (toContentScript.indexOf(message.type) !== -1) {
    sendToTab(message, sendResponse);
    return true;
  }

  var toPanel = ["PICKER_RESULT", "FOCUS_UPDATE", "FOCUS_MODE_STOPPED", "TAB_CHANGED"];
  if (toPanel.indexOf(message.type) !== -1) {
    forwardToPanel(message);
    return true;
  }
});
