'use strict';

/*
 * Canonical Vault Item presentation and edit-form behavior.
 *
 * This module is deliberately passive: it does not observe or patch the page.
 * group.js calls these helpers while it is already rendering a Vault Item, so
 * category normalization, presets, account fields, and icons have one owner.
 */

const profileSetup = require('./profile-setup');
const serviceCatalog = require('./service-catalog');
const walletIcons = require('./wallet-icons');
const web3Icons = require('./web3-icons');

const EXCHANGE_CATEGORY = 'Exchange Account';
const LEGACY_SERVICE_CATEGORY = 'Web3 / Website Account';
const WEB3_CATEGORY = 'Web3 Account';
const WEBSITE_CATEGORY = 'Website Account';
const HARDWARE_CATEGORY = 'Hardware Wallet';
const SOFTWARE_CATEGORY = 'Software Wallet';
const OTHER_WALLET_CATEGORY = 'Other Wallet';

const WALLET_CATEGORIES = new Set([HARDWARE_CATEGORY, SOFTWARE_CATEGORY, OTHER_WALLET_CATEGORY]);
const ACCOUNT_CATEGORIES = new Set([EXCHANGE_CATEGORY, WEB3_CATEGORY, WEBSITE_CATEGORY]);

const TYPE_GROUPS = Object.freeze([
  Object.freeze({
    label: 'Accounts',
    values: Object.freeze([EXCHANGE_CATEGORY, WEB3_CATEGORY, WEBSITE_CATEGORY].sort((a, b) => a.localeCompare(b)))
  }),
  Object.freeze({
    label: 'Wallets',
    values: Object.freeze([HARDWARE_CATEGORY, OTHER_WALLET_CATEGORY, SOFTWARE_CATEGORY].sort((a, b) => a.localeCompare(b)))
  })
].sort((a, b) => a.label.localeCompare(b)));

const WEB3_PRESET_GROUPS = Object.freeze([
  Object.freeze({ label: 'DeFi', names: Object.freeze(['Aave', 'Lido', 'Uniswap']) }),
  Object.freeze({ label: 'Gaming', names: Object.freeze(['Chain Games']) }),
  Object.freeze({ label: 'Identity & Naming', names: Object.freeze(['FIO App']) }),
  Object.freeze({ label: 'NFT', names: Object.freeze(['OpenSea']) })
].map((group) => Object.freeze({
  label: group.label,
  names: Object.freeze([...group.names].sort((a, b) => a.localeCompare(b)))
})).sort((a, b) => a.label.localeCompare(b)));

const WEBSITE_GROUP_BY_NAME = Object.freeze({
  Adobe: 'Productivity & Cloud',
  Amazon: 'Shopping & Payments',
  Apple: 'Productivity & Cloud',
  CoinGecko: 'Finance & Crypto',
  CoinTracker: 'Finance & Crypto',
  Discord: 'Social & Community',
  Dropbox: 'Productivity & Cloud',
  eBay: 'Shopping & Payments',
  Etherscan: 'Finance & Crypto',
  Facebook: 'Social & Community',
  GitHub: 'Developer',
  Gmail: 'Email',
  Google: 'Productivity & Cloud',
  Instagram: 'Social & Community',
  Koinly: 'Finance & Crypto',
  LinkedIn: 'Social & Community',
  Microsoft: 'Productivity & Cloud',
  Netflix: 'Entertainment',
  Outlook: 'Email',
  PayPal: 'Shopping & Payments',
  Proton: 'Email',
  Reddit: 'Social & Community',
  Slack: 'Productivity & Cloud',
  Solscan: 'Finance & Crypto',
  Spotify: 'Entertainment',
  Steam: 'Entertainment',
  TikTok: 'Social & Community',
  Twitch: 'Entertainment',
  'X / Twitter': 'Social & Community',
  Yahoo: 'Email',
  YouTube: 'Entertainment',
  Zoom: 'Productivity & Cloud'
});

