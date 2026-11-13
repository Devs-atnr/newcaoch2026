(function () {
  const key = 'coach-wishlist';

  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(items) ? items : [];
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(key, JSON.stringify(items));
    updateHeader();
    document.dispatchEvent(new CustomEvent('coach:wishlist'));
  }

  function updateHeader() {
    const count = read().length;
    document.querySelectorAll('[data-wishlist-count]').forEach((node) => {
      node.textContent = count > 99 ? '99+' : String(count);
      node.hidden = count === 0;
    });
  }

  window.CoachWishlist = {
    read,
    has(handle) {
      return read().some((item) => item.handle === handle);
    },
    toggle(item) {
      if (!item || !item.handle) return false;
      const items = read();
      const index = items.findIndex((saved) => saved.handle === item.handle);
      if (index >= 0) {
        items.splice(index, 1);
        write(items);
        return false;
      }
      items.unshift({
        handle: item.handle,
        id: item.id || '',
        variantId: item.variantId || '',
        title: item.title || '',
        url: item.url || `/products/${item.handle}`,
        image: item.image || '',
        price: item.price || '',
      });
      write(items.slice(0, 40));
      return true;
    },
    remove(handle) {
      write(read().filter((item) => item.handle !== handle));
    },
    updateHeader,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateHeader);
  } else {
    updateHeader();
  }
})();
