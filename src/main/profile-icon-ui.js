'use strict';

const iconModel = require('./profile-icon-model');
const web3Icons = require('./web3-icons');
const serviceCatalog = require('./service-catalog');

const GROUPS = Object.freeze([
  { key: 'tokens', label: 'Crypto' },
  { key: 'networks', label: 'Networks' },
  { key: 'wallets', label: 'Wallets' },
  { key: 'exchanges', label: 'Exchanges' },
  { key: 'services', label: 'Services' },
  { key: 'general', label: 'General' }
]);

function entries(group) {
  if (iconModel.WEB3_CATEGORIES.includes(group)) {
    const items = web3Icons.entries(group).map((entry) => ({
      label: entry.name,
      search: `${entry.name} ${entry.key}`.toLowerCase(),
      selection: { type: 'web3', category: group, key: entry.key }
    }));
    if (group === 'tokens' && !items.some((entry) => /chain games/i.test(entry.label))) {
      items.push({ label: 'Chain Games', search: 'chain games chain', selection: { type: 'service', key: 'Chain Games' } });
      items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }
    return items;
  }
  if (group === 'services') {
    return serviceCatalog.SERVICES.map((service) => ({
      label: service.name,
      search: `${service.name} ${service.aliases.join(' ')}`.toLowerCase(),
      selection: { type: 'service', key: service.name }
    })).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }
  if (group === 'general') {
    return iconModel.GENERAL_ICONS.map((entry) => ({
      label: entry.label,
      search: `${entry.label} ${entry.key}`.toLowerCase(),
      selection: { type: 'local', key: entry.key }
    }));
  }
  return [];
}

function createIcon(selection, className = 'profile-icon-visual') {
  const icon = iconModel.tryNormalizeSelection(selection);
  if (!icon || typeof document === 'undefined') return null;

  if (icon.type === 'web3') {
    const match = web3Icons.entries(icon.category).find((entry) => entry.key === icon.key);
    return match ? web3Icons.createImage(match.src, match.name, className) : null;
  }
  if (icon.type === 'service') return serviceCatalog.createIcon(icon.key, className);

  const element = document.createElement('i');
  const family = icon.key.startsWith('glyphicon-') ? 'glyphicon' : 'fa';
  element.className = `${family} ${icon.key} ${className}`;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function createInitial(name, className = 'profile-list-initial') {
  const initial = document.createElement('span');
  initial.className = className;
  initial.textContent = String(name || '').trim().charAt(0).toUpperCase() || '?';
  return initial;
}

function createProfileVisual(profile, className = 'profile-icon-visual', initialClass = 'profile-list-initial') {
  return createIcon(profile && profile.profileIcon, className) || createInitial(profile && profile.name, initialClass);
}

function groupForSelection(selection) {
  const icon = iconModel.tryNormalizeSelection(selection);
  if (!icon) return 'tokens';
  if (icon.type === 'web3') return icon.category;
  return icon.type === 'service' ? 'services' : 'general';
}

function createPicker(initialSelection) {
  let selected = iconModel.tryNormalizeSelection(initialSelection);
  let activeGroup = groupForSelection(selected);

  const root = document.createElement('div'); root.className = 'profile-icon-picker';
  const summary = document.createElement('div'); summary.className = 'profile-icon-picker-summary';
  const preview = document.createElement('span'); preview.className = 'profile-icon-picker-preview';
  const summaryText = document.createElement('span'); summaryText.className = 'profile-icon-picker-summary-text';
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn btn-default btn-sm'; clear.textContent = 'Use initial';
  summary.appendChild(preview); summary.appendChild(summaryText); summary.appendChild(clear); root.appendChild(summary);

  const tabs = document.createElement('div'); tabs.className = 'profile-icon-picker-tabs'; tabs.setAttribute('role', 'tablist');
  const tabButtons = new Map();
  for (const group of GROUPS) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'profile-icon-picker-tab'; button.textContent = group.label; button.dataset.iconGroup = group.key; button.setAttribute('role', 'tab');
    tabs.appendChild(button); tabButtons.set(group.key, button);
  }
  root.appendChild(tabs);

  const search = document.createElement('input'); search.type = 'search'; search.className = 'form-control profile-icon-picker-search'; search.placeholder = 'Search icons'; search.setAttribute('aria-label', 'Search profile icons'); root.appendChild(search);
  const grid = document.createElement('div'); grid.className = 'profile-icon-picker-grid'; root.appendChild(grid);

  const updateSummary = () => {
    preview.innerHTML = '';
    const visual = createIcon(selected, 'profile-icon-picker-preview-visual') || createInitial('', 'profile-icon-picker-preview-initial');
    preview.appendChild(visual);
    const id = iconModel.selectionId(selected);
    if (id === 'initial') summaryText.textContent = 'Using profile initial';
    else {
      const all = entries(groupForSelection(selected));
      const match = all.find((entry) => iconModel.sameSelection(entry.selection, selected));
      summaryText.textContent = match ? match.label : 'Selected icon';
    }
    clear.disabled = !selected;
  };

  const renderGrid = () => {
    grid.innerHTML = '';
    const query = String(search.value || '').trim().toLowerCase();
    const matches = entries(activeGroup).filter((entry) => !query || entry.search.includes(query));
    for (const entry of matches) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'profile-icon-option'; button.title = entry.label;
      const visual = createIcon(entry.selection, 'profile-icon-option-visual');
      if (visual) button.appendChild(visual);
      const label = document.createElement('span'); label.textContent = entry.label; button.appendChild(label);
      const isSelected = iconModel.sameSelection(entry.selection, selected);
      button.classList.toggle('is-selected', isSelected); button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      button.addEventListener('click', () => { selected = iconModel.normalizeSelection(entry.selection); updateSummary(); renderGrid(); });
      grid.appendChild(button);
    }
    if (!matches.length) {
      const empty = document.createElement('p'); empty.className = 'profile-icon-picker-empty'; empty.textContent = 'No matching icons in this category.'; grid.appendChild(empty);
    }
    for (const [key, button] of tabButtons) {
      const active = key === activeGroup; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  };

  for (const [key, button] of tabButtons) button.addEventListener('click', () => { activeGroup = key; search.value = ''; renderGrid(); });
  search.addEventListener('input', renderGrid);
  clear.addEventListener('click', () => { selected = null; updateSummary(); renderGrid(); });
  updateSummary(); renderGrid();

  return {
    element: root,
    getSelection() { return selected ? Object.assign({}, selected) : null; }
  };
}

exports.GROUPS = GROUPS;
exports.entries = entries;
exports.createIcon = createIcon;
exports.createInitial = createInitial;
exports.createProfileVisual = createProfileVisual;
exports.createPicker = createPicker;
exports._test = { groupForSelection };
