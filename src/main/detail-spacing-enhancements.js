'use strict';

const EDIT_TITLES = new Set([
  'Modify Wallet',
  'Add Wallet',
  'Modify Coin',
  'Add Coin'
]);

function dockHas(prefix) {
  const dock = document.getElementById('detailActionArea');
  if (!dock) return false;
  const target = String(prefix || '').toLowerCase();
  return Array.from(dock.querySelectorAll('button')).some((button) =>
    String(button.title || '').trim().toLowerCase().startsWith(target)
  );
}

function applyDetailSpacingClass() {
  const area = document.getElementById('detailArea');
  if (!area) return;

  area.classList.remove('wallet-coin-detail', 'wallet-coin-view', 'wallet-coin-edit');
  const header = area.querySelector('h1');
  const title = header ? String(header.textContent || '').trim() : '';

  if (EDIT_TITLES.has(title)) {
    area.classList.add('wallet-coin-detail', 'wallet-coin-edit');
    return;
  }

  const coinView = !!area.querySelector('.coin-detail-header') || dockHas('edit coin');
  const walletView = dockHas('edit wallet');
  if (coinView || walletView) {
    area.classList.add('wallet-coin-detail', 'wallet-coin-view');
  }
}

function install() {
  const area = document.getElementById('detailArea');
  const dock = document.getElementById('detailActionArea');
  if (!area || !dock) return;
  const update = () => queueMicrotask(applyDetailSpacingClass);
  const detailObserver = new MutationObserver(update);
  const dockObserver = new MutationObserver(update);
  detailObserver.observe(area, { childList: true, subtree: true });
  dockObserver.observe(dock, { childList: true, subtree: true });
  applyDetailSpacingClass();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { EDIT_TITLES, applyDetailSpacingClass };
