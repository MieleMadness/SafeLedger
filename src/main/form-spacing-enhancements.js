'use strict';

const EDIT_FORM_TITLES = new Set([
  'Modify Wallet',
  'Add Wallet',
  'Modify Coin',
  'Add Coin'
]);

function applyEditFormClass() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  const form = area.querySelector('form');
  if (!form) return;
  const title = header ? String(header.textContent || '').trim() : '';
  form.classList.toggle('safeledger-edit-form', EDIT_FORM_TITLES.has(title));
}

function install() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const update = () => queueMicrotask(applyEditFormClass);
  const observer = new MutationObserver(update);
  observer.observe(area, { childList: true, subtree: true });
  applyEditFormClass();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { EDIT_FORM_TITLES, applyEditFormClass };
