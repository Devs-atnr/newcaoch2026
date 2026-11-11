/**
 * Coach Luxury Collection Interactive Scripts
 * - Filter pills & floating popovers with smooth toggle & outside-click close
 * - Best Matches sort dropdown
 * - Seamless AJAX filter & sort updates using Section Rendering API
 * - Product card image slider (< >)
 * - Color variant swatches (swaps image, price, and Add to Bag variant ID)
 * - "Add To Bag" AJAX quick-add with Dawn cart-drawer & header bubble integration
 */

class CoachCollection {
  constructor() {
    this.wrapper = document.querySelector('.coach-collection-wrapper');
    if (!this.wrapper) return;

    this.sectionId = this.wrapper.dataset.sectionId;
    this.init();
  }

  init() {
    const cleanUrl = this.stripFiltersFromUrl();
    this.clearIdleFilters();
    this.bindPopovers();
    this.bindSort();
    this.bindFilterInputs();
    this.bindPriceFilter();
    this.bindProductCards();
    if (cleanUrl) this.fetchFilteredSection(cleanUrl);

    window.addEventListener('popstate', () => {
      this.fetchFilteredSection(window.location.href);
    });
  }

  /* Drop filter query params on a fresh page load. Sort is kept. */
  stripFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let hasFilter = false;
    const next = new URLSearchParams();
    params.forEach((value, key) => {
      if (key.indexOf('filter.') === 0) {
        hasFilter = true;
        return;
      }
      next.append(key, value);
    });
    if (!hasFilter) return null;

