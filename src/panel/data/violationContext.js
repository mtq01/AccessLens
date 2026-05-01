// Rich context for axe-core violation rules.
// Each entry has:
//   - why:    plain-English explanation of the real user impact
//   - fix:    concrete code example (before/after where possible)
//   - links:  curated external resources [{label, url}]

const context = {

  // ── Images & media ────────────────────────────────────────────────────────

  "image-alt": {
    why: "Screen reader users hear alt text instead of seeing the image. Without it, they either hear the filename ('img_2847.jpg') or nothing at all — both are useless. Blind users miss context that sighted users get instantly.",
    fix: `<!-- Before: missing alt -->
<img src="hero.jpg">

<!-- After: meaningful alt text -->
<img src="hero.jpg" alt="Team of developers collaborating around a whiteboard">

<!-- Decorative image: use empty alt so screen readers skip it -->
<img src="divider.png" alt="">`,
    links: [
      { label: "WCAG 1.1.1 — Non-text content", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" },
      { label: "Alt text decision tree", url: "https://www.w3.org/WAI/tutorials/images/decision-tree/" },
    ]
  },

  "image-redundant-alt": {
    why: "When an image's alt text repeats the text right next to it, screen reader users hear the same thing twice. It's the equivalent of a sighted person reading the same sentence twice in a row.",
    fix: `<!-- Before: redundant -->
<img src="icon.png" alt="Download PDF"> Download PDF

<!-- After: decorative since the text says it all -->
<img src="icon.png" alt=""> Download PDF`,
    links: [
      { label: "WCAG 1.1.1 — Non-text content", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" },
    ]
  },

  "input-image-alt": {
    why: "An <input type='image'> acts as a submit button. Without alt text, screen reader users don't know what submitting the form will do.",
    fix: `<!-- Before -->
<input type="image" src="submit-btn.png">

<!-- After -->
<input type="image" src="submit-btn.png" alt="Submit order">`,
    links: [
      { label: "WCAG 1.1.1 — Non-text content", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" },
    ]
  },

  // ── Color contrast ───────────────────────────────────────────────────────

  "color-contrast": {
    why: "Low contrast text is hard to read for users with low vision, color blindness, or anyone in bright sunlight. WCAG AA requires 4.5:1 for normal text and 3:1 for large text (18px+ bold or 24px+). Roughly 300 million people have color blindness worldwide.",
    fix: `/* Before: fails AA (2.8:1 ratio) */
color: #999999;
background: #ffffff;

/* After: passes AA (4.54:1 ratio) */
color: #767676;
background: #ffffff;

/* Tip: use the Contrast tab in this extension
   to check any color combination instantly */`,
    links: [
      { label: "WCAG 1.4.3 — Contrast (Minimum)", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum" },
      { label: "WebAIM contrast checker", url: "https://webaim.org/resources/contrastchecker/" },
      { label: "Who can use — color contrast simulator", url: "https://www.whocanuse.com/" },
    ]
  },

  "color-contrast-enhanced": {
    why: "WCAG AAA requires 7:1 contrast for normal text and 4.5:1 for large text. While not legally required in most contexts, it significantly improves readability for users with moderate low vision who don't use assistive technology.",
    fix: `/* AAA requires 7:1 for normal text */
/* Use the Contrast tab to find a passing color */`,
    links: [
      { label: "WCAG 1.4.6 — Contrast (Enhanced)", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced" },
    ]
  },

  "non-text-contrast": {
    why: "UI components like button borders, input outlines, focus rings, and icons must have 3:1 contrast against their background. Users with low vision need to be able to distinguish interactive elements from the page.",
    fix: `/* Before: light grey border barely visible */
border: 1px solid #cccccc; /* 1.6:1 — fails */

/* After: darker border passes 3:1 */
border: 1px solid #767676; /* 4.5:1 — passes */

/* For icons used without text */
color: #767676; /* ensure 3:1 against background */`,
    links: [
      { label: "WCAG 1.4.11 — Non-text Contrast", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast" },
    ]
  },

  // ── Forms ────────────────────────────────────────────────────────────────

  "label": {
    why: "When a form input has no label, screen reader users hear 'edit text' with no context about what to type. Sighted users use placeholder text as a hint, but it disappears on input and has poor contrast — it's not a substitute for a label.",
    fix: `<!-- Before: no label -->
<input type="email" placeholder="Email address">

<!-- After: explicit label -->
<label for="email">Email address</label>
<input type="email" id="email" placeholder="you@example.com">

<!-- Or: aria-label if visual label isn't desired -->
<input type="email" aria-label="Email address" placeholder="you@example.com">`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
      { label: "WCAG 3.3.2 — Labels or Instructions", url: "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions" },
    ]
  },

  "select-name": {
    why: "A <select> dropdown without a label gives screen reader users no context about what they're choosing. They hear the options but not the question.",
    fix: `<!-- Before -->
<select>
  <option>January</option>
</select>

<!-- After -->
<label for="month">Birth month</label>
<select id="month">
  <option>January</option>
</select>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  "autocomplete-valid": {
    why: "The autocomplete attribute tells browsers and password managers what a field is for. Users with cognitive disabilities benefit enormously from autofill — it reduces the memory and typing burden. Using wrong values breaks this.",
    fix: `<!-- Before: wrong value -->
<input type="text" autocomplete="username123">

<!-- After: valid autocomplete token -->
<input type="text" autocomplete="given-name">
<input type="email" autocomplete="email">
<input type="tel" autocomplete="tel">`,
    links: [
      { label: "WCAG 1.3.5 — Identify Input Purpose", url: "https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose" },
      { label: "Full autocomplete token list (MDN)", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete" },
    ]
  },

  // ── Buttons & links ───────────────────────────────────────────────────────

  "button-name": {
    why: "A button without a text label is invisible to screen reader users. Icon-only buttons are common offenders — a trash icon with no label is announced as 'button' with no indication of what it does.",
    fix: `<!-- Before: icon only, no name -->
<button><svg>...</svg></button>

<!-- After option 1: visible text -->
<button><svg aria-hidden="true">...</svg> Delete item</button>

<!-- After option 2: aria-label for icon-only -->
<button aria-label="Delete item"><svg aria-hidden="true">...</svg></button>

<!-- After option 3: visually hidden text -->
<button>
  <svg aria-hidden="true">...</svg>
  <span class="sr-only">Delete item</span>
</button>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "link-name": {
    why: "Screen reader users often navigate by tabbing through links or pulling up a list of all links on the page. 'Click here', 'Read more', and 'Learn more' are meaningless out of context. Each link should describe its destination.",
    fix: `<!-- Before: meaningless out of context -->
<a href="/report.pdf">Click here</a>
<a href="/blog/post-1">Read more</a>

<!-- After: descriptive -->
<a href="/report.pdf">Download annual report (PDF)</a>
<a href="/blog/post-1">Read more about accessibility testing</a>

<!-- If design requires short text, use aria-label -->
<a href="/blog/post-1" aria-label="Read more about accessibility testing">Read more</a>`,
    links: [
      { label: "WCAG 2.4.4 — Link Purpose", url: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context" },
    ]
  },

  // ── Structure & semantics ─────────────────────────────────────────────────

  "heading-order": {
    why: "Screen reader users navigate pages by jumping between headings — it's their equivalent of skimming. Skipping levels (h1 → h3) or using headings for visual styling breaks this navigation. The heading hierarchy should reflect the document outline.",
    fix: `<!-- Before: skips h2, jumps from h1 to h3 -->
<h1>Page title</h1>
<h3>First section</h3>  <!-- wrong: should be h2 -->
  <h4>Subsection</h4>   <!-- wrong: should be h3 -->

<!-- After: correct hierarchy -->
<h1>Page title</h1>
<h2>First section</h2>
  <h3>Subsection</h3>

<!-- For visual size without semantic meaning, use CSS not heading levels -->
<p class="visually-large">This looks big but isn't a heading</p>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  "landmark-one-main": {
    why: "The <main> element is how screen reader users jump directly to the page content, skipping navigation. Without it, they have to Tab through every nav link on every page load — like forcing sighted users to scroll past the header on every visit.",
    fix: `<!-- Before: no landmark structure -->
<div id="nav">...</div>
<div id="content">...</div>

<!-- After: semantic landmarks -->
<header>
  <nav>...</nav>
</header>
<main>
  <!-- primary page content here -->
</main>
<footer>...</footer>`,
    links: [
      { label: "WCAG 2.4.1 — Bypass Blocks", url: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks" },
      { label: "ARIA Landmarks — W3C", url: "https://www.w3.org/TR/wai-aria-practices/examples/landmarks/" },
    ]
  },

  "region": {
    why: "Landmark regions (main, nav, header, footer, aside) act as a page map for screen reader users. Content outside any landmark is in a 'dead zone' that's hard to navigate to and may be skipped entirely.",
    fix: `<!-- Before: content with no landmark -->
<div class="sidebar">Related articles...</div>

<!-- After: wrapped in appropriate landmark -->
<aside aria-label="Related articles">
  Related articles...
</aside>`,
    links: [
      { label: "ARIA Landmark Roles", url: "https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/" },
    ]
  },

  "bypass": {
    why: "Keyboard users must Tab through every navigation link on every page load unless a skip link exists. On a site with 20 nav items, that's 20 extra Tab presses before reaching the content — every single page.",
    fix: `<!-- Add as the very first element in <body> -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<!-- Your main content -->
<main id="main-content">...</main>

<!-- CSS: visible on focus, hidden otherwise -->
<style>
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
}
.skip-link:focus {
  top: 0;
}
</style>`,
    links: [
      { label: "WCAG 2.4.1 — Bypass Blocks", url: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks" },
      { label: "WebAIM — Skip Navigation Links", url: "https://webaim.org/techniques/skipnav/" },
    ]
  },

  // ── ARIA ──────────────────────────────────────────────────────────────────

  "aria-allowed-attr": {
    why: "Using an ARIA attribute on an element that doesn't support it creates conflicting signals for assistive technology. Screen readers may announce incorrect roles or ignore the element entirely.",
    fix: `<!-- Before: aria-checked is not valid on a <div> -->
<div aria-checked="true">Option A</div>

<!-- After: use the correct role first -->
<div role="checkbox" aria-checked="true">Option A</div>

<!-- Or better: use a native element -->
<input type="checkbox" id="optA" checked>
<label for="optA">Option A</label>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "ARIA in HTML — allowed attributes", url: "https://www.w3.org/TR/html-aria/" },
    ]
  },

  "aria-hidden-focus": {
    why: "aria-hidden='true' hides an element from screen readers, but keyboard focus can still land on it. This creates ghost focus stops where the screen reader announces nothing — deeply confusing for keyboard users.",
    fix: `<!-- Before: hidden from AT but still focusable -->
<div aria-hidden="true">
  <button>Hidden button</button>  <!-- keyboard can still reach this -->
</div>

<!-- After option 1: also make children non-focusable -->
<div aria-hidden="true" inert>
  <button>Hidden button</button>
</div>

<!-- After option 2: remove aria-hidden if content should be accessible -->
<div>
  <button>Visible button</button>
</div>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "aria-required-attr": {
    why: "Some ARIA roles require specific attributes to work correctly. A slider without aria-valuenow, for example, gives screen reader users no information about the current value.",
    fix: `<!-- Before: role="slider" missing required attributes -->
<div role="slider">Volume</div>

<!-- After: all required attributes present -->
<div
  role="slider"
  aria-valuenow="50"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Volume"
  tabindex="0"
>Volume: 50%</div>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "ARIA Required Attributes", url: "https://www.w3.org/TR/wai-aria-1.2/#requiredState" },
    ]
  },

  "aria-roles": {
    why: "An invalid or misspelled ARIA role is ignored by assistive technology — the element falls back to its native semantics (or none). A custom widget that relies on a role that doesn't exist simply won't work for screen reader users.",
    fix: `<!-- Before: misspelled role -->
<div role="buttn">Submit</div>

<!-- After: valid role -->
<div role="button" tabindex="0">Submit</div>

<!-- Better: use native HTML -->
<button>Submit</button>`,
    links: [
      { label: "WAI-ARIA Roles", url: "https://www.w3.org/TR/wai-aria-1.2/#role_definitions" },
    ]
  },

  "aria-valid-attr-value": {
    why: "An ARIA attribute with an invalid value (like aria-expanded='yes' instead of 'true') is treated as if the attribute doesn't exist. The component's state won't be communicated to screen reader users.",
    fix: `<!-- Before: invalid boolean value -->
<button aria-expanded="yes">Menu</button>

<!-- After: correct boolean string -->
<button aria-expanded="true">Menu</button>
<!-- or -->
<button aria-expanded="false">Menu</button>

<!-- In React: use boolean, JSX handles the string conversion -->
<button aria-expanded={isOpen}>Menu</button>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  // ── Keyboard & focus ──────────────────────────────────────────────────────

  "scrollable-region-focusable": {
    why: "If a scrollable area can't receive keyboard focus, keyboard-only users have no way to scroll it. They're locked out of the content inside.",
    fix: `<!-- Before: scrollable but not focusable -->
<div style="overflow: auto; height: 200px">
  Long content...
</div>

<!-- After: add tabindex so keyboard users can focus and scroll -->
<div
  style="overflow: auto; height: 200px"
  tabindex="0"
  role="region"
  aria-label="Product description"
>
  Long content...
</div>`,
    links: [
      { label: "WCAG 2.1.1 — Keyboard", url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard" },
    ]
  },

  "tabindex": {
    why: "Positive tabindex values (tabindex='2', tabindex='5') create a custom tab order that overrides the natural DOM order. This almost always creates a confusing, unpredictable tab sequence. Use tabindex='0' to add elements to the natural tab order, or tabindex='-1' to make them programmatically focusable only.",
    fix: `<!-- Before: positive tabindex breaks natural order -->
<button tabindex="3">First visually</button>
<button tabindex="1">Second visually</button>
<button tabindex="2">Third visually</button>

<!-- After: let DOM order control tab order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- tabindex="0": adds non-interactive element to tab order -->
<div role="button" tabindex="0">Custom button</div>

<!-- tabindex="-1": focusable by JS only, not by Tab key -->
<div tabindex="-1" id="modal-heading">Modal title</div>`,
    links: [
      { label: "WCAG 2.4.3", url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order" },
      { label: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex" },
    ]
  },

  "focus-trap": {
    why: "When a modal or dialog opens, keyboard focus must be trapped inside it. If users can Tab out of the modal into the page behind it, they lose context and can interact with content that should be blocked.",
    fix: `// In React: use a focus trap library
// npm install focus-trap-react

import FocusTrap from 'focus-trap-react';

function Modal({ isOpen, onClose }) {
  return isOpen ? (
    <FocusTrap>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Confirm action</h2>
        <button onClick={onClose}>Cancel</button>
        <button>Confirm</button>
      </div>
    </FocusTrap>
  ) : null;
}`,
    links: [
      { label: "WCAG 2.1.2 — No Keyboard Trap", url: "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap" },
      { label: "ARIA Dialog Pattern", url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/" },
    ]
  },

  // ── Page & document ───────────────────────────────────────────────────────

  "document-title": {
    why: "The page title is the first thing screen reader users hear when a page loads. In a browser with many tabs, it's how users identify the right tab. Titles like 'Untitled' or the same title on every page are useless.",
    fix: `<!-- Before: missing or generic -->
<title>Page</title>

<!-- After: descriptive and unique per page -->
<title>Shopping cart (3 items) — Acme Store</title>
<title>Sign in — Acme Store</title>
<title>Order confirmed #12345 — Acme Store</title>

<!-- In React with react-helmet -->
import { Helmet } from 'react-helmet';

<Helmet><title>Shopping cart — Acme Store</title></Helmet>`,
    links: [
      { label: "WCAG 2.4.2 — Page Titled", url: "https://www.w3.org/WAI/WCAG21/Understanding/page-titled" },
    ]
  },

  "html-has-lang": {
    why: "The lang attribute tells screen readers which language to use for pronunciation. Without it, a French screen reader trying to read English content will mispronounce every word — making the page unintelligible.",
    fix: `<!-- Before: no language declared -->
<html>

<!-- After: language specified -->
<html lang="en">

<!-- For multilingual content, set lang on the specific element -->
<p lang="fr">Bonjour le monde</p>`,
    links: [
      { label: "WCAG 3.1.1 — Language of Page", url: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page" },
    ]
  },

  "html-lang-valid": {
    why: "An invalid language code (like lang='english' or lang='en-us' with wrong casing) may not be recognised by screen readers, causing the same mispronunciation problem as having no lang attribute at all.",
    fix: `<!-- Before: invalid lang value -->
<html lang="english">
<html lang="EN">

<!-- After: valid BCP 47 language tag -->
<html lang="en">          <!-- English -->
<html lang="en-US">       <!-- American English -->
<html lang="fr">          <!-- French -->
<html lang="zh-Hans">     <!-- Simplified Chinese -->`,
    links: [
      { label: "WCAG 3.1.1 — Language of Page", url: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page" },
      { label: "BCP 47 language tags", url: "https://www.iana.org/assignments/language-subtag-registry/" },
    ]
  },

  // ── Lists & tables ────────────────────────────────────────────────────────

  "list": {
    why: "Screen readers announce list semantics ('list, 5 items'). This tells users they're in a structured group and lets them navigate item by item. Broken list markup loses this context — users just hear a stream of text with no structure.",
    fix: `<!-- Before: invalid list structure -->
<ul>
  <div>Item one</div>   <!-- div not allowed directly in ul -->
  <div>Item two</div>
</ul>

<!-- After: correct structure -->
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  "td-headers-attr": {
    why: "Complex tables with merged cells use headers attributes to link data cells to their headers. Without this, screen reader users lose track of which column and row header applies to each data cell.",
    fix: `<!-- Before: no header association -->
<table>
  <tr><th>Name</th><th>Score</th></tr>
  <tr><td>Alice</td><td>92</td></tr>
</table>

<!-- After: headers linked by ID -->
<table>
  <tr>
    <th id="h-name">Name</th>
    <th id="h-score">Score</th>
  </tr>
  <tr>
    <td headers="h-name">Alice</td>
    <td headers="h-score">92</td>
  </tr>
</table>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
      { label: "W3C Table Concepts", url: "https://www.w3.org/WAI/tutorials/tables/" },
    ]
  },

  // ── IDs ───────────────────────────────────────────────────────────────────

  "duplicate-id": {
    why: "IDs must be unique on a page. Duplicate IDs break aria-labelledby, aria-describedby, htmlFor, and anchor links — any feature that references an element by ID. The browser picks one arbitrarily, usually the wrong one.",
    fix: `<!-- Before: duplicate IDs -->
<label for="email">Email</label>
<input id="email" type="email">
...
<!-- later in a modal -->
<label for="email">Email</label>  <!-- same ID! -->
<input id="email" type="email">

<!-- After: unique IDs — add context or use generated IDs -->
<input id="login-email" type="email">
<input id="signup-email" type="email">

<!-- In React: use useId() hook -->
import { useId } from 'react';
const id = useId();
<input id={id} /><label htmlFor={id}>Email</label>`,
    links: [
      { label: "WCAG 4.1.1 — Parsing", url: "https://www.w3.org/WAI/WCAG21/Understanding/parsing" },
      { label: "React useId hook", url: "https://react.dev/reference/react/useId" },
    ]
  },

  "duplicate-id-aria": {
    why: "When an aria-labelledby or aria-describedby references a duplicate ID, the association is broken. The screen reader either picks the wrong element or announces nothing — directly breaking accessibility for that component.",
    fix: `<!-- Before: aria-labelledby references a non-unique ID -->
<div id="title">Choose a date</div>
<input aria-labelledby="title" type="date">
<!-- ...elsewhere... -->
<div id="title">Another title</div>  <!-- duplicate! -->

<!-- After: ensure referenced IDs are unique -->
<div id="datepicker-title">Choose a date</div>
<input aria-labelledby="datepicker-title" type="date">`,
    links: [
      { label: "WCAG 4.1.1 — Parsing", url: "https://www.w3.org/WAI/WCAG21/Understanding/parsing" },
    ]
  },

  // ── Target size (WCAG 2.2) ────────────────────────────────────────────────

  "target-size": {
    why: "Small touch targets are impossible to tap accurately for users with motor impairments, tremors, or large fingers. WCAG 2.2 requires a minimum 24×24px target — anything smaller and users will routinely mis-tap, triggering unintended actions.",
    fix: `/* Before: tiny icon button */
.icon-btn { width: 16px; height: 16px; }

/* After option 1: increase the element itself */
.icon-btn { width: 44px; height: 44px; } /* 44px is Apple's recommendation */

/* After option 2: use padding to increase hit area without changing visual size */
.icon-btn {
  padding: 12px;  /* 16px icon + 24px padding = 40px tap area */
}

/* After option 3: use a pseudo-element for larger hit area */
.icon-btn {
  position: relative;
}
.icon-btn::before {
  content: '';
  position: absolute;
  inset: -12px;  /* extends tap area by 12px on all sides */
}`,
    links: [
      { label: "WCAG 2.5.8 — Target Size (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum" },
      { label: "Apple HIG — Touch Targets", url: "https://developer.apple.com/design/human-interface-guidelines/accessibility" },
    ]
  },

  // ── Meta & viewport ───────────────────────────────────────────────────────

  "meta-viewport": {
    why: "Setting user-scalable=no or maximum-scale=1 prevents users from zooming the page. Many users with low vision rely on browser zoom as their primary accessibility tool. Blocking it is a direct WCAG violation.",
    fix: `<!-- Before: blocks user zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<meta name="viewport" content="width=device-width, maximum-scale=1">

<!-- After: allow user scaling -->
<meta name="viewport" content="width=device-width, initial-scale=1">`,
    links: [
      { label: "WCAG 1.4.4 — Resize Text", url: "https://www.w3.org/WAI/WCAG21/Understanding/resize-text" },
    ]
  },

};

// Fallback for rules without custom context
const fallback = {
  why: "This violation affects users who rely on assistive technology or who cannot use a mouse. Fixing it improves the experience for users with visual, motor, or cognitive disabilities.",
  fix: "Review the axe-core guidance below and the WCAG success criterion for specific remediation steps.",
  links: [],
};

export function getViolationContext(ruleId) {
  return context[ruleId] || fallback;
}

export default context;
