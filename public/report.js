// ── SVG icon paths (inline, no external font) ─────────────────────────────────
const ICONS = {
  visibility:   "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  keyboard:     "M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z",
  chat:         "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z",
  build:        "M13.7 7.34l1.41 1.41-9.19 9.2-1.41-1.41 9.19-9.2zm-1.83-4.76L8.34 6.1l1.41 1.41 1.06-1.06 1.41 1.41-2.12 2.12 1.41 1.41L14.93 7 11.87 2.58zM3 18.17l2.83 2.83 8.48-8.48-2.83-2.83L3 18.17z",
  check_circle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
  warning:      "M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z",
  info:         "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  link:         "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.71-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  check:        "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
  open_in_new:  "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
  hearing:      "M17 8C17 4.69 14.31 2 11 2S5 4.69 5 8c0 2.97 2.04 5.43 4.8 6.18A2.5 2.5 0 0 1 7.5 17.5h-1v2h1a4.5 4.5 0 0 0 4.5-4.5C14.32 13.77 17 11.1 17 8zm-6 4.93V6h2v2h2c0 2.21-1.79 4-4 4z",
  people:       "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  description:  "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  checklist:    "M22 7h-9v2h9V7zm0 8h-9v2h9v-2zM4.5 6l-1.41 1.41L5.67 10 11 4.67 9.59 3.25 5.67 7.17 4.5 6zm0 8l-1.41 1.41 2.58 2.59L11 12.67l-1.41-1.42-3.92 3.92L4.5 14z",
  account_tree: "M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-12h3v4h-3V3z",
  north_east:   "M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5H9z",
  lightbulb:    "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
};

function svg(name, size=16, color='currentColor') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" aria-hidden="true"><path d="${ICONS[name]||''}"/></svg>`;
}

// ── Violation context (why/fix/links per rule) ─────────────────────────────────
const VIOLATION_CONTEXT = {
  "image-alt": {
    why: "Screen reader users hear alt text instead of seeing images. Without it they hear the filename or nothing — both are meaningless.",
    fix: '<!-- Missing alt -->\n<img src="hero.jpg">\n\n<!-- Fixed: descriptive alt -->\n<img src="hero.jpg" alt="Team of developers at a whiteboard">\n\n<!-- Decorative: empty alt hides it from screen readers -->\n<img src="divider.png" alt="">',
    links: [{ label: "WCAG 1.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" }]
  },
  "color-contrast": {
    why: "Low contrast text is unreadable for users with low vision, colour blindness, or in bright sunlight. WCAG requires 4.5:1 for normal text.",
    fix: '/* Fails AA (2.8:1) */\ncolor: #999999; background: #ffffff;\n\n/* Passes AA (4.5:1+) */\ncolor: #767676; background: #ffffff;',
    links: [{ label: "WCAG 1.4.3", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum" }, { label: "WebAIM Contrast Checker", url: "https://webaim.org/resources/contrastchecker/" }]
  },
  "non-text-contrast": {
    why: "UI components like button borders, input outlines, and icons need 3:1 contrast so users with low vision can distinguish them from the background.",
    fix: '/* Border fails 3:1 */\nborder: 1px solid #cccccc;\n\n/* Border passes 3:1 */\nborder: 1px solid #767676;',
    links: [{ label: "WCAG 1.4.11", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast" }]
  },
  "label": {
    why: "Without a label, screen reader users hear 'edit text' with no context about what to type. Placeholder text disappears on input and isn't a substitute.",
    fix: '<!-- No label -->\n<input type="email" placeholder="Email">\n\n<!-- Fixed -->\n<label for="email">Email address</label>\n<input type="email" id="email" placeholder="you@example.com">\n\n<!-- Or with aria-label -->\n<input type="email" aria-label="Email address">',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "button-name": {
    why: "Icon-only buttons without accessible names are announced as 'button' with no indication of what they do — completely useless to screen reader users.",
    fix: '<!-- No name -->\n<button><svg>...</svg></button>\n\n<!-- Fixed: aria-label -->\n<button aria-label="Delete item"><svg aria-hidden="true">...</svg></button>\n\n<!-- Fixed: visually hidden text -->\n<button><svg aria-hidden="true">...</svg><span class="sr-only">Delete item</span></button>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }]
  },
  "link-name": {
    why: "Screen reader users often navigate by pulling up a list of all links. 'Click here', 'Read more', and 'Learn more' are meaningless out of context.",
    fix: '<!-- Ambiguous -->\n<a href="/report.pdf">Click here</a>\n\n<!-- Fixed -->\n<a href="/report.pdf">Download annual report (PDF)</a>\n\n<!-- Or with aria-label -->\n<a href="/blog/post" aria-label="Read more about accessibility">Read more</a>',
    links: [{ label: "WCAG 2.4.4", url: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context" }]
  },
  "heading-order": {
    why: "Screen reader users navigate pages by jumping between headings. Skipping levels (h1 → h3) breaks this navigation pattern and confuses the document outline.",
    fix: '<!-- Broken -->\n<h1>Page title</h1>\n<h3>First section</h3>  <!-- wrong -->\n\n<!-- Fixed -->\n<h1>Page title</h1>\n<h2>First section</h2>\n  <h3>Subsection</h3>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "html-has-lang": {
    why: "The lang attribute tells screen readers which language to use for pronunciation. Without it, a French screen reader reading English will mispronounce every word.",
    fix: '<!-- Missing -->\n<html>\n\n<!-- Fixed -->\n<html lang="en">\n<!-- or -->\n<html lang="fr">  <!-- French -->\n<html lang="en-US"> <!-- American English -->',
    links: [{ label: "WCAG 3.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page" }]
  },
  "landmark-one-main": {
    why: "The <main> landmark is how screen reader users skip directly to the page content. Without it, they must Tab through every navigation link on every page load.",
    fix: '<!-- No landmarks -->\n<div id="nav">...</div>\n<div id="content">...</div>\n\n<!-- Fixed -->\n<header><nav>...</nav></header>\n<main><!-- primary content --></main>\n<footer>...</footer>',
    links: [{ label: "WCAG 2.4.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks" }]
  },
  "duplicate-id": {
    why: "Duplicate IDs break aria-labelledby, aria-describedby, and htmlFor. The browser picks one arbitrarily, almost always the wrong one.",
    fix: '<!-- Duplicate -->\n<input id="email"> ... <input id="email">\n\n<!-- Fixed: unique IDs -->\n<input id="login-email">\n<input id="signup-email">\n\n// In React: use useId()\nimport { useId } from "react";\nconst id = useId();\n<input id={id} />',
    links: [{ label: "WCAG 4.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/parsing" }]
  },
  "aria-hidden-focus": {
    why: "aria-hidden hides elements from screen readers but focus can still land on them, creating invisible 'ghost' stops where nothing is announced. Deeply disorienting for keyboard users.",
    fix: '<!-- Bug: hidden but focusable -->\n<div aria-hidden="true">\n  <button>Ghost stop</button>\n</div>\n\n<!-- Fixed: inert blocks keyboard too -->\n<div aria-hidden="true" inert>\n  <button>Fully hidden</button>\n</div>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }, { label: "MDN: inert", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert" }]
  },
  "target-size": {
    why: "Small touch targets are impossible to tap accurately for users with motor impairments or tremors. WCAG 2.2 requires a minimum 24×24px target area.",
    fix: '/* Too small */\n.icon-btn { width: 16px; height: 16px; }\n\n/* Fixed: use padding to increase hit area */\n.icon-btn {\n  padding: 12px; /* 16px + 24px = 40px tap area */\n}\n\n/* Or pseudo-element hit area */\n.icon-btn { position: relative; }\n.icon-btn::before {\n  content: ""; position: absolute; inset: -12px;\n}',
    links: [{ label: "WCAG 2.5.8", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum" }]
  },
  "meta-viewport": {
    why: "Setting user-scalable=no prevents users from zooming. Many users with low vision rely on browser zoom as their primary accessibility tool.",
    fix: '<!-- Blocks zoom -->\n<meta name="viewport" content="width=device-width, user-scalable=no">\n\n<!-- Fixed: allow zooming -->\n<meta name="viewport" content="width=device-width, initial-scale=1">',
    links: [{ label: "WCAG 1.4.4", url: "https://www.w3.org/WAI/WCAG21/Understanding/resize-text" }]
  },
  "bypass": {
    why: "Without a skip link, keyboard users must Tab through every navigation item on every page. On a 20-item nav, that's 20 extra keypresses per page — every visit.",
    fix: '<!-- Add as first element in body -->\n<a href="#main" class="skip-link">Skip to main content</a>\n<main id="main">...</main>\n\n/* CSS: visible on focus only */\n.skip-link { position: absolute; top: -100%; }\n.skip-link:focus { top: 0; }',
    links: [{ label: "WCAG 2.4.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks" }]
  },
  "document-title": {
    why: "The page title is the first thing screen reader users hear when a page loads. Generic or missing titles make it impossible to identify the page or browser tab.",
    fix: '<!-- Generic -->\n<title>Page</title>\n\n<!-- Specific and unique per page -->\n<title>Shopping cart (3 items) — Acme Store</title>\n\n// React with react-helmet\nimport { Helmet } from "react-helmet";\n<Helmet><title>Cart — Acme Store</title></Helmet>',
    links: [{ label: "WCAG 2.4.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/page-titled" }]
  },
  "scrollable-region-focusable": {
    why: "If a scrollable area cannot receive keyboard focus, keyboard-only users cannot scroll it and are locked out of its content entirely.",
    fix: '<!-- Not keyboard reachable -->\n<div style="overflow: auto; height: 200px">\n  Long content...\n</div>\n\n<!-- Fixed: tabindex="0" adds to tab order -->\n<div\n  style="overflow: auto; height: 200px"\n  tabindex="0"\n  role="region"\n  aria-label="Product description"\n>\n  Long content...\n</div>',
    links: [{ label: "WCAG 2.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard" }]
  },
  "aria-required-parent": {
    why: "Some ARIA roles only make sense inside a specific parent — an option must be in a listbox, a menuitem must be in a menu. Without the right parent, screen readers can't tell users what widget they're in, breaking keyboard navigation patterns.",
    fix: '<!-- Before: option with no listbox parent -->\n<ul>\n  <li role="option">First</li>\n</ul>\n\n<!-- After: nested inside listbox -->\n<ul role="listbox" aria-label="Choose a country">\n  <li role="option">United Kingdom</li>\n  <li role="option">United States</li>\n</ul>\n\n<!-- Before: menuitem outside menu -->\n<div role="menuitem">Edit</div>\n\n<!-- After: inside a menu -->\n<ul role="menu">\n  <li role="menuitem">Edit</li>\n  <li role="menuitem">Delete</li>\n</ul>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }, { label: "WAI-ARIA required context roles", url: "https://www.w3.org/TR/wai-aria-1.2/#scope" }]
  },
  "aria-required-children": {
    why: "Some ARIA roles must contain specific child roles — a listbox needs option children, a menu needs menuitem children. Without them, screen readers announce an empty widget users can't navigate.",
    fix: '<!-- Before: listbox with no option children -->\n<ul role="listbox">\n  <li>First choice</li>\n</ul>\n\n<!-- After: correct children -->\n<ul role="listbox" aria-label="Sort by">\n  <li role="option" aria-selected="true">Relevance</li>\n  <li role="option" aria-selected="false">Price</li>\n</ul>\n\n<!-- Before: menu with no menuitem children -->\n<div role="menu"><div>Edit</div></div>\n\n<!-- After -->\n<div role="menu">\n  <div role="menuitem">Edit</div>\n  <div role="menuitem">Delete</div>\n</div>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }]
  },
  "frame-title": {
    why: "When a screen reader hits an iframe, the first thing it announces is the frame title. Without one, users hear the filename or nothing and have no idea what the embedded content is.",
    fix: '<!-- Before: no title -->\n<iframe src="https://www.youtube.com/embed/abc123"></iframe>\n\n<!-- After: descriptive title -->\n<iframe\n  src="https://www.youtube.com/embed/abc123"\n  title="Introduction to web accessibility — YouTube video"\n></iframe>\n\n<!-- Decorative/tracking iframes: hide from AT -->\n<iframe src="tracking.html" title="none" aria-hidden="true" tabindex="-1"></iframe>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }]
  },
  "object-alt": {
    why: "The <object> element needs a text alternative inside it that screen readers can use if the object can't be rendered. Without one, users with visual disabilities get nothing.",
    fix: '<!-- Before: no text fallback -->\n<object data="chart.svg" type="image/svg+xml"></object>\n\n<!-- After: text description inside -->\n<object data="chart.svg" type="image/svg+xml">\n  Bar chart showing sales growth from 2022 to 2024.\n  <a href="sales-data.csv">Download the data as CSV</a>\n</object>',
    links: [{ label: "WCAG 1.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" }]
  },
  "role-img-alt": {
    why: "Any element with role='img' is treated as an image by screen readers. Without an accessible name, the screen reader announces 'image' with no description.",
    fix: '<!-- Before: no accessible name -->\n<div role="img"></div>\n\n<!-- After: aria-label -->\n<div role="img" aria-label="Company logo — Acme Corp"></div>\n\n<!-- SVG -->\n<svg role="img" aria-label="Pie chart: 60% returning, 40% new users">\n  <!-- paths -->\n</svg>\n\n<!-- Decorative: hide entirely -->\n<div role="img" aria-hidden="true"></div>',
    links: [{ label: "WCAG 1.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" }]
  },
  "svg-img-alt": {
    why: "SVGs used as images need a text alternative just like <img> tags. Without one, screen readers skip them or read raw SVG markup.",
    fix: '<!-- Before: no accessible name -->\n<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="green"/></svg>\n\n<!-- After: role + aria-label -->\n<svg role="img" aria-label="Green circle indicating success" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="50" fill="green"/>\n</svg>\n\n<!-- Decorative: hide from screen readers -->\n<svg aria-hidden="true" focusable="false" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="50" fill="green"/>\n</svg>',
    links: [{ label: "WCAG 1.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" }]
  },
  "listitem": {
    why: "A <li> must be a direct child of <ul> or <ol>. Outside a list element, screen readers lose the list context, item count, and list navigation commands.",
    fix: '<!-- Before: li not inside a list -->\n<div>\n  <li>First item</li>\n  <li>Second item</li>\n</div>\n\n<!-- After -->\n<ul>\n  <li>First item</li>\n  <li>Second item</li>\n</ul>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "definition-list": {
    why: "A <dl> must only contain <dt> and <dd> elements as direct children. Other elements break the semantic relationship screen readers use to pair terms with their definitions.",
    fix: '<!-- Before: invalid children -->\n<dl><p>Term: Definition</p></dl>\n\n<!-- After: correct dt/dd structure -->\n<dl>\n  <dt>Accessibility</dt>\n  <dd>Making products usable by people with disabilities.</dd>\n  <dt>WCAG</dt>\n  <dd>Web Content Accessibility Guidelines.</dd>\n</dl>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "dlitem": {
    why: "<dt> and <dd> elements must be inside a <dl>. Outside one, screen readers can't announce the definition list context.",
    fix: '<!-- Before: dt/dd outside dl -->\n<div>\n  <dt>Screen reader</dt>\n  <dd>Software that reads content aloud for blind users.</dd>\n</div>\n\n<!-- After: wrapped in dl -->\n<dl>\n  <dt>Screen reader</dt>\n  <dd>Software that reads content aloud for blind users.</dd>\n</dl>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "empty-heading": {
    why: "Screen reader users navigate by jumping between headings. An empty heading creates a phantom stop — the screen reader announces 'heading level 2' and reads nothing.",
    fix: '<!-- Before: heading with no content -->\n<h2></h2>\n\n<!-- After: meaningful text -->\n<h2>Product features</h2>\n\n<!-- In React: handle loading state -->\n<h2>{pageTitle || \'Loading...\'}</h2>\n\n<!-- Purely decorative: use div instead -->\n<div class="section-divider" aria-hidden="true"></div>',
    links: [{ label: "WCAG 2.4.6", url: "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels" }]
  },
  "landmark-no-duplicate-banner": {
    why: "A page should have only one banner landmark. Multiple banners create ambiguity — screen reader users don't know which one to go to.",
    fix: '<!-- Before: multiple banners -->\n<header>Site header</header>\n<section>\n  <header>Section header</header>  <!-- becomes banner 2 -->\n</section>\n\n<!-- After: only top-level header is the banner landmark -->\n<header>Site header</header>\n<section>\n  <header>Section header</header>  <!-- nested: not a landmark -->\n</section>',
    links: [{ label: "ARIA banner role", url: "https://www.w3.org/TR/wai-aria-1.2/#banner" }]
  },
  "landmark-no-duplicate-contentinfo": {
    why: "A page should have only one contentinfo landmark (page-level footer). Multiple contentinfo landmarks confuse screen reader landmark navigation.",
    fix: '<!-- Before: multiple footers as landmarks -->\n<footer>Site footer</footer>\n<section>\n  <footer>Section footer</footer>  <!-- becomes landmark 2 -->\n</section>\n\n<!-- After: only top-level footer is a landmark -->\n<footer>Site footer</footer>\n<section>\n  <footer>Section footer</footer>  <!-- nested: not a landmark -->\n</section>',
    links: [{ label: "ARIA contentinfo role", url: "https://www.w3.org/TR/wai-aria-1.2/#contentinfo" }]
  },
  "landmark-no-duplicate-main": {
    why: "There must be exactly one <main> landmark per page. Multiple main elements break skip navigation and confuse users about which is the primary content.",
    fix: '<!-- Before: two main elements -->\n<main>Primary content</main>\n<main>Secondary content</main>  <!-- invalid -->\n\n<!-- After: one main, use aside for secondary -->\n<main>Primary content</main>\n<aside>Secondary content</aside>',
    links: [{ label: "WCAG 2.4.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks" }]
  },
  "landmark-banner-is-top-level": {
    why: "The banner landmark must be at the page top level. A banner nested inside another landmark breaks screen reader landmark navigation.",
    fix: '<!-- Before: header inside main -->\n<main>\n  <header>Wrongly nested</header>\n  Page content...\n</main>\n\n<!-- After: header at the top level -->\n<header>Site-wide header</header>\n<main>Page content...</main>\n<footer>Site footer</footer>',
    links: [{ label: "ARIA banner role", url: "https://www.w3.org/TR/wai-aria-1.2/#banner" }]
  },
  "landmark-contentinfo-is-top-level": {
    why: "The contentinfo (footer) landmark must be at the page top level. A footer nested inside another landmark won't appear in screen reader landmark navigation.",
    fix: '<!-- Before: footer nested inside main -->\n<main>\n  Page content...\n  <footer>Wrong: nested footer</footer>\n</main>\n\n<!-- After: footer at the top level -->\n<main>Page content...</main>\n<footer>Site-wide footer</footer>',
    links: [{ label: "ARIA contentinfo role", url: "https://www.w3.org/TR/wai-aria-1.2/#contentinfo" }]
  },
  "scope-attr-valid": {
    why: "The scope attribute on <th> tells screen readers whether the header applies to a column or row. An invalid value is ignored — users hear column data without any header context.",
    fix: '<!-- Before: invalid scope -->\n<th scope="yes">Name</th>\n\n<!-- After: valid scope values -->\n<table>\n  <thead>\n    <tr>\n      <th scope="col">Name</th>\n      <th scope="col">Score</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <th scope="row">Alice</th>\n      <td>92</td>\n    </tr>\n  </tbody>\n</table>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "th-has-data-cells": {
    why: "A <th> header with no data cells is either misplaced or unnecessary. Screen readers announce it as a header, but users never see data it labels — creating confusion about the table.",
    fix: '<!-- Before: header with no data cells -->\n<table>\n  <tr><th>Name</th><th>Score</th><th>Extra</th></tr>\n  <tr><td>Alice</td><td>92</td></tr>  <!-- missing third cell -->\n</table>\n\n<!-- After: every header has data cells -->\n<table>\n  <thead><tr><th scope="col">Name</th><th scope="col">Score</th></tr></thead>\n  <tbody><tr><td>Alice</td><td>92</td></tr></tbody>\n</table>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "keyboard": {
    why: "Any element a mouse user can click must also be reachable by keyboard. Users who can't use a mouse are completely locked out of functionality that requires mouse-only interaction.",
    fix: '<!-- Before: click handler on a non-interactive div -->\n<div onclick="doSomething()">Click me</div>\n\n<!-- After: use native button (handles Tab + Enter/Space automatically) -->\n<button onclick="doSomething()">Click me</button>\n\n// In React\n<button onClick={doSomething}>Click me</button>',
    links: [{ label: "WCAG 2.1.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard" }]
  },
  "empty-table-header": {
    why: "An empty <th> is useless to screen reader users — they hear 'column header' with no text. Users can't tell which column or row they're in.",
    fix: '<!-- Before: empty th -->\n<th></th>\n<th>Score</th>\n\n<!-- After: all headers have text -->\n<th scope="col">Player name</th>\n<th scope="col">Score</th>\n\n<!-- If the column is for row numbers with no label, use aria-label -->\n<th scope="col" aria-label="Row number">#</th>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }]
  },
  "p-as-heading": {
    why: "Bold or large <p> tags look like headings to sighted users but are invisible to screen reader heading navigation. Users who tab through headings will miss this content entirely.",
    fix: '<!-- Before: paragraph styled to look like a heading -->\n<p style="font-size: 24px; font-weight: bold;">Section Title</p>\n\n<!-- After: real heading element, styled to match design -->\n<h2 class="section-title">Section Title</h2>\n\n<style>\n  .section-title { font-size: 24px; font-weight: bold; }\n</style>',
    links: [{ label: "WCAG 1.3.1", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" }, { label: "WCAG 2.4.6", url: "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels" }]
  },
  "aria-command-name": {
    why: "Custom buttons, links, and menuitems built with ARIA roles must have an accessible name. Without one, screen readers announce only the role ('button') with no indication of what it does.",
    fix: '<!-- Before: custom button with no label -->\n<div role="button" tabindex="0"><svg><!-- icon --></svg></div>\n\n<!-- After: aria-label -->\n<div role="button" tabindex="0" aria-label="Close dialog">\n  <svg aria-hidden="true"><!-- icon --></svg>\n</div>\n\n<!-- Better: use native <button> -->\n<button aria-label="Close dialog">\n  <svg aria-hidden="true"><!-- icon --></svg>\n</button>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }]
  },
  "aria-progressbar-name": {
    why: "A progress bar without a label leaves screen reader users guessing what is loading. They hear '40%' but 40% of what? A label like 'Uploading file' gives essential context.",
    fix: '<!-- Before: no label -->\n<div role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"></div>\n\n<!-- After: aria-label -->\n<div role="progressbar" aria-label="File upload progress"\n  aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">40%</div>\n\n<!-- Or native progress with label -->\n<label>Uploading file\n  <progress value="40" max="100">40%</progress>\n</label>',
    links: [{ label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" }]
  },
};

const FALLBACK_CONTEXT = {
  why: "This violation affects users who rely on assistive technology or who cannot use a mouse. Fixing it improves the experience for users with visual, motor, or cognitive disabilities.",
  fix: "Review the WCAG success criterion linked below for specific remediation steps.",
  links: []
};

function getContext(ruleId) {
  return VIOLATION_CONTEXT[ruleId] || FALLBACK_CONTEXT;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const IMPACT_COLOURS = {
  critical: "#dc2626", serious: "#d97706", moderate: "#2563eb", minor: "#6b7280"
};

const PRINCIPLES = ["Perceivable","Operable","Understandable","Robust"];

const PRINCIPLE_META = {
  Perceivable:    { icon: "visibility",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  Operable:       { icon: "keyboard",     color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  Understandable: { icon: "chat",         color: "#065f46", bg: "#f0fdf4", border: "#a7f3d0" },
  Robust:         { icon: "build",        color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
};

const RULE_TO_PRINCIPLE = {
  "image-alt":"Perceivable","input-image-alt":"Perceivable","color-contrast":"Perceivable",
  "color-contrast-enhanced":"Perceivable","non-text-contrast":"Perceivable","reflow":"Perceivable",
  "text-spacing":"Perceivable","meta-viewport":"Perceivable",
  "keyboard":"Operable","focus-trap":"Operable","tabindex":"Operable","target-size":"Operable",
  "scrollable-region-focusable":"Operable","bypass":"Operable","link-name":"Operable","button-name":"Operable",
  "label":"Understandable","select-name":"Understandable","autocomplete-valid":"Understandable",
  "html-has-lang":"Understandable","html-lang-valid":"Understandable","error-message":"Understandable",
  "duplicate-id":"Robust","duplicate-id-aria":"Robust","aria-allowed-attr":"Robust",
  "aria-required-attr":"Robust","aria-roles":"Robust","aria-valid-attr-value":"Robust",
  "aria-hidden-focus":"Robust","document-title":"Robust","heading-order":"Robust","region":"Robust",
  "landmark-one-main":"Robust",
};

const CHECKLIST_DEF = [
  { id:"keyboard", icon:"keyboard", category:"Keyboard Navigation", items:[
    {id:"kb-1",text:"Unplug your mouse. Navigate the entire page using only Tab, Shift+Tab, Enter, Space, and arrow keys.",wcag:"2.1.1"},
    {id:"kb-2",text:"Every interactive element — links, buttons, inputs, dropdowns, modals — is reachable and operable by keyboard.",wcag:"2.1.1"},
    {id:"kb-3",text:"No keyboard traps — you can always Tab away from any component.",wcag:"2.1.2"},
    {id:"kb-4",text:"Focus is never lost after closing a modal or dismissing a component.",wcag:"2.4.3"},
    {id:"kb-5",text:"Tab order follows the logical reading order of the page.",wcag:"2.4.3"},
  ]},
  { id:"screen-reader", icon:"hearing", category:"Screen Reader", items:[
    {id:"sr-1",text:"Tested with VoiceOver (Mac: Cmd+F5) or NVDA (Windows, free download).",wcag:"4.1.2"},
    {id:"sr-2",text:"Page title is announced correctly when the page loads.",wcag:"2.4.2"},
    {id:"sr-3",text:"All images have meaningful alt text that conveys their purpose.",wcag:"1.1.1"},
    {id:"sr-4",text:"Form fields announce their label, type, and any error messages when focused.",wcag:"1.3.1"},
    {id:"sr-5",text:"Dynamic content changes (loading states, errors) are announced without requiring focus.",wcag:"4.1.3"},
    {id:"sr-6",text:"Modals are announced correctly and focus is trapped inside while open.",wcag:"4.1.2"},
  ]},
  { id:"visual", icon:"visibility", category:"Visual & Cognitive", items:[
    {id:"vi-1",text:"Content is readable and usable at 200% browser zoom with no overlap.",wcag:"1.4.4"},
    {id:"vi-2",text:"Content reflows to a single column at 400% zoom with no horizontal scrolling.",wcag:"1.4.10"},
    {id:"vi-3",text:"All error messages describe the problem in text, not just a red border or colour change.",wcag:"3.3.1"},
    {id:"vi-4",text:"Instructions do not rely on shape, colour, size, or position alone.",wcag:"1.3.3"},
    {id:"vi-5",text:"Animations can be paused or stopped. Tested with OS Reduce Motion setting.",wcag:"2.3.3"},
  ]},
  { id:"user-testing", icon:"people", category:"User Testing", items:[
    {id:"ut-1",text:"At least one person who uses assistive technology has tested the primary user flow end-to-end.",wcag:"—"},
    {id:"ut-2",text:"A user with low vision has tested at their preferred zoom or text size.",wcag:"—"},
    {id:"ut-3",text:"Critical flows completed successfully by a disabled user.",wcag:"—"},
  ]},
  { id:"documentation", icon:"description", category:"Documentation", items:[
    {id:"doc-1",text:"An Accessibility Statement is published and linked in the footer with a contact method for users to report barriers.",wcag:"—"},
    {id:"doc-2",text:"An ACR (Accessibility Conformance Report / VPAT) has been completed for enterprise or government procurement.",wcag:"—"},
    {id:"doc-3",text:"Known issues are documented with planned fix dates, not silently ignored.",wcag:"—"},
  ]},
];

function esc(str) {
  return String(str||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getPrinciple(ruleId) { return RULE_TO_PRINCIPLE[ruleId] || 'Robust'; }

function getWcagVersion(tags) {
  if (!tags) return null;
  if (tags.some(t => t==='wcag22aa'||t==='wcag22a')) return '2.2';
  if (tags.some(t => t==='wcag21aa'||t==='wcag21a')) return '2.1';
  if (tags.some(t => t==='wcag2aa' ||t==='wcag2a'))  return '2.0';
  return null;
}

function calcRiskScore(violations) {
  const deductions = (violations||[]).reduce((s,v) => {
    const w = {critical:10,serious:5,moderate:2,minor:0.5}[v.impact]||1;
    return s + w*(v.nodes?.length||1);
  },0);
  const score = Math.max(0, Math.round(100 - deductions));
  if (score>=90) return {score, label:'Low risk',      color:'#16a34a'};
  if (score>=75) return {score, label:'Manageable',    color:'#65a30d'};
  if (score>=50) return {score, label:'Moderate risk', color:'#d97706'};
  if (score>=25) return {score, label:'High risk',     color:'#ea580c'};
  return              {score, label:'Critical risk',  color:'#dc2626'};
}

// ── Render ─────────────────────────────────────────────────────────────────────
function renderReport(data) {
  const { url, scanDate, sections, violations=[], passes=[], tabOrderStops=[], dynamicIssues=[], checklist={}, focusLog=[] } = data;
  const critical = violations.filter(v=>v.impact==='critical').length;
  const serious  = violations.filter(v=>v.impact==='serious').length;
  const moderate = violations.filter(v=>v.impact==='moderate').length;
  const minor    = violations.filter(v=>v.impact==='minor').length;

  // Plain status — no score
  let riskLabel, gradeColor;
  if (violations.length === 0) { riskLabel = 'No violations'; gradeColor = '#16a34a'; }
  else if (critical > 0)       { riskLabel = 'Fix now';       gradeColor = '#dc2626'; }
  else if (serious > 0)        { riskLabel = 'Needs work';    gradeColor = '#d97706'; }
  else if (moderate > 0)       { riskLabel = 'Minor issues';  gradeColor = '#2563eb'; }
  else                         { riskLabel = 'Almost clean';  gradeColor = '#65a30d'; }
  const totalInst = violations.reduce((s,v)=>s+v.nodes.length,0);

  let html = '';

  // ── Cover ──
  html += `
  <div class="cover">
    <div>
      <div class="cover-eyebrow">Accessibility Report · WCAG 2.2 AA</div>
      <h1 class="cover-title">Accessibility Audit</h1>
      <div class="cover-url">${esc(url)}</div>
      <div class="cover-meta">
        <div class="cover-meta-item">
          <span class="cover-meta-label">Scan date</span>
          <span class="cover-meta-value">${esc(scanDate)}</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Standard</span>
          <span class="cover-meta-value">WCAG 2.2 Level AA</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Tool</span>
          <span class="cover-meta-value">AccessLens + axe-core</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Violations</span>
          <span class="cover-meta-value" style="color:${violations.length>0?'#dc2626':'#16a34a'}">${violations.length} rules · ${totalInst} instances</span>
        </div>
      </div>
    </div>
    <div class="grade-card" style="color:${gradeColor}; border-color:${gradeColor}; background:${gradeColor}11;">
      <div class="grade-letter" style="font-size:28px;line-height:1.2;">${riskLabel}</div>
      <div class="grade-chips">
        ${critical>0?'<span style="color:#dc2626;font-size:16px;font-weight:600;">'+critical+' critical</span>':''}
        ${serious>0?'<span style="color:#d97706;font-size:16px;font-weight:600;">'+serious+' serious</span>':''}
        ${violations.length===0?'<span style="color:#16a34a;font-size:16px;">All clear</span>':''}
      </div>
    </div>
  </div>`;

  // ── Impact summary row ──
  const impactData = [
    { label:"Critical", count:critical,  color:"#dc2626" },
    { label:"Serious",  count:serious,   color:"#d97706" },
    { label:"Moderate", count:moderate,  color:"#2563eb" },
    { label:"Minor",    count:minor,     color:"#6b7280" },
  ];
  html += `<div class="impact-row">`;
  impactData.forEach(i => {
    html += `<div class="impact-card" style="color:${i.color}; border-top-color:${i.color};">
      <div class="impact-num">${i.count}</div>
      <div class="impact-label">${i.label}</div>
    </div>`;
  });
  html += `</div>`;

  // ── Next steps callout ──
  const hasCritical = critical > 0 || serious > 0;
  html += `
  <div class="next-steps">
    <div class="next-steps-title">
      ${svg('lightbulb', 18)} What to do next
    </div>
    <div class="next-step">
      <div class="next-step-num">1</div>
      <div class="next-step-text"><strong>Fix critical and serious violations first.</strong> These directly block users from completing tasks. You have ${critical + serious} high-priority issues to address.</div>
    </div>
    <div class="next-step">
      <div class="next-step-num">2</div>
      <div class="next-step-text"><strong>Test with a keyboard, no mouse.</strong> Tab through every flow. Focus should always be visible and logical. Use the Manual Testing checklist below.</div>
    </div>
    <div class="next-step">
      <div class="next-step-num">3</div>
      <div class="next-step-text"><strong>Test with a screen reader.</strong> VoiceOver on Mac (Cmd+F5) or NVDA on Windows (free). Automated tools catch only 30–40% of real issues. Human testing catches the rest.</div>
    </div>
    <div class="next-step">
      <div class="next-step-num">4</div>
      <div class="next-step-text"><strong>Re-scan after fixes.</strong> Use AccessLens Dev Mode to auto-scan every 30 seconds while you develop. Track your grade improving over time.</div>
    </div>
  </div>`;

  // ── WCAG Violations ──
  if (sections.violations && violations.length > 0) {
    const grouped = {};
    PRINCIPLES.forEach(p => grouped[p]=[]);
    violations.forEach(v => grouped[getPrinciple(v.id)].push(v));

    html += `<div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#eff6ff; color:#2563eb;">
          ${svg('warning', 20, '#2563eb')}
        </div>
        <div class="section-title-wrap">
          <div class="section-title">WCAG Violations</div>
          <div class="section-subtitle">Each violation below includes why it matters, how to fix it, and where to learn more</div>
        </div>
        <span class="section-badge" style="background:#fef2f2;color:#dc2626;">${violations.length} rules · ${totalInst} instances</span>
      </div>`;

    PRINCIPLES.forEach(principle => {
      const group = grouped[principle];
      if (!group.length) return;
      const meta = PRINCIPLE_META[principle];
      const instCount = group.reduce((s,v)=>s+v.nodes.length,0);

      html += `<div class="principle-group">
        <div class="principle-label" style="background:${meta.bg}; border-color:${meta.border};">
          <div class="principle-label-icon" style="background:${meta.bg}; color:${meta.color};">
            ${svg(meta.icon, 14, meta.color)}
          </div>
          <span class="principle-label-name" style="color:${meta.color};">${principle}</span>
          <span class="principle-label-count">${group.length} rule${group.length!==1?'s':''} · ${instCount} instance${instCount!==1?'s':''}</span>
        </div>`;

      group.forEach(v => {
        const ctx = getContext(v.id);
        const ver = getWcagVersion(v.tags);
        const sc  = v.tags.filter(t => /^\d+\.\d+\.\d+$/.test(t)).join(', ');
        const impColor = IMPACT_COLOURS[v.impact] || '#6b7280';
        const badgeCls = `badge-${v.impact}`;

        html += `<div class="violation-card">
          <div class="violation-head">
            <div class="violation-stripe" style="background:${impColor};"></div>
            <div class="violation-head-inner">
              <div class="violation-name">${esc(v.description)}</div>
              <div class="violation-badges">
                <span class="badge ${badgeCls}">${v.impact}</span>
                ${ver ? `<span class="badge badge-wcag">WCAG ${ver}</span>` : ''}
                ${ver==='2.2' ? `<span class="badge badge-new22">New in 2.2</span>` : ''}
                ${sc ? `<span class="badge badge-wcag">${esc(sc)}</span>` : ''}
                <span class="badge badge-instances">${v.nodes.length} instance${v.nodes.length!==1?'s':''}</span>
              </div>
            </div>
          </div>

          <div class="violation-detail">
            <div class="detail-col">
              <div class="detail-label">${svg('info',12)} Why it matters</div>
              <div class="detail-text">${esc(ctx.why)}</div>
            </div>
            <div class="detail-col">
              <div class="detail-label">${svg('check',12)} What to fix</div>
              <div class="detail-text">${esc(v.help)}</div>
            </div>

            <div class="fix-block">
              <div class="fix-block-header">
                <span class="fix-block-label">${svg('build',12,'rgba(255,255,255,0.4)')} Code fix</span>
              </div>
              <pre class="fix-code"><code>${esc(ctx.fix)}</code></pre>
            </div>

            ${v.nodes.length > 0 ? `
            <div class="elements-block">
              <div class="elements-label">Affected elements on this page</div>
              ${v.nodes.slice(0,3).map((n,i) => `
                <div class="element-snippet">
                  <span class="element-num">#${i+1}</span>
                  <span class="element-code">${esc(n.html?.slice(0,180)||'')}</span>
                </div>`).join('')}
              ${v.nodes.length > 3 ? `<div class="elements-more">+ ${v.nodes.length-3} more instances not shown</div>` : ''}
            </div>` : ''}

            ${ctx.links.length > 0 || v.helpUrl ? `
            <div class="links-block">
              <span class="links-label">Resources</span>
              ${ctx.links.map(l => `<a href="${esc(l.url)}" class="resource-link" target="_blank">${svg('open_in_new',11)} ${esc(l.label)}</a>`).join('')}
              ${v.helpUrl ? `<a href="${esc(v.helpUrl)}" class="resource-link" target="_blank">${svg('open_in_new',11)} axe-core documentation</a>` : ''}
            </div>` : ''}
          </div>
        </div>`;
      });

      html += `</div>`; // principle-group
    });

    html += `</div>`; // section
  }

  // ── All clear ──
  if (sections.violations && violations.length === 0) {
    html += `<div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#f0fdf4; color:#16a34a;">
          ${svg('check_circle', 20, '#16a34a')}
        </div>
        <div class="section-title-wrap">
          <div class="section-title" style="color:#16a34a;">No violations found</div>
          <div class="section-subtitle">Automated checks passed. Continue with manual testing below.</div>
        </div>
      </div>
    </div>`;
  }

  // ── Tab order issues ──
  if (sections.tabOrder) {
    const issues = tabOrderStops.filter(s => s.hasPositiveTabindex || s.isAriaHiddenFocusable || !s.hasFocusRing);
    if (issues.length > 0) {
      const TAB_FIX = {
        noFocusRing: "Add :focus-visible styles. Never use outline:none without a visible replacement. Use box-shadow or a styled outline with sufficient contrast.",
        positiveTabindex: "Remove positive tabindex values. Use tabindex='0' to include elements in natural order, tabindex='-1' for programmatic focus only.",
        ariaHiddenFocusable: "Add the inert attribute alongside aria-hidden, or set tabindex='-1' on all focusable children to prevent ghost focus stops.",
      };

      html += `<div class="section">
        <div class="section-header">
          <div class="section-icon" style="background:#f0f9ff; color:#0369a1;">
            ${svg('account_tree', 20, '#0369a1')}
          </div>
          <div class="section-title-wrap">
            <div class="section-title">Tab Order Issues</div>
            <div class="section-subtitle">Keyboard navigation problems detected in the tab sequence</div>
          </div>
          <span class="section-badge" style="background:#fff7ed;color:#c2410c;">${issues.length} issue${issues.length!==1?'s':''}</span>
        </div>`;

      issues.forEach(s => {
        let flagText='', flagColor='#d97706', fixKey='noFocusRing';
        if (s.isAriaHiddenFocusable) { flagText='aria-hidden but still keyboard focusable'; flagColor='#dc2626'; fixKey='ariaHiddenFocusable'; }
        else if (s.hasPositiveTabindex) { flagText=`tabindex="${s.tabindex}" — breaks natural tab order`; flagColor='#d97706'; fixKey='positiveTabindex'; }
        else if (!s.hasFocusRing) { flagText='No visible focus ring when focused'; flagColor='#c2410c'; fixKey='noFocusRing'; }

        html += `<div class="tab-issue">
          <div class="tab-num" style="background:${flagColor};">${s.index}</div>
          <div class="tab-issue-info">
            <div class="tab-issue-label">${esc(s.label)}</div>
            <div class="tab-issue-flag" style="color:${flagColor};">${esc(flagText)}</div>
            <div class="tab-issue-fix"><strong>Fix:</strong> ${TAB_FIX[fixKey]}</div>
          </div>
        </div>`;
      });

      html += `</div>`;
    }
  }

  // ── Dynamic errors ──
  if (sections.dynamicErrors && dynamicIssues.length > 0) {
    html += `<div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#fff7ed; color:#c2410c;">
          ${svg('warning', 20, '#c2410c')}
        </div>
        <div class="section-title-wrap">
          <div class="section-title">Dynamic ARIA Issues</div>
          <div class="section-subtitle">Error messages injected by JavaScript that are missing ARIA live region announcements</div>
        </div>
        <span class="section-badge" style="background:#fff7ed;color:#c2410c;">${dynamicIssues.length}</span>
      </div>`;

    dynamicIssues.forEach(issue => {
      html += `<div class="violation-card" style="margin-bottom:10px;border-radius:var(--radius);">
        <div class="violation-head">
          <div class="violation-stripe" style="background:#d97706;"></div>
          <div class="violation-head-inner">
            <div class="violation-name">${esc(issue.description)}</div>
            <div class="violation-badges">
              <span class="badge badge-serious">Serious</span>
              <span class="badge badge-wcag">ARIA live region</span>
            </div>
          </div>
        </div>
        <div class="violation-detail">
          <div class="detail-col" style="grid-column:1/-1;">
            <div class="detail-label">${svg('info',12)} Issues found</div>
            ${issue.issues.map(msg => `<div class="detail-text" style="margin-bottom:4px;">• ${esc(msg)}</div>`).join('')}
          </div>
        </div>
      </div>`;
    });

    html += `</div>`;
  }

  // ── Focus ring test log ──
  if (sections.focusLog && focusLog.length > 0) {
    const withRing    = focusLog.filter(s => s.hasFocusRing === true).length;
    const withoutRing = focusLog.filter(s => s.hasFocusRing === false).length;

    html += `<div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#f0f9ff; color:#0369a1;">
          ${svg('keyboard', 20, '#0369a1')}
        </div>
        <div class="section-title-wrap">
          <div class="section-title">Focus Ring Test Log</div>
          <div class="section-subtitle">Keyboard tab-through test — ${withRing} with focus ring · ${withoutRing} missing focus ring</div>
        </div>
        <span class="section-badge" style="background:#f0f9ff;color:#0369a1;">${focusLog.length} stop${focusLog.length!==1?'s':''}</span>
      </div>
      <div class="passed-grid" style="grid-template-columns:1fr 1fr 1fr;">
        ${focusLog.map(s => {
          const tag = (s.tagName || '').toLowerCase();
          const id  = s.id ? ` #${s.id}` : '';
          const color = s.hasFocusRing ? '#16a34a' : '#d97706';
          const icon  = s.hasFocusRing ? 'check' : 'warning';
          return `<div class="passed-item" style="color:${color}; border-left:3px solid ${color}; padding-left:8px;">
            ${svg(icon, 13, color)}
            <span style="font-weight:600;">#${s.stopCount}</span>
            <code style="font-size:11px;">&lt;${esc(tag)}&gt;${esc(id)}</code>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // ── Manual checklist ──
  if (sections.checklist) {
    const totalItems = CHECKLIST_DEF.reduce((s,c)=>s+c.items.length,0);
    const totalDone  = Object.values(checklist).filter(Boolean).length;

    html += `<div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#f5f3ff; color:#7c3aed;">
          ${svg('checklist', 20, '#7c3aed')}
        </div>
        <div class="section-title-wrap">
          <div class="section-title">Manual Testing Checklist</div>
          <div class="section-subtitle">These checks require human judgment — they cannot be automated. ${totalDone} of ${totalItems} completed.</div>
        </div>
        <span class="section-badge" style="background:${totalDone===totalItems?'#f0fdf4':'#f8f9fc'};color:${totalDone===totalItems?'#16a34a':'#6b7280'};">${totalDone}/${totalItems}</span>
      </div>`;

    CHECKLIST_DEF.forEach(cat => {
      html += `<div class="checklist-category">
        <div class="checklist-cat-header">
          <div class="checklist-cat-icon">${svg(cat.icon, 16, 'currentColor')}</div>
          <div class="checklist-cat-name">${cat.category}</div>
        </div>`;

      cat.items.forEach((item,i) => {
        const done = !!checklist[item.id];
        const first = i===0, last = i===cat.items.length-1;
        const style = first ? 'border-radius:var(--radius) var(--radius) 0 0;' : last ? 'border-radius:0 0 var(--radius) var(--radius);' : '';
        html += `<div class="checklist-item" style="${style}${done?'background:#f0fdf4;':''}">
          <div class="checklist-icon">
            ${done
              ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="${ICONS.check_circle}"/></svg>`
              : `<svg width="20" height="20" viewBox="0 0 24 24" fill="#d1d5db"><circle cx="12" cy="12" r="9" stroke="#d1d5db" stroke-width="1.5" fill="none"/></svg>`}
          </div>
          <div>
            <div class="checklist-text ${done?'done':''}">${esc(item.text)}</div>
            ${item.wcag!=='—' ? `<div class="checklist-wcag">WCAG ${item.wcag}</div>` : ''}
          </div>
        </div>`;
      });

      html += `</div>`;
    });

    html += `</div>`;
  }

  // ── Passed checks ──
  if (sections.passed && passes.length > 0) {
    html += `<div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#f0fdf4; color:#16a34a;">
          ${svg('check_circle', 20, '#16a34a')}
        </div>
        <div class="section-title-wrap">
          <div class="section-title">Passed Checks</div>
          <div class="section-subtitle">These axe-core rules passed on this page</div>
        </div>
        <span class="section-badge" style="background:#f0fdf4;color:#16a34a;">${passes.length} rules</span>
      </div>
      <div class="passed-grid">
        ${passes.map(p=>`<div class="passed-item">${svg('check',14,'#16a34a')} ${esc(p.description)}</div>`).join('')}
      </div>
    </div>`;
  }

  // ── Footer ──
  html += `
  <div class="report-footer">
    <div class="footer-note">Generated by AccessLens using axe-core. Automated tools identify approximately 30–40% of real-world accessibility issues. This report must be supplemented with keyboard testing, screen reader testing, and testing with users who have disabilities.</div>
    <div>${new Date().getFullYear()} · WCAG 2.2 AA</div>
  </div>`;

  document.getElementById('report-root').innerHTML = html;
  document.title = `AccessLens Report — ${url}`;
}

// ── CSV export ─────────────────────────────────────────────────────────────────
window.downloadCSV = function() {
  chrome.storage.local.get('accesslens_report', (result) => {
    const raw = result.accesslens_report;
    if (!raw) return;
    const data = JSON.parse(raw);
    const rows = [['Principle','Rule ID','Impact','WCAG Version','Criteria','Description','Instances','Why it matters','First element']];
    (data.violations||[]).forEach(v => {
      const ver = (v.tags||[]).some(t=>t.includes('wcag22'))?'2.2':(v.tags||[]).some(t=>t.includes('wcag21'))?'2.1':'2.0';
      const sc  = (v.tags||[]).filter(t=>/^\d+\.\d+\.\d+$/.test(t)).join(' ');
      const ctx = getContext(v.id);
      rows.push([
        getPrinciple(v.id), v.id, v.impact, ver, sc,
        (v.description||'').replace(/,/g,' '),
        v.nodes?.length||0,
        (ctx.why||'').replace(/,/g,' ').replace(/\n/g,' '),
        (v.nodes?.[0]?.html||'').slice(0,100).replace(/"/g,"'"),
      ]);
    });
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `accesslens-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });
};

// ── Boot ───────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  function tryLoad(attemptsLeft) {
    chrome.storage.local.get('accesslens_report', (result) => {
      if (chrome.runtime.lastError) {
        document.getElementById('report-root').innerHTML =
          '<p style="color:#888;padding:60px;text-align:center;">Could not load report data.</p>';
        return;
      }
      const raw = result && result.accesslens_report;
      if (!raw) {
        if (attemptsLeft > 0) {
          setTimeout(() => tryLoad(attemptsLeft - 1), 250);
        } else {
          document.getElementById('report-root').innerHTML =
            '<p style="color:#888;padding:60px;text-align:center;font-size:16px;">No report found. Generate one from the AccessLens extension first.</p>';
        }
        return;
      }
      try { renderReport(JSON.parse(raw)); }
      catch(e) {
        document.getElementById('report-root').innerHTML =
          '<p style="color:#dc2626;padding:60px;font-size:16px;">Could not load report: ' + e.message + '</p>';
      }
    });
  }
  tryLoad(8);
});
