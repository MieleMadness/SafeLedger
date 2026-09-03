'use strict';

const serviceCatalog = require('./service-catalog');
const vaultItemUi = require('./vault-item-ui');

const EXCHANGE_CATEGORY = 'Exchange Account';
const LEGACY_SERVICE_CATEGORY = 'Web3 / Website Account';
const WEB3_CATEGORY = 'Web3 Account';
const WEBSITE_CATEGORY = 'Website Account';

const TYPE_GROUPS = Object.freeze([
  Object.freeze({ label: 'Accounts', values: Object.freeze([EXCHANGE_CATEGORY, WEB3_CATEGORY, WEBSITE_CATEGORY].sort((a, b) => a.localeCompare(b))) }),
  Object.freeze({ label: 'Wallets', values: Object.freeze(['Hardware Wallet', 'Other Wallet', 'Software Wallet'].sort((a, b) => a.localeCompare(b))) })
].sort((a, b) => a.label.localeCompare(b)));

const WEB3_PRESET_GROUPS = Object.freeze([
  Object.freeze({ label: 'DeFi', names: Object.freeze(['Aave', 'Lido', 'Uniswap']) }),
  Object.freeze({ label: 'Gaming', names: Object.freeze(['Chain Games']) }),
  Object.freeze({ label: 'Identity & Naming', names: Object.freeze(['FIO App']) }),
  Object.freeze({ label: 'NFT', names: Object.freeze(['OpenSea']) })
].map((group) => Object.freeze({ label: group.label, names: Object.freeze([...group.names].sort((a, b) => a.localeCompare(b))) }))
  .sort((a, b) => a.label.localeCompare(b)));

const WEBSITE_GROUP_BY_NAME = Object.freeze({
  'Adobe': 'Productivity & Cloud',
  'Amazon': 'Shopping & Payments',
  'Apple': 'Productivity & Cloud',
  'CoinGecko': 'Finance & Crypto',
  'CoinTracker': 'Finance & Crypto',
  'Discord': 'Social & Community',
  'Dropbox': 'Productivity & Cloud',
  'eBay': 'Shopping & Payments',
  'Etherscan': 'Finance & Crypto',
  'Facebook': 'Social & Community',
  'GitHub': 'Developer',
  'Gmail': 'Email',
  'Google': 'Productivity & Cloud',
  'Instagram': 'Social & Community',
  'Koinly': 'Finance & Crypto',
  'LinkedIn': 'Social & Community',
  'Microsoft': 'Productivity & Cloud',
  'Netflix': 'Entertainment',
  'Outlook': 'Email',
  'PayPal': 'Shopping & Payments',
  'Proton': 'Email',
  'Reddit': 'Social & Community',
  'Slack': 'Productivity & Cloud',
  'Solscan': 'Finance & Crypto',
  'Spotify': 'Entertainment',
  'Steam': 'Entertainment',
  'TikTok': 'Social & Community',
  'Twitch': 'Entertainment',
  'X / Twitter': 'Social & Community',
  'Yahoo': 'Email',
  'YouTube': 'Entertainment',
  'Zoom': 'Productivity & Cloud'
});

const WEBSITE_EXTRA_PRESETS = Object.freeze(['CoinGecko', 'CoinTracker', 'Etherscan', 'Koinly', 'Solscan']);
const WEB3_PRESETS = Object.freeze(WEB3_PRESET_GROUPS.flatMap((group) => group.names));

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

