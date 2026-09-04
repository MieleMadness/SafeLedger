'use strict';

/*
 * SafeLedger compact navigation rails.
 *
 * Profiles, Vault Items, and Assets stay expanded by default so labels remain
 * discoverable. The user may independently collapse any column into a compact
 * icon rail for the current app session. No vault or settings data is changed.
 */

const COLUMNS = Object.freeze([
  Object.freeze({
    key: 'profile',
    label: 'Profiles',
    searchId: 'profileSearch',
    areaId: 'vaultArea',
    addId: 'addVault',
    addLabel: 'Add Profile',
    itemLabelSelector: '.profile-list-name'
  }),
  Object.freeze({
    key: 'vault',
    label: 'Vault Items',
    searchId: 'groupSearch',
    areaId: 'groupArea',
    addId: 'addGroup',
    addLabel: 'Add Vault Item',
    itemLabelSelector: '.wallet-list-name'
  }),
  Object.freeze({
    key: 'asset',
    label: 'Assets',
    searchId: 'recordSearch',
    areaId: 'recordArea',
    addId: 'addRecord',
    addLabel: 'Add Asset',
    itemLabelSelector: '.coin-list-label'
  })
]);

function getCell(id) {
  const node = document.getElementById(id);
  return node && typeof node.closest === 'function' ? node.closest('.app-cell') : null;
}

function syncItemLabels(config, mainCell) {
  if (!mainCell || typeof mainCell.querySelectorAll !== 'function') return;
  for (const link of mainCell.querySelectorAll('.nav > li > a')) {
    const label = link.querySelector(config.itemLabelSelector);
    const text = label && String(label.textContent || '').trim();
    if (!text) continue;
    link.title = text;
    link.setAttribute('aria-label', text);
  }
}

function clearHiddenSearch(config) {
  const input = document.getElementById(config.searchId);
  if (!input || !input.value) return;
  input.value = '';
  if (typeof Event === 'function') {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('keyup', { bubbles: true }));
  }
}

function setCollapsed(state, collapsed) {
  const { config, shell, searchCell, mainCell, buttonCell, toggle } = state;
  state.collapsed = collapsed === true;
  shell.setAttribute(`data-${config.key}-collapsed`, state.collapsed ? 'true' : 'false');

  for (const cell of [searchCell, mainCell, buttonCell]) {
    if (cell) cell.classList.toggle('nav-column-collapsed', state.collapsed);
  }

  const action = state.collapsed ? 'Expand' : 'Collapse';
  toggle.title = `${action} ${config.label}`;
  toggle.setAttribute('aria-label', `${action} ${config.label}`);
  toggle.setAttribute('aria-expanded', state.collapsed ? 'false' : 'true');
  const icon = toggle.querySelector('.fa');
  if (icon) icon.className = `fa fa-chevron-${state.collapsed ? 'right' : 'left'}`;

  if (state.collapsed) clearHiddenSearch(config);
  syncItemLabels(config, mainCell);
  return state.collapsed;
}

function setupColumn(config) {
  const shell = document.querySelector('.app-shell');
  const searchCell = getCell(config.searchId);
  const mainCell = getCell(config.areaId);
  const buttonCell = getCell(config.addId);
  const addButton = document.getElementById(config.addId);
  if (!shell || !searchCell || !mainCell || !buttonCell || !addButton) return null;

  searchCell.classList.add('nav-column', `nav-column-${config.key}`, 'nav-column-search');
  mainCell.classList.add('nav-column', `nav-column-${config.key}`, 'nav-column-main');
  buttonCell.classList.add('nav-column', `nav-column-${config.key}`, 'nav-column-button');

  addButton.title = config.addLabel;
  addButton.setAttribute('aria-label', config.addLabel);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = `${config.key}ColumnToggle`;
  toggle.className = 'btn btn-default column-collapse-toggle';
  toggle.setAttribute('aria-controls', config.areaId);
  const icon = document.createElement('i');
  icon.className = 'fa fa-chevron-left';
  icon.setAttribute('aria-hidden', 'true');
  toggle.appendChild(icon);
  searchCell.appendChild(toggle);

  const state = { config, shell, searchCell, mainCell, buttonCell, toggle, collapsed: false };
  toggle.addEventListener('click', () => setCollapsed(state, !state.collapsed));

  // List renderers replace their children as selections change. Event
  // delegation keeps native tooltips/accessibility names current without a
  // MutationObserver or post-render patch loop.
  const refreshLabels = () => syncItemLabels(config, mainCell);
  mainCell.addEventListener('mouseover', refreshLabels);
  mainCell.addEventListener('focusin', refreshLabels);

  setCollapsed(state, false);
  return state;
}

function init() {
  return COLUMNS.map(setupColumn).filter(Boolean);
}

if (typeof document !== 'undefined') init();

exports._test = { COLUMNS, getCell, syncItemLabels, clearHiddenSearch, setCollapsed, setupColumn, init };
