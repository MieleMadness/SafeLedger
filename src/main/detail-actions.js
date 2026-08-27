'use strict';

const DETAIL_MODE_CLASSES = ['wallet-coin-detail', 'wallet-coin-view', 'wallet-coin-edit'];

function getDock() {
  return document.getElementById('detailActionArea');
}

function getDetailArea() {
  return document.getElementById('detailArea');
}

function clearDockOnly() {
  const dock = getDock();
  if (dock) dock.innerHTML = '';
}

function setDetailMode(mode = '') {
  const detail = getDetailArea();
  if (!detail) return;
  detail.classList.remove(...DETAIL_MODE_CLASSES);
  if (mode === 'edit') detail.classList.add('wallet-coin-detail', 'wallet-coin-edit');
  if (mode === 'view') detail.classList.add('wallet-coin-detail', 'wallet-coin-view');
}

function modeForActions(actions) {
  const titles = (Array.isArray(actions) ? actions : [])
    .map((action) => String(action && action.title || '').trim().toLowerCase());
  if (titles.some((title) => title === 'save coin' || title === 'save wallet')) return 'edit';
  if (titles.some((title) => title === 'edit coin' || title === 'edit wallet')) return 'view';
  return '';
}

function clear() {
  clearDockOnly();
  setDetailMode('');
  const detail = getDetailArea();
  if (detail) {
    detail.querySelectorAll('.detail-action-context-marker').forEach((marker) => marker.remove());
  }
}

function markContext() {
  const detail = getDetailArea();
  if (!detail) return;
  detail.querySelectorAll('.detail-action-context-marker').forEach((marker) => marker.remove());
  const marker = document.createElement('span');
  marker.className = 'detail-action-context-marker';
  marker.hidden = true;
  detail.appendChild(marker);
}

function makeIconButton(action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-default detail-action-button ${action.className || ''}`.trim();
  button.title = action.title;
  button.setAttribute('aria-label', action.title);
  button.innerHTML = `<i class="fa ${action.icon}" aria-hidden="true"></i>`;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof action.onClick === 'function') action.onClick(event, button);
  });
  return button;
}

function set(actions) {
  const dock = getDock();
  if (!dock) return;
  clearDockOnly();
  setDetailMode(modeForActions(actions));
  markContext();
  (Array.isArray(actions) ? actions : []).forEach((action) => {
    if (action && action.icon && action.title) dock.appendChild(makeIconButton(action));
  });
}

function installDetailObserver() {
  const detail = getDetailArea();
  if (!detail || detail.dataset.detailActionObserver === '1') return;
  detail.dataset.detailActionObserver = '1';
  const observer = new MutationObserver(() => {
    queueMicrotask(() => {
      if (!detail.querySelector('.detail-action-context-marker')) {
        clearDockOnly();
        setDetailMode('');
      }
    });
  });
  observer.observe(detail, { childList: true });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', installDetailObserver, { once: true });
} else {
  installDetailObserver();
}

exports.set = set;
exports.clear = clear;
exports.setDetailMode = setDetailMode;
exports._test = { DETAIL_MODE_CLASSES, makeIconButton, modeForActions };
