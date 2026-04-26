// This is the extension's message hub.
// It opens the panel, tracks which tab to scan, and forwards messages.
var panelWindowId = null;
var trackedTabId = null;

// ── Open panel on icon click ──────────────────────────────────────────────────
chrome.action.onClicked.addListener(function (tab) {
  trackedTabId = tab.id;

  if (panelWindowId !== null) {
    chrome.windows.update(panelWindowId, { focused: true });
    // Update tracked tab even if panel is already open
    chrome.runtime.sendMessage({ type: "TAB_CHANGED", tabId: tab.id });
    return;
  }

  chrome.windows.create(
    {
      url: chrome.runtime.getURL("panel.html"),
      type: "popup",
      width: 570,
      height: 760,
    },
    function (win) {
      panelWindowId = win.id;
    },
  );
});

// ── Track tab switches ────────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(function (activeInfo) {
  // Only update if the activated tab is NOT the panel itself
  if (panelWindowId === null) return;
  chrome.windows.get(panelWindowId, function (panelWin) {
    if (chrome.runtime.lastError) return;
    if (activeInfo.windowId !== panelWin.id) {
      trackedTabId = activeInfo.tabId;
      // Notify panel that the tracked tab changed
      chrome.tabs.query({ windowId: panelWin.id }, function (tabs) {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "TAB_CHANGED",
            tabId: activeInfo.tabId,
          });
        }
      });
    }
  });
});

// ── Clean up when panel closes ────────────────────────────────────────────────
chrome.windows.onRemoved.addListener(function (windowId) {
  if (windowId === panelWindowId) {
    panelWindowId = null;
    trackedTabId = null;
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

  // First check if tab is accessible
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) {
      if (sendResponse)
        sendResponse({
          success: false,
          error:
            "Tab not found — click the extension icon on the page you want to scan",
        });
      return;
    }

    // Block chrome:// and extension pages
    if (
      tab.url &&
      (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:"))
    ) {
      if (sendResponse)
        sendResponse({ success: false, error: "chrome_restricted" });
      return;
    }

    chrome.tabs.sendMessage(tabId, message, function (response) {
      if (chrome.runtime.lastError) {
        // Content script not ready — inject then retry
        chrome.scripting.executeScript(
          { target: { tabId: tabId }, files: ["content.js"] },
          function () {
            if (chrome.runtime.lastError) {
              if (sendResponse)
                sendResponse({
                  success: false,
                  error: chrome.runtime.lastError.message,
                });
              return;
            }
            setTimeout(function () {
              chrome.tabs.sendMessage(tabId, message, function (r) {
                if (chrome.runtime.lastError) {
                  if (sendResponse)
                    sendResponse({
                      success: false,
                      error: chrome.runtime.lastError.message,
                    });
                } else {
                  if (sendResponse) sendResponse(r || { success: true });
                }
              });
            }, 400);
          },
        );
      } else {
        if (sendResponse) sendResponse(response || { success: true });
      }
    });
  });
}

// ── Forward messages from content script to panel ─────────────────────────────
function forwardToPanel(message) {
  if (panelWindowId === null) return;
  chrome.tabs.query({ windowId: panelWindowId }, function (tabs) {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

// ── Message router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "GET_TAB_ID") {
    sendResponse({ tabId: trackedTabId });
    return true;
  }

  if (message.type === "SET_BADGE") {
    if (message.text) {
      chrome.action.setBadgeText({ text: message.text });
      chrome.action.setBadgeBackgroundColor({
        color: message.color || "#E24B4A",
      });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
    return true;
  }

  var toContentScript = [
    "RUN_SCAN",
    "HIGHLIGHT_ELEMENT",
    "CLEAR_HIGHLIGHT",
    "START_PICKER",
    "START_FOCUS_MODE",
    "STOP_FOCUS_MODE",
    "RUN_ZOOM_TEST",
    "ENABLE_HIGH_CONTRAST",
    "DISABLE_HIGH_CONTRAST",
    "SHOW_TAB_ORDER",
    "SCROLL_TO_STOP",
    "RUN_CONTENT_ANALYSIS",
    "SCAN_CONTRAST",
    "SCROLL_TO_ELEMENT",
  ];

  if (toContentScript.indexOf(message.type) !== -1) {
    sendToTab(message, sendResponse);
    return true;
  }

  var toPanel = [
    "PICKER_RESULT",
    "FOCUS_UPDATE",
    "FOCUS_MODE_STOPPED",
    "TAB_CHANGED",
  ];
  if (toPanel.indexOf(message.type) !== -1) {
    forwardToPanel(message);
    return true;
  }
});
