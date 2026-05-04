export const TAB_ISSUE_GUIDANCE = {
  positiveTabindex: {
    title: "Positive tabindex breaks tab order",
    why: "Positive tabindex values (tabindex=\"1\", tabindex=\"2\", etc.) create a custom tab sequence that overrides the natural DOM order. This creates a confusing experience where elements jump around instead of flowing in order.",
    fix: `<!-- Never use positive tabindex values -->
<button tabindex="2">This causes problems</button>
<button tabindex="1">Tab order is now unpredictable</button>

<!-- Fix: Remove tabindex entirely -->
<button>First in DOM = first in tab order</button>
<button>Second in DOM = second in tab order</button>

<!-- Only two valid tabindex values:
  tabindex="0"  — adds element to natural tab order
  tabindex="-1" — removes from tab order, focusable by JS only -->
<div role="button" tabindex="0">Custom interactive element</div>`,
    links: [
      { label: "WCAG 2.4.3", url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order" },
      { label: "MDN: tabindex", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex" },
    ],
  },
  ariaHiddenFocusable: {
    title: "aria-hidden element receives keyboard focus",
    why: "aria-hidden=\"true\" hides an element from screen readers, but keyboard focus can still land on it. This creates invisible \"ghost\" focus stops — a keyboard user presses Tab but the screen reader says nothing. Very confusing.",
    fix: `<!-- Problem: hidden from AT but still keyboard focusable -->
<div aria-hidden="true">
  <button>Ghost button — keyboard reaches it, screen reader ignores it</button>
</div>

<!-- Fix 1: Add inert attribute to block all interaction -->
<div aria-hidden="true" inert>
  <button>Now fully hidden from both keyboard and AT</button>
</div>

<!-- Fix 2: Add tabindex="-1" to all focusable children -->
<div aria-hidden="true">
  <button tabindex="-1">No longer keyboard reachable</button>
</div>`,
    links: [
      { label: "WCAG 4.1.2", url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value" },
      { label: "MDN: inert", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert" },
    ],
  },
};

export function getIssueType(stop) {
  if (stop.isAriaHiddenFocusable) return "ariaHiddenFocusable";
  if (stop.hasPositiveTabindex)   return "positiveTabindex";
  return null;
}
