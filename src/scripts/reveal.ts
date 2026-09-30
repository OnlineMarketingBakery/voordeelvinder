// Scroll reveals (brief §6.1): sections and cards rise and fade in once, with a stagger.
// Content is visible by default. Elements are only hidden after this script has run, elements
// already on screen are never hidden (no flicker), and with reduced motion nothing happens.
//
// Markup: `data-reveal` on an element, or `data-reveal-stagger` on a parent to reveal its
// children one after another.

const STAGGER_MS = 80;

function setup() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const targets = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => targets.add(el));
  document.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((parent) => {
    [...parent.children].forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.setProperty('--reveal-delay', `${index * STAGGER_MS}ms`);
      targets.add(child);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  for (const el of targets) {
    const { top } = el.getBoundingClientRect();
    if (top < window.innerHeight) continue; // already visible: leave it alone
    el.dataset.revealReady = '';
    observer.observe(el);
  }
}

setup();
