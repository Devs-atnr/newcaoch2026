class CoachProductPage extends HTMLElement {
  connectedCallback() {
    this.data = this.readData();
    this.selected = (this.data.variants.find((variant) => String(variant.id) === this.querySelector('.js-variant-id')?.value) || this.data.variants[0] || {}).options?.slice() || [];
    this.bindGallery();
    this.bindOptions();
    this.bindQty();
    this.bindForm();
    this.bindBagSize();
    this.bindWishlist();
    this.rememberView();
    this.loadAlso();
    this.loadRecent();
  }

  readData() {
    try {
      return JSON.parse(this.querySelector('.js-coach-product-data')?.textContent || '{}');
    } catch (error) {
      return { variants: [], options: [], colorIndex: -1 };
    }
  }

  bindGallery() {
    const list = this.querySelector('.js-thumbs');
    const main = this.querySelector('.js-main-image');
    if (!list || !main) return;
    list.addEventListener('click', (event) => {
      const button = event.target.closest('.coach-product__thumb');
      if (!button) return;
      this.showImage(button.dataset.src, button.dataset.alt, button);
    });
    this.querySelector('.js-thumb-prev')?.addEventListener('click', () => {
      list.scrollBy({ top: -80, left: -80, behavior: 'smooth' });
    });
    this.querySelector('.js-thumb-next')?.addEventListener('click', () => {
      list.scrollBy({ top: 80, left: 80, behavior: 'smooth' });
    });
  }

  showImage(src, alt, thumb) {
    const main = this.querySelector('.js-main-image');
    if (main && src) {
      main.src = src;
      if (alt) main.alt = alt;
    }
    this.querySelectorAll('.coach-product__thumb').forEach((button) => button.classList.toggle('is-active', button === thumb));
  }

  bindOptions() {
    this.querySelectorAll('[data-option-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.optionIndex);
        this.selected[index] = button.dataset.value;
        this.querySelectorAll(`[data-option-index="${index}"]`).forEach((item) => {
          item.classList.toggle('is-active', item === button);
        });
        const label = button.closest('.coach-product__info')?.querySelectorAll('.js-option-label')[this.data.colorIndex === index ? 0 : -1];
        if (index === this.data.colorIndex) {
          this.querySelectorAll('.js-option-label').forEach((node, nodeIndex) => {
            if (nodeIndex === 0) node.textContent = button.dataset.value;
          });
          const overlay = this.querySelector('.js-color-label');
          if (overlay) overlay.textContent = button.dataset.value;
        }
        this.applyVariant();
      });
    });
  }

  applyVariant() {
    const variant = this.data.variants.find((item) => item.options.every((value, index) => value === this.selected[index]));
    if (!variant) return;
    const idInput = this.querySelector('.js-variant-id');
    if (idInput) idInput.value = variant.id;
    const price = this.querySelector('.js-price');
    if (price) price.innerHTML = variant.price;
    const sku = this.querySelector('.js-sku');
    if (sku && variant.sku) sku.textContent = variant.sku;
    this.querySelectorAll('.js-add, .js-buy-now').forEach((button) => {
      button.disabled = !variant.available;
    });
    if (variant.image) {
      const thumb = [...this.querySelectorAll('.coach-product__thumb')].find((button) => button.dataset.src === variant.image);
      this.showImage(variant.image, this.querySelector('.coach-product__title')?.textContent || '', thumb);
    }
  }

  bindQty() {
    const input = this.querySelector('.js-qty-input');
    this.querySelectorAll('.js-qty').forEach((button) => {
      button.addEventListener('click', () => {
        const next = Math.max(1, Number(input.value || 1) + Number(button.dataset.step));
        input.value = String(next);
      });
    });
  }

  bindForm() {
    const form = this.querySelector('.js-product-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.addToCart(false);
    });
    this.querySelector('.js-buy-now')?.addEventListener('click', () => this.addToCart(true));
  }

  async addToCart(checkout) {
    const id = this.querySelector('.js-variant-id')?.value;
    const quantity = Number(this.querySelector('.js-qty-input')?.value || 1);
    if (!id || this.dataset.adding === 'true') return;
    this.dataset.adding = 'true';
    this.showLoader(true);
    const error = this.querySelector('.js-error');
    if (error) error.textContent = '';
    try {
      const response = await fetch((window.routes && window.routes.cart_add_url) || '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: parseInt(id, 10), quantity }] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.description || data.message || 'Could not add this product to your bag.');
      await this.updateCount();
      this.showLoader(false);
      if (checkout) {
        window.location.href = '/checkout';
        return;
      }
      if (window.CoachMiniBag?.open) await window.CoachMiniBag.open();
    } catch (err) {
      if (error) error.textContent = err.message;
    } finally {
      this.dataset.adding = 'false';
      this.showLoader(false);
    }
  }

  async updateCount() {
    const response = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const cart = await response.json();
    document.querySelectorAll('.coach-bag__count').forEach((node) => {
      node.textContent = cart.item_count < 100 ? String(cart.item_count) : '99+';
      node.hidden = false;
      node.classList.toggle('is-empty', cart.item_count === 0);
    });
  }

  showLoader(active) {
    let loader = document.querySelector('.coach-page-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'coach-page-loader';
      loader.innerHTML = '<span class="coach-page-loader__spin"></span>';
      document.body.appendChild(loader);
    }
    loader.classList.toggle('is-active', active);
  }

  bindBagSize() {
    const modal = this.querySelector('.coach-product__modal');
    if (!modal) return;
    this.querySelector('.js-bag-size')?.addEventListener('click', () => { modal.hidden = false; });
    modal.querySelectorAll('.js-bag-size-close').forEach((button) => {
      button.addEventListener('click', () => { modal.hidden = true; });
    });
  }

  bindWishlist() {
    this.querySelector('[data-wishlist]')?.addEventListener('click', (event) => {
      event.currentTarget.classList.toggle('is-on');
    });
  }

  rememberView() {
    const handle = this.dataset.productHandle;
    if (!handle) return;
    try {
      const key = 'coach-recently-viewed';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const handles = [handle, ...current.filter((item) => item !== handle)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(handles));
    } catch (error) {
      /* ignore storage failures */
    }
  }

  async loadAlso() {
    const track = this.querySelector('.js-also');
    const rail = this.querySelector('[data-rail="also"]');
    if (!track) return;
    try {
      const response = await fetch(`/recommendations/products.json?product_id=${this.dataset.productId}&limit=8`);
      if (!response.ok) throw new Error('recommendations');
      const data = await response.json();
      const products = (data.products || []).filter((product) => product.handle !== this.dataset.productHandle);
      if (!products.length) {
        rail.hidden = true;
        return;
      }
      track.innerHTML = products.map((product) => this.card(product)).join('');
      this.querySelector('.js-also-next')?.addEventListener('click', () => {
        track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });
      });
    } catch (error) {
      if (rail) rail.hidden = true;
    }
  }

  async loadRecent() {
    const track = this.querySelector('.js-recent');
    const rail = this.querySelector('[data-rail="recent"]');
    if (!track || !rail) return;
    let handles = [];
    try {
      handles = JSON.parse(localStorage.getItem('coach-recently-viewed') || '[]')
        .filter((handle) => handle && handle !== this.dataset.productHandle)
        .slice(0, 4);
    } catch (error) {
      handles = [];
    }
    if (!handles.length) return;
    const products = (await Promise.all(handles.map(async (handle) => {
      try {
        const response = await fetch(`/products/${encodeURIComponent(handle)}.js`);
        return response.ok ? response.json() : null;
      } catch (error) {
        return null;
      }
    }))).filter(Boolean);
    if (!products.length) return;
    track.innerHTML = products.map((product) => this.card({
      title: product.title,
      url: product.url,
      images: product.images || [],
      image: product.featured_image,
    })).join('');
    rail.hidden = false;
  }

  card(product) {
    const image = product.featured_image || product.image || (product.images && product.images[0]) || '';
    const src = typeof image === 'string' ? image : (image.src || '');
    const title = product.title || '';
    const url = product.url || '#';
    return `<a class="coach-rail-card" href="${this.escape(url)}">
      <span class="coach-rail-card__media">
        ${src ? `<img src="${this.escape(src)}" alt="">` : ''}
        <span class="coach-rail-card__heart" aria-hidden="true">♡</span>
      </span>
      <span class="coach-rail-card__title">${this.escape(title)}</span>
    </a>`;
  }

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

if (!customElements.get('coach-product-page')) {
  customElements.define('coach-product-page', CoachProductPage);
}
