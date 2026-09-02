'use strict';

const serviceCatalog = require('./service-catalog');
const vaultItemUi = require('./vault-item-ui');

const EXCHANGE_CATEGORY = 'Exchange Account';
const LEGACY_SERVICE_CATEGORY = 'Web3 / Website Account';
const WEB3_CATEGORY = 'Web3 Account';
const WEBSITE_CATEGORY = 'Website Account';

const WEB3_PRESETS = Object.freeze([
  'Chain Games',
  'Aave',
  'FIO App',
  'Lido',
  'OpenSea',
  'Uniswap'
]);

const WEBSITE_EXTRA_PRESETS = Object.freeze([
  'CoinGecko',
  'CoinTracker',
  'Etherscan',
  'Koinly',
  'Solscan'
]);

const WEB3_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Website', 'url'],
  ['Login method', 'text'],
  ['Connected wallet(s)', 'text'],
  ['Account / profile ID', 'text'],
  ['2FA method', 'text'],
  ['2FA recovery / backup codes', 'sensitive']
]);

const WEBSITE_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Website', 'url'],
  ['Login method', 'text'],
  ['Account / profile ID', 'text'],
  ['2FA method', 'text'],
  ['2FA recovery / backup codes', 'sensitive']
]);

const ACCOUNT_ONLY_HIDE_IDS = Object.freeze([
  'inputManufacturer',
  'inputModel',
  'inputPurchaseDate',
  'inputRecoveryFormat',
  'inputRecoveryStorageMode',
  'inputDeviceLocation',
  'inputPassphraseUsed',
  'inputSeedPhrase'
]);

const normalize = (value) => String(value || '').trim().toLowerCase();
const WEB3_NAMES = new Set(WEB3_PRESETS.map(normalize));

function isWeb3Name(name) {
  return WEB3_NAMES.has(normalize(name));
}

function inferAccountType(name, category) {
  if (category === WEB3_CATEGORY || category === WEBSITE_CATEGORY) return category;
  if (category !== LEGACY_SERVICE_CATEGORY) return category || '';
  return isWeb3Name(name) ? WEB3_CATEGORY : WEBSITE_CATEGORY;
}

