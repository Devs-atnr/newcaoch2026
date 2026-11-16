class CoachProductPage extends HTMLElement {
  connectedCallback() {
    this.data = this.readData();
    this.selected = (this.data.variants.find((variant) => String(variant.id) === this.querySelector('.js-variant-id')?.value) || this.data.variants[0] || {}).options?.slice() || [];
    this.bindGallery();
    this.bindOptions();
    this.prepareSelection();
    this.bindSizeGuide();
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
    const step = (direction) => {
      const thumb = list.querySelector('.coach-product__thumb');
      if (!thumb) return;
      const styles = getComputedStyle(list);
      const gap = parseFloat(styles.rowGap || styles.gap) || 8;
      const horizontal = styles.flexDirection === 'row';
      const amount = (horizontal ? thumb.offsetWidth : thumb.offsetHeight) + gap;
      list.scrollBy({
        top: horizontal ? 0 : amount * direction,
        left: horizontal ? amount * direction : 0,
        behavior: 'smooth',
      });
    };
    this.querySelector('.js-thumb-prev')?.addEventListener('click', () => step(-1));
    this.querySelector('.js-thumb-next')?.addEventListener('click', () => step(1));
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
        if (button.disabled || button.classList.contains('is-disabled') || button.classList.contains('is-unavailable')) return;
        const index = Number(button.dataset.optionIndex);
        this.selected[index] = button.dataset.value;
        this.querySelectorAll(`[data-option-index="${index}"]`).forEach((item) => {
          item.classList.toggle('is-active', item === button);
        });
        if (index === this.data.colorIndex) {
          const colorLabel = this.querySelector('.js-option-label');
          if (colorLabel) colorLabel.textContent = button.dataset.value;
          const overlay = this.querySelector('.js-color-label');
          if (overlay) overlay.textContent = button.dataset.value;
          this.renderThumbs(button.dataset.value);
        }
        this.querySelectorAll('.js-option-value').forEach((node) => {
          if (Number(node.dataset.forOption) === index) node.textContent = button.dataset.value;
        });
        this.applyVariant();
      });
    });
  }

  prepareSelection() {
    if (this.data.sizeIndex >= 0) {
      this.selected[this.data.sizeIndex] = null;
      const idInput = this.querySelector('.js-variant-id');
      if (idInput) idInput.value = '';
      this.querySelectorAll('.js-add, .js-buy-now').forEach((button) => { button.disabled = true; });
    }
    this.refreshAvailability();
  }

  optionAvailable(index, value) {
    return this.data.variants.some((variant) => {
      if (variant.options[index] !== value || !variant.available) return false;
      return variant.options.every((option, optionIndex) => {
        if (optionIndex === index) return true;
        if (optionIndex === this.data.sizeIndex) return true;
        return this.selected[optionIndex] == null || option === this.selected[optionIndex];
      });
    });
  }

  refreshAvailability() {
    this.querySelectorAll('[data-option-index]').forEach((button) => {
      const index = Number(button.dataset.optionIndex);
      if (index === this.data.colorIndex) {
        const available = this.data.variants.some((variant) => variant.options[index] === button.dataset.value && variant.available);
        button.classList.toggle('is-unavailable', !available);
        button.disabled = !available;
        return;
      }
      const available = this.optionAvailable(index, button.dataset.value);
      button.classList.toggle('is-disabled', !available);
      button.disabled = !available;
      if (!available && button.classList.contains('is-active')) {
        button.classList.remove('is-active');
        this.selected[index] = null;
        const label = this.querySelector(`.js-option-value[data-for-option="${index}"]`);
        if (label) label.textContent = 'Select a size';
      }
    });
  }

  findVariant() {
    if (this.selected.some((value) => value == null || value === '')) return null;
    return this.data.variants.find((item) => item.options.every((value, index) => value === this.selected[index])) || null;
  }

  applyVariant() {
    this.refreshAvailability();
    const variant = this.findVariant();
    const idInput = this.querySelector('.js-variant-id');
    const price = this.querySelector('.js-price-now');
    const compare = this.querySelector('.js-price-compare');
    if (!variant) {
      if (idInput) idInput.value = '';
      this.querySelectorAll('.js-add, .js-buy-now').forEach((button) => { button.disabled = true; });
      this.showColorImage();
      return;
    }
    if (idInput) idInput.value = variant.available ? variant.id : '';
    if (price) price.innerHTML = variant.price;
    if (compare) {
      compare.hidden = !variant.compare;
      compare.innerHTML = variant.compare || '';
    }
    const sku = this.querySelector('.js-sku');
    if (sku && variant.sku) sku.textContent = variant.sku;
    this.querySelectorAll('.js-add, .js-buy-now').forEach((button) => {
      button.disabled = !variant.available;
    });
    const stock = this.querySelector('.js-stock');
    if (stock) {
      const left = Number(variant.inventory);
      if (variant.tracked && left > 0 && left <= 10) {
        stock.hidden = false;
        stock.textContent = `ONLY ${left} ITEM(S) LEFT!`;
      } else {
        stock.hidden = true;
        stock.textContent = '';
      }
    }
    this.syncWishlist();
    if (variant.image) {
      const thumb = [...this.querySelectorAll('.coach-product__thumb')].find((button) => button.dataset.src === variant.image);
      this.showImage(variant.image, this.querySelector('.coach-product__title')?.textContent || '', thumb);
    }
  }

  showColorImage() {
    const colorIndex = this.data.colorIndex;
    const color = colorIndex >= 0 ? this.selected[colorIndex] : null;
    const variant = this.data.variants.find((item) => item.image && (!color || item.options[colorIndex] === color) && item.available)
      || this.data.variants.find((item) => item.image && (!color || item.options[colorIndex] === color));
    if (!variant?.image) return;
    const thumb = [...this.querySelectorAll('.coach-product__thumb')].find((button) => button.dataset.src === variant.image);
    this.showImage(variant.image, color || '', thumb);
  }

  renderThumbs(color) {
    const list = this.querySelector('.js-thumbs');
    const media = this.data.media || [];
    if (!list || !media.length || !color) return;
    const matched = media.filter((item) => (item.alt || '').toLowerCase().includes(String(color).toLowerCase()));
    const visible = matched.length ? matched : media;
    const current = this.querySelector('.js-main-image')?.src;
    const activeSrc = visible.some((item) => item.src === current) ? current : visible[0]?.src;
    list.innerHTML = visible.map((item) => `<button type="button" class="coach-product__thumb${item.src === activeSrc ? ' is-active' : ''}" data-src="${this.escape(item.src)}" data-alt="${this.escape(item.alt || '')}" aria-label="${this.escape(item.alt || 'Product image')}"><img src="${this.escape(item.thumb || item.src)}" alt="${this.escape(item.alt || '')}"></button>`).join('');
    list.scrollTo({ top: 0, left: 0 });
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
    const error = this.querySelector('.js-error');
    if (!id) {
      if (error) error.textContent = this.data.sizeIndex >= 0 ? 'Please select a size.' : 'Please select an available option.';
      return;
    }
    if (this.dataset.adding === 'true') return;
    this.dataset.adding = 'true';
    this.showLoader(true);
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

  bindSizeGuide() {
    const modal = this.querySelector('.coach-size-guide');
    if (!modal) return;
    this.querySelector('.js-size-guide')?.addEventListener('click', () => this.openSizeGuide());
    modal.querySelectorAll('.js-guide-close').forEach((button) => {
      button.addEventListener('click', () => this.closeSizeGuide());
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) this.closeSizeGuide();
    });
  }

  openSizeGuide() {
    const modal = this.querySelector('.coach-size-guide');
    if (!modal) return;
    const guide = this.buildSizeGuide();
    const title = modal.querySelector('.js-guide-title');
    const table = modal.querySelector('.js-guide-table');
    const note = modal.querySelector('.js-guide-note');
    if (title) title.textContent = guide.title;
    if (table) table.innerHTML = this.guideTable(guide);
    if (note) note.innerHTML = guide.note ? `<p>${this.escape(guide.note)}</p>` : '';
    modal.hidden = false;
    document.body.classList.add('coach-guide-open');
  }

  closeSizeGuide() {
    const modal = this.querySelector('.coach-size-guide');
    if (modal) modal.hidden = true;
    document.body.classList.remove('coach-guide-open');
  }

  buildSizeGuide() {
    const raw = this.normalizeGuide(this.data.sizeGuide);
    if (raw?.rows?.length) return raw;
    const category = this.sizeCategory();
    const sizes = this.sizeValues();
    const shoe = category.includes('shoe');
    const rows = shoe ? this.shoeRows(sizes, category) : [{ label: 'Size', values: sizes }];
    return {
      title: raw?.title || this.guideTitle(category),
      rows,
      note: raw?.note || (shoe
        ? 'Measurements can vary by style. Foot length is the length of the foot in millimetres.'
        : 'Size details for this product come from its options. Add the custom.size_guide metafield for a full chart.'),
    };
  }

  normalizeGuide(raw) {
    let guide = raw;
    if (typeof guide === 'string') {
      const trimmed = guide.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { guide = JSON.parse(trimmed); } catch (error) { return { note: trimmed }; }
      } else {
        return { note: trimmed };
      }
    }
    if (!guide || typeof guide !== 'object') return null;
    if (Array.isArray(guide.sizes) && !guide.rows) {
      guide.rows = [
        { label: 'US', values: guide.sizes.map((size) => size.us || size.US || '') },
        { label: 'UK', values: guide.sizes.map((size) => size.uk || size.UK || '') },
        { label: 'EU', values: guide.sizes.map((size) => size.eu || size.EU || '') },
        { label: 'Foot Length (mm)', values: guide.sizes.map((size) => size.mm || size.foot || size.footLength || '') },
      ];
    }
    return {
      title: guide.title || '',
      rows: Array.isArray(guide.rows) ? guide.rows : [],
      note: guide.note || guide.info || '',
    };
  }

  sizeValues() {
    if (this.data.sizeIndex < 0) return [];
    const values = new Set();
    this.data.variants.forEach((variant) => {
      const value = variant.options[this.data.sizeIndex];
      if (value) values.add(value);
    });
    return [...values];
  }

  sizeCategory() {
    const text = `${this.data.productType || ''} ${(this.data.tags || []).join(' ')} ${this.dataset.productTitle || ''}`.toLowerCase();
    const women = /women|woman|ladies|female/.test(text);
    const men = /\bmen\b|\bman\b|male/.test(text) && !women;
    const shoe = /shoe|sneaker|trainer|boot|loafer|sandal|footwear/.test(text);
    if (shoe && women) return 'women-shoes';
    if (shoe && men) return 'men-shoes';
    if (shoe) return 'shoes';
    if (women) return 'women';
    if (men) return 'men';
    return this.data.productType || 'general';
  }

  guideTitle(category) {
    const type = this.data.productType || '';
    if (category === 'women-shoes') return type ? `Women's ${type}` : "Women's Shoes";
    if (category === 'men-shoes') return type ? `Men's ${type}` : "Men's Shoes";
    if (category === 'shoes') return type || 'Shoes';
    if (category === 'women') return type ? `Women's ${type}` : "Women's Size Guide";
    if (category === 'men') return type ? `Men's ${type}` : "Men's Size Guide";
    return type || 'Size Guide';
  }

  shoeRows(sizes, category) {
    const women = category === 'women-shoes';
    const parsed = sizes.map((label) => {
      const usMatch = String(label).match(/[\d.]+/);
      const ukMatch = String(label).match(/UK\s*([\d.]+)/i);
      const us = usMatch ? Number(usMatch[0]) : NaN;
      if (!Number.isFinite(us)) return { label, us: label, uk: ukMatch ? ukMatch[1] : '', eu: '', mm: '' };
      const uk = ukMatch ? ukMatch[1] : this.formatSize(women ? us - 2 : us - 0.5);
      const eu = this.formatSize(women ? 35 + (us - 5) : 40 + (us - 7));
      const mm = String(Math.round((women ? 220 : 250) + ((women ? us - 5 : us - 7) * 8)));
      return { label, us: usMatch[0], uk, eu, mm };
    });
    return [
      { label: 'US', values: parsed.map((size) => size.us) },
      { label: 'UK', values: parsed.map((size) => size.uk) },
      { label: 'EU', values: parsed.map((size) => size.eu) },
      { label: 'Foot Length (mm)', values: parsed.map((size) => size.mm) },
    ];
  }

  formatSize(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  guideTable(guide) {
    const rows = guide.rows || [];
    return rows.map((row) => {
      const values = row.values || [];
      return `<tr><td>${this.escape(row.label || '')}</td>${values.map((value) => `<td>${this.escape(value)}</td>`).join('')}</tr>`;
    }).join('');
  }

  bindWishlist() {
    const button = this.querySelector('[data-wishlist]');
    this.syncWishlist();
    button?.addEventListener('click', () => {
      if (!window.CoachWishlist) return;
      const variantId = this.querySelector('.js-variant-id')?.value;
      const image = this.querySelector('.js-main-image')?.src || '';
      const price = this.querySelector('.js-price-now')?.textContent?.trim() || '';
      const saved = window.CoachWishlist.toggle({
        handle: this.dataset.productHandle,
        id: this.dataset.productId,
        variantId,
        title: this.dataset.productTitle,
        url: this.dataset.productUrl,
        image,
        price,
      });
      button.classList.toggle('is-on', saved);
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    });
    this.addEventListener('click', (event) => {
      const heart = event.target.closest('[data-wish-handle]');
      if (!heart || !window.CoachWishlist) return;
      event.preventDefault();
      event.stopPropagation();
      const saved = window.CoachWishlist.toggle({
        handle: heart.dataset.wishHandle,
        title: heart.dataset.wishTitle,
        url: heart.dataset.wishUrl,
        image: heart.dataset.wishImage,
        price: heart.dataset.wishPrice,
      });
      heart.classList.toggle('is-on', saved);
      heart.setAttribute('aria-pressed', saved ? 'true' : 'false');
    });
  }

  syncWishlist() {
    const button = this.querySelector('[data-wishlist]');
    if (!button || !window.CoachWishlist) return;
    const saved = window.CoachWishlist.has(this.dataset.productHandle);
    button.classList.toggle('is-on', saved);
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
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
      this.markSavedHearts(track);
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
      handle: product.handle,
      images: product.images || [],
      image: product.featured_image,
      price: product.price,
    })).join('');
    this.markSavedHearts(track);
    rail.hidden = false;
  }

  markSavedHearts(root) {
    if (!window.CoachWishlist) return;
    root.querySelectorAll('[data-wish-handle]').forEach((heart) => {
      const saved = window.CoachWishlist.has(heart.dataset.wishHandle);
      heart.classList.toggle('is-on', saved);
      heart.setAttribute('aria-pressed', saved ? 'true' : 'false');
    });
  }

  card(product) {
    const image = product.featured_image || product.image || (product.images && product.images[0]) || '';
    const src = typeof image === 'string' ? image : (image.src || '');
    const title = product.title || '';
    const url = product.url || '#';
    const handle = product.handle || '';
    const price = typeof product.price === 'number' ? '' : (product.price || '');
    return `<article class="coach-rail-card">
      <a class="coach-rail-card__link" href="${this.escape(url)}">
        <span class="coach-rail-card__media">
          ${src ? `<img src="${this.escape(src)}" alt="">` : ''}
        </span>
        <span class="coach-rail-card__title">${this.escape(title)}</span>
      </a>
      <button type="button" class="coach-rail-card__heart" aria-label="Wishlist" data-wish-handle="${this.escape(handle)}" data-wish-title="${this.escape(title)}" data-wish-url="${this.escape(url)}" data-wish-image="${this.escape(src)}" data-wish-price="${this.escape(price)}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M12 20.4s-7.6-4.5-9.3-9.4C1.6 7.7 3.6 4.4 7 4.4c2.1 0 3.6 1.2 5 3.1 1.4-1.9 2.9-3.1 5-3.1 3.4 0 5.4 3.3 4.3 6.6-1.7 4.9-9.3 9.4-9.3 9.4z"/></svg>
      </button>
    </article>`;
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
