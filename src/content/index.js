import axe from "axe-core";

let pickerActive = false;
let focusModeActive = false;
let focusStopCount = 0;
let focusHandler = null;
let focusKeyHandler = null;
let highContrastStyleEl = null;
let mutationObserver = null;
let dynamicIssues = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearHighlights() {
  document.querySelectorAll(".__al_hl__").forEach(el => el.remove());
}

function makeBadge(text, bg, extraStyles = {}) {
  const b = document.createElement("div");
  Object.assign(b.style, {
    position: "absolute",
    background: bg,
    color: "#fff",
    fontSize: "10px",
    fontFamily: "monospace",
    padding: "2px 6px",
    borderRadius: "3px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: "2147483647",
    ...extraStyles,
  });
  b.textContent = text;
  return b;
}

function createOverlay(rect, color, opacity = 0.08) {
  const el = document.createElement("div");
  el.className = "__al_hl__";
  // Use absolute + scroll offset so overlays stay anchored when scrolling
  const top  = rect.top  + window.scrollY;
  const left = rect.left + window.scrollX;
  Object.assign(el.style, {
    position: "absolute",
    top:    top    + "px",
    left:   left   + "px",
    width:  rect.width  + "px",
    height: rect.height + "px",
    outline: `2px solid ${color}`,
    outlineOffset: "2px",
    background: `${color}${Math.round(opacity * 255).toString(16).padStart(2,"0")}`,
    borderRadius: "2px",
    pointerEvents: "none",
    zIndex: "2147483646",
  });
  return el;
}

// ── Scan ─────────────────────────────────────────────────────────────────────