function websitePresetNames() {
  const names = serviceCatalog.SERVICES
    .map((service) => service.name)
    .filter((name) => !isWeb3Name(name));
  for (const name of WEBSITE_EXTRA_PRESETS) {
    if (!names.includes(name)) names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

function presetNames(category) {
  if (category === WEB3_CATEGORY) return [...WEB3_PRESETS];
  if (category === WEBSITE_CATEGORY) return websitePresetNames();
  return [];
}

function fieldWrap(input) {
  return input && input.closest ? input.closest('.edit-info-grid-field, .form-group') : null;
}

function setFieldVisible(form, id, visible) {
  const input = form.querySelector(`#${id}`);
  const wrap = fieldWrap(input);
  if (wrap) wrap.style.display = visible ? '' : 'none';
}

function setLabel(form, id, text) {
  const input = form.querySelector(`#${id}`);
  const wrap = fieldWrap(input);
  const label = wrap && wrap.querySelector('label');
  if (label) label.textContent = text;
}

function customFieldLabels(form) {
  return new Set([...form.querySelectorAll('.custom-field-label-control input')]
    .map((input) => normalize(input.value))
    .filter(Boolean));
}

function addCustomField(form, label, type) {
  if (customFieldLabels(form).has(normalize(label))) return;
  const add = form.querySelector('.custom-field-add');
  if (!add || typeof add.click !== 'function') return;
  add.click();
  const rows = form.querySelectorAll('.custom-field-edit-row');
  const row = rows[rows.length - 1];
  if (!row) return;
  const labelInput = row.querySelector('.custom-field-label-control input');
  const typeSelect = row.querySelector('.custom-field-type-control select');
  if (labelInput) labelInput.value = label;
  if (typeSelect) {
    typeSelect.value = type;
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function ensureAccountFields(form, category) {
  const fields = category === WEB3_CATEGORY
    ? WEB3_FIELDS
    : category === WEBSITE_CATEGORY ? WEBSITE_FIELDS : [];
  for (const [label, type] of fields) addCustomField(form, label, type);
}

function ensureCategoryOption(categoryInput, value) {
  if ([...categoryInput.options].some((option) => option.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  categoryInput.appendChild(option);
}

function removeLegacyCategoryOption(categoryInput) {
  const legacy = [...categoryInput.options].find((option) => option.value === LEGACY_SERVICE_CATEGORY);
  if (legacy) legacy.remove();
}

function ensurePresetField(form, categoryInput) {
  let wrap = form.querySelector('.vault-item-preset-field');
  if (wrap) return wrap;

  wrap = document.createElement('div');
  wrap.className = 'form-group edit-info-grid-field vault-item-preset-field';
  const label = document.createElement('label');
  label.textContent = 'Known platform (optional)';
  const select = document.createElement('select');
  select.className = 'form-control';
  select.id = 'inputVaultItemPreset';
  const note = document.createElement('p');
  note.className = 'vault-item-preset-note';
  wrap.appendChild(label);
  wrap.appendChild(select);
  wrap.appendChild(note);

  const categoryWrap = fieldWrap(categoryInput);
  if (categoryWrap && categoryWrap.parentNode) categoryWrap.parentNode.insertBefore(wrap, categoryWrap.nextSibling);

  select.addEventListener('change', () => {
    if (!select.value) return;
    const name = form.querySelector('#inputName');
    if (name) name.value = select.value;
    ensureAccountFields(form, categoryInput.value);
  });
  return wrap;
}

function updatePresetField(form, categoryInput) {
  if (![WEB3_CATEGORY, WEBSITE_CATEGORY].includes(categoryInput.value)) return;
  const wrap = ensurePresetField(form, categoryInput);
  const select = wrap.querySelector('select');
  const previous = select && select.value;
  const names = presetNames(categoryInput.value);
  wrap.style.display = '';
  if (!select) return;
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = categoryInput.value === WEB3_CATEGORY
    ? 'Choose a Web3 service…'
    : 'Choose a website…';
  select.appendChild(blank);
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  const inputName = form.querySelector('#inputName');
  const preferred = names.includes(previous) ? previous : String(inputName && inputName.value || '').trim();
  if (names.includes(preferred)) select.value = preferred;
  const note = wrap.querySelector('.vault-item-preset-note');
  if (note) {
    note.textContent = categoryInput.value === WEB3_CATEGORY
      ? 'Choose a known Web3 service for local recognition and icons. SafeLedger never auto-fills a login URL.'
      : 'Choose a known website for local recognition and icons. SafeLedger never auto-fills a login URL.';
  }
}

function updateAccountLayout(form, categoryInput) {
  const category = categoryInput.value;
  if (![WEB3_CATEGORY, WEBSITE_CATEGORY].includes(category)) return;
  for (const id of ACCOUNT_ONLY_HIDE_IDS) setFieldVisible(form, id, false);
  setLabel(form, 'inputCategory', 'Vault item type');
  setLabel(form, 'inputRecoveryLink', 'Account recovery link');
  setLabel(form, 'inputRecoveryLocation', 'Recovery / backup-code location');
  setLabel(form, 'inputBackupLocation', 'Backup / exported-data location');
  ensureAccountFields(form, category);
  updatePresetField(form, categoryInput);
}

function patchEditForm(area) {
  const categoryInput = area && area.querySelector('#inputCategory');
  if (!categoryInput) return;
  const form = categoryInput.closest('form');
  if (!form) return;

  ensureCategoryOption(categoryInput, WEB3_CATEGORY);
  ensureCategoryOption(categoryInput, WEBSITE_CATEGORY);

  const heading = area.querySelector('h1');
  const modifying = Boolean(heading && /Modify/i.test(String(heading.textContent || '')));
  const nameInput = form.querySelector('#inputName');
  const name = nameInput && nameInput.value;
  const lastViewed = vaultItemUi && vaultItemUi._test && typeof vaultItemUi._test.getLastViewedCategory === 'function'
    ? vaultItemUi._test.getLastViewedCategory()
    : '';

  let desired = categoryInput.value;
  if (desired === LEGACY_SERVICE_CATEGORY) desired = inferAccountType(name, desired);
  else if (modifying && !desired && [LEGACY_SERVICE_CATEGORY, WEB3_CATEGORY, WEBSITE_CATEGORY].includes(lastViewed)) {
    desired = inferAccountType(name, lastViewed);
  }

  removeLegacyCategoryOption(categoryInput);
  if ([WEB3_CATEGORY, WEBSITE_CATEGORY].includes(desired)) categoryInput.value = desired;

  if (categoryInput.dataset.safeLedgerTypeSplit !== 'true') {
    categoryInput.dataset.safeLedgerTypeSplit = 'true';
    categoryInput.addEventListener('change', () => {
      if ([WEB3_CATEGORY, WEBSITE_CATEGORY].includes(categoryInput.value)) updateAccountLayout(form, categoryInput);
    });
  }

  updateAccountLayout(form, categoryInput);
}

function patchListCategories(root = document) {
  for (const anchor of root.querySelectorAll('#groupArea .nav > li > a')) {
    const category = anchor.querySelector('.wallet-list-category');
    const name = anchor.querySelector('.wallet-list-name');
    if (!category || String(category.textContent || '').trim() !== LEGACY_SERVICE_CATEGORY) continue;
    category.textContent = inferAccountType(name && name.textContent, LEGACY_SERVICE_CATEGORY);
  }
}

function patchDetailCategory(area) {
  const category = area && area.querySelector('.wallet-detail-category');
  if (!category || String(category.textContent || '').trim() !== LEGACY_SERVICE_CATEGORY) return;
  const name = area.querySelector('.wallet-detail-title, h1');
  category.textContent = inferAccountType(name && name.textContent, LEGACY_SERVICE_CATEGORY);
}

function patchAccountIcons(root = document) {
  for (const anchor of root.querySelectorAll('#groupArea .nav > li > a')) {
    const category = anchor.querySelector('.wallet-list-category');
    const nameNode = anchor.querySelector('.wallet-list-name');
    const categoryText = String(category && category.textContent || '').trim();
    if (![WEB3_CATEGORY, WEBSITE_CATEGORY, LEGACY_SERVICE_CATEGORY].includes(categoryText) || !nameNode) continue;
    const service = serviceCatalog.find(nameNode.textContent);
    if (!service) continue;
    const existing = anchor.querySelector('.vault-service-icon, .wallet-list-icon, .wallet-list-catalog-icon, .wallet-list-brand-image, .wallet-list-fallback-icon');
    if (existing && existing.dataset && existing.dataset.serviceCatalog === service.name) continue;
    const icon = serviceCatalog.createIcon(service.name, 'wallet-list-brand-image vault-service-icon known-service-brand-image');
    if (!icon) continue;
    icon.dataset.serviceCatalog = service.name;
    if (existing) existing.replaceWith(icon);
    else anchor.insertBefore(icon, anchor.firstChild);
  }
}

function patch(root = document) {
  const area = document.getElementById('detailArea');
  if (area) {
    patchEditForm(area);
    patchDetailCategory(area);
  }
  patchListCategories(root);
  patchAccountIcons(root);
}

function start() {
  patch(document);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      patch(document);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.EXCHANGE_CATEGORY = EXCHANGE_CATEGORY;
exports.LEGACY_SERVICE_CATEGORY = LEGACY_SERVICE_CATEGORY;
exports.WEB3_CATEGORY = WEB3_CATEGORY;
exports.WEBSITE_CATEGORY = WEBSITE_CATEGORY;
exports.WEB3_PRESETS = WEB3_PRESETS;
exports.WEBSITE_EXTRA_PRESETS = WEBSITE_EXTRA_PRESETS;
exports._test = {
  isWeb3Name,
  inferAccountType,
  websitePresetNames,
  presetNames,
  customFieldLabels,
  patchEditForm,
  patchListCategories,
  patchDetailCategory
};