(function () {
  const selector = [
    '.coach-card__price',
    '.coach-search-card__price',
    '.coach-bag-item__price',
    '.coach-wish-card__price',
    '.ymal__price',
    '.cart-item__price-wrapper',
    '[data-bag-total]',
    '.price'
  ].join(',');

  const strip = (root) => {
    if (!root || (root.closest && root.closest('.coach-product__price'))) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (parent && parent.closest('.coach-product__price')) return;
      const next = node.nodeValue.replace(/[.,]00(?!\d)/g, '');
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  };

  const scan = (root) => {
    const scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches(selector)) strip(scope);
    scope.querySelectorAll(selector).forEach(strip);
  };

  const start = () => {
    scan(document);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.target && record.target.closest && record.target.closest('.coach-product__price')) return;
        if (record.type === 'characterData') {
          const parent = record.target.parentElement;
          const price = parent && parent.closest(selector);
          if (price) strip(price);
          return;
        }
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1) scan(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
