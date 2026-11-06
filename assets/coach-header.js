/* Coach header: mega menu, predictive search, mobile drawer, language dropdown, sticky behaviour. */
(() => {
  if (customElements.get('coach-header')) return;

  const DESKTOP = window.matchMedia('(min-width: 990px)');
  const HOVER_OPEN_DELAY = 90;
  const HOVER_CLOSE_DELAY = 160;
  const L2_INTENT_DELAY = 110;

  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  /* ------------------------------------------------------------------ */
  /* Predictive search                                                   */
  /* ------------------------------------------------------------------ */
  class CoachSearch extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('[data-search-input]');
      this.panel = this.querySelector('[data-search-panel]');
      this.results = this.querySelector('[data-search-results]');
      this.defaultResults = this.querySelector('[data-search-default]');
      this.defaultList = this.querySelector('[data-default-list]');
      this.defaultUrl = this.defaultResults?.dataset.url || '';
      this.clearButton = this.querySelector('[data-search-clear]');
      if (!this.input || !this.panel) return;

      this.sectionId = this.dataset.section || 'coach-predictive-search';
      this.limit = parseInt(this.dataset.limit, 10) || 4;
      this.cache = new Map();
      this.isDrawer = this.classList.contains('coach-search--drawer');

      this.onInput = debounce(this.onInput.bind(this), 250);
      this.onDocumentClick = this.onDocumentClick.bind(this);

      this.input.addEventListener('input', () => {
        this.toggleClear();
        this.onInput();
      });
      this.input.addEventListener('focus', () => this.onFocus());
      this.clearButton?.addEventListener('click', () => {
        this.input.value = '';
        this.toggleClear();
        this.results.innerHTML = '';
        this.input.focus();
        this.showDefault();
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.isOpen) {
          event.stopPropagation();
          if (this.isDrawer) {
            this.reset();
            this.closest('[data-drawer-panel]')?.focus();
          } else {
            this.close();
            this.input.focus();
          }
        }
      });
      this.querySelector('form')?.addEventListener('submit', (event) => {
        if (!this.input.value.trim()) event.preventDefault();
      });
      document.addEventListener('click', this.onDocumentClick);
      this.toggleClear();
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.onDocumentClick);
    }

    get isOpen() {
      return !this.panel.hidden;
    }

    get query() {
      return this.input.value.trim();
    }

    toggleClear() {
      if (this.clearButton) this.clearButton.hidden = this.query.length === 0;
    }

    onFocus() {
      if (this.query) {
        this.open();
        if (!this.results.innerHTML.trim()) this.fetchResults(this.query);
      } else {
        this.showDefault();
      }
    }

    onInput() {
      if (!this.query) {
        this.results.innerHTML = '';
        this.showDefault();
        return;
      }
      if (this.defaultResults) this.defaultResults.hidden = true;
      this.open();
      this.fetchResults(this.query);
    }

    /* Products shown before typing: a chosen collection, or the store's best sellers loaded on demand.
       The drawer always switches to its search screen, even with nothing to show yet. */
    showDefault() {
      const hasDefault = this.prepareDefault();
      if (this.defaultResults) this.defaultResults.hidden = !hasDefault;
      if (hasDefault || this.isDrawer) this.open();
      else this.close();
    }

    prepareDefault() {
      if (!this.defaultResults || !this.defaultList) return false;
      if (this.defaultList.querySelector('li')) return true;
      if (!this.defaultUrl || this.defaultFailed) return false;
      if (!this.defaultLoading) this.loadDefault();
      return true;
    }

    async loadDefault() {
      this.defaultLoading = true;
      try {
        const response = await fetch(this.defaultUrl);
        if (!response.ok) throw new Error(response.status);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const items = [...doc.querySelectorAll('.coach-search-results__item')].slice(0, this.limit);
        if (!items.length) throw new Error('no products');
        const list = document.createElement('ul');
        list.className = 'coach-search-results__grid';
        list.setAttribute('role', 'list');
        items.forEach((item) => list.appendChild(document.importNode(item, true)));
        this.defaultList.replaceChildren(list);
      } catch (error) {
        this.defaultFailed = true;
        this.defaultResults.hidden = true;
        if (!this.query && !this.isDrawer) this.close();
      } finally {
        this.defaultLoading = false;
      }
    }

    reset() {
      this.abortController?.abort();
      this.input.value = '';
      this.results.innerHTML = '';
      this.toggleClear();
      this.close();
    }

    async fetchResults(term) {
      const key = term.toLowerCase();
      if (this.cache.has(key)) {
        this.renderResults(this.cache.get(key));
        return;
      }

      this.abortController?.abort();
      this.abortController = new AbortController();
      this.classList.add('is-loading');

      const base = (window.routes && window.routes.predictive_search_url) || '/search/suggest';
      const params = new URLSearchParams({
        q: term,
        'resources[type]': 'product',
        'resources[limit]': String(this.limit),
        'resources[options][unavailable_products]': 'last',
        section_id: this.sectionId,
      });

      try {
        const response = await fetch(`${base}?${params.toString()}`, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(response.status);
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const html = (doc.getElementById(`shopify-section-${this.sectionId}`) || doc.body).innerHTML;
        this.cache.set(key, html);
        if (term === this.query) this.renderResults(html);
      } catch (error) {
        if (error.name !== 'AbortError') this.results.innerHTML = '';
      } finally {
        this.classList.remove('is-loading');
      }
    }

    renderResults(html) {
      if (this.defaultResults) this.defaultResults.hidden = true;
      this.results.innerHTML = html;
    }

    open() {
      if (this.isOpen) return;
      this.panel.hidden = false;
      this.input.setAttribute('aria-expanded', 'true');
      this.dispatchEvent(new CustomEvent('coach-search:toggle', { bubbles: true, detail: { open: true } }));
    }

    close() {
      if (!this.isOpen) return;
      this.panel.hidden = true;
      this.input.setAttribute('aria-expanded', 'false');
      this.dispatchEvent(new CustomEvent('coach-search:toggle', { bubbles: true, detail: { open: false } }));
    }

    onDocumentClick(event) {
      if (this.isDrawer || !this.isOpen) return;
      if (!this.contains(event.target)) this.close();
    }
  }

  customElements.define('coach-search', CoachSearch);

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  class CoachHeader extends HTMLElement {
    connectedCallback() {
      this.section = this.closest('.shopify-section') || this.parentElement;
      this.drawer = this.querySelector('[data-drawer]');
      this.drawerPanel = this.querySelector('[data-drawer-panel]');
      this.navItems = [...this.querySelectorAll('[data-nav-item]')];
      this.openItem = null;

      this.onKeydown = this.onKeydown.bind(this);
      this.onDocumentClick = this.onDocumentClick.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onBreakpoint = this.onBreakpoint.bind(this);
      this.onBlockSelect = this.onBlockSelect.bind(this);
      this.onBlockDeselect = this.onBlockDeselect.bind(this);

      this.initMegaMenu();
      this.initDrawer();
      this.initCartMirror();
      this.initLanguage();
      this.initHeightTracking();
      this.initSticky();

      this.addEventListener('coach-search:toggle', (event) => {
        const inDrawer = event.target.closest('[data-drawer]');
        if (inDrawer) {
          this.drawer.classList.toggle('is-searching', event.detail.open);
        } else {
          this.classList.toggle('is-searching', event.detail.open);
          if (event.detail.open) this.closeMega();
        }
      });

      document.addEventListener('keydown', this.onKeydown);
      document.addEventListener('click', this.onDocumentClick);
      DESKTOP.addEventListener('change', this.onBreakpoint);
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('shopify:block:deselect', this.onBlockDeselect);
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this.onKeydown);
      document.removeEventListener('click', this.onDocumentClick);
      window.removeEventListener('scroll', this.onScroll);
      DESKTOP.removeEventListener('change', this.onBreakpoint);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('shopify:block:deselect', this.onBlockDeselect);
      this.resizeObserver?.disconnect();
      this.cartObserver?.disconnect();
      this.unlockScroll();
      this.section?.classList.remove('coach-is-overlaying');
    }

    /* ---------- Mega menu ---------- */
    initMegaMenu() {
      this.navItems.forEach((item) => {
        const mega = item.querySelector('[data-mega]');
        const toggle = item.querySelector('[data-mega-toggle]');
        if (!mega) {
          item.addEventListener('mouseenter', () => {
            if (DESKTOP.matches) this.scheduleOpen(null);
          });
          return;
        }

        item.addEventListener('mouseenter', () => {
          if (!DESKTOP.matches) return;
          this.scheduleOpen(item);
        });
        item.addEventListener('mouseleave', () => {
          if (!DESKTOP.matches) return;
          this.scheduleClose();
        });

        toggle?.addEventListener('click', () => {
          if (this.openItem === item) {
            this.closeMega();
          } else {
            this.openMega(item);
            item.querySelector('.coach-mega__l2-link')?.focus();
          }
        });

        item.addEventListener('focusout', (event) => {
          if (!item.contains(event.relatedTarget) && this.openItem === item) this.closeMega();
        });

        mega.querySelectorAll('.coach-mega__l2-item').forEach((l2) => {
          l2.addEventListener('mouseenter', () => {
            clearTimeout(this.l2Timer);
            this.l2Timer = setTimeout(() => this.setActiveL2(item, l2), L2_INTENT_DELAY);
          });
          l2.addEventListener('mouseleave', () => clearTimeout(this.l2Timer));
          l2.addEventListener('focusin', () => {
            clearTimeout(this.l2Timer);
            this.setActiveL2(item, l2);
          });
        });
      });
    }

    scheduleOpen(item) {
      clearTimeout(this.closeTimer);
      clearTimeout(this.openTimer);
      const delay = this.openItem ? 40 : HOVER_OPEN_DELAY;
      this.openTimer = setTimeout(() => {
        if (item) this.openMega(item);
        else this.closeMega();
      }, delay);
    }

    scheduleClose() {
      clearTimeout(this.openTimer);
      clearTimeout(this.closeTimer);
      this.closeTimer = setTimeout(() => this.closeMega(), HOVER_CLOSE_DELAY);
    }

    openMega(item) {
      clearTimeout(this.closeTimer);
      if (this.openItem === item) return;
      if (this.openItem) this.closeMega();
      if (this.classList.contains('is-searching')) {
        this.querySelectorAll('coach-search').forEach((search) => search.close?.());
      }
      this.openItem = item;
      item.classList.add('is-open');
      item.querySelector('[data-mega-toggle]')?.setAttribute('aria-expanded', 'true');
      this.resetL2(item);
    }

    closeMega() {
      clearTimeout(this.openTimer);
      clearTimeout(this.l2Timer);
      if (!this.openItem) return;
      const item = this.openItem;
      item.classList.remove('is-open');
      item.querySelector('[data-mega-toggle]')?.setAttribute('aria-expanded', 'false');
      this.openItem = null;
    }

    resetL2(item) {
      item.querySelectorAll('.coach-mega__l2-item.is-active').forEach((el) => el.classList.remove('is-active'));
      this.showMedia(item, '0');
      this.fitColumns(item, null);

    }

    setActiveL2(item, l2) {
      if (l2.classList.contains('is-active')) return;
      item.querySelectorAll('.coach-mega__l2-item.is-active').forEach((el) => el.classList.remove('is-active'));
      l2.classList.add('is-active');
      this.showMedia(item, l2.dataset.l2);
      this.fitColumns(item, l2);
    }

    /* The third-level column is positioned beside the list, so grow the panel when it is taller */
    fitColumns(item, l2) {
      const lists = item.querySelector('.coach-mega__lists');
      if (!lists) return;
      lists.style.minHeight = '';
      const l3 = l2 && l2.querySelector('.coach-mega__l3');
      if (!l3) return;
      const padding = parseFloat(getComputedStyle(lists).paddingBottom) || 0;
      const needed = l3.getBoundingClientRect().bottom - lists.getBoundingClientRect().top + padding;
      if (needed > lists.offsetHeight) lists.style.minHeight = `${Math.ceil(needed)}px`;
    }

    showMedia(item, index) {
      const media = [...item.querySelectorAll('[data-media]')];
      if (!media.length) return;
      const target = media.find((el) => el.dataset.media === index) || media.find((el) => el.dataset.media === '0');
      media.forEach((el) => {
        el.hidden = el !== target;
      });
    }

    /* Theme editor: open the menu that contains the selected "Menu image" block */
    onBlockSelect(event) {
      if (!this.contains(event.target)) return;
      const media = event.target.closest('[data-media]');
      const item = media?.closest('[data-nav-item]');
      if (!item) return;
      this.editorPinned = true;
      this.openMega(item);
      const index = media.dataset.media;
      const l2 = item.querySelector(`.coach-mega__l2-item[data-l2="${index}"]`);
      if (l2) this.setActiveL2(item, l2);
      else this.showMedia(item, index);
    }

    onBlockDeselect(event) {
      if (!this.contains(event.target)) return;
      this.editorPinned = false;
      this.closeMega();
    }

    /* ---------- Drawer ---------- */
    initDrawer() {
      if (!this.drawer) return;

      this.querySelectorAll('[data-drawer-open]').forEach((button) => {
        button.addEventListener('click', () => this.openDrawer(button, button.hasAttribute('data-drawer-search')));
      });
      this.drawer.querySelectorAll('[data-drawer-close]').forEach((button) => {
        button.addEventListener('click', () => this.closeDrawer());
      });

      this.drawerSearch = this.drawer.querySelector('coach-search');
      this.drawer.querySelector('[data-search-back]')?.addEventListener('click', () => {
        this.drawerSearch?.reset();
        this.drawerPanel.focus();
      });

      const tabs = [...this.drawer.querySelectorAll('[role="tab"]')];
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => this.selectTab(tabs, tab));
        tab.addEventListener('keydown', (event) => {
          const rtl = this.getAttribute('dir') === 'rtl';
          let next = null;
          if (event.key === 'ArrowRight') next = tabs[(i + (rtl ? -1 : 1) + tabs.length) % tabs.length];
          if (event.key === 'ArrowLeft') next = tabs[(i + (rtl ? 1 : -1) + tabs.length) % tabs.length];
          if (event.key === 'Home') next = tabs[0];
          if (event.key === 'End') next = tabs[tabs.length - 1];
          if (next) {
            event.preventDefault();
            this.selectTab(tabs, next);
            next.focus();
          }
        });
      });

      this.drawer.querySelectorAll('[data-accordion-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          const expanded = button.getAttribute('aria-expanded') === 'true';
          button.setAttribute('aria-expanded', String(!expanded));
          const list = document.getElementById(button.getAttribute('aria-controls'));
          if (list) list.hidden = expanded;
        });
      });
    }

    selectTab(tabs, active) {
      tabs.forEach((tab) => {
        const selected = tab === active;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panel.hidden = !selected;
      });
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    openDrawer(trigger, focusSearch) {
      this.drawerTrigger = trigger;
      this.closeMega();
      this.section?.classList.add('coach-is-overlaying');
      this.drawer.classList.add('is-open');
      this.querySelectorAll('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
      this.lockScroll();

      const searchInput = this.drawer.querySelector('[data-search-input]');
      const focusTarget = focusSearch && searchInput ? searchInput : this.drawerPanel;
      requestAnimationFrame(() => {
        if (typeof window.trapFocus === 'function') window.trapFocus(this.drawerPanel, focusTarget);
        else focusTarget.focus();
      });
    }

    closeDrawer() {
      if (!this.drawer?.classList.contains('is-open')) return;
      this.drawer.classList.remove('is-open');
      this.closeLanguage(false);
      setTimeout(() => this.drawerSearch?.reset(), 300);
      this.querySelectorAll('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      this.unlockScroll();
      setTimeout(() => this.section?.classList.remove('coach-is-overlaying'), 300);
      if (typeof window.removeTrapFocus === 'function') window.removeTrapFocus(this.drawerTrigger);
      else this.drawerTrigger?.focus();
    }

    lockScroll() {
      document.body.classList.add('overflow-hidden');
    }

    unlockScroll() {
      document.body.classList.remove('overflow-hidden');
    }

    onBreakpoint() {
      if (DESKTOP.matches) this.closeDrawer();
      else this.closeMega();
      this.updateHeight();
    }

    /* ---------- Mobile bag ---------- */
    initCartMirror() {
      const source = document.getElementById('cart-icon-bubble');
      const mirrors = [...this.querySelectorAll('[data-cart-mirror]')];
      if (!source || !mirrors.length) return;
      const sync = () => mirrors.forEach((mirror) => (mirror.innerHTML = source.innerHTML));
      this.cartObserver = new MutationObserver(sync);
      this.cartObserver.observe(source, { childList: true, subtree: true, characterData: true });
      mirrors.forEach((mirror) =>
        mirror.addEventListener('click', (event) => {
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer && typeof cartDrawer.open === 'function') {
            event.preventDefault();
            cartDrawer.open(mirror);
          }
        })
      );
    }

    /* ---------- Language dropdown ---------- */
    initLanguage() {
      this.querySelectorAll('[data-lang-switcher]').forEach((wrapper) => {
        const toggle = wrapper.querySelector('[data-lang-toggle]');
        const list = wrapper.querySelector('[data-lang-list]');
        if (!toggle || !list) return;
        toggle.addEventListener('click', () => {
          const open = toggle.getAttribute('aria-expanded') === 'true';
          this.setLanguageOpen(toggle, list, !open);
          if (!open) list.querySelector('button')?.focus();
        });
        wrapper.addEventListener('focusout', (event) => {
          if (!wrapper.contains(event.relatedTarget)) this.setLanguageOpen(toggle, list, false);
        });
      });
    }

    setLanguageOpen(toggle, list, open) {
      toggle.setAttribute('aria-expanded', String(open));
      list.hidden = !open;
    }

    closeLanguage(returnFocus) {
      this.querySelectorAll('[data-lang-switcher]').forEach((wrapper) => {
        const toggle = wrapper.querySelector('[data-lang-toggle]');
        const list = wrapper.querySelector('[data-lang-list]');
        if (toggle && list && !list.hidden) {
          this.setLanguageOpen(toggle, list, false);
          if (returnFocus) toggle.focus();
        }
      });
    }

    /* ---------- Global handlers ---------- */
    onKeydown(event) {
      if (event.key !== 'Escape') return;
      if (this.drawer?.classList.contains('is-open')) {
        this.closeDrawer();
        return;
      }
      if (this.openItem) {
        const item = this.openItem;
        const hadFocus = item.contains(document.activeElement);
        this.closeMega();
        if (hadFocus) item.querySelector('.coach-nav__link')?.focus();
      }
      this.closeLanguage(true);
    }

    onDocumentClick(event) {
      if (!this.contains(event.target) && !this.editorPinned) this.closeMega();
      this.querySelectorAll('[data-lang-switcher]').forEach((wrapper) => {
        if (wrapper.contains(event.target)) return;
        const toggle = wrapper.querySelector('[data-lang-toggle]');
        const list = wrapper.querySelector('[data-lang-list]');
        if (toggle && list && !list.hidden) this.setLanguageOpen(toggle, list, false);
      });
    }

    /* ---------- Height + sticky ---------- */
    initHeightTracking() {
      this.updateHeight = () => {
        const height = this.section ? this.section.offsetHeight : this.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      };
      this.updateHeight();
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.updateHeight());
        this.resizeObserver.observe(this.querySelector('.coach-header__bar') || this);
      }
    }

    initSticky() {
      this.stickyType = this.dataset.sticky || 'none';
      if (!this.section || this.stickyType === 'none') return;
      this.section.classList.add('shopify-section-header-sticky');
      if (this.stickyType !== 'on-scroll-up') return;
      this.lastScroll = window.scrollY;
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }

    isBusy() {
      return (
        this.openItem ||
        this.classList.contains('is-searching') ||
        this.drawer?.classList.contains('is-open') ||
        this.querySelector('[data-lang-toggle][aria-expanded="true"]')
      );
    }

    onScroll() {
      const y = window.scrollY;
      // offsetTop of a stuck sticky element follows the scroll, so use the header height instead
      const threshold = this.section.offsetHeight + 120;
      if (this.isBusy()) {
        this.lastScroll = y;
        return;
      }
      if (y > this.lastScroll && y > threshold) {
        this.section.classList.add('shopify-section-header-hidden', 'scrolled-past-header');
        requestAnimationFrame(() => this.section.classList.add('animate'));
      } else if (y < this.lastScroll) {
        this.section.classList.remove('shopify-section-header-hidden');
      }
      if (y <= 0) this.section.classList.remove('animate', 'scrolled-past-header');
      this.lastScroll = y;
    }

    /* Dawn's cart notification calls header.reveal() after add-to-cart */
    reveal() {
      this.section?.classList.remove('shopify-section-header-hidden');
    }
  }

  customElements.define('coach-header', CoachHeader);
})();
