/** Full-screen menu on narrow screens. Without JavaScript the links stay visible in the header. */
export function initNavigation(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu || !label) return;

  const background = document.querySelectorAll<HTMLElement>('main, footer');
  const narrow = window.matchMedia('(max-width: 47.99rem)');

  const setOpen = (open: boolean): void => {
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = (open ? toggle.dataset.closeText : toggle.dataset.openText) ?? '';
    menu.toggleAttribute('data-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    background.forEach((element) => {
      element.inert = open;
    });
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  menu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  });

  narrow.addEventListener('change', () => setOpen(false));

  // A page restored from the back/forward cache must not come back with the menu open.
  window.addEventListener('pageshow', () => setOpen(false));
}
