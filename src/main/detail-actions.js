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
  if (titles.some((title) => ['save coin', 'save wallet', 'save profile'].includes(title))) return 'edit';
  if (titles.some((title) => ['edit coin', 'edit wallet', 'edit profile'].includes(title))) return 'view';
  return '';
}

function clear() {
  clearDockOnly();
  setDetailMode('');
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
  (Array.isArray(actions) ? actions : []).forEach((action) => {
    if (action && action.icon && action.title) dock.appendChild(makeIconButton(action));
  });
}

exports.set = set;
exports.clear = clear;
exports.setDetailMode = setDetailMode;
exports._test = { DETAIL_MODE_CLASSES, makeIconButton, modeForActions };
