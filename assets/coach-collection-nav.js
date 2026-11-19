(function () {
  if (window.CoachColNav) return;
  window.CoachColNav = true;

  const bindGrid = (grid) => {
    if (!grid || grid.dataset.loopReady === 'true') return;
    const section = grid.closest('.coach-colnav');
    if (!section || !section.classList.contains('is-photos')) return;
    const cards = [...grid.children].filter((node) => node.classList.contains('coach-colnav__card'));
    if (cards.length < 2) return;

    grid.querySelectorAll('a, img').forEach((node) => node.setAttribute('draggable', 'false'));

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
    let placed = false;

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

    const place = () => {
      const width = setWidth();
      if (width < 8) return;
      if (placed && grid.scrollLeft > 8) return;
      jumping = true;
      grid.scrollLeft = width;
      jumping = false;
      placed = true;
    };

    place();
    requestAnimationFrame(place);
    window.addEventListener('load', place);
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(place);
      observer.observe(grid);
    }
    grid.addEventListener('scroll', normalize, { passive: true });

    let dragging = false;
    let moved = false;
    let axis = '';
    let startX = 0;
    let startY = 0;
    let startLeft = 0;

    grid.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.pointerType === 'mouse') event.preventDefault();
      dragging = true;
      moved = false;
      axis = '';
      startX = event.clientX;
      startY = event.clientY;
      startLeft = grid.scrollLeft;
    });

    grid.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') {
          dragging = false;
          return;
        }
        grid.classList.add('is-dragging');
        if (grid.setPointerCapture) grid.setPointerCapture(event.pointerId);
      }
      if (axis !== 'x') return;
      moved = true;
      grid.scrollLeft = startLeft - dx;
      if (event.cancelable) event.preventDefault();
    });

    const stopDrag = () => {
      dragging = false;
      axis = '';
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
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? grid.clientWidth : 1;
      grid.scrollLeft += delta * scale;
    }, { passive: false });

    window.addEventListener('resize', () => {
      const width = setWidth();
      if (width < 8) return;
      if (grid.scrollLeft < width * 0.5 || grid.scrollLeft > width * 1.5) {
        jumping = true;
        grid.scrollLeft = width;
        jumping = false;
      }
    });
  };

  const init = () => {
    document.querySelectorAll('.coach-colnav.is-photos .coach-colnav__grid').forEach(bindGrid);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
