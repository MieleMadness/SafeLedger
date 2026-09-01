'use strict';

const web3Icons = require('./web3-icons');

const EXCHANGE_CATEGORY = 'Exchange Account';
const SERVICE_CATEGORY = 'Web3 / Website Account';

const SERVICE_PRESETS = Object.freeze([
  'FIO App',
  'OpenSea',
  'Uniswap',
  'Aave',
  'Lido',
  'Etherscan',
  'Solscan',
  'Koinly',
  'CoinTracker',
  'CoinGecko'
]);

const EXCHANGE_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Account / customer ID', 'text'],
  ['Website', 'url'],
  ['Login method', 'text'],
  ['2FA method', 'text'],
  ['2FA recovery / backup codes', 'sensitive'],
  ['KYC / identity notes', 'multiline']
]);

const SERVICE_FIELDS = Object.freeze([
  ['Login email / username', 'text'],
  ['Website', 'url'],
  ['Login method', 'text'],
  ['Connected wallet(s)', 'text'],
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
    .map((input) => String(input.value || '').trim().toLowerCase())
    .filter(Boolean));
}

function addCustomField(form, label, type) {
  const existing = customFieldLabels(form);
  if (existing.has(String(label).toLowerCase())) return;
  const add = form.querySelector('.custom-field-add');
  if (!add) return;
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
  const fields = category === EXCHANGE_CATEGORY
    ? EXCHANGE_FIELDS
    : category === SERVICE_CATEGORY ? SERVICE_FIELDS : [];
  for (const [label, type] of fields) addCustomField(form, label, type);
}

function presetNames(category) {
  if (category === EXCHANGE_CATEGORY) return web3Icons.entries('exchanges').map((entry) => entry.name);
  if (category === SERVICE_CATEGORY) return [...SERVICE_PRESETS];
  return [];
}

function ensurePresetField(form, categoryInput) {
  let wrap = form.querySelector('.vault-item-preset-field');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'form-group edit-info-grid-field vault-item-preset-field';
    const label = document.createElement('label');
    label.textContent = 'Known platform (optional)';
    const select = document.createElement('select');
    select.className = 'form-control';
    select.id = 'inputVaultItemPreset';
    wrap.appendChild(label);
    wrap.appendChild(select);
    const categoryWrap = fieldWrap(categoryInput);
    if (categoryWrap && categoryWrap.parentNode) categoryWrap.parentNode.insertBefore(wrap, categoryWrap.nextSibling);

    const note = document.createElement('p');
    note.className = 'vault-item-preset-note';
    note.textContent = 'SafeLedger can recognize known platforms and local icons, but it does not auto-fill login URLs. Enter a URL only after verifying it yourself.';
    wrap.appendChild(note);

    select.addEventListener('change', () => {
      if (!select.value) return;
      const name = form.querySelector('#inputName');
      if (name) name.value = select.value;
      ensureAccountFields(form, categoryInput.value);
    });
  }
  return wrap;
}

function updatePresetField(form, categoryInput) {
  const wrap = ensurePresetField(form, categoryInput);
  const select = wrap.querySelector('select');
  const names = presetNames(categoryInput.value);
  wrap.style.display = names.length ? '' : 'none';
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = categoryInput.value === EXCHANGE_CATEGORY ? 'Choose an exchange…' : 'Choose a service…';
  select.appendChild(blank);
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
}

function updateAccountLayout(form, categoryInput) {
  const account = categoryInput.value === EXCHANGE_CATEGORY || categoryInput.value === SERVICE_CATEGORY;
  for (const id of ACCOUNT_ONLY_HIDE_IDS) setFieldVisible(form, id, !account);
  setLabel(form, 'inputCategory', 'Vault item type');
  setLabel(form, 'inputRecoveryLink', account ? 'Account recovery link' : 'Recovery link');
  setLabel(form, 'inputRecoveryLocation', account ? 'Recovery / backup-code location' : 'Recovery material location');
  setLabel(form, 'inputBackupLocation', account ? 'Backup / exported-data location' : 'Backup location');
  updatePresetField(form, categoryInput);
  if (account) ensureAccountFields(form, categoryInput.value);
}

function patchEditForm(area) {
  const categoryInput = area.querySelector('#inputCategory');
  if (!categoryInput || categoryInput.dataset.vaultItemPatched === 'true') return;
  const form = categoryInput.closest('form');
  if (!form) return;
  categoryInput.dataset.vaultItemPatched = 'true';

  for (const value of [EXCHANGE_CATEGORY, SERVICE_CATEGORY]) {
    if (![...categoryInput.options].some((option) => option.value === value)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      categoryInput.appendChild(option);
    }
  }

  const heading = area.querySelector('h1');
  if (heading && /Wallet/i.test(heading.textContent || '')) heading.textContent = heading.textContent.replace(/Wallet/g, 'Vault Item');
  const customNote = form.querySelector('.custom-fields-note');
  if (customNote) customNote.textContent = 'Add optional information that does not fit the standard wallet, exchange, service, or asset fields. Sensitive values stay encrypted and are excluded from search.';

  categoryInput.addEventListener('change', () => updateAccountLayout(form, categoryInput));
  updateAccountLayout(form, categoryInput);
}

function patchServiceIcons(root) {
  for (const anchor of root.querySelectorAll('#groupArea .nav > li > a')) {
    const category = anchor.querySelector('.wallet-list-category');
    if (!category || !/website|service/i.test(category.textContent || '')) continue;
    if (anchor.querySelector('.vault-service-icon')) continue;
    const existing = anchor.querySelector('.wallet-list-icon, .wallet-list-catalog-icon, .wallet-list-brand-image');
    const icon = document.createElement('i');
    icon.className = 'fa fa-globe vault-service-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (existing) existing.replaceWith(icon);
    else anchor.insertBefore(icon, anchor.firstChild);
  }
}

function patchDetailTerminology(area) {
  const category = area.querySelector('.wallet-detail-category');
  if (!category || !/exchange|website|service/i.test(category.textContent || '')) return;
  for (const heading of area.querySelectorAll('.product-section-title')) {
    if (heading.textContent === 'Wallet information') heading.textContent = 'Account / service information';
  }
}

function patchGlobalLabels() {
  const search = document.getElementById('groupSearch');
  if (search) search.placeholder = 'Search vault items...';
  const add = document.getElementById('addGroup');
  if (add) add.innerHTML = '<span class="fa fa-plus"></span> Add Vault Item';
}

function patch(root = document) {
  patchGlobalLabels();
  const area = document.getElementById('detailArea');
  if (area) {
    patchEditForm(area);
    patchDetailTerminology(area);
  }
  patchServiceIcons(root);
}

function start() {
  patch();
  const observer = new MutationObserver(() => patch(document));
  observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('DOMContentLoaded', start);

exports.EXCHANGE_CATEGORY = EXCHANGE_CATEGORY;
exports.SERVICE_CATEGORY = SERVICE_CATEGORY;
exports.SERVICE_PRESETS = SERVICE_PRESETS;
exports._test = { presetNames, customFieldLabels, addCustomField, updateAccountLayout, patchEditForm };
