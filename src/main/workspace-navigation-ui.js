'use strict';

const NAVIGATION_AREA_IDS = Object.freeze(['vaultArea', 'groupArea', 'recordArea']);

function detailScrollContainer(doc = document) {
  if (!doc || typeof doc.getElementById !== 'function') return null;
  const detailArea = doc.getElementById('detailArea');
  if (!detailArea || typeof detailArea.closest !== 'function') return null;
  return detailArea.closest('.content-middle');
}

function resetDetailScroll(doc = document) {
  const container = detailScrollContainer(doc);
  if (!container) return false;
  container.scrollTop = 0;
  return true;
}

function install(doc = document) {
  if (!doc || typeof doc.getElementById !== 'function') return;
  for (const id of NAVIGATION_AREA_IDS) {
    const area = doc.getElementById(id);
    if (!area || !area.dataset || area.dataset.safeLedgerDetailScrollReset === 'true') continue;

    // Navigation rows are rendered repeatedly, so the stable column owns one
    // delegated click handler. It runs during bubbling after the row's direct
    // navigation handler has rendered the new detail view. No synthetic click,
    // timer, MutationObserver, or post-render DOM patch is involved.
    area.addEventListener('click', (event) => {
      const target = event && event.target;
      const link = target && typeof target.closest === 'function' ? target.closest('a') : null;
      if (!link || (typeof area.contains === 'function' && !area.contains(link))) return;
      resetDetailScroll(doc);
    });
    area.dataset.safeLedgerDetailScrollReset = 'true';
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => install(document));
}

module.exports = {
  NAVIGATION_AREA_IDS,
  detailScrollContainer,
  resetDetailScroll,
  install
};