    const query = next.toString();
    const cleanUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    return cleanUrl;
  }

  /* Filters stay unchecked until the shopper chooses one. */
  clearIdleFilters() {
    const params = new URLSearchParams(window.location.search);
    let hasFilter = false;
    params.forEach((value, key) => {
      if (key.indexOf('filter.') === 0 && value !== '') hasFilter = true;
    });
    if (hasFilter) return;

    this.wrapper.querySelectorAll('.js-coach-filter-item .js-filter-input').forEach((input) => {
      if (input.type === 'checkbox' || input.type === 'radio') input.checked = false;
    });
    this.wrapper.querySelectorAll('.js-price-min-param, .js-price-max-param').forEach((input) => {
      input.value = '';
    });
    this.wrapper.querySelectorAll('.coach-filter-pill--active').forEach((pill) => {
      pill.classList.remove('coach-filter-pill--active');
    });
    this.wrapper.querySelectorAll('.coach-list-row--active').forEach((row) => {
      row.classList.remove('coach-list-row--active');
    });
    this.wrapper.querySelectorAll('.coach-list-radio--checked').forEach((radio) => {
      radio.classList.remove('coach-list-radio--checked');
    });
    this.wrapper.querySelectorAll('.coach-color-item--active').forEach((item) => {
      item.classList.remove('coach-color-item--active');
    });
    const chips = this.wrapper.querySelector('#CoachActiveFacets');
    if (chips) chips.remove();
    this.wrapper.querySelectorAll('.coach-filter-pill__badge').forEach((badge) => {
      badge.remove();
    });
  }

  alignSortDropdown() {
    const sortWrap = this.wrapper.querySelector('.js-coach-sort-container');
    if (!sortWrap) return;
    const valueEl = sortWrap.querySelector('.coach-sort-btn__value');
    const dropdown = sortWrap.querySelector('.coach-sort-dropdown');
    if (!valueEl || !dropdown) return;

    if (window.innerWidth < 750) {
      dropdown.style.left = 'auto';
      dropdown.style.right = '0px';
      return;
    }

    const wrapRect = sortWrap.getBoundingClientRect();
    const valueRect = valueEl.getBoundingClientRect();
    const menuWidth = dropdown.offsetWidth || 228;
    let left = valueRect.left - wrapRect.left;
    const viewportRight = window.innerWidth - 16;
    const overflow = wrapRect.left + left + menuWidth - viewportRight;
    if (overflow > 0) left -= overflow;
    dropdown.style.right = 'auto';
    dropdown.style.left = `${Math.max(0, Math.round(left))}px`;
  }

  /* -------------------------------------------------------------------------
     Filter Popovers
     ------------------------------------------------------------------------- */
  bindPopovers() {
    const filterItems = this.wrapper.querySelectorAll('.js-coach-filter-item');

    filterItems.forEach((item) => {
      const pillBtn = item.querySelector('.js-coach-filter-pill');
      const closeBtn = item.querySelector('.js-coach-close-popover');
      const popover = item.querySelector('.js-coach-popover');

      if (pillBtn && popover) {
        const openItem = () => {
          this.closeAllPopovers();
          this.closeSort();
          this.openFilterIndex = item.dataset.index;
          item.classList.add('is-open');
          pillBtn.setAttribute('aria-expanded', 'true');
          popover.removeAttribute('hidden');
        };

        pillBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = item.classList.contains('is-open');
          this.closeAllPopovers();
          this.closeSort();
          if (!isOpen) openItem();
        });
      }

        if (closeBtn && popover) {
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openFilterIndex = null;
            item.classList.remove('is-open');
            pillBtn?.setAttribute('aria-expanded', 'false');
          });
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.js-coach-filter-item')) {
        this.closeAllPopovers();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllPopovers();
        this.closeSort();
      }
    });
  }

  restoreOpenFilter() {
    if (!this.openFilterIndex) return;
    const item = this.wrapper.querySelector(
      `.js-coach-filter-item[data-index="${this.openFilterIndex}"]`
    );
    if (!item) return;
    const pill = item.querySelector('.js-coach-filter-pill');
    const popover = item.querySelector('.js-coach-popover');
    item.classList.add('is-open');
    pill?.setAttribute('aria-expanded', 'true');
    popover?.removeAttribute('hidden');
  }

  closeAllPopovers() {
    this.openFilterIndex = null;
    const openItems = this.wrapper.querySelectorAll('.js-coach-filter-item.is-open');
    openItems.forEach((item) => {
      item.classList.remove('is-open');
      const pill = item.querySelector('.js-coach-filter-pill');
      pill?.setAttribute('aria-expanded', 'false');
    });
  }

  /* -------------------------------------------------------------------------
     Sort Dropdown
     ------------------------------------------------------------------------- */
  bindSort() {
    const sortWrap = this.wrapper.querySelector('.js-coach-sort-container');
    if (!sortWrap) return;

    const sortBtn = sortWrap.querySelector('.js-coach-sort-btn');
    const sortOptions = sortWrap.querySelectorAll('.coach-sort-item');
    const hiddenSelect = sortWrap.querySelector('.js-coach-sort-select');

    const openSort = () => {
      this.closeAllPopovers();
      this.alignSortDropdown();
      sortWrap.classList.add('is-open');
      sortBtn?.setAttribute('aria-expanded', 'true');
    };
    const closeThisSort = () => {
      sortWrap.classList.remove('is-open');
      sortBtn?.setAttribute('aria-expanded', 'false');
    };

    if (sortBtn) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sortWrap.classList.contains('is-open');
        this.closeAllPopovers();
        if (isOpen) closeThisSort();
        else openSort();
      });
    }

    this.alignSortDropdown();
    if (!this.sortResizeBound) {
      this.sortResizeBound = true;
      window.addEventListener('resize', () => this.alignSortDropdown());
    }

    if (window.matchMedia('(hover: hover) and (min-width: 990px)').matches) {
      let closeTimer = null;
      sortWrap.addEventListener('mouseenter', () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        openSort();
      });
      sortWrap.addEventListener('mouseleave', () => {
        closeTimer = setTimeout(closeThisSort, 280);
      });
    }

    sortOptions.forEach((option) => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = option.dataset.sortValue;
        if (hiddenSelect && val) {
          hiddenSelect.value = val;
          this.closeSort();
          this.submitFilters();
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.js-coach-sort-container')) {
        this.closeSort();
      }
    });
  }

  closeSort() {
    const sortWrap = this.wrapper.querySelector('.js-coach-sort-container.is-open');
    if (sortWrap) {
      sortWrap.classList.remove('is-open');
      sortWrap.querySelector('.js-coach-sort-btn')?.setAttribute('aria-expanded', 'false');
    }
  }

  /* -------------------------------------------------------------------------
     AJAX Filtering
     ------------------------------------------------------------------------- */
  bindFilterInputs() {
    const form = this.wrapper.querySelector('#CoachFacetFiltersForm');
    if (!form) return;

    form.querySelectorAll('.js-filter-input').forEach((input) => {
      input.addEventListener('change', () => {
        this.submitFilters();
      });
    });
  }

  bindPriceFilter() {
    const slider = this.wrapper.querySelector('.js-coach-price-slider');
    if (slider) {
      const floor = Number(slider.dataset.floor || 0);
      const ceil = Number(slider.dataset.ceil || 0);
      const minRange = slider.querySelector('.js-price-range-min');
      const maxRange = slider.querySelector('.js-price-range-max');
      const minInput = slider.querySelector('.js-price-min');
      const maxInput = slider.querySelector('.js-price-max');
      const minHidden = slider.querySelector('.js-price-min-param');
      const maxHidden = slider.querySelector('.js-price-max-param');

      const paint = () => {
        const min = Number(minRange.value);
        const max = Number(maxRange.value);
        const span = Math.max(ceil - floor, 1);
        const left = ((min - floor) / span) * 100;
        const right = 100 - ((max - floor) / span) * 100;
        slider.style.setProperty('--coach-price-left', `${left}%`);
        slider.style.setProperty('--coach-price-right', `${right}%`);
      };

      const writeHidden = () => {
        const min = Number(minInput.value);
        const max = Number(maxInput.value);
        if (minHidden) minHidden.value = min <= floor ? '' : String(min);
        if (maxHidden) maxHidden.value = max >= ceil ? '' : String(max);
      };

      const clampPair = (source) => {
        let min = Number(source === 'input' ? minInput.value : minRange.value);
        let max = Number(source === 'input' ? maxInput.value : maxRange.value);
        if (Number.isNaN(min)) min = floor;
        if (Number.isNaN(max)) max = ceil;
        min = Math.min(Math.max(min, floor), ceil);
        max = Math.min(Math.max(max, floor), ceil);
        if (min > max) {
          if (source === 'min') min = max;
          else if (source === 'max') max = min;
          else {
            const swap = min;
            min = max;
            max = swap;
          }
        }
        minInput.value = min;
        maxInput.value = max;
        minRange.value = min;
        maxRange.value = max;
        writeHidden();
        paint();
      };

      minRange.addEventListener('input', () => clampPair('min'));
      maxRange.addEventListener('input', () => clampPair('max'));
      minRange.addEventListener('change', () => this.submitFilters());
      maxRange.addEventListener('change', () => this.submitFilters());
      minInput.addEventListener('change', () => {
        clampPair('input');
        this.submitFilters();
      });
      maxInput.addEventListener('change', () => {
        clampPair('input');
        this.submitFilters();
      });
      paint();
    }

    const resetLinks = this.wrapper.querySelectorAll('.js-facet-remove');
    resetLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.fetchFilteredSection(link.href);
      });
    });
  }

  submitFilters() {
    const form = this.wrapper.querySelector('#CoachFacetFiltersForm');
    if (!form) return;

    const openItem = this.wrapper.querySelector('.js-coach-filter-item.is-open');
    this.openFilterIndex = openItem ? openItem.dataset.index : null;

    const formData = new FormData(form);
    const searchParams = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (value !== '' && value !== null) {
        searchParams.append(key, value);
      }
    }

    const currentPath = window.location.pathname;
    const queryString = searchParams.toString();
    const newUrl = queryString ? `${currentPath}?${queryString}` : currentPath;

    window.history.pushState({ path: newUrl }, '', newUrl);
    this.fetchFilteredSection(newUrl);
  }

  async fetchFilteredSection(url) {
    const grid = this.wrapper.querySelector('.coach-product-grid');
    if (grid) grid.classList.add('is-loading');

    const separator = url.includes('?') ? '&' : '?';
    const fetchUrl = `${url}${separator}section_id=${this.sectionId}`;

    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error('Network error');
      const htmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // 1. Update Product Grid
      const newGridContainer = doc.querySelector('#CoachProductGridContainer');
      const currentGridContainer = this.wrapper.querySelector('#CoachProductGridContainer');
      if (newGridContainer && currentGridContainer) {
        currentGridContainer.innerHTML = newGridContainer.innerHTML;
      }

      // 2. Update Count
      const newCount = doc.querySelector('#CoachCollectionCount');
      const currentCount = this.wrapper.querySelector('#CoachCollectionCount');
      if (newCount && currentCount) {
        currentCount.innerHTML = newCount.innerHTML;
      }

      // 3. Update Facets Bar
      const newFacets = doc.querySelector('#CoachFacetsBar');
      const currentFacets = this.wrapper.querySelector('#CoachFacetsBar');
      if (newFacets && currentFacets) {
        currentFacets.innerHTML = newFacets.innerHTML;
      }

      // 4. Update Pagination
      const newPagination = doc.querySelector('.coach-pagination');
      const currentPagination = this.wrapper.querySelector('.coach-pagination');
      if (newPagination && currentPagination) {
        currentPagination.innerHTML = newPagination.innerHTML;
      } else if (!newPagination && currentPagination) {
        currentPagination.remove();
      }

      // Rebind events
      this.clearIdleFilters();
      this.bindPopovers();
      this.restoreOpenFilter();
      this.bindSort();
      this.bindFilterInputs();
      this.bindPriceFilter();
      this.bindProductCards();

    } catch (err) {
      console.error('Error filtering collection:', err);
    } finally {
      const refreshedGrid = this.wrapper.querySelector('.coach-product-grid');
      if (refreshedGrid) refreshedGrid.classList.remove('is-loading');
    }
  }

  /* -------------------------------------------------------------------------
     Product Card Interactions
     ------------------------------------------------------------------------- */
  bindProductCards() {
    const cards = this.wrapper.querySelectorAll('.coach-card');

    cards.forEach((card) => {
      // 1. Image Slider (< >)
      const prevBtn = card.querySelector('.coach-card__arrow--prev');
      const nextBtn = card.querySelector('.coach-card__arrow--next');
      const images = card.querySelectorAll('.coach-card__img');

      if (images.length > 1) {
        let activeIdx = 0;

        const updateImage = (newIdx) => {
          images.forEach((img, idx) => {
            img.classList.toggle('coach-card__img--active', idx === newIdx);
          });
          activeIdx = newIdx;
        };

        if (prevBtn) {
          prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nextIdx = (activeIdx - 1 + images.length) % images.length;
            updateImage(nextIdx);
          });
        }

        if (nextBtn) {
          nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nextIdx = (activeIdx + 1) % images.length;
            updateImage(nextIdx);
          });
        }
      }

      // 2. Color Swatches Slider (< >) & Variant Selection
      const swatchesWrap = card.querySelector('.js-coach-swatches-wrapper');
      const swatchesTrack = card.querySelector('.js-swatches-track');
      const swatchPrevBtn = card.querySelector('.js-swatch-nav-prev');
      const swatchNextBtn = card.querySelector('.js-swatch-nav-next');
      const swatchDots = card.querySelectorAll('.coach-card__swatch-dot');
      const quickAddBtn = card.querySelector('.coach-card__quick-add-btn');
      const priceRegular = card.querySelector('.coach-card__price-regular');
      const priceSale = card.querySelector('.coach-card__price-sale');
      const priceCompare = card.querySelector('.coach-card__price-compare');

      if (swatchesWrap && swatchesTrack) {
        if (swatchDots.length <= 4) {
          swatchesWrap.classList.add('coach-card__swatches-wrapper--no-arrows');
        } else {
          const updateSwatchArrows = () => {
            const maxScroll = swatchesTrack.scrollWidth - swatchesTrack.clientWidth;
            if (swatchPrevBtn) {
              if (swatchesTrack.scrollLeft <= 2) {
                swatchPrevBtn.setAttribute('disabled', 'disabled');
              } else {
                swatchPrevBtn.removeAttribute('disabled');
              }
            }
            if (swatchNextBtn) {
              if (swatchesTrack.scrollLeft >= maxScroll - 2) {
                swatchNextBtn.setAttribute('disabled', 'disabled');
              } else {
                swatchNextBtn.removeAttribute('disabled');
              }
            }
          };

          if (swatchPrevBtn) {
            swatchPrevBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              swatchesTrack.scrollBy({ left: -48, behavior: 'smooth' });
              setTimeout(updateSwatchArrows, 250);
            });
          }

          if (swatchNextBtn) {
            swatchNextBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              swatchesTrack.scrollBy({ left: 48, behavior: 'smooth' });
              setTimeout(updateSwatchArrows, 250);
            });
          }

          swatchesTrack.addEventListener('scroll', updateSwatchArrows, { passive: true });
          updateSwatchArrows();
        }
      }

      swatchDots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Active state
          swatchDots.forEach((d) => d.classList.remove('coach-card__swatch-dot--active'));
          dot.classList.add('coach-card__swatch-dot--active');

          const variantId = dot.dataset.variantId;
          const isAvailable = dot.dataset.variantAvailable === 'true';
          const price = dot.dataset.variantPrice;
          const comparePrice = dot.dataset.variantComparePrice;
          const imgSrc = dot.dataset.variantImageSrc;

          // Update Quick Add button
          if (quickAddBtn) {
            quickAddBtn.dataset.variantId = variantId;
            if (isAvailable) {
              quickAddBtn.classList.remove('coach-card__quick-add-btn--sold-out');
              quickAddBtn.classList.add('coach-card__quick-add-btn--available');
              quickAddBtn.removeAttribute('disabled');
              const textSpan = quickAddBtn.querySelector('.coach-card__quick-add-text');
              if (textSpan) textSpan.textContent = 'Add To Bag';
            } else {
              quickAddBtn.classList.remove('coach-card__quick-add-btn--available');
              quickAddBtn.classList.add('coach-card__quick-add-btn--sold-out');
              quickAddBtn.setAttribute('disabled', 'disabled');
              const textSpan = quickAddBtn.querySelector('.coach-card__quick-add-text');
              if (textSpan) textSpan.textContent = 'Add To Bag';
            }
          }

          // Update Price
          if (comparePrice && priceSale && priceCompare) {
            priceSale.textContent = price;
            priceCompare.textContent = comparePrice;
          } else if (priceRegular) {
            priceRegular.textContent = price;
          }

          const badgeWrap = card.querySelector('.coach-card__badges');
          if (badgeWrap) {
            if (!badgeWrap.dataset.originalHtml) badgeWrap.dataset.originalHtml = badgeWrap.innerHTML;
            if (!isAvailable) {
              badgeWrap.innerHTML = '<span class="coach-badge coach-badge--sold-out">Sold Out</span>';
            } else {
              badgeWrap.innerHTML = badgeWrap.dataset.originalHtml;
            }
          }

          if (imgSrc && images.length > 0) {
            const primary = images[0];
            primary.removeAttribute('srcset');
            primary.src = imgSrc;
            images.forEach((img, idx) => {
              img.classList.toggle('coach-card__img--active', idx === 0);
            });
          }
        });
      });

      // 3. Quick Add to Bag
      if (quickAddBtn && !quickAddBtn.dataset.bound) {
        quickAddBtn.dataset.bound = 'true';
        quickAddBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const variantId = quickAddBtn.dataset.variantId;
          if (!variantId) return;

          this.handleQuickAdd(quickAddBtn, variantId);
        });
      }
    });
  }

  /* -------------------------------------------------------------------------
     AJAX Add To Bag
     ------------------------------------------------------------------------- */
  async handleQuickAdd(button, variantId) {
    button.classList.add('is-loading');

    try {
      const routes = window.routes || { cart_add_url: '/cart/add.js', cart_url: '/cart' };
      const formData = {
        items: [
          {
            id: parseInt(variantId, 10),
            quantity: 1,
          },
        ],
      };

      // Include cart drawer sections if cart-drawer exists
      const cartDrawer = document.querySelector('cart-drawer');
      const cartNotification = document.querySelector('cart-notification');

      const response = await fetch(routes.cart_add_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/javascript',
        },
        body: JSON.stringify(formData),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.description || 'Could not add to bag');
      }

      // Success feedback
      const textSpan = button.querySelector('.coach-card__quick-add-text');
      const originalText = textSpan ? textSpan.textContent : 'Add To Bag';
      if (textSpan) textSpan.textContent = 'Added ✓';

      setTimeout(() => {
        if (textSpan) textSpan.textContent = originalText;
      }, 1800);

      // Trigger Cart Drawer / Cart Notification
      if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
        cartDrawer.renderContents(resData);
      } else if (cartNotification && typeof cartNotification.renderContents === 'function') {
        cartNotification.renderContents(resData);
      } else {
        // Fallback: update bubble & open drawer
        this.updateHeaderCartCount();
      }

      // Publish Dawn PubSub event if active
      if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS) {
        window.publish(window.PUB_SUB_EVENTS.cartUpdate, {
          source: 'coach-collection',
          cartData: resData,
        });
      }

    } catch (err) {
      console.error('Quick Add error:', err);
      alert(err.message || 'Error adding product to bag.');
    } finally {
      button.classList.remove('is-loading');
    }
  }

  async updateHeaderCartCount() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      const countBubbles = document.querySelectorAll('.cart-count-bubble, .coach-header__cart-count');
      countBubbles.forEach((bubble) => {
        bubble.textContent = cart.item_count;
        bubble.classList.remove('hidden');
      });
    } catch (e) {
      console.warn('Could not update cart count bubble', e);
    }
  }
}

function initCoachCollection() {
  window.coachCollection = new CoachCollection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCoachCollection);
} else {
  initCoachCollection();
}

// Support Shopify section editor reload
if (typeof Shopify !== 'undefined' && Shopify.designMode) {
  document.addEventListener('shopify:section:load', initCoachCollection);
}
