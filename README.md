# AccessLens — Chrome Extension

A developer-first accessibility inspector for Chrome. Scans any page for WCAG 2.2 violations, checks colour contrast, tests keyboard focus, simulates 400% zoom and high contrast mode, and provides a human testing checklist — all in a clean pop-out panel.

---

## Features

| Feature | What it does |
|---|---|
| **WCAG Scan** | Runs axe-core against the live DOM. Violations grouped by WCAG principle (Perceivable / Operable / Understandable / Robust) |
| **WCAG 2.2 labels** | Every violation is tagged with its WCAG version (2.0 / 2.1 / 2.2) and success criterion number |
| **Filter bar** | Filter violations by standard (2.0 / 2.1 / 2.2) and impact level |
| **Element highlight** | Click any violation to highlight the exact element on the page |
| **Target size overlay** | For touch target violations, shows the actual pixel dimensions vs the 24×24px minimum |
| **Focus mode** | Tab through the page and see each focus stop numbered and colour-coded (green = focus ring visible, red = missing) |
| **Zoom test** | Temporarily sets viewport to 320px (400% zoom equivalent) and reports new violations introduced at that width |
| **High contrast** | Injects a CSS simulation of Windows High Contrast / forced-colors mode |
| **Dynamic errors** | MutationObserver detects JS-injected error messages missing ARIA associations |
| **Contrast checker** | Element picker (click any element) + manual hex input. Shows ratio and AA/AAA pass/fail for all text sizes |
| **Manual checklist** | Keyboard, screen reader, visual, user testing, and documentation checklists with persistent progress |

---

## Project structure

```
accesslens-extension/
├── src/
│   ├── background/
│   │   └── index.js          # Service worker — message hub between panel and page
│   ├── content/
│   │   └── index.js          # Injected into pages — runs scans, highlights, picker
│   └── panel/
│       ├── index.js          # React entry point
│       ├── App.jsx           # Shell — tabs, header, routing
│       ├── ScanPanel.jsx     # Scan tab — violations, focus mode, zoom, HC, filters
│       ├── ContrastPanel.jsx # Contrast tab — element picker + manual checker
│       ├── ChecklistPanel.jsx# Manual testing checklist with persistent state
│       └── styles.css        # All styles
├── public/
│   ├── manifest.json         # Chrome extension manifest v3
│   ├── panel.html            # Panel window HTML shell
│   └── icons/               # Extension icons (16, 48, 128px)
├── dist/                     # Built output — load this folder in Chrome
├── webpack.config.js
├── .babelrc
└── package.json
```

---

## Setup

**Prerequisites:** Node.js 18+ and Chrome.

```bash
# 1. Install dependencies (one time only)
npm install

# 2. Start development build with file watching
npm run dev

# 3. Load in Chrome
#    - Go to chrome://extensions
#    - Enable Developer mode (top right toggle)
#    - Click "Load unpacked"
#    - Select the dist/ folder

# 4. After saving any file in src/
#    - webpack rebuilds automatically (~2 seconds)
#    - Click the refresh icon on chrome://extensions
#    - Reload the test tab
```

**Production build:**
```bash
npm run build
```

---

## Development workflow

You only ever edit files in `src/`. The `dist/` folder is generated — never edit it directly.

| File | Edit this when you want to… |
|---|---|
| `src/panel/ScanPanel.jsx` | Change the violations UI, add filters, modify focus/zoom/HC features |
| `src/panel/ContrastPanel.jsx` | Change the contrast checker UI or logic |
| `src/panel/ChecklistPanel.jsx` | Add or edit manual testing checklist items |
| `src/panel/App.jsx` | Add tabs, change the header, modify routing |
| `src/panel/styles.css` | Change any visual styling |
| `src/content/index.js` | Change what runs inside the page (scanning, highlighting, pickers) |
| `src/background/index.js` | Change message routing between panel and page |
| `public/manifest.json` | Change permissions, icons, or extension metadata |

---

## Architecture

```
[Extension icon clicked]
        ↓
[Background service worker]  ←──────────────────────────┐
   - Stores trackedTabId                                  │
   - Opens panel window                                   │
   - Routes messages                                      │
        ↓                                                 │
[Panel window] ──── sendMessage ──→ [Background] ──→ [Content script]
  React app                                           Injected into page
  ScanPanel                                           - Runs axe-core
  ContrastPanel                                       - Highlights elements
  ChecklistPanel                                      - Focus mode listener
                                                      - Zoom test
                                                      - High contrast CSS
                                                      - Contrast picker
                                                      - MutationObserver
```

Messages always go: Panel → Background → Content script (and back).
The panel never talks directly to the content script.

---

## Roadmap

- [ ] Human testing checklist — persistent per-domain progress
- [ ] Export scan results as PDF report
- [ ] Multi-page crawl support (web app)
- [ ] CI/CD GitHub Action (web app)
- [ ] VPAT / ACR generation (web app)
- [ ] VS Code extension (future)

---

## What this tool covers

Automated tools (including this one) catch approximately **30–40%** of real accessibility issues.

**This tool covers:** alt text, contrast ratios, ARIA roles, semantic structure, form labels, heading order, keyboard flow (partially), target sizes, dynamic ARIA errors.

**Still requires human testing:** screen reader behaviour with NVDA/VoiceOver, usability with disabled users, cognitive accessibility, motor impairment edge cases, caption accuracy, real-world task completion.

Use the Manual Checklist tab to track your human testing progress.

---

## Tech stack

- **React 18** — panel UI
- **axe-core 4.9** — WCAG rule engine
- **Webpack 5** — bundler
- **Chrome Manifest V3** — extension platform
# AccessLens
