'use strict';

const walletIcons = require('./wallet-icons');

function enhanceWalletTemplate(label) {
  if (!label || label.dataset.walletIconEnhanced === '1') return;
  const input = label.querySelector('input[type="checkbox"]');
  const copy = label.querySelector('.profile-wallet-template-copy');
  if (!input || !copy) return;

  const name = String(input.value || '').trim();
  const icon = walletIcons.createIconElement({ name }, 'profile-wallet-template-icon');
  if (icon) label.insertBefore(icon, copy);
  label.dataset.walletIconEnhanced = '1';
}

function enhancePicker(root = document) {
  for (const label of root.querySelectorAll('.profile-wallet-template')) enhanceWalletTemplate(label);
}

function start() {
  enhancePicker();
  const area = document.getElementById('detailArea');
  if (!area || typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver(() => enhancePicker(area));
  observer.observe(area, { childList: true, subtree: true });
}

window.addEventListener('DOMContentLoaded', start);

exports._test = { enhanceWalletTemplate, enhancePicker };
