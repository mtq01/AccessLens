// Rich context for axe-core violation rules.
// Each entry has:
//   - why:    plain-English explanation of the real user impact
//   - fix:    concrete code example (before/after where possible)
//   - links:  curated external resources [{label, url}]

const context = {

  // ── Images & media ────────────────────────────────────────────────────────

  "image-alt": {
    label: "Images missing alt text",
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
    label: "Images with redundant alt text",
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
    label: "Image buttons missing alt text",
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
    label: "Text with low color contrast",
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
    label: "Text doesn't meet enhanced contrast",
    why: "WCAG AAA requires 7:1 contrast for normal text and 4.5:1 for large text. While not legally required in most contexts, it significantly improves readability for users with moderate low vision who don't use assistive technology.",
    fix: `/* AAA requires 7:1 for normal text */
/* Use the Contrast tab to find a passing color */`,
    links: [
      { label: "WCAG 1.4.6 — Contrast (Enhanced)", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced" },
    ]
  },

  "non-text-contrast": {
    label: "UI elements with low contrast",
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
    label: "Form inputs without labels",
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
    label: "Dropdowns without labels",
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
    label: "Invalid autocomplete values",
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
    label: "Buttons without a name",
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
    label: "Links without a readable name",
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
    label: "Headings in the wrong order",
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
    label: "Page missing a main landmark",
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
    label: "Content outside landmark regions",
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
    label: "No skip navigation link",
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
    label: "Invalid ARIA attributes used",
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
    label: "Focusable elements hidden from screen readers",
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
    label: "ARIA roles missing required attributes",
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
    label: "Invalid ARIA roles",
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
    label: "ARIA attributes with invalid values",
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
    label: "Scrollable area not keyboard accessible",
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
    label: "Positive tabindex values used",
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
    label: "Focus not trapped in modal",
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
    label: "Page missing a title",
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
    label: "Page is missing a language",
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
    label: "Page has an invalid language code",
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
    label: "Invalid list structure",
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
    label: "Table cells not linked to headers",
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
    label: "Duplicate element IDs",
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
    label: "Duplicate IDs referenced by ARIA",
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
    label: "Tap targets too small",
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
    label: "Page blocks user zoom",
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

  // ── ARIA role hierarchy ───────────────────────────────────────────────────

  "aria-required-parent": {
    label: "ARIA role missing required parent",
    why: "Some ARIA roles only make sense inside a specific parent role — for example, an option must be inside a listbox, and a menuitem must be inside a menu. Without the right parent, screen readers can't tell users what kind of widget they're in, breaking keyboard navigation patterns.",
    fix: `<!-- Before: option with no listbox parent -->
<ul>
  <li role="option">First choice</li>
  <li role="option">Second choice</li>
</ul>

<!-- After: option correctly nested inside listbox -->
<ul role="listbox" aria-label="Choose a country">
  <li role="option">United Kingdom</li>
  <li role="option">United States</li>
</ul>

<!-- Before: menuitem outside a menu -->
<div role="menuitem">Edit</div>

<!-- After: menuitem inside a menu -->
<ul role="menu">
  <li role="menuitem">Edit</li>
  <li role="menuitem">Delete</li>
</ul>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "WAI-ARIA required context roles", url: "https://www.w3.org/TR/wai-aria-1.2/#scope" },
    ]
  },

  "aria-required-children": {
    label: "ARIA role missing required children",
    why: "Some ARIA roles must contain specific child roles to work correctly. A listbox with no option children, or a menu with no menuitem children, is an empty widget that screen readers can't navigate. Users hear the role announced but find nothing inside.",
    fix: `<!-- Before: listbox with no option children -->
<ul role="listbox">
  <li>First choice</li>   <!-- no role="option" -->
</ul>

<!-- After: each child has the required role -->
<ul role="listbox" aria-label="Sort by">
  <li role="option" aria-selected="true">Relevance</li>
  <li role="option" aria-selected="false">Price: low to high</li>
  <li role="option" aria-selected="false">Newest first</li>
</ul>

<!-- Before: menu with no menuitem children -->
<div role="menu">
  <div>Edit</div>
</div>

<!-- After -->
<div role="menu">
  <div role="menuitem">Edit</div>
  <div role="menuitem">Delete</div>
</div>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "WAI-ARIA required owned elements", url: "https://www.w3.org/TR/wai-aria-1.2/#mustContain" },
    ]
  },

  // ── Frames & embedded content ─────────────────────────────────────────────

  "frame-title": {
    label: "Iframes missing a title",
    why: "When a screen reader encounters an iframe, the first thing it announces is the frame's title. Without one, users have no idea what the embedded content is — they either hear the filename or nothing. Common offenders are chat widgets, video embeds, and ad iframes.",
    fix: `<!-- Before: no title -->
<iframe src="https://www.youtube.com/embed/abc123"></iframe>

<!-- After: descriptive title -->
<iframe
  src="https://www.youtube.com/embed/abc123"
  title="Introduction to web accessibility — YouTube video"
></iframe>

<!-- For decorative / tracking iframes that users should skip -->
<iframe src="tracking.html" title="none" aria-hidden="true" tabindex="-1"></iframe>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "frame-focusable-content": {
    label: "Iframe with focusable content hidden from screen readers",
    why: "An iframe with aria-hidden='true' still allows keyboard focus to enter it. Users who Tab into a hidden frame receive no screen reader announcement — they're in a void. Either the frame should be fully hidden (inert), or it should be visible to assistive technology.",
    fix: `<!-- Before: hidden but keyboard can enter -->
<iframe src="widget.html" aria-hidden="true"></iframe>

<!-- After option 1: fully block keyboard access too -->
<iframe src="widget.html" aria-hidden="true" tabindex="-1" inert></iframe>

<!-- After option 2: remove aria-hidden if content should be accessible -->
<iframe src="widget.html" title="Live chat widget"></iframe>`,
    links: [
      { label: "WCAG 2.1.1 — Keyboard", url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard" },
    ]
  },

  "object-alt": {
    label: "Embedded objects missing text alternative",
    why: "The <object> element (used for Flash, PDFs, SVGs, and other embeds) needs a text alternative inside it that screen readers can read if the object can't be rendered. Without one, users with visual disabilities get nothing.",
    fix: `<!-- Before: no text fallback -->
<object data="chart.svg" type="image/svg+xml"></object>

<!-- After: descriptive text inside the object element -->
<object data="chart.svg" type="image/svg+xml">
  Bar chart showing sales growth from 2022 to 2024.
  <a href="sales-data.csv">Download the underlying data as CSV</a>
</object>`,
    links: [
      { label: "WCAG 1.1.1 — Non-text content", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" },
    ]
  },

  // ── Images with roles ─────────────────────────────────────────────────────

  "role-img-alt": {
    label: "Elements with role='img' missing a label",
    why: "Any element with role='img' is treated as an image by screen readers. Without an accessible name (via aria-label or aria-labelledby), the screen reader announces 'image' with no description — conveying nothing to the user.",
    fix: `<!-- Before: no accessible name -->
<div role="img">
  <!-- SVG or background image here -->
</div>

<!-- After: aria-label describes the image -->
<div role="img" aria-label="Company logo — Acme Corp">
  <!-- SVG or background image here -->
</div>

<!-- For SVG directly -->
<svg role="img" aria-label="Pie chart: 60% returning users, 40% new users">
  <!-- paths here -->
</svg>

<!-- Decorative: hide from screen readers entirely -->
<div role="img" aria-hidden="true"></div>`,
    links: [
      { label: "WCAG 1.1.1 — Non-text content", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" },
    ]
  },

  "svg-img-alt": {
    label: "SVG images missing accessible names",
    why: "SVGs used as images need a text alternative just like <img> tags. Without one, screen readers either skip them or read out raw SVG markup — neither is useful. The most reliable method is adding role='img' and aria-label to the SVG element.",
    fix: `<!-- Before: SVG with no accessible name -->
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="green"/>
</svg>

<!-- After: role + aria-label (works in all browsers) -->
<svg role="img" aria-label="Green circle icon indicating success" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="green"/>
</svg>

<!-- Alt: use a <title> as the first child (less reliable) -->
<svg viewBox="0 0 100 100" aria-labelledby="svg-title">
  <title id="svg-title">Success icon</title>
  <circle cx="50" cy="50" r="50" fill="green"/>
</svg>

<!-- Decorative SVG: hide from screen readers -->
<svg aria-hidden="true" focusable="false" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="green"/>
</svg>`,
    links: [
      { label: "WCAG 1.1.1 — Non-text content", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content" },
      { label: "SVG accessibility guide — CSS-Tricks", url: "https://css-tricks.com/accessible-svgs/" },
    ]
  },

  // ── Lists ────────────────────────────────────────────────────────────────

  "listitem": {
    label: "List items outside a list element",
    why: "A <li> element must be a direct child of <ul> or <ol>. When it isn't, screen readers can't tell users they're in a list. The item count, list context, and navigation commands all break.",
    fix: `<!-- Before: li not inside a list -->
<div>
  <li>First item</li>
  <li>Second item</li>
</div>

<!-- After: li correctly inside ul or ol -->
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>

<!-- For ordered steps, use ol -->
<ol>
  <li>Download the file</li>
  <li>Open the installer</li>
  <li>Follow the prompts</li>
</ol>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  "definition-list": {
    label: "Definition list with invalid children",
    why: "A <dl> (definition list) must only contain <dt> (term) and <dd> (definition) elements as direct children. Wrapping them in <div> or <p> breaks the semantic relationship that screen readers use to pair terms with their definitions.",
    fix: `<!-- Before: invalid children in dl -->
<dl>
  <p>Term: Definition</p>
</dl>

<!-- After: correct dt/dd structure -->
<dl>
  <dt>Accessibility</dt>
  <dd>The practice of making products usable by people with disabilities.</dd>

  <dt>WCAG</dt>
  <dd>Web Content Accessibility Guidelines — the international standard for web accessibility.</dd>
</dl>

<!-- Grouping dt/dd in a div is valid in HTML5 -->
<dl>
  <div>
    <dt>Accessibility</dt>
    <dd>The practice of making products usable by people with disabilities.</dd>
  </div>
</dl>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  "dlitem": {
    label: "Definition list terms/descriptions outside a dl",
    why: "<dt> and <dd> elements must be inside a <dl>. Outside one, screen readers can't announce the definition list context, so users lose the structured relationship between terms and their descriptions.",
    fix: `<!-- Before: dt/dd outside dl -->
<div>
  <dt>Screen reader</dt>
  <dd>Software that reads screen content aloud for blind users.</dd>
</div>

<!-- After: wrapped in dl -->
<dl>
  <dt>Screen reader</dt>
  <dd>Software that reads screen content aloud for blind users.</dd>
</dl>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  // ── Headings ─────────────────────────────────────────────────────────────

  "empty-heading": {
    label: "Empty heading element",
    why: "Screen reader users navigate pages by jumping between headings. An empty heading creates a phantom navigation stop — the screen reader announces 'heading level 2' and then reads nothing. This is disorienting and wastes the user's time.",
    fix: `<!-- Before: heading with no content -->
<h2></h2>
<h3>  </h3>

<!-- After: heading has meaningful text content -->
<h2>Product features</h2>

<!-- If the heading content is injected by JavaScript, ensure
     it's loaded before the heading is rendered -->
<h2>{pageTitle || 'Loading...'}</h2>

<!-- If used purely for visual decoration, use a div + CSS instead -->
<div class="section-divider" aria-hidden="true"></div>`,
    links: [
      { label: "WCAG 2.4.6 — Headings and Labels", url: "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels" },
    ]
  },

  // ── Landmark duplicates ───────────────────────────────────────────────────

  "landmark-no-duplicate-banner": {
    label: "Multiple banner landmarks",
    why: "A page should have only one banner landmark (<header> at the top level, or role='banner'). Screen readers provide a landmark navigation shortcut to jump to the banner. Multiple banners create ambiguity — users don't know which one to go to.",
    fix: `<!-- Before: multiple banners -->
<header>Site header</header>        <!-- banner 1 -->
<section>
  <header>Section header</header>   <!-- banner 2 — problem -->
</section>

<!-- After: only the top-level header is a banner landmark -->
<header>Site header</header>        <!-- banner: top-level = landmark -->
<section>
  <!-- nested header is NOT a landmark — this is correct HTML -->
  <header>Section header</header>
</section>

<!-- Or: use role="banner" only once -->
<div role="banner">Site header</div>`,
    links: [
      { label: "ARIA banner role", url: "https://www.w3.org/TR/wai-aria-1.2/#banner" },
    ]
  },

  "landmark-no-duplicate-contentinfo": {
    label: "Multiple contentinfo landmarks",
    why: "A page should have only one contentinfo landmark (<footer> at the top level, or role='contentinfo'). It identifies the page-level footer containing copyright, links, and contact info. Multiple contentinfo landmarks confuse screen reader landmark navigation.",
    fix: `<!-- Before: multiple footers as landmarks -->
<footer>Site footer</footer>        <!-- contentinfo 1 -->
<section>
  <footer>Section footer</footer>   <!-- contentinfo 2 — problem -->
</section>

<!-- After: only the top-level footer is a landmark -->
<footer>Site footer</footer>        <!-- top-level = landmark -->
<section>
  <footer>Section footer</footer>   <!-- nested = not a landmark -->
</section>`,
    links: [
      { label: "ARIA contentinfo role", url: "https://www.w3.org/TR/wai-aria-1.2/#contentinfo" },
    ]
  },

  "landmark-no-duplicate-main": {
    label: "Multiple main landmarks",
    why: "There must be exactly one <main> landmark per page. It marks the primary content that keyboard users jump to when skipping navigation. Multiple <main> elements break this pattern — users jump to the first one and miss the others, or can't tell which is the 'real' main content.",
    fix: `<!-- Before: two main elements -->
<main>Primary content</main>
<main>Secondary content</main>  <!-- invalid -->

<!-- After: one main, use other landmarks for secondary content -->
<main>Primary content</main>
<aside>Secondary content</aside>

<!-- In SPAs, update content inside main rather than adding a second main -->
<main id="app-root">
  {/* React/Vue content renders here */}
</main>`,
    links: [
      { label: "WCAG 2.4.1 — Bypass Blocks", url: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks" },
    ]
  },

  "landmark-banner-is-top-level": {
    label: "Banner landmark nested inside another landmark",
    why: "The banner landmark must be at the top level of the page — not nested inside another landmark like <main> or <section>. Screen readers look for it at the top level. A nested banner breaks landmark navigation and confuses users about the page structure.",
    fix: `<!-- Before: header (banner) nested inside main -->
<main>
  <header>This becomes a nested banner — wrong</header>
  Page content...
</main>

<!-- After: header at the top level, outside other landmarks -->
<header>Site-wide header</header>
<main>Page content...</main>
<footer>Site footer</footer>`,
    links: [
      { label: "ARIA banner role", url: "https://www.w3.org/TR/wai-aria-1.2/#banner" },
    ]
  },

  "landmark-contentinfo-is-top-level": {
    label: "Contentinfo landmark nested inside another landmark",
    why: "The contentinfo landmark (page-level footer) must be at the top level of the page, not inside <main> or another landmark. A nested footer is still valid HTML but doesn't become a page-level landmark — it won't be found by screen reader landmark navigation.",
    fix: `<!-- Before: footer nested inside main -->
<main>
  Page content...
  <footer>This is a nested footer — not a page landmark</footer>
</main>

<!-- After: footer at the top level -->
<main>Page content...</main>
<footer>Site-wide footer — copyright, links, contact</footer>`,
    links: [
      { label: "ARIA contentinfo role", url: "https://www.w3.org/TR/wai-aria-1.2/#contentinfo" },
    ]
  },

  "landmark-complementary-is-top-level": {
    label: "Aside landmark nested inside a landmark incorrectly",
    why: "An <aside> element (complementary landmark) should relate to the page as a whole, not to a specific section. When nested inside <main> or other landmarks without proper labelling, screen readers can't tell users whether the aside is page-level or section-specific supplementary content.",
    fix: `<!-- Before: unlabelled aside inside main -->
<main>
  <p>Article text...</p>
  <aside>Related links</aside>  <!-- ambiguous scope -->
</main>

<!-- After option 1: move to top level for page-wide sidebars -->
<main>Article text...</main>
<aside aria-label="Related links">...</aside>

<!-- After option 2: keep nested but add aria-label to clarify scope -->
<main>
  <p>Article text...</p>
  <aside aria-label="Further reading for this article">
    Related links...
  </aside>
</main>`,
    links: [
      { label: "ARIA complementary role", url: "https://www.w3.org/TR/wai-aria-1.2/#complementary" },
    ]
  },

  // ── Tables ───────────────────────────────────────────────────────────────

  "scope-attr-valid": {
    label: "Invalid scope attribute on table header",
    why: "The scope attribute on <th> tells screen readers whether the header applies to a column, row, or group of columns/rows. An invalid value (like scope='yes') is ignored — users hear column data without any header context.",
    fix: `<!-- Before: invalid scope value -->
<th scope="yes">Name</th>

<!-- After: valid scope values -->
<table>
  <thead>
    <tr>
      <th scope="col">Name</th>      <!-- applies to the column -->
      <th scope="col">Score</th>
      <th scope="col">Grade</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Alice</th>     <!-- applies to the row -->
      <td>92</td>
      <td>A</td>
    </tr>
  </tbody>
</table>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  "th-has-data-cells": {
    label: "Table header has no associated data cells",
    why: "A <th> header that has no data cells associated with it is either misplaced or unnecessary. Screen readers announce it as a header, but users never encounter the data it's meant to label — creating confusion about the table structure.",
    fix: `<!-- Before: header without corresponding data cells -->
<table>
  <tr>
    <th>Name</th>
    <th>Score</th>
    <th>Extra header</th>  <!-- no data cells in this column -->
  </tr>
  <tr>
    <td>Alice</td>
    <td>92</td>
    <!-- missing third cell -->
  </tr>
</table>

<!-- After: every header has matching data cells -->
<table>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Score</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice</td>
      <td>92</td>
    </tr>
  </tbody>
</table>`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
    ]
  },

  // ── ARIA widget names ─────────────────────────────────────────────────────

  "aria-command-name": {
    label: "ARIA command (button/link/menuitem) missing accessible name",
    why: "Buttons, links, and menuitems with role='button', role='link', or role='menuitem' must have an accessible name. Without one, screen readers announce only the role ('button') with no indication of what it does.",
    fix: `<!-- Before: custom button with no label -->
<div role="button" tabindex="0">
  <svg><!-- icon --></svg>
</div>

<!-- After option 1: aria-label -->
<div role="button" tabindex="0" aria-label="Close dialog">
  <svg aria-hidden="true"><!-- icon --></svg>
</div>

<!-- After option 2: visible text content -->
<div role="button" tabindex="0">
  <svg aria-hidden="true"><!-- icon --></svg>
  Close dialog
</div>

<!-- Better: use native <button> which handles keyboard events natively -->
<button aria-label="Close dialog">
  <svg aria-hidden="true"><!-- icon --></svg>
</button>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "aria-input-field-name": {
    label: "ARIA input field missing accessible name",
    why: "Custom input widgets (role='textbox', role='spinbutton', role='combobox', etc.) must have an accessible name so screen reader users know what to type into them. Without a name, users hear only 'edit text' with no context.",
    fix: `<!-- Before: custom textbox with no label -->
<div role="textbox" contenteditable="true"></div>

<!-- After option 1: aria-label -->
<div role="textbox" contenteditable="true" aria-label="Search products"></div>

<!-- After option 2: aria-labelledby pointing to visible text -->
<div id="search-lbl">Search products</div>
<div role="textbox" contenteditable="true" aria-labelledby="search-lbl"></div>

<!-- Best practice: use native <input> or <textarea> with a <label> -->
<label for="search">Search products</label>
<input type="search" id="search">`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "aria-meter-name": {
    label: "ARIA meter missing accessible name",
    why: "An element with role='meter' represents a scalar value within a range (like disk usage or battery level). Without an accessible name, screen reader users hear only 'meter' and the numeric value — they have no idea what the meter is measuring.",
    fix: `<!-- Before: meter with no label -->
<div role="meter" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>

<!-- After: aria-label describes what's being measured -->
<div
  role="meter"
  aria-label="Disk usage"
  aria-valuenow="75"
  aria-valuemin="0"
  aria-valuemax="100"
>
  75% used
</div>

<!-- Or use the native <meter> element with a visible label -->
<label>
  Disk usage
  <meter value="75" min="0" max="100">75%</meter>
</label>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "aria-progressbar-name": {
    label: "ARIA progress bar missing accessible name",
    why: "A progress bar without a label leaves screen reader users guessing what is loading or being completed. They hear 'progress bar, 40%' — but 40% of what? A name like 'Uploading file' or 'Page loading' gives essential context.",
    fix: `<!-- Before: progress bar with no label -->
<div role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"></div>

<!-- After: aria-label explains what's progressing -->
<div
  role="progressbar"
  aria-label="File upload progress"
  aria-valuenow="40"
  aria-valuemin="0"
  aria-valuemax="100"
>
  40%
</div>

<!-- Or use native <progress> with a visible label -->
<label>
  Uploading file
  <progress value="40" max="100">40%</progress>
</label>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "aria-toggle-field-name": {
    label: "ARIA toggle field missing accessible name",
    why: "Toggle controls like checkboxes, radio buttons, and switches (role='checkbox', role='radio', role='switch') must have an accessible name. Without one, screen reader users hear 'checkbox, unchecked' — but not what the checkbox is for.",
    fix: `<!-- Before: custom checkbox with no label -->
<div role="checkbox" aria-checked="false" tabindex="0"></div>

<!-- After option 1: aria-label -->
<div role="checkbox" aria-checked="false" tabindex="0" aria-label="Subscribe to newsletter"></div>

<!-- After option 2: aria-labelledby -->
<span id="subscribe-lbl">Subscribe to newsletter</span>
<div role="checkbox" aria-checked="false" tabindex="0" aria-labelledby="subscribe-lbl"></div>

<!-- Best practice: use native input — browser handles all ARIA automatically -->
<label>
  <input type="checkbox"> Subscribe to newsletter
</label>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "aria-tooltip-name": {
    label: "ARIA tooltip missing accessible name",
    why: "A tooltip (role='tooltip') must have text content or an accessible name so screen readers can announce it. An empty tooltip is confusing — the screen reader announces 'tooltip' but reads nothing.",
    fix: `<!-- Before: empty tooltip -->
<div role="tooltip" id="tip-1"></div>
<button aria-describedby="tip-1">Save</button>

<!-- After: tooltip has text content -->
<div role="tooltip" id="tip-1">Save changes to your account</div>
<button aria-describedby="tip-1">Save</button>

<!-- Tooltip shows on hover/focus, hidden otherwise -->
<style>
  [role="tooltip"] { display: none; }
  button:hover [role="tooltip"],
  button:focus [role="tooltip"] { display: block; }
</style>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "WAI-ARIA tooltip pattern", url: "https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/" },
    ]
  },

  // ── Language ──────────────────────────────────────────────────────────────

  "html-xml-lang-mismatch": {
    label: "HTML lang and xml:lang attributes don't match",
    why: "When the lang and xml:lang attributes on the <html> element have different values, screen readers get conflicting language signals. One attribute may be ignored — causing mispronunciation in one mode (HTML) or the other (XHTML served as XML).",
    fix: `<!-- Before: mismatched language attributes -->
<html lang="en" xml:lang="fr">

<!-- After: both attributes agree -->
<html lang="en" xml:lang="en">

<!-- Most modern sites don't need xml:lang unless serving XHTML as XML.
     If you don't need it, just use lang alone. -->
<html lang="en">`,
    links: [
      { label: "WCAG 3.1.1 — Language of Page", url: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page" },
    ]
  },

  // ── Miscellaneous ─────────────────────────────────────────────────────────

  "blink": {
    label: "Blinking content on the page",
    why: "The <blink> element (and CSS text-decoration: blink) causes text to flash on and off. Blinking content can trigger seizures in users with photosensitive epilepsy, and is impossible to read for users with cognitive or attention disabilities. The element is deprecated and should never be used.",
    fix: `<!-- Before: blinking element -->
<blink>SALE — 50% off!</blink>

<!-- After: use a visible, static highlight instead -->
<strong class="sale-badge">SALE — 50% off!</strong>

<style>
  .sale-badge {
    background: #dc2626;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
  }
</style>

/* Also remove any CSS blink */
/* Before */
text-decoration: blink;

/* After: remove the property entirely */`,
    links: [
      { label: "WCAG 2.2.2 — Pause, Stop, Hide", url: "https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide" },
    ]
  },

  "marquee": {
    label: "Scrolling marquee content",
    why: "The <marquee> element creates automatically-scrolling text that users can't pause or stop. This violates WCAG — moving content that lasts more than 5 seconds must have a way to pause or stop it. It's also nearly impossible to read for users with cognitive disabilities or vestibular disorders.",
    fix: `<!-- Before: marquee -->
<marquee>Breaking news: important announcement scrolling here</marquee>

<!-- After: static text, or a proper ticker with pause controls -->
<div class="news-ticker" aria-live="polite">
  <p>Breaking news: important announcement</p>
  <button aria-label="Pause news ticker">Pause</button>
</div>`,
    links: [
      { label: "WCAG 2.2.2 — Pause, Stop, Hide", url: "https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide" },
    ]
  },

  "p-as-heading": {
    label: "Paragraph styled as a heading instead of using heading elements",
    why: "When sighted designers use bold or large <p> tags to visually mimic headings, screen reader users miss out. They navigate by jumping between real heading elements — a <p style='font-weight: bold'> is invisible to heading navigation. It looks like a heading but doesn't function as one.",
    fix: `<!-- Before: paragraph styled to look like a heading -->
<p style="font-size: 24px; font-weight: bold; margin-top: 2rem;">
  Section Title
</p>

<!-- After: use a real heading element and style it -->
<h2 class="section-title">Section Title</h2>

<style>
  .section-title {
    font-size: 24px;
    font-weight: bold;
    margin-top: 2rem;
  }
</style>

<!-- Choose the correct heading level based on document hierarchy,
     not based on visual size. Use CSS for the visual style. -->`,
    links: [
      { label: "WCAG 1.3.1 — Info and Relationships", url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships" },
      { label: "WCAG 2.4.6 — Headings and Labels", url: "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels" },
    ]
  },

  "presentation-role-conflict": {
    label: "Native semantics conflict with presentation role",
    why: "Adding role='presentation' or role='none' to a native HTML element removes its semantic meaning from screen readers. But if the element is focusable or has global ARIA attributes, browsers ignore the presentation role — the conflict causes inconsistent screen reader behavior across browsers.",
    fix: `<!-- Before: button with presentation role (conflict — button is focusable) -->
<button role="presentation">Click me</button>

<!-- After option 1: remove the role conflict — let button be a button -->
<button>Click me</button>

<!-- After option 2: use a div if you truly want a non-semantic element -->
<div tabindex="0" role="button" aria-label="Click me">Click me</div>

<!-- role="presentation" is valid for layout tables or decorative elements -->
<table role="presentation">  <!-- removes table semantics from a layout table -->
  <tr><td>...</td></tr>
</table>`,
    links: [
      { label: "WCAG 4.1.2 — Name, Role, Value", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
    ]
  },

  "keyboard": {
    label: "Interactive element not reachable by keyboard",
    why: "Any element a mouse user can click must also be reachable and operable by keyboard. Users who can't use a mouse — due to motor disabilities, preference, or broken hardware — are completely locked out of functionality that requires a mouse click.",
    fix: `<!-- Before: click handler on a non-interactive div -->
<div onclick="doSomething()">Click me</div>
<!-- This is invisible to keyboard users — Tab won't reach it -->

<!-- After option 1: use a native button (handles Tab + Enter/Space automatically) -->
<button onclick="doSomething()">Click me</button>

<!-- After option 2: if you must use a div, add tabindex and keyboard handler -->
<div
  tabindex="0"
  role="button"
  onclick="doSomething()"
  onkeydown="if(event.key==='Enter'||event.key===' ') doSomething()"
>
  Click me
</div>

// In React
<div
  tabIndex={0}
  role="button"
  onClick={doSomething}
  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && doSomething()}
>
  Click me
</div>`,
    links: [
      { label: "WCAG 2.1.1 — Keyboard", url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard" },
    ]
  },

};

// Fallback for rules without custom context
const fallback = {
  why: "This violation affects users who rely on assistive technology or who cannot use a mouse. Fixing it improves the experience for users with visual, motor, or cognitive disabilities.",
  fix: null,
  links: [],
};

export function getViolationContext(ruleId) {
  return context[ruleId] || fallback;
}

export default context;