const WEBSITE_EXTRA_PRESETS = Object.freeze(['CoinGecko', 'CoinTracker', 'Etherscan', 'Koinly', 'Solscan']);
const WEB3_PRESETS = Object.freeze(WEB3_PRESET_GROUPS.flatMap((group) => group.names));
const WEB3_NAMES = new Set(WEB3_PRESETS.map((name) => normalize(name)));
const RETIRED_EMPTY_ACCOUNT_FIELDS = Object.freeze(['Login method', 'Connected wallet(s)']);

const EXCHANGE_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Account / customer ID', 'text'],
  ['Website', 'url'],
  ['2FA method', 'text'],
  ['2FA recovery / backup codes', 'sensitive'],
  ['KYC / identity notes', 'multiline']
]);

const WEB3_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Website', 'url'],
  ['Account / profile ID', 'text'],
  ['2FA method', 'text'],
  ['2FA recovery / backup codes', 'sensitive']
]);

const WEBSITE_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Website', 'url'],
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

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function displayName(name) {
  return normalize(name) === 'base app (coinbase wallet)' ? 'Coinbase Wallet' : String(name || '');
}

function isWeb3Name(name) {
  return WEB3_NAMES.has(normalize(name));
}

function normalizeCategory(name, category) {
  if (category === WEB3_CATEGORY || category === WEBSITE_CATEGORY || category === EXCHANGE_CATEGORY) return category;
  if (category === LEGACY_SERVICE_CATEGORY) return isWeb3Name(name) ? WEB3_CATEGORY : WEBSITE_CATEGORY;
  return category || '';
}

function websitePresetNames() {
  const names = serviceCatalog.SERVICES
    .map((service) => service.name)
    .filter((name) => !isWeb3Name(name));
  for (const name of WEBSITE_EXTRA_PRESETS) if (!names.includes(name)) names.push(name);
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

function walletTemplatesForCategory(category) {
  const templates = profileSetup.availableTemplates().filter((template) => template && template.hasIcon === true);
  if (category === HARDWARE_CATEGORY) return templates.filter((template) => normalize(template.type) === 'hardware');
  if (category === SOFTWARE_CATEGORY) return templates.filter((template) => normalize(template.type) === 'software');
  if (category === OTHER_WALLET_CATEGORY) return templates.filter((template) => !['hardware', 'software'].includes(normalize(template.type)));
  return [];
}

function groupedPresetNames(category) {
  if (category === WEB3_CATEGORY) return WEB3_PRESET_GROUPS.map((group) => ({ label: group.label, names: [...group.names] }));
  if (category === WEBSITE_CATEGORY) return websitePresetGroups();
  if (category === EXCHANGE_CATEGORY) {
    const names = web3Icons.entries('exchanges').map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
    return [{ label: 'Exchanges', names }];
  }
  if (WALLET_CATEGORIES.has(category)) {
    return [{ label: 'Wallets', names: walletTemplatesForCategory(category).map((template) => template.name) }];
  }
  return [];
}

function presetNames(category) {
  return groupedPresetNames(category).flatMap((group) => group.names);
}

function accountFields(category) {
  if (category === EXCHANGE_CATEGORY) return EXCHANGE_FIELDS;
  if (category === WEB3_CATEGORY) return WEB3_FIELDS;
  if (category === WEBSITE_CATEGORY) return WEBSITE_FIELDS;
  return [];
}

function createIconElement(group) {
  const category = normalizeCategory(group && group.name, group && group.category);
  if (category === WEB3_CATEGORY || category === WEBSITE_CATEGORY) {
    const service = serviceCatalog.find(group && group.name);
    if (service) {
      const icon = serviceCatalog.createIcon(service.name, 'wallet-list-brand-image vault-service-icon known-service-brand-image');
      if (icon) {
        icon.dataset.serviceCatalog = service.name;
        return icon;
      }
    }
    if (typeof document !== 'undefined') {
      const fallback = document.createElement('i');
      fallback.className = 'fa fa-globe vault-service-icon';
      fallback.setAttribute('aria-hidden', 'true');
      fallback.setAttribute('title', 'Account / service');
      return fallback;
    }
  }
  return walletIcons.createIconElement(group);
}

function appendOption(parent, value, label = value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  parent.appendChild(option);
  return option;
}

function renderTypeOptions(select, selectedValue) {
  if (!select) return;
  select.innerHTML = '';
  appendOption(select, '', 'Choose a type…');
  for (const group of TYPE_GROUPS) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const value of group.values) appendOption(optgroup, value);
    select.appendChild(optgroup);
  }
  if ([...select.options].some((option) => option.value === selectedValue)) select.value = selectedValue;
}

