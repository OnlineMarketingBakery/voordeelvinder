// Scroll reveals (brief §6.1): sections and cards rise and fade in once, with a stagger.
// Content is visible by default. Elements are only hidden after this script has run, elements
// already on screen are never hidden (no flicker), and with reduced motion nothing happens.
//
// Markup: `data-reveal` on an element, or `data-reveal-stagger` on a parent to reveal its
// children one after another. A stagger group is decided and revealed as a whole, when the
// parent scrolls into view, so stacked rows on phones do not trickle in one by one.

const STAGGER_MS = 80;

function setup() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  // Observed element → the elements it reveals.
  const groups = new Map<Element, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => groups.set(el, [el]));
  document.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((parent) => {
    const children = [...parent.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    children.forEach((child, index) => {
      child.style.setProperty('--reveal-delay', `${index * STAGGER_MS}ms`);
    });
    groups.set(parent, children);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const el of groups.get(entry.target) ?? []) el.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  for (const [target, elements] of groups) {
    const { top } = target.getBoundingClientRect();
    if (top < window.innerHeight) continue; // already visible: leave it alone
    for (const el of elements) el.dataset.revealReady = '';
    observer.observe(target);
  }
}

setup();