function websitePresetGroups() {
  const grouped = new Map();
  for (const name of websitePresetNames()) {
    const label = WEBSITE_GROUP_BY_NAME[name] || 'Other';
    const names = grouped.get(label) || [];
    names.push(name);
    grouped.set(label, names);
  }
  return [...grouped.entries()]
    .map(([label, names]) => ({ label, names: names.sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function groupedPresetNames(category) {
  if (category === WEB3_CATEGORY) return WEB3_PRESET_GROUPS.map((group) => ({ label: group.label, names: [...group.names] }));
  if (category === WEBSITE_CATEGORY) return websitePresetGroups();
  return [];
}

function presetNames(category) {
  return groupedPresetNames(category).flatMap((group) => group.names);
}

function fieldWrap(input) {
  return input && input.closest ? input.closest('.edit-info-grid-field, .form-group') : null;
}

function setFieldVisible(form, id, visible) {
  const input = form.querySelector(`#${id}`);
  const wrap = fieldWrap(input);
  if (!wrap) return;
  const display = visible ? '' : 'none';
  if (wrap.style.display !== display) wrap.style.display = display;
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setLabel(form, id, text) {
  const input = form.querySelector(`#${id}`);
  const wrap = fieldWrap(input);
  setText(wrap && wrap.querySelector('label'), text);
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

function appendOption(parent, value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  parent.appendChild(option);
  return option;
}

function typeSignature() {
  return TYPE_GROUPS.map((group) => `${group.label}:${group.values.join('|')}`).join('||');
}

function rebuildTypeOptions(categoryInput, selectedValue) {
  const signature = typeSignature();
  if (categoryInput.dataset.safeLedgerTypeOptionSignature !== signature) {
    categoryInput.innerHTML = '';
    const blank = appendOption(categoryInput, '');
    blank.textContent = 'Choose a type…';
    for (const group of TYPE_GROUPS) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      for (const value of group.values) appendOption(optgroup, value);
      categoryInput.appendChild(optgroup);
    }
    categoryInput.dataset.safeLedgerTypeOptionSignature = signature;
  }
  if ([...categoryInput.options].some((option) => option.value === selectedValue)) categoryInput.value = selectedValue;
}

function groupedOptionSignature(groups, placeholder) {
  return `${placeholder}::${groups.map((group) => `${group.label}:${group.names.join('|')}`).join('||')}`;
}

function renderGroupedOptions(select, groups, placeholder) {
  const signature = groupedOptionSignature(groups, placeholder);
  if (select.dataset.safeLedgerGroupedOptionSignature === signature) return false;

  select.innerHTML = '';
  const blank = appendOption(select, '');
  blank.textContent = placeholder;
  for (const group of groups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const name of group.names) appendOption(optgroup, name);
    select.appendChild(optgroup);
  }
  select.dataset.safeLedgerGroupedOptionSignature = signature;
  return true;
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
  const groups = groupedPresetNames(categoryInput.value);
  const names = groups.flatMap((group) => group.names);
  if (wrap.style.display !== '') wrap.style.display = '';
  if (!select) return;

  const placeholder = categoryInput.value === WEB3_CATEGORY ? 'Choose a Web3 service…' : 'Choose a website…';
  renderGroupedOptions(select, groups, placeholder);

  const inputName = form.querySelector('#inputName');
  const preferred = names.includes(previous) ? previous : String(inputName && inputName.value || '').trim();
  if (names.includes(preferred) && select.value !== preferred) select.value = preferred;

  setText(wrap.querySelector('label'), categoryInput.value === WEB3_CATEGORY ? 'Known Web3 service (optional)' : 'Known website (optional)');
  setText(
    wrap.querySelector('.vault-item-preset-note'),
    categoryInput.value === WEB3_CATEGORY
      ? 'Web3 services are grouped by purpose and alphabetized. SafeLedger uses only local recognition/icons and never auto-fills a login URL.'
      : 'Websites are grouped by purpose and alphabetized. SafeLedger uses only local recognition/icons and never auto-fills a login URL.'
  );
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

  rebuildTypeOptions(categoryInput, desired);

  if (categoryInput.dataset.safeLedgerTypeSplit !== 'true') {
    categoryInput.dataset.safeLedgerTypeSplit = 'true';
    categoryInput.addEventListener('change', () => updateAccountLayout(form, categoryInput));
  }

  updateAccountLayout(form, categoryInput);
}

function patchListCategories(root = document) {
  for (const anchor of root.querySelectorAll('#groupArea .nav > li > a')) {
    const category = anchor.querySelector('.wallet-list-category');
    const name = anchor.querySelector('.wallet-list-name');
    if (!category || String(category.textContent || '').trim() !== LEGACY_SERVICE_CATEGORY) continue;
    setText(category, inferAccountType(name && name.textContent, LEGACY_SERVICE_CATEGORY));
  }
}

function patchDetailCategory(area) {
  const category = area && area.querySelector('.wallet-detail-category');
  if (!category) return;
  const name = area.querySelector('.wallet-detail-title, h1');
  let categoryText = String(category.textContent || '').trim();
  if (categoryText === LEGACY_SERVICE_CATEGORY) {
    categoryText = inferAccountType(name && name.textContent, LEGACY_SERVICE_CATEGORY);
    setText(category, categoryText);
  }
  if (![EXCHANGE_CATEGORY, WEB3_CATEGORY, WEBSITE_CATEGORY].includes(categoryText)) return;
  for (const heading of area.querySelectorAll('.product-section-title')) {
    if (heading.textContent !== 'Wallet information' && heading.textContent !== 'Account / service information' && heading.textContent !== 'Web3 account information' && heading.textContent !== 'Website account information' && heading.textContent !== 'Account information') continue;
    setText(
      heading,
      categoryText === WEB3_CATEGORY
        ? 'Web3 account information'
        : categoryText === WEBSITE_CATEGORY ? 'Website account information' : 'Account information'
    );
  }
}

function patchAccountIcons(root = document) {
  for (const anchor of root.querySelectorAll('#groupArea .nav > li > a')) {
    const category = anchor.querySelector('.wallet-list-category');
    const nameNode = anchor.querySelector('.wallet-list-name');
    const categoryText = String(category && category.textContent || '').trim();
    if (![WEB3_CATEGORY, WEBSITE_CATEGORY, LEGACY_SERVICE_CATEGORY].includes(categoryText) || !nameNode) continue;
    const existing = anchor.querySelector('.vault-service-icon, .wallet-list-icon, .wallet-list-catalog-icon, .wallet-list-brand-image, .wallet-list-fallback-icon');
    const service = serviceCatalog.find(nameNode.textContent);
    if (service) {
      if (existing && existing.dataset && existing.dataset.serviceCatalog === service.name) continue;
      const icon = serviceCatalog.createIcon(service.name, 'wallet-list-brand-image vault-service-icon known-service-brand-image');
      if (!icon) continue;
      icon.dataset.serviceCatalog = service.name;
      if (existing) existing.replaceWith(icon);
      else anchor.insertBefore(icon, anchor.firstChild);
      continue;
    }

    if (existing && existing.classList && existing.classList.contains('vault-service-icon')) continue;
    const fallback = document.createElement('i');
    fallback.className = 'fa fa-globe vault-service-icon';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.setAttribute('title', 'Account / service');
    if (existing) existing.replaceWith(fallback);
    else anchor.insertBefore(fallback, anchor.firstChild);
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
  let observer;
  const observe = () => observer.observe(document.body, { childList: true, subtree: true });
  observer = new MutationObserver(() => {
    // Never observe DOM changes produced by this patch itself. The 2.6.5
    // implementation rebuilt labels/options while observing those rebuilds,
    // creating a self-sustaining Web3/Website render loop.
    observer.disconnect();
    try {
      patch(document);
    } finally {
      observe();
    }
  });
  observe();
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.EXCHANGE_CATEGORY = EXCHANGE_CATEGORY;
exports.LEGACY_SERVICE_CATEGORY = LEGACY_SERVICE_CATEGORY;
exports.WEB3_CATEGORY = WEB3_CATEGORY;
exports.WEBSITE_CATEGORY = WEBSITE_CATEGORY;
exports.TYPE_GROUPS = TYPE_GROUPS;
exports.WEB3_PRESET_GROUPS = WEB3_PRESET_GROUPS;
exports.WEB3_PRESETS = WEB3_PRESETS;
exports.WEBSITE_EXTRA_PRESETS = WEBSITE_EXTRA_PRESETS;
exports._test = {
  isWeb3Name,
  inferAccountType,
  websitePresetNames,
  websitePresetGroups,
  groupedPresetNames,
  presetNames,
  customFieldLabels,
  rebuildTypeOptions,
  renderGroupedOptions,
  updatePresetField,
  updateAccountLayout,
  patchEditForm,
  patchListCategories,
  patchDetailCategory,
  groupedOptionSignature
};
