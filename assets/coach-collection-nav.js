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

    let moved = false;
    let drag = null;

    grid.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      moved = false;
      drag = { x: event.clientX, left: grid.scrollLeft };
      grid.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      if (Math.abs(dx) > 4) moved = true;
      grid.scrollLeft = drag.left - dx;
    });

    window.addEventListener('mouseup', () => {
      drag = null;
      grid.classList.remove('is-dragging');
    });

    grid.addEventListener('click', (event) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }, true);

    const onWheel = (event) => {
      if (!section.contains(event.target)) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? grid.clientWidth : 1;
      grid.scrollLeft += delta * scale;
      if (event.cancelable) event.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });

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

  const bindScrollBar = (grid) => {
    if (!grid || grid.dataset.barReady === 'true') return;
    const section = grid.closest('.coach-colnav');
    if (!section) return;
    grid.dataset.barReady = 'true';

    const bar = document.createElement('div');
    bar.className = 'coach-colnav__bar';
    bar.hidden = true;
    const thumb = document.createElement('span');
    thumb.className = 'coach-colnav__bar-thumb';
    bar.appendChild(thumb);
    grid.insertAdjacentElement('afterend', bar);

    let hovering = false;
    let hideTimer = 0;

    const paint = () => {
      const max = grid.scrollWidth - grid.clientWidth;
      if (max < 8) {
        bar.hidden = true;
        bar.classList.remove('is-on');
        return false;
      }
      bar.hidden = false;
      const width = Math.max(16, (grid.clientWidth / grid.scrollWidth) * 100);
      const left = (grid.scrollLeft / max) * (100 - width);
      thumb.style.width = width + '%';
      thumb.style.left = left + '%';
      return true;
    };

    const show = () => {
      if (!paint()) return;
      clearTimeout(hideTimer);
      if (bar.classList.contains('is-on')) return;
      requestAnimationFrame(() => bar.classList.add('is-on'));
    };

    const hideLater = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!hovering) bar.classList.remove('is-on');
      }, 800);
    };

    section.addEventListener('mouseenter', () => {
      hovering = true;
      show();
    });
    section.addEventListener('mouseleave', () => {
      hovering = false;
      hideLater();
    });
    grid.addEventListener('pointerdown', () => {
      show();
    });
    grid.addEventListener('scroll', () => {
      show();
      hideLater();
    }, { passive: true });
    window.addEventListener('resize', paint);
    if (window.ResizeObserver) new ResizeObserver(paint).observe(grid);
    paint();
  };

  const init = () => {
    document.querySelectorAll('.coach-colnav.is-photos .coach-colnav__grid').forEach(bindGrid);
    document.querySelectorAll('.coach-colnav__grid').forEach(bindScrollBar);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
