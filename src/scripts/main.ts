import { initNavigation } from './navigation';
import { initSound } from './sound';

initNavigation();
initSound();

// GSAP is only downloaded when motion is allowed. It stays out of the way of first paint.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function loadMotion(): Promise<void> {
  try {
    const { startMotion } = await import('./motion');
    startMotion();
  } catch {
    // The page is complete without animation.
    document.documentElement.classList.remove('motion-pending');
  }
}

if (!reducedMotion.matches) void loadMotion();

reducedMotion.addEventListener('change', (event) => {
  if (!event.matches) void loadMotion();
});
