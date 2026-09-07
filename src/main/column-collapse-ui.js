'use strict';

/* SafeLedger compact navigation rails. */

const motion = require('./motion-ui');
const OPEN_DURATION_MS = 420;
const COLUMNS = Object.freeze([
  Object.freeze({ key: 'profile', label: 'Profiles', searchId: 'profileSearch', areaId: 'vaultArea', addId: 'addVault', addLabel: 'Add Profile', itemLabelSelector: '.profile-list-name' }),
  Object.freeze({ key: 'vault', label: 'Vault Items', searchId: 'groupSearch', areaId: 'groupArea', addId: 'addGroup', addLabel: 'Add Vault Item', itemLabelSelector: '.wallet-list-name' }),
  Object.freeze({ key: 'asset', label: 'Assets', searchId: 'recordSearch', areaId: 'recordArea', addId: 'addRecord', addLabel: 'Add Asset', itemLabelSelector: '.coin-list-label' })
]);

let columnStates = [];
let openingAnimations = [];
let openingGeneration = 0;
let onSearchClear = null;

function configure(options = {}) {
  onSearchClear = typeof options.onSearchClear === 'function' ? options.onSearchClear : null;
}

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
  if (!input || !input.value) return false;
  input.value = '';
  if (onSearchClear) onSearchClear(config.key);
  return true;
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

function clearOpeningAnimation() {
  openingGeneration++;
  for (const animation of openingAnimations) {
    try { animation.cancel(); } catch (_) {}
  }
  openingAnimations = [];
  const shell = document.querySelector('.app-shell');
  if (shell) shell.removeAttribute('data-nav-opening');
  document.querySelectorAll('.app-grid').forEach((grid) => grid.style.removeProperty('grid-template-columns'));
}

function animateCollapsedState(state, collapsed) {
  if (!state || !state.shell) return Promise.resolve(false);
  const grids = Array.from(state.shell.querySelectorAll('.app-grid'));
  const canAnimate = grids.length && grids.every((grid) => typeof grid.animate === 'function');
  if (!canAnimate || motion.prefersReducedMotion()) {
    setCollapsed(state, collapsed);
    return Promise.resolve(false);
  }

  const starts = grids.map((grid) => getComputedStyle(grid).gridTemplateColumns);
  setCollapsed(state, collapsed);
  const targets = grids.map((grid) => getComputedStyle(grid).gridTemplateColumns);
  const transitions = grids.map((grid, index) => motion.animate(grid, [
    { gridTemplateColumns: starts[index] },
    { gridTemplateColumns: targets[index] }
  ], { duration: motion.DURATIONS.nav, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'none' }));
  return Promise.all(transitions).then(() => true);
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
  icon.className = 'fa fa-chevron-right';
  icon.setAttribute('aria-hidden', 'true');
  toggle.appendChild(icon);
  searchCell.appendChild(toggle);

  const state = { config, shell, searchCell, mainCell, buttonCell, toggle, collapsed: true };
  toggle.addEventListener('click', () => {
    clearOpeningAnimation();
    animateCollapsedState(state, !state.collapsed);
  });

  const refreshLabels = () => syncItemLabels(config, mainCell);
  mainCell.addEventListener('mouseover', refreshLabels);
  mainCell.addEventListener('focusin', refreshLabels);

  setCollapsed(state, true);
  return state;
}

function init() {
  if (columnStates.length) return columnStates;
  columnStates = COLUMNS.map(setupColumn).filter(Boolean);
  return columnStates;
}

function collapseForLogin() {
  clearOpeningAnimation();
  for (const state of init()) setCollapsed(state, true);
  return columnStates;
}

function targetExpandedTemplate(shell) {
  const width = Math.max(0, Number(shell && shell.getBoundingClientRect().width) || 0);
  if (!width) return '';
  const unit = width / 11;
  return `${unit * 2}px ${unit * 2}px ${unit * 2}px ${unit * 5}px`;
}

function prefersReducedMotion() {
  return motion.prefersReducedMotion();
}

function revealAfterLogin() {
  const states = init();
  const shell = states[0] && states[0].shell;
  if (!shell) return Promise.resolve();

  clearOpeningAnimation();
  const grids = Array.from(shell.querySelectorAll('.app-grid'));
  const canAnimate = grids.length > 0 && grids.every((grid) => typeof grid.animate === 'function');
  if (!canAnimate || prefersReducedMotion()) {
    for (const state of states) setCollapsed(state, false);
    return Promise.resolve();
  }

  const starts = grids.map((grid) => Array.from(grid.children).slice(0, 4)
    .map((cell) => `${Math.max(0, cell.getBoundingClientRect().width)}px`).join(' '));
  const target = targetExpandedTemplate(shell);
  if (!target || starts.some((value) => !value)) {
    for (const state of states) setCollapsed(state, false);
    return Promise.resolve();
  }

  grids.forEach((grid, index) => { grid.style.gridTemplateColumns = starts[index]; });
  for (const state of states) setCollapsed(state, false);
  shell.setAttribute('data-nav-opening', 'true');

  const generation = ++openingGeneration;
  openingAnimations = grids.map((grid, index) => grid.animate([
    { gridTemplateColumns: starts[index] },
    { gridTemplateColumns: target }
  ], { duration: OPEN_DURATION_MS, easing: 'cubic-bezier(.22,.61,.36,1)' }));

  return Promise.all(openingAnimations.map((animation) => animation.finished.catch(() => null)))
    .then(() => {
      if (generation !== openingGeneration) return;
      openingAnimations = [];
      shell.removeAttribute('data-nav-opening');
      grids.forEach((grid) => grid.style.removeProperty('grid-template-columns'));
    });
}

if (typeof document !== 'undefined') init();

exports.configure = configure;
exports.collapseForLogin = collapseForLogin;
exports.revealAfterLogin = revealAfterLogin;
exports._test = { OPEN_DURATION_MS, COLUMNS, getCell, syncItemLabels, clearHiddenSearch, setCollapsed, animateCollapsedState, setupColumn, init, collapseForLogin, targetExpandedTemplate, prefersReducedMotion, revealAfterLogin };