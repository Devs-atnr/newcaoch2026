(function () {
  if (window.CoachColNav) return;
  window.CoachColNav = true;

  const bindGrid = (grid) => {
    if (!grid || grid.dataset.loopReady === 'true') return;
    const cards = [...grid.children].filter((node) => node.classList.contains('coach-colnav__card'));
    if (cards.length < 2) return;

    const before = document.createDocumentFragment();
    const after = document.createDocumentFragment();
    cards.forEach((card) => {
      const previous = card.cloneNode(true);
      const next = card.cloneNode(true);
      previous.setAttribute('aria-hidden', 'true');
      next.setAttribute('aria-hidden', 'true');
      previous.querySelectorAll('a, button').forEach((node) => node.setAttribute('tabindex', '-1'));
      next.querySelectorAll('a, button').forEach((node) => node.setAttribute('tabindex', '-1'));
      before.appendChild(previous);
      after.appendChild(next);
    });
    grid.insertBefore(before, grid.firstChild);
    grid.appendChild(after);
    grid.dataset.loopReady = 'true';
    grid.classList.add('is-loop');

    const setWidth = () => grid.scrollWidth / 3;
    let jumping = false;
    const normalize = () => {
      if (jumping) return;
      const width = setWidth();
      if (width < 8) return;
      if (grid.scrollLeft < width * 0.5) {
        jumping = true;
        grid.scrollLeft += width;
        jumping = false;
      } else if (grid.scrollLeft > width * 1.5) {
        jumping = true;
        grid.scrollLeft -= width;
        jumping = false;
      }
    };

    grid.scrollLeft = setWidth();
    grid.addEventListener('scroll', normalize, { passive: true });

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;

    grid.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startLeft = grid.scrollLeft;
      grid.classList.add('is-dragging');
      grid.setPointerCapture(event.pointerId);
    });

    grid.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 4) moved = true;
      grid.scrollLeft = startLeft - delta;
    });

    const stopDrag = () => {
      dragging = false;
      grid.classList.remove('is-dragging');
    };
    grid.addEventListener('pointerup', stopDrag);
    grid.addEventListener('pointercancel', stopDrag);

    grid.addEventListener('click', (event) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }, true);

    grid.addEventListener('wheel', (event) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      grid.scrollLeft += delta;
    }, { passive: false });

    window.addEventListener('resize', () => {
      const width = setWidth();
      if (grid.scrollLeft < width * 0.5 || grid.scrollLeft > width * 1.5) grid.scrollLeft = width;
    });
  };

  const init = () => {
    document.querySelectorAll('.coach-colnav__grid').forEach(bindGrid);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
