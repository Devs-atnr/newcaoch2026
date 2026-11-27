(() => {
  const bind = (root) => {
    if (!root || root.dataset.bound === 'true') return;
    const track = root.querySelector('[data-uk-track]');
    const slides = [...root.querySelectorAll('[data-uk-slide]')];
    if (!track || slides.length < 2) return;
    root.dataset.bound = 'true';

    let index = 0;
    const dots = [...root.querySelectorAll('[data-uk-dot]')];
    const go = (next) => {
      index = (next + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    };

    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-uk-prev]')) go(index - 1);
      if (event.target.closest('[data-uk-next]')) go(index + 1);
    });
    dots.forEach((dot) => dot.addEventListener('click', () => go(Number(dot.dataset.ukDot))));

    let startX = 0;
    root.addEventListener('touchstart', (event) => {
      startX = event.changedTouches[0].clientX;
    }, { passive: true });
    root.addEventListener('touchend', (event) => {
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
    }, { passive: true });

    const delay = Number(root.dataset.autoplay) || 0;
    if (delay > 0) {
      setInterval(() => {
        if (!root.matches(':hover')) go(index + 1);
      }, delay);
    }
  };

  document.querySelectorAll('[data-uk-hero]').forEach(bind);
  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-uk-hero]').forEach((root) => {
      root.dataset.bound = '';
      bind(root);
    });
  });
})();