function fieldWrap(input) {
  return input && input.closest ? input.closest('.edit-info-grid-field, .form-group') : null;
}

function setFieldVisible(form, id, visible) {
  const wrap = fieldWrap(form && form.querySelector ? form.querySelector(`#${id}`) : null);
  if (wrap) wrap.style.display = visible ? '' : 'none';
}

function setLabel(form, id, text) {
  const wrap = fieldWrap(form && form.querySelector ? form.querySelector(`#${id}`) : null);
  const label = wrap && wrap.querySelector('label');
  if (label) label.textContent = text;
}

function ensurePresetField(form, categoryInput, nameInput, customEditor) {
  let wrap = form.querySelector('.vault-item-preset-field');
  if (wrap) return wrap;

  wrap = document.createElement('div');
  wrap.className = 'form-group edit-info-grid-field vault-item-preset-field';
  const label = document.createElement('label');
  const select = document.createElement('select');
  const note = document.createElement('p');
  select.className = 'form-control';
  select.id = 'inputVaultItemPreset';
  note.className = 'vault-item-preset-note';
  wrap.appendChild(label);
  wrap.appendChild(select);
  wrap.appendChild(note);

  const categoryWrap = fieldWrap(categoryInput);
  if (categoryWrap && categoryWrap.parentNode) categoryWrap.parentNode.insertBefore(wrap, categoryWrap.nextSibling);

  select.addEventListener('change', () => {
    if (!select.value) return;
    if (nameInput) nameInput.value = displayName(select.value);
    for (const [fieldLabel, type] of accountFields(categoryInput.value)) {
      if (customEditor && typeof customEditor.ensureField === 'function') customEditor.ensureField({ label: fieldLabel, type, value: '' });
    }
  });
  return wrap;
}

function presetPresentation(category) {
  if (WALLET_CATEGORIES.has(category)) {
    return {
      label: 'Known wallet (optional)',
      placeholder: 'Choose a wallet…',
      note: 'Only wallets with real local SafeLedger artwork are listed. Choosing a reviewed wallet also preloads supported assets and networks that have local icons.'
    };
  }
  if (category === EXCHANGE_CATEGORY) {
    return {
      label: 'Known exchange (optional)',
      placeholder: 'Choose an exchange…',
      note: 'Known exchanges use local SafeLedger artwork. SafeLedger never auto-fills a login URL.'
    };
  }
  if (category === WEB3_CATEGORY) {
    return {
      label: 'Known Web3 service (optional)',
      placeholder: 'Choose a Web3 service…',
      note: 'Web3 services are grouped by purpose and alphabetized. SafeLedger uses only local recognition/icons and never auto-fills a login URL.'
    };
  }
  if (category === WEBSITE_CATEGORY) {
    return {
      label: 'Known website (optional)',
      placeholder: 'Choose a website…',
      note: 'Websites are grouped by purpose and alphabetized. SafeLedger uses only local recognition/icons and never auto-fills a login URL.'
    };
  }
  return null;
}

function renderPresetField(form, categoryInput, nameInput, customEditor) {
  const wrap = ensurePresetField(form, categoryInput, nameInput, customEditor);
  const presentation = presetPresentation(categoryInput.value);
  if (!presentation) {
    wrap.style.display = 'none';
    return;
  }

  const select = wrap.querySelector('select');
  const label = wrap.querySelector('label');
  const note = wrap.querySelector('.vault-item-preset-note');
  const groups = groupedPresetNames(categoryInput.value);
  const currentName = normalize(nameInput && nameInput.value);
  select.innerHTML = '';
  appendOption(select, '', presentation.placeholder);
  for (const group of groups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const name of group.names) {
      const option = appendOption(optgroup, name, displayName(name));
      if (currentName && [name, displayName(name)].some((candidate) => normalize(candidate) === currentName)) option.selected = true;
    }
    select.appendChild(optgroup);
  }
  label.textContent = presentation.label;
  note.textContent = presentation.note;
  wrap.style.display = groups.some((group) => group.names.length) ? '' : 'none';
}

