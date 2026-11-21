import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const MOTION_OK_WIDE = `${MOTION_OK} and (min-width: 48rem)`;

let controller: gsap.MatchMedia | null = null;

function revealHero(): void {
  const root = document.documentElement;
  const hero = document.querySelector('[data-hero]');
  // Past the head script's timeout the hero is already on screen, so it must not be hidden again.
  const stillHidden = root.classList.contains('motion-pending');
  if (!hero || !stillHidden) {
    root.classList.remove('motion-pending');
    return;
  }

  const q = gsap.utils.selector(hero);
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // The word stands up first, then the two Ts complete the name.
  timeline
    .from(q('[data-hero-letter]'), { y: 150, opacity: 0, duration: 0.8, stagger: 0.09 }, 0.1)
    .from(q('[data-hero-slit]'), { scaleY: 0, transformOrigin: 'center top', duration: 0.45, stagger: 0.05 }, 0.95)
    .from(q('[data-hero-bar]'), { scaleX: 0, transformOrigin: 'left center', duration: 0.6, stagger: 0.07, ease: 'power2.inOut' }, 0.95)
    .from(q('[data-hero-stripe]'), { scaleY: 0, transformOrigin: 'center top', duration: 0.6, stagger: 0.025 }, 1.3)
    .from(q('[data-hero-root]'), { scaleY: 0, transformOrigin: 'center top', duration: 0.55, stagger: 0.02 }, 1.35);

  // from() has already applied the start state, so the hero can be shown without a flash.
  root.classList.remove('motion-pending');
}

function revealOnScroll(): void {
  gsap.utils.toArray<HTMLElement>('[data-rule]').forEach((element) => {
    gsap.from(element, {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: { trigger: element, start: 'top 94%', once: true },
    });
  });

  gsap.utils.toArray<HTMLElement>('[data-fade]').forEach((element) => {
    gsap.from(element, {
      opacity: 0,
      y: 16,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: element, start: 'top 92%', once: true },
    });
  });

  const cards = gsap.utils.toArray<HTMLElement>('[data-card]');
  if (cards.length) {
    gsap.set(cards, { opacity: 0, y: 28 });
    ScrollTrigger.batch(cards, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }),
    });
  }
}

/** Scrubbed movement, wide screens only: the big word drifts. */
function driftWithScroll(): void {
  gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((element) => {
    const distance = Number(element.dataset.drift);
    gsap.fromTo(
      element,
      { xPercent: -distance },
      {
        xPercent: distance,
        ease: 'none',
        scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      },
    );
  });
}

/**
 * Safe to call repeatedly: earlier animations and ScrollTriggers are reverted first, so nothing is
 * registered twice. gsap.matchMedia also reverts everything when reduced motion is turned on.
 */
export function startMotion(): void {
  stopMotion();
  controller = gsap.matchMedia();
  controller.add(MOTION_OK, () => {
    revealHero();
    revealOnScroll();
  });
  controller.add(MOTION_OK_WIDE, driftWithScroll);
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export function stopMotion(): void {
  controller?.revert();
  controller = null;
}

// Pages kept in the back/forward cache stay as they are. Anything else is torn down on the way out.
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) stopMotion();
});