async function runScan() {
  try {
    const results = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21aa","wcag22aa"] },
    });
    return {
      success: true,
      violations: results.violations,
      passes: results.passes,
      dynamicIssues: deduplicateDynamicIssues(dynamicIssues),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Highlight element ─────────────────────────────────────────────────────────

function highlightElement(selector, showDimensions = false) {
  clearHighlights();
  try {
    const el = document.querySelector(selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overlay = createOverlay(rect, "#E24B4A");

    const short = selector.length > 40 ? selector.slice(0, 40) + "…" : selector;
    overlay.appendChild(makeBadge(short, "#E24B4A", { top: "-22px", left: "0" }));

    if (showDimensions) {
      const w = Math.round(rect.width), h = Math.round(rect.height);
      const ok = w >= 24 && h >= 24;
      const text = ok ? `${w}×${h}px ✓` : `${w}×${h}px. Needs 24×24px minimum`;
      overlay.appendChild(makeBadge(text, ok ? "#1D9E75" : "#C2410C", { bottom: "-24px", right: "0" }));
    }

    document.documentElement.appendChild(overlay);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch(e) {}
}

// ── Tab order visualiser ──────────────────────────────────────────────────────

const FOCUSABLE = [
  'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', 'button:not([disabled])', 'iframe',
  '[tabindex]', '[contenteditable="true"]', 'details > summary',
].join(', ');

// ── Focus ring detection via CSS rule inspection ─────────────────────────────
// Rather than focusing each element (which doesn't reliably trigger style
// recalculation in content scripts), we read the page's actual CSS rules
// and check whether any :focus or :focus-visible rule applies to the element.

let _focusRuleCache = null;

function buildFocusRuleCache() {
  if (_focusRuleCache) return _focusRuleCache;

  const rules = [];
  try {
    for (const sheet of document.styleSheets) {
      let cssRules;
      try { cssRules = sheet.cssRules; } catch { continue; }
      if (!cssRules) continue;
      for (const rule of cssRules) {
        if (!(rule instanceof CSSStyleRule)) continue;
        const sel = rule.selectorText || '';
        if (sel.includes(':focus') || sel.includes(':focus-visible') || sel.includes(':focus-within')) {
          // Check if the rule actually sets a visible focus indicator
          const s = rule.style;
          const hasOutline = s.outline && s.outline !== 'none' && s.outline !== '0';
          const hasOutlineWidth = s.outlineWidth && s.outlineWidth !== '0' && s.outlineWidth !== '0px';
          const hasBoxShadow = s.boxShadow && s.boxShadow !== 'none';
          const hasBorder = s.border && s.border !== 'none';
          const hasBorderColor = s.borderColor;
          const hasBackground = s.backgroundColor;
          const outlineExplicitlyNone = s.outline === 'none' || s.outlineWidth === '0' || s.outlineWidth === '0px';

          if (!outlineExplicitlyNone && (hasOutline || hasOutlineWidth || hasBoxShadow || hasBorder || hasBorderColor || hasBackground)) {
            // Strip the :focus/:focus-visible part to get the base selector
            const baseSelector = sel
              .replace(/:focus-visible/g, '')
              .replace(/:focus-within/g, '')
              .replace(/:focus/g, '')
              .trim();
            rules.push({ baseSelector, rule, hasOutline, hasBoxShadow, outlineExplicitlyNone });
          } else if (outlineExplicitlyNone && !hasBoxShadow) {
            // Explicitly removes focus ring with no replacement
            const baseSelector = sel
              .replace(/:focus-visible/g, '')
              .replace(/:focus-within/g, '')
              .replace(/:focus/g, '')
              .trim();
            rules.push({ baseSelector, rule, removes: true });
          }
        }
      }
    }
  } catch(e) {}

  _focusRuleCache = rules;
  return rules;
}

function elementHasFocusRingViaCSS(el) {
  const rules = buildFocusRuleCache();

  let hasPositiveRule = false;
  let hasRemovalRule = false;

  for (const entry of rules) {
    if (!entry.baseSelector) continue;
    try {
      // Check if this element matches the base selector
      if (el.matches(entry.baseSelector)) {
        if (entry.removes) {
          hasRemovalRule = true;
        } else {
          hasPositiveRule = true;
        }
      }
    } catch(e) {
      // Invalid selector — skip
    }
  }

  // If there's a positive rule and no removal, it has a focus ring
  // If there's only a removal rule, it doesn't
  // If no rules at all, browser default focus ring applies (most browsers show one)
  if (hasPositiveRule) return true;
  if (hasRemovalRule) return false;

  // No CSS rules found — check if browser default outline would show
  // Native elements (button, input, a, select) get browser defaults
  const nativeElements = ['button', 'input', 'select', 'textarea', 'a'];
  if (nativeElements.includes(el.tagName.toLowerCase())) {
    // Check if outline:none is set globally via inline style or a * rule
    const style = window.getComputedStyle(el);
    const outlineWidth = parseFloat(style.outlineWidth) || 0;
    // If outline is 0 in resting state, check if it's been explicitly zeroed
    if (outlineWidth === 0) {
      // Could be browser default that only appears on focus
      // Give benefit of the doubt — native elements usually have browser defaults
      return true;
    }
    return outlineWidth > 0;
  }

  // For custom elements with no CSS focus rules, assume no focus ring
  return false;
}

async function getTabOrder() {
  // Invalidate CSS rule cache for fresh scan
  _focusRuleCache = null;

  const allFocusable = Array.from(document.querySelectorAll(FOCUSABLE))
    .filter(el => {
      const ti = parseInt(el.getAttribute('tabindex') ?? '0', 10);
      if (ti < 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return true;
    });

  const withPos = allFocusable
    .filter(el => parseInt(el.getAttribute('tabindex') || '0', 10) > 0)
    .sort((a, b) => parseInt(a.getAttribute('tabindex'), 10) - parseInt(b.getAttribute('tabindex'), 10));
  const natural = allFocusable.filter(el => !(parseInt(el.getAttribute('tabindex') || '0', 10) > 0));
  const ordered = [...withPos, ...natural];

  const results = ordered.map((el, i) => {
    const rect = el.getBoundingClientRect();
    const tabindex = el.getAttribute('tabindex');
    const hasPositiveTabindex = tabindex !== null && parseInt(tabindex, 10) > 0;
    const isAriaHiddenFocusable = el.closest('[aria-hidden="true"]') !== null;
    const hasFocusRing = elementHasFocusRingViaCSS(el);

    const tag = el.tagName.toLowerCase();
    const id  = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    const text = (
      el.getAttribute('aria-label') ||
      el.getAttribute('alt') ||
      el.getAttribute('placeholder') ||
      el.getAttribute('title') ||
      el.textContent || ''
    ).trim().slice(0, 30);
    const label = `${tag}${id || cls}${text ? `: "${text}"` : ''}`;

    return {
      index: i + 1,
      tag,
      label,
      tabindex: tabindex || '0',
      hasPositiveTabindex,
      isAriaHiddenFocusable,
      hasFocusRing,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    };
  });

  return results;
}

async function showAllTabOrder() {
  clearHighlights();
  const stops = await getTabOrder();

  // Re-query ordered elements for positioning (getTabOrder already blurred them)
  const allFocusable = Array.from(document.querySelectorAll(FOCUSABLE))
    .filter(el => {
      const ti = parseInt(el.getAttribute('tabindex') ?? '0', 10);
      if (ti < 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

  const withPos = allFocusable
    .filter(e => parseInt(e.getAttribute('tabindex') || '0', 10) > 0)
    .sort((a, b) => parseInt(a.getAttribute('tabindex'), 10) - parseInt(b.getAttribute('tabindex'), 10));
  const natural = allFocusable.filter(e => !(parseInt(e.getAttribute('tabindex') || '0', 10) > 0));
  const ordered = [...withPos, ...natural];

  stops.forEach((stop, i) => {
    const domEl = ordered[i];
    if (!domEl) return;

    // Get rect — element may be off-screen so use getBoundingClientRect
    // then add scroll offset to get document-relative position
    const rect = domEl.getBoundingClientRect();
    const top  = rect.top  + window.scrollY;
    const left = rect.left + window.scrollX;

    // Skip elements with zero size (hidden)
    if (rect.width === 0 && rect.height === 0) return;

    // Colour by issue type
    let color = '#4f8ef7'; // blue — normal
    if (stop.isAriaHiddenFocusable) color = '#E24B4A'; // red (bug)
    else if (stop.hasPositiveTabindex) color = '#EF9F27'; // amber (avoid this)
    else if (!stop.hasFocusRing)       color = '#C2410C'; // dark red (no focus ring)

    // Element outline — absolute so it stays anchored on scroll
    const outline = document.createElement('div');
    outline.className = '__al_hl__';
    Object.assign(outline.style, {
      position: 'absolute',
      top:  top  + 'px',
      left: left + 'px',
      width:  rect.width  + 'px',
      height: rect.height + 'px',
      outline: `2px solid ${color}`,
      outlineOffset: '2px',
      background: `${color}18`,
      borderRadius: '2px',
      pointerEvents: 'none',
      zIndex: '2147483646',
    });

    // Number badge — absolute, positioned above element
    const badge = document.createElement('div');
    badge.className = '__al_hl__';
    Object.assign(badge.style, {
      position: 'absolute',
      top:  (top  - 10) + 'px',
      left: (left - 10) + 'px',
      width: '20px',
      height: '20px',
      background: color,
      color: '#fff',
      fontSize: '10px',
      fontFamily: 'monospace',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '2147483647',
      boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
      lineHeight: '1',
    });
    badge.textContent = stop.index;

    document.documentElement.appendChild(outline);
    document.documentElement.appendChild(badge);
  });

  return stops;
}

function scrollToStop(stopIndex) {
  const allFocusable = Array.from(document.querySelectorAll(FOCUSABLE))
    .filter(el => {
      const ti = parseInt(el.getAttribute('tabindex') ?? '0', 10);
      if (ti < 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  const withPos = allFocusable.filter(e => parseInt(e.getAttribute('tabindex') || '0', 10) > 0)
    .sort((a, b) => parseInt(a.getAttribute('tabindex'), 10) - parseInt(b.getAttribute('tabindex'), 10));
  const natural = allFocusable.filter(e => !(parseInt(e.getAttribute('tabindex') || '0', 10) > 0));
  const ordered = [...withPos, ...natural];
  const el = ordered[stopIndex - 1];
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function startFocusMode() {
  if (focusModeActive) return;
  focusModeActive = true;
  focusStopCount = 0;

  // Hint bar
  const hint = document.createElement("div");
  hint.id = "__al_focus_hint__";
  Object.assign(hint.style, {
    position: "fixed", top: "0", left: "0", right: "0",
    background: "#1a3a6b", color: "#ffffff",  // dark navy — white text 9.5:1 contrast
    fontSize: "13px", fontFamily: "monospace",
    padding: "8px 16px", zIndex: "2147483647",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    pointerEvents: "none",
    borderBottom: "2px solid #4f8ef7",
  });
  hint.innerHTML = `<span id="__al_focus_counter__">Press Tab to step through focus stops</span><span>Press Escape to stop</span>`;
  document.body.appendChild(hint);

  focusHandler = (e) => {
    if (!focusModeActive) return;
    clearHighlights();
    focusStopCount++;

    const el = e.target;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    // Check if focus ring is visible
    const outline = style.outline;
    const outlineWidth = parseFloat(style.outlineWidth) || 0;
    const boxShadow = style.boxShadow;
    const hasFocusRing = outlineWidth > 0 || (boxShadow && boxShadow !== "none");

    const color = hasFocusRing ? "#1D9E75" : "#E24B4A";
    const overlay = createOverlay(rect, color, 0.1);

    // Stop number badge
    overlay.appendChild(makeBadge(`#${focusStopCount}`, color, { top: "-22px", left: "0" }));

    // Focus ring status badge
    const status = hasFocusRing ? "Focus ring ✓" : "No focus ring ✗";
    overlay.appendChild(makeBadge(status, color, { bottom: "-22px", left: "0" }));

    document.documentElement.appendChild(overlay);
    const counter = document.getElementById("__al_focus_counter__");
    if (counter) counter.textContent = `Stop ${focusStopCount}: ${el.tagName.toLowerCase()}${el.id ? "#"+el.id : ""}`;

    // Report back to panel
    chrome.runtime.sendMessage({
      type: "FOCUS_UPDATE",
      stopCount: focusStopCount,
      tagName: el.tagName,
      id: el.id || "",
      hasFocusRing,
      selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
    });
  };

  focusKeyHandler = (e) => {
    if (e.key === "Escape") stopFocusMode();
  };

  document.addEventListener("focusin", focusHandler, true);
  document.addEventListener("keydown", focusKeyHandler, true);
}

function stopFocusMode() {
  if (!focusModeActive) return;
  focusModeActive = false;
  document.removeEventListener("focusin", focusHandler, true);
  document.removeEventListener("keydown", focusKeyHandler, true);
  document.getElementById("__al_focus_hint__")?.remove();
  clearHighlights();
  chrome.runtime.sendMessage({ type: "FOCUS_MODE_STOPPED", totalStops: focusStopCount });
}

// ── Zoom / reflow test ────────────────────────────────────────────────────────

async function runZoomTest() {
  // Save original viewport
  const originalMeta = document.querySelector("meta[name=viewport]");
  const originalContent = originalMeta?.content || "";

  try {
    // Set viewport to 320px (equivalent to 1280px at 400% zoom)
    let meta = originalMeta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=320";

    // Wait for reflow
    await new Promise(r => setTimeout(r, 600));

    // Run scan at narrow viewport
    const narrowResults = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21aa","wcag22aa"] },
    });

    // Restore viewport
    if (originalContent) {
      meta.content = originalContent;
    } else {
      meta.remove();
    }

    await new Promise(r => setTimeout(r, 300));

    return { success: true, violations: narrowResults.violations };
  } catch(err) {
    // Always restore viewport even on error
    if (originalMeta) originalMeta.content = originalContent;
    return { success: false, error: err.message };
  }
}

// ── High contrast simulation ──────────────────────────────────────────────────

function enableHighContrast() {
  if (highContrastStyleEl) return;
  highContrastStyleEl = document.createElement("style");
  highContrastStyleEl.id = "__al_hc__";
  // Simulate forced-colors / Windows High Contrast mode
  highContrastStyleEl.textContent = `
    * {
      background-color: #000000 !important;
      color: #ffffff !important;
      border-color: #ffffff !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    a, a * { color: #ffff00 !important; }
    button, [role="button"], input, select, textarea {
      background-color: #000000 !important;
      color: #ffffff !important;
      border: 2px solid #ffffff !important;
    }
    img { filter: invert(1) !important; }
    *:focus {
      outline: 3px solid #00ffff !important;
      outline-offset: 2px !important;
    }
    ::placeholder { color: #aaaaaa !important; }
  `;
  document.head.appendChild(highContrastStyleEl);
}

function disableHighContrast() {
  const el = document.getElementById("__al_hc__");
  if (el) el.remove();
  highContrastStyleEl = null;
}

// ── Dynamic error detection ───────────────────────────────────────────────────

const ERROR_PATTERNS = [
  /error/i, /invalid/i, /needd/i, /fail/i, /warning/i, /alert/i,
  /notice/i, /message/i, /notification/i, /toast/i, /banner/i,
];

// Patterns that suggest content was deliberately injected for the user to see
const DYNAMIC_CONTENT_PATTERNS = [
  /deal/i, /offer/i, /discount/i, /promo/i, /credit/i, /save/i,
  /new/i, /update/i, /available/i, /expires/i,
];

function looksLikeDynamicUserContent(el) {
  const text = (el.textContent?.trim() || "");
  const cls  = (el.className && typeof el.className === 'string' ? el.className : "");
  const role = (el.getAttribute("role") || "");

  if (text.length < 5) return false;

  // Strong signal: class or role explicitly suggests this is a message/error/alert
  if (ERROR_PATTERNS.some(p => p.test(cls) || p.test(role))) return true;

  // Strong signal: element has role that implies it's a user-facing message
  if (['alert','status','log','marquee','timer'].includes(role)) return true;

  // Strong signal: aria attributes suggest it's meant to be announced
  if (el.getAttribute('aria-atomic') || el.getAttribute('aria-relevant')) return true;

  // For everything else, don't flag it — static content doesn't need aria-live
  return false;
}

function checkDynamicError(el) {
  if (!looksLikeDynamicUserContent(el)) return null;

  const hasAriaLive = el.getAttribute("aria-live");
  const hasRole     = el.getAttribute("role");
  const hasId       = !!el.id;
  const hasAriaDescribedBy = hasId && !!document.querySelector(`[aria-describedby="${el.id}"]`);

  // Already properly marked up — not an issue
  if (hasAriaLive || hasRole === "alert" || hasRole === "status") return null;

  const issues = [];
  issues.push("Missing aria-live or role=alert. Screen readers won't know this appeared");

  if (hasId && !hasAriaDescribedBy) {
    issues.push("Has an ID but no input references it via aria-describedby");
  } else if (!hasId) {
    issues.push("No ID. Cannot be linked to a form input via aria-describedby");
  }

  const elCls = (el.className && typeof el.className === 'string') ? el.className : '';
  const elTag = el.tagName?.toLowerCase() || '';
  const elText = (el.textContent || '').trim();
  const elTextShort = elText.slice(0, 60);

  // Categorize meaningfully
  let category = 'General content';
  if (ERROR_PATTERNS.some(p => p.test(elCls))) category = 'Error message';
  else if (/toast|snack|notif/i.test(elCls)) category = 'Notification';
  else if (/banner|promo|deal|offer|credit/i.test(elCls)) category = 'Marketing content';
  else if (/modal|dialog|popup/i.test(elCls)) category = 'Modal content';
  else if (elTag === 'strong' || elTag === 'b') category = 'Highlighted text';
  else if (elTag === 'p') category = 'Paragraph text';
  else if (elTag === 'li') category = 'List item';
  else if (elTag === 'span') category = 'Inline text';
  else if (elTag === 'div') category = 'Content block';

  const description = category + ' missing ARIA live region';

  // Dedup key = category + first 40 chars of text
  // This groups truly identical content while keeping different text as separate entries
  const textKey = elText.slice(0, 40).replace(/\s+/g, ' ').trim();
  const dedupKey = category + '|' + textKey;

  return {
    id: "dynamic-" + Date.now(),
    type: "dynamic",
    impact: "serious",
    description,
    category,
    issues,
    dedupKey,
    sampleText: elTextShort,
    tag: elTag,
    html: el.outerHTML.slice(0, 200),
  };
}

function deduplicateDynamicIssues(issues) {
  // Group by dedupKey — same pattern of issues = one entry with a count
  const groups = {};
  issues.forEach(issue => {
    const key = issue.dedupKey || issue.issues.join("|");
    if (!groups[key]) {
      groups[key] = { ...issue, count: 1, examples: [issue.html] };
    } else {
      groups[key].count++;
      if (groups[key].examples.length < 3) groups[key].examples.push(issue.html);
    }
  });
  return Object.values(groups);
}

function startMutationObserver() {
  if (mutationObserver) mutationObserver.disconnect();
  dynamicIssues = [];

  // Only watch for elements ADDED after page load via JavaScript.
  // Static content doesn't need aria-live — only content that changes does.
  mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        // Only check elements that look like user-facing messages
        const issue = checkDynamicError(node);
        if (issue) dynamicIssues.push(issue);
        // Also check children of the added node
        if (node.querySelectorAll) {
          node.querySelectorAll('*').forEach(child => {
            const childIssue = checkDynamicError(child);
            if (childIssue) dynamicIssues.push(childIssue);
          });
        }
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// ── Contrast picker ───────────────────────────────────────────────────────────

function getEffectiveBackground(el) {
  let node = el;
  while (node && node !== document.body) {
    const bg = window.getComputedStyle(node).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
    node = node.parentElement;
  }
  return "rgb(255,255,255)";
}

function startPicker() {
  pickerActive = true;
  document.body.style.cursor = "crosshair";

  const hint = document.createElement("div");
  hint.id = "__al_picker_hint__";
  Object.assign(hint.style, {
    position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)",
    background: "rgba(15,17,23,0.92)", color: "#e8eaf0",
    fontSize: "12px", fontFamily: "monospace",
    padding: "6px 14px", borderRadius: "6px",
    zIndex: "2147483647", pointerEvents: "none", whiteSpace: "nowrap",
  });
  hint.textContent = "Click any element to check contrast";
  document.body.appendChild(hint);

  const handler = (e) => {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    pickerActive = false;
    document.body.style.cursor = "";
    document.removeEventListener("click", handler, true);
    document.getElementById("__al_picker_hint__")?.remove();
    const style = window.getComputedStyle(e.target);
    chrome.runtime.sendMessage({
      type: "PICKER_RESULT",
      fg: style.color,
      bg: getEffectiveBackground(e.target),
      tagName: e.target.tagName,
      text: e.target.innerText?.slice(0, 60) || "",
    });
  };

  document.addEventListener("click", handler, true);
}

// ── Boot mutation observer on load ───────────────────────────────────────────

startMutationObserver();

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_SCAN") {
    runScan().then(sendResponse);
    return true;
  }
  if (message.type === "HIGHLIGHT_ELEMENT") {
    highlightElement(message.selector, message.showDimensions || false);
    return true;
  }
  if (message.type === "CLEAR_HIGHLIGHT") {
    clearHighlights();
    return true;
  }
  if (message.type === "START_PICKER") {
    startPicker();
    sendResponse({ started: true });
    return true;
  }
  if (message.type === "SHOW_TAB_ORDER") {
    showAllTabOrder().then(stops => {
      sendResponse({ success: true, stops });
    }).catch(() => {
      sendResponse({ success: false });
    });
    return true;
  }
  if (message.type === "SCROLL_TO_STOP") {
    scrollToStop(message.stopIndex);
    return true;
  }
  if (message.type === "START_FOCUS_MODE") {
    startFocusMode();
    sendResponse({ started: true });
    return true;
  }
  if (message.type === "STOP_FOCUS_MODE") {
    stopFocusMode();
    return true;
  }
  if (message.type === "RUN_ZOOM_TEST") {
    runZoomTest().then(sendResponse);
    return true;
  }
  if (message.type === "ENABLE_HIGH_CONTRAST") {
    enableHighContrast();
    sendResponse({ enabled: true });
    return true;
  }
  if (message.type === "DISABLE_HIGH_CONTRAST") {
    disableHighContrast();
    sendResponse({ disabled: true });
    return true;
  }
});

// ── Link text analyser ────────────────────────────────────────────────────────

const AMBIGUOUS_PATTERNS = [
  /^click here$/i, /^here$/i, /^this$/i, /^read more$/i,
  /^more$/i, /^learn more$/i, /^details$/i, /^info$/i,
  /^information$/i, /^link$/i, /^page$/i, /^continue$/i,
  /^go$/i, /^view$/i, /^see more$/i, /^show more$/i,
];

function analyseLinkText() {
  const links = Array.from(document.querySelectorAll('a[href]'));
  const issues = [];

  links.forEach((link, idx) => {
    const text = (
      link.getAttribute('aria-label') ||
      link.textContent ||
      link.getAttribute('title') || ''
    ).trim();

    // Tag every link with a unique marker so we can find it reliably later
    const marker = 'al-' + idx;
    link.setAttribute('data-al-link', marker);
    const selector = '[data-al-link="' + marker + '"]';

    if (!text) {
      issues.push({
        type: 'empty',
        text: '(no text)',
        html: link.outerHTML.slice(0, 150),
        href: link.href,
        selector,
        message: 'Link has no accessible text — screen readers will read the URL out loud instead',
      });
      return;
    }

    if (AMBIGUOUS_PATTERNS.some(p => p.test(text))) {
      issues.push({
        type: 'ambiguous',
        text,
        html: link.outerHTML.slice(0, 150),
        href: link.href,
        selector,
        message: '"' + text + '" is ambiguous out of context. Screen reader users navigating by link list cannot determine the destination.',
      });
    }
  });

  return { total: links.length, issues };
}

// ── Reading level ─────────────────────────────────────────────────────────────

function getReadingLevel() {
  // Gather text from main content areas, skip nav/header/footer
  const skipTags = new Set(['SCRIPT','STYLE','NAV','HEADER','FOOTER','ASIDE','NOSCRIPT']);
  const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;

  let text = '';
  const walk = (node) => {
    if (node.nodeType === 3) { text += node.textContent + ' '; return; }
    if (node.nodeType !== 1) return;
    if (skipTags.has(node.tagName)) return;
    node.childNodes.forEach(walk);
  };
  walk(main);

  // Clean up
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length < 100) return { score: null, grade: null, message: 'Not enough text content to analyse.' };

  // Count sentences, words, syllables
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3).length || 1;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length || 1;

  // Syllable estimation
  const syllables = words.reduce((total, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return total;
    let count = w.match(/[aeiouy]+/g)?.length || 1;
    if (w.endsWith('e') && count > 1) count--;
    return total + Math.max(1, count);
  }, 0);

  // Flesch-Kincaid Grade Level
  const fkgl = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  const grade = Math.max(1, Math.round(fkgl));

  let label, color, explanation;
  if (grade <= 6)  { label = 'Very easy';  color = '#16a34a'; explanation = 'Elementary school level. Suitable for all audiences, including users with cognitive disabilities. Great work.'; }
  else if (grade <= 8)  { label = 'Easy';  color = '#65a30d'; explanation = 'Middle school level. Good readability. Most adults will understand this easily.'; }
  else if (grade <= 10) { label = 'Moderate'; color = '#d97706'; explanation = 'High school level. Readable by most adults, but consider simplifying to reach users with lower literacy or cognitive disabilities.'; }
  else if (grade <= 12) { label = 'Difficult'; color = '#ea580c'; explanation = 'Upper high school level. WCAG 3.1.5 recommends Grade 8 or below. Simplify your sentences and word choices, or provide a plain-language summary.'; }
  else                  { label = 'Very difficult'; color = '#dc2626'; explanation = 'University / post-secondary level. This content is likely inaccessible to many users. Write at a lower grade level or add a plain-language summary at the top of the page.'; }

  return {
    grade,
    label,
    color,
    explanation,
    wordCount,
    sentenceCount: sentences,
    passesWcag: grade <= 9,
  };
}

// ── Motion detector ───────────────────────────────────────────────────────────

function detectMotion() {
  const issues = [];
  const all = Array.from(document.querySelectorAll('*'));

  all.forEach(el => {
    const style = window.getComputedStyle(el);
    const animName = style.animationName;
    const animDuration = parseFloat(style.animationDuration) || 0;
    const animIterCount = style.animationIterationCount;
    const transDuration = parseFloat(style.transitionDuration) || 0;

    const hasAnimation = animName && animName !== 'none' && animDuration > 0;
    const hasLongTransition = transDuration > 1;

    if (hasAnimation) {
      const isInfinite = animIterCount === 'infinite';
      const isLong = animDuration > 2;

      if (isInfinite || isLong) {
        // Check if there's a pause/stop control nearby
        const hasPauseControl = el.closest('[aria-label*="pause"]') ||
          el.closest('[aria-label*="stop"]') ||
          el.querySelector('[aria-label*="pause"]') ||
          el.querySelector('[aria-label*="stop"]');

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        issues.push({
          type: isInfinite ? 'infinite' : 'long',
          tag: el.tagName.toLowerCase(),
          id: el.id ? `#${el.id}` : '',
          animName,
          duration: isInfinite ? '∞' : animDuration + 's',
          hasPauseControl: !!hasPauseControl,
          html: el.outerHTML.slice(0, 120),
          message: isInfinite
            ? `Infinite animation "${animName}" — WCAG 2.2.2 says users need a way to pause, stop, or hide this.`
            : `Long animation "${animName}" (${animDuration}s) — Make sure users can pause or stop it.`,
        });
      }
    }
  });

  // Deduplicate by animName
  const seen = new Set();
  return issues.filter(i => {
    const key = i.animName + i.tag;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20); // cap at 20
}

// ── Message handlers ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RUN_CONTENT_ANALYSIS') {
    try {
      const linkResults    = analyseLinkText();
      const readingLevel   = getReadingLevel();
      const motionIssues   = detectMotion();
      sendResponse({ success: true, linkResults, readingLevel, motionIssues });
    } catch(e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
});

// ── Contrast scan ─────────────────────────────────────────────────────────────

function parseRgbStr(str) {
  if (!str) return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

function luminance([r, g, b]) {
  const c = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function getEffectiveBg(el) {
  let node = el;
  while (node && node !== document.documentElement) {
    const bg = window.getComputedStyle(node).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    node = node.parentElement;
  }
  return 'rgb(255,255,255)';
}

function getElementType(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button' || el.getAttribute('role') === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (['input','select','textarea'].includes(tag)) return 'input';
  if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return 'heading';
  return 'text';
}

function scanContrast() {
  const results = { summary: { total: 0, failures: 0, warnings: 0 }, groups: {} };
  const SELECTORS = 'p, span, a, button, h1, h2, h3, h4, h5, h6, label, li, td, th, input, select, div[role="button"]';
  const els = Array.from(document.querySelectorAll(SELECTORS));
  const seen = new Set();

  els.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const fgStr = style.color;
    const bgStr = getEffectiveBg(el);
    const fgRgb = parseRgbStr(fgStr);
    const bgRgb = parseRgbStr(bgStr);
    if (!fgRgb || !bgRgb) return;

    const key = fgStr + '|' + bgStr;
    if (seen.has(key)) return;
    seen.add(key);

    const ratio = contrastRatio(fgRgb, bgRgb);
    const fontSize = parseFloat(style.fontSize) || 16;
    const fontWeight = parseInt(style.fontWeight) || 400;
    const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);
    const aaNeedd = isLargeText ? 3.0 : 4.5;
    const aaaNeedd = isLargeText ? 4.5 : 7.0;
    const passesAA  = ratio >= aaNeedd;
    const passesAAA = ratio >= aaaNeedd;

    results.summary.total++;
    if (!passesAA) results.summary.failures++;
    else if (!passesAAA) results.summary.warnings++;

    const type = getElementType(el);
    if (!results.groups[type]) results.groups[type] = [];

    // Always tag the element with a unique marker for reliable jump-to
    const cscanIdx = results.summary.total;
    el.setAttribute('data-al-cscan', String(cscanIdx));
    const selector = '[data-al-cscan="' + cscanIdx + '"]';

    const textSnippet = (el.textContent || '').trim().slice(0, 40);

    results.groups[type].push({
      ratio: Math.round(ratio * 100) / 100,
      fg: rgbToHex(fgRgb),
      bg: rgbToHex(bgRgb),
      passesAA,
      passesAAA,
      isLargeText,
      aaRequired,
      text: textSnippet,
      tag: el.tagName.toLowerCase(),
      selector,
    });
  });

  // Sort each group: failures first, then warnings, then passes
  Object.keys(results.groups).forEach(type => {
    results.groups[type].sort((a, b) => {
      if (!a.passesAA && b.passesAA) return -1;
      if (a.passesAA && !b.passesAA) return 1;
      if (!a.passesAAA && b.passesAAA) return -1;
      if (a.passesAAA && !b.passesAAA) return 1;
      return a.ratio - b.ratio;
    });
  });

  return results;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_CONTRAST') {
    try {
      sendResponse({ success: true, results: scanContrast() });
    } catch(e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
});

// ── Scroll to element by selector or text ────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCROLL_TO_ELEMENT") {
    try {
      let el = null;
      if (message.selector) {
        el = document.querySelector(message.selector);
      }
      if (!el && message.text) {
        const all = document.querySelectorAll('a, button, p, h1, h2, h3, h4, h5, h6, span, li, td');
        for (const node of all) {
          if (node.textContent?.trim().startsWith(message.text.trim())) {
            el = node;
            break;
          }
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Pulsing highlight — more visible than static
        const orig = {
          outline: el.style.outline,
          outlineOffset: el.style.outlineOffset,
          transition: el.style.transition,
        };
        el.style.transition = 'outline 0.15s ease';
        el.style.outline = '3px solid #4f8ef7';
        el.style.outlineOffset = '4px';
        // Pulse twice then fade
        let count = 0;
        const pulse = setInterval(() => {
          count++;
          el.style.outline = count % 2 === 0 ? '3px solid #4f8ef7' : '3px solid #ef9f27';
          if (count >= 4) {
            clearInterval(pulse);
            setTimeout(() => {
              el.style.outline = orig.outline;
              el.style.outlineOffset = orig.outlineOffset;
              el.style.transition = orig.transition;
            }, 500);
          }
        }, 300);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    } catch(e) {
      sendResponse({ success: false });
    }
    return true;
  }
});
