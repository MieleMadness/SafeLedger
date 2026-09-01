'use strict';

const walletIcons = require('./wallet-icons');

function enhanceWalletList() {
  const names = document.querySelectorAll('#groupArea .wallet-list-name');
  for (const nameNode of names) {
    const anchor = nameNode.closest('a');
    if (!anchor || anchor.dataset.walletIconEnhanced === 'true') continue;
    anchor.dataset.walletIconEnhanced = 'true';

    const name = String(nameNode.textContent || '').trim();
    const image = walletIcons.createIconElement(name, 'wallet-list-brand-image');
    if (!image) continue;

    const generic = anchor.querySelector('.wallet-list-icon');
    if (generic) generic.replaceWith(image);
    else {
      const text = anchor.querySelector('.wallet-list-text');
      if (text) anchor.insertBefore(image, text);
      else anchor.insertBefore(image, anchor.firstChild);
    }
  }
}

function createDetailFallback() {
  const icon = document.createElement('span');
  icon.className = 'glyphicon glyphicon-piggy-bank wallet-detail-generic-icon';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function enhanceWalletDetail() {
  const header = document.querySelector('#detailArea .wallet-detail-title');
  if (!header || header.dataset.walletIconEnhanced === 'true') return;
  header.dataset.walletIconEnhanced = 'true';

  const name = String(header.textContent || '').trim() || 'Wallet';
  const icon = walletIcons.createIconElement(name, 'wallet-detail-brand-image') || createDetailFallback();
  const label = document.createElement('span');
  label.className = 'wallet-detail-title-text';
  label.textContent = name;

  header.textContent = '';
  header.appendChild(icon);
  header.appendChild(label);
}

function enhanceAll() {
  enhanceWalletList();
  enhanceWalletDetail();
}

function install() {
  enhanceAll();

  const observer = new MutationObserver(enhanceAll);
  const groupArea = document.getElementById('groupArea');
  const detailArea = document.getElementById('detailArea');
  if (groupArea) observer.observe(groupArea, { childList: true, subtree: true });
  if (detailArea) observer.observe(detailArea, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports.enhanceAll = enhanceAll;