function removeRetiredEmptyAccountFields(customEditor) {
  if (!customEditor || typeof customEditor.removeEmptyField !== 'function') return;
  for (const label of RETIRED_EMPTY_ACCOUNT_FIELDS) customEditor.removeEmptyField(label);
}

function updateEditLayout(form, categoryInput, nameInput, customEditor) {
  const category = categoryInput.value;
  const account = ACCOUNT_CATEGORIES.has(category);
  for (const id of ACCOUNT_ONLY_HIDE_IDS) setFieldVisible(form, id, !account);
  setLabel(form, 'inputCategory', 'Vault item type');
  setLabel(form, 'inputRecoveryLink', account ? 'Account recovery link' : 'Recovery link');
  setLabel(form, 'inputRecoveryLocation', account ? 'Recovery / backup-code location' : 'Recovery material location');
  setLabel(form, 'inputBackupLocation', account ? 'Backup / exported-data location' : 'Backup location');

  const customNote = form.querySelector('.custom-fields-note');
  if (customNote) {
    customNote.textContent = account
      ? 'Add optional account information that does not fit the standard fields. Sensitive values stay encrypted and are excluded from search.'
      : 'Add optional information that does not fit the standard wallet fields. Sensitive values stay encrypted and are excluded from search.';
  }

  removeRetiredEmptyAccountFields(customEditor);
  for (const [fieldLabel, type] of accountFields(category)) {
    if (customEditor && typeof customEditor.ensureField === 'function') customEditor.ensureField({ label: fieldLabel, type, value: '' });
  }
  renderPresetField(form, categoryInput, nameInput, customEditor);
}

function configureEditForm({ form, categoryInput, nameInput, customEditor, initialCategory } = {}) {
  if (!form || !categoryInput) return;
  const desired = normalizeCategory(nameInput && nameInput.value, initialCategory || categoryInput.value);
  renderTypeOptions(categoryInput, desired);
  updateEditLayout(form, categoryInput, nameInput, customEditor);
  categoryInput.addEventListener('change', () => updateEditLayout(form, categoryInput, nameInput, customEditor));
}

function detailInformationTitle(category) {
  if (category === WEB3_CATEGORY) return 'Web3 account information';
  if (category === WEBSITE_CATEGORY) return 'Website account information';
  if (category === EXCHANGE_CATEGORY) return 'Account information';
  return 'Wallet information';
}

exports.EXCHANGE_CATEGORY = EXCHANGE_CATEGORY;
exports.LEGACY_SERVICE_CATEGORY = LEGACY_SERVICE_CATEGORY;
exports.WEB3_CATEGORY = WEB3_CATEGORY;
exports.WEBSITE_CATEGORY = WEBSITE_CATEGORY;
exports.WALLET_CATEGORIES = WALLET_CATEGORIES;
exports.ACCOUNT_CATEGORIES = ACCOUNT_CATEGORIES;
exports.TYPE_GROUPS = TYPE_GROUPS;
exports.WEB3_PRESET_GROUPS = WEB3_PRESET_GROUPS;
exports.displayName = displayName;
exports.normalizeCategory = normalizeCategory;
exports.websitePresetNames = websitePresetNames;
exports.websitePresetGroups = websitePresetGroups;
exports.walletTemplatesForCategory = walletTemplatesForCategory;
exports.groupedPresetNames = groupedPresetNames;
exports.presetNames = presetNames;
exports.accountFields = accountFields;
exports.createIconElement = createIconElement;
exports.renderTypeOptions = renderTypeOptions;
exports.configureEditForm = configureEditForm;
exports.updateEditLayout = updateEditLayout;
exports.detailInformationTitle = detailInformationTitle;
exports._test = { normalize, isWeb3Name, presetPresentation, renderPresetField, fieldWrap, setFieldVisible, setLabel, removeRetiredEmptyAccountFields, RETIRED_EMPTY_ACCOUNT_FIELDS };
