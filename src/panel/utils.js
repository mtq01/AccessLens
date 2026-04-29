// ── Page domain ──────────────────────────────────────────────────────────────

export function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url || "unknown"; }
}

// ── Scan history (per-domain, persisted in chrome.storage.local) ─────────────

const HISTORY_KEY = "accesslens_history";
const MAX_HISTORY = 5;

export function loadHistory(domain) {
  return new Promise(resolve => {
    chrome.storage.local.get(HISTORY_KEY, result => {
      const all = result[HISTORY_KEY] || {};
      resolve(all[domain] || []);
    });
  });
}

export function saveHistory(domain, entry) {
  return new Promise(resolve => {
    chrome.storage.local.get(HISTORY_KEY, result => {
      const all = result[HISTORY_KEY] || {};
      const prev = all[domain] || [];
      all[domain] = [entry, ...prev].slice(0, MAX_HISTORY);
      chrome.storage.local.set({ [HISTORY_KEY]: all }, resolve);
    });
  });
}

// ── Color math (used by ContrastPanel) ──────────────────────────────────────

export function parseRgb(str) {
  const m = str?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function luminance([r, g, b]) {
  return [r, g, b].reduce((sum, v, i) => {
    const s = v / 255;
    const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return sum + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

export function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function getContrastResults(ratio) {
  return {
    aa_normal:  ratio >= 4.5,
    aa_large:   ratio >= 3.0,
    aaa_normal: ratio >= 7.0,
    aaa_large:  ratio >= 4.5,
  };
}

// ── Sort order constants ─────────────────────────────────────────────────────

export const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"];
