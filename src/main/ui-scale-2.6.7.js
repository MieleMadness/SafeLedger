'use strict';

/*
 * SafeLedger 2.6.7 visual scale helpers.
 *
 * This module only adjusts presentation:
 * - gives Vault Item detail views the same large local artwork treatment as Assets
 * - opens the application at the requested wider default size when room permits
 *
 * It does not touch vault data, encryption, IPC save paths, action buttons, or
 * Emergency Lock behavior.
 */

const DETAIL_WIDTH = 1400;
const DETAIL_HEIGHT = 750;

function preferredWindowSize(win = window) {
  const availableWidth = win.screen && Number(win.screen.availWidth) > 0
    ? Number(win.screen.availWidth)
    : DETAIL_WIDTH;
  const availableHeight = win.screen && Number(win.screen.availHeight) > 0
    ? Number(win.screen.availHeight)
    : DETAIL_HEIGHT;
  return {
    width: Math.min(DETAIL_WIDTH, availableWidth),
    height: Math.min(DETAIL_HEIGHT, availableHeight)
  };
}

function applyPreferredWindowSize(win = window) {
  if (!win || typeof win.resizeTo !== 'function') return false;
  const target = preferredWindowSize(win);
  const currentWidth = Number(win.outerWidth) || 0;
  const currentHeight = Number(win.outerHeight) || 0;

  // Only grow the initial/default window. Do not shrink a window the user or
  // operating system has already made larger.
  if (currentWidth >= target.width && currentHeight >= target.height) return false;
  win.resizeTo(Math.max(currentWidth, target.width), Math.max(currentHeight, target.height));
  return true;
}

function selectedVaultIcon(doc = document) {
  const selected = doc.querySelector('#groupArea .nav > li > a.item-selected');
  if (!selected) return null;
  return selected.querySelector(
    '.vault-service-icon, .wallet-list-brand-image, .wallet-list-catalog-icon, .wallet-list-icon, .wallet-list-fallback-icon'
  );
}

function iconSignature(icon) {
  if (!icon) return '';
  return [
    String(icon.tagName || ''),
    String(icon.getAttribute && icon.getAttribute('src') || ''),
    String(icon.dataset && icon.dataset.serviceCatalog || ''),
    String(icon.className || ''),
    String(icon.textContent || '').trim()
  ].join('|');
}

function cloneDetailIcon(icon) {
  if (!icon || typeof icon.cloneNode !== 'function') return null;
  const clone = icon.cloneNode(true);
  clone.classList.add('wallet-detail-brand-image');
  clone.removeAttribute('id');
  return clone;
}

function patchVaultDetail(doc = document) {
  const area = doc.getElementById('detailArea');
  if (!area) return false;

  const title = area.querySelector('h1.wallet-detail-title');
  if (!title) return false;

  const source = selectedVaultIcon(doc);
  if (!source) return false;
  const signature = iconSignature(source);

  let header = area.querySelector('.wallet-detail-header');
  let titleWrap = header && header.querySelector('.wallet-detail-title-wrap');
  let changed = false;

  if (!header) {
    header = doc.createElement('div');
    header.className = 'wallet-detail-header';
    titleWrap = doc.createElement('div');
    titleWrap.className = 'wallet-detail-title-wrap';

    const category = title.nextElementSibling && title.nextElementSibling.classList.contains('wallet-detail-category')
      ? title.nextElementSibling
      : null;

    area.insertBefore(header, title);
    titleWrap.appendChild(title);
    if (category) titleWrap.appendChild(category);
    header.appendChild(titleWrap);
    changed = true;
  }

  const currentDetailIcon = header.querySelector('.wallet-detail-brand-image');
  if (!currentDetailIcon || header.dataset.iconSignature !== signature) {
    const detailIcon = cloneDetailIcon(source);
    if (detailIcon) {
      if (currentDetailIcon) currentDetailIcon.replaceWith(detailIcon);
      else header.insertBefore(detailIcon, titleWrap);
      header.dataset.iconSignature = signature;
      changed = true;
    }
  }

  return changed;
}

function start() {
  applyPreferredWindowSize(window);

  const detailArea = document.getElementById('detailArea');
  const groupArea = document.getElementById('groupArea');
  if (!detailArea || !groupArea) return;

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      observer.disconnect();
      try {
        patchVaultDetail(document);
      } finally {
        observer.observe(detailArea, { childList: true, subtree: true });
        observer.observe(groupArea, { childList: true, subtree: true });
      }
    });
  });

  patchVaultDetail(document);
  observer.observe(detailArea, { childList: true, subtree: true });
  observer.observe(groupArea, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.DETAIL_WIDTH = DETAIL_WIDTH;
exports.DETAIL_HEIGHT = DETAIL_HEIGHT;
exports._test = {
  preferredWindowSize,
  applyPreferredWindowSize,
  selectedVaultIcon,
  iconSignature,
  cloneDetailIcon,
  patchVaultDetail
};
