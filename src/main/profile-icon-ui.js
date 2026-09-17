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
const BATCH_SIZE = 72;
const catalogCache = new Map();
const catalogBySelectionId = new Map();

function rememberCatalog(items) {
  for (const item of items) catalogBySelectionId.set(iconModel.selectionId(item.selection), item);
  return Object.freeze(items);
}

function entries(group) {
  if (catalogCache.has(group)) return catalogCache.get(group);

  let items = [];
  if (iconModel.WEB3_CATEGORIES.includes(group)) {
    items = web3Icons.entries(group).map((entry) => Object.freeze({
      label: entry.name,
      search: `${entry.name} ${entry.key}`.toLowerCase(),
      selection: Object.freeze({ type: 'web3', category: group, key: entry.key })
    }));
    if (group === 'tokens' && !items.some((entry) => /chain games/i.test(entry.label))) {
      items.push(Object.freeze({
        label: 'Chain Games',
        search: 'chain games chain',
        selection: Object.freeze({ type: 'service', key: 'Chain Games' })
      }));
      items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }
  } else if (group === 'services') {
    items = serviceCatalog.SERVICES.map((service) => Object.freeze({
      label: service.name,
      search: `${service.name} ${service.aliases.join(' ')}`.toLowerCase(),
      selection: Object.freeze({ type: 'service', key: service.name })
    })).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  } else if (group === 'general') {
    items = iconModel.GENERAL_ICONS.map((entry) => Object.freeze({
      label: entry.label,
      search: `${entry.label} ${entry.key}`.toLowerCase(),
      selection: Object.freeze({ type: 'local', key: entry.key })
    }));
  }

  const catalog = rememberCatalog(items);
  catalogCache.set(group, catalog);
  return catalog;
}

function findCatalogEntry(selection) {
  const id = iconModel.selectionId(selection);
  if (id === 'initial') return null;
  if (catalogBySelectionId.has(id)) return catalogBySelectionId.get(id);
  entries(groupForSelection(selection));
  return catalogBySelectionId.get(id) || null;
}

function createIcon(selection, className = 'profile-icon-visual') {
  const icon = iconModel.tryNormalizeSelection(selection);
  if (!icon || typeof document === 'undefined') return null;

  if (icon.type === 'web3') {
    const match = web3Icons.entry(icon.category, icon.key);
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
  let matches = [];
  let renderedCount = 0;
  let loadMoreButton = null;

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
  const optionButtons = new Map();

  const updateSummary = () => {
    preview.innerHTML = '';
    const visual = createIcon(selected, 'profile-icon-picker-preview-visual') || createInitial('', 'profile-icon-picker-preview-initial');
    preview.appendChild(visual);
    const match = findCatalogEntry(selected);
    summaryText.textContent = match ? match.label : (selected ? 'Selected icon' : 'Using profile initial');
    clear.disabled = !selected;
  };

  const setOptionSelected = (button, isSelected) => {
    if (!button) return;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  };

  const syncSelectedButton = (previousId) => {
    if (previousId) setOptionSelected(optionButtons.get(previousId), false);
    setOptionSelected(optionButtons.get(iconModel.selectionId(selected)), true);
  };

  const createOptionButton = (entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'profile-icon-option';
    button.title = entry.label;
    const visual = createIcon(entry.selection, 'profile-icon-option-visual');
    if (visual) button.appendChild(visual);
    const label = document.createElement('span'); label.textContent = entry.label; button.appendChild(label);
    const id = iconModel.selectionId(entry.selection);
    setOptionSelected(button, id === iconModel.selectionId(selected));
    button.addEventListener('click', () => {
      const previousId = iconModel.selectionId(selected);
      selected = iconModel.normalizeSelection(entry.selection);
      updateSummary();
      syncSelectedButton(previousId);
    });
    optionButtons.set(id, button);
    return button;
  };

  const appendNextBatch = () => {
    if (renderedCount >= matches.length) return;
    if (loadMoreButton) {
      loadMoreButton.remove();
      loadMoreButton = null;
    }

    const end = Math.min(renderedCount + BATCH_SIZE, matches.length);
    const fragment = document.createDocumentFragment();
    for (let index = renderedCount; index < end; index++) fragment.appendChild(createOptionButton(matches[index]));
    renderedCount = end;
    grid.appendChild(fragment);

    if (renderedCount < matches.length) {
      const remaining = matches.length - renderedCount;
      loadMoreButton = document.createElement('button');
      loadMoreButton.type = 'button';
      loadMoreButton.className = 'btn btn-default btn-sm profile-icon-picker-more';
      loadMoreButton.textContent = `Show more icons (${remaining} remaining)`;
      loadMoreButton.addEventListener('click', appendNextBatch);
      grid.appendChild(loadMoreButton);
    }
  };

  const renderGrid = () => {
    grid.innerHTML = '';
    grid.scrollTop = 0;
    optionButtons.clear();
    loadMoreButton = null;
    renderedCount = 0;
    const query = String(search.value || '').trim().toLowerCase();
    matches = entries(activeGroup).filter((entry) => !query || entry.search.includes(query));

    if (!matches.length) {
      const empty = document.createElement('p'); empty.className = 'profile-icon-picker-empty'; empty.textContent = 'No matching icons in this category.'; grid.appendChild(empty);
    } else {
      appendNextBatch();
    }

    for (const [key, button] of tabButtons) {
      const active = key === activeGroup;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  };

  for (const [key, button] of tabButtons) button.addEventListener('click', () => {
    if (activeGroup === key && !search.value) return;
    activeGroup = key;
    search.value = '';
    renderGrid();
  });
  search.addEventListener('input', renderGrid);
  grid.addEventListener('scroll', () => {
    if (renderedCount >= matches.length) return;
    if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 80) appendNextBatch();
  });
  clear.addEventListener('click', () => {
    const previousId = iconModel.selectionId(selected);
    selected = null;
    updateSummary();
    syncSelectedButton(previousId);
  });
  updateSummary();
  renderGrid();

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
exports._test = { groupForSelection, findCatalogEntry, BATCH_SIZE, catalogCache };
