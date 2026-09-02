'use strict';

const profileSetup = require('./profile-setup');

const WALLET_CATEGORIES = new Set(['Hardware Wallet', 'Software Wallet', 'Other Wallet']);
const ACCOUNT_CATEGORIES = new Set(['Web3 Account', 'Website Account']);

function displayWalletName(name) {
  return String(name || '').trim().toLowerCase() === 'base app (coinbase wallet)' ? 'Coinbase Wallet' : String(name || '');
}

function templatesForCategory(category) {
  const templates = profileSetup.availableTemplates().filter((template) => template && template.hasIcon === true);
  if (category === 'Hardware Wallet') return templates.filter((template) => String(template.type || '').toLowerCase() === 'hardware');
  if (category === 'Software Wallet') return templates.filter((template) => String(template.type || '').toLowerCase() === 'software');
  if (category === 'Other Wallet') return templates.filter((template) => !['hardware', 'software'].includes(String(template.type || '').toLowerCase()));
  return [];
}

function patchWalletPreset(form, categoryInput) {
  if (!form || !categoryInput) return;
  const wrap = form.querySelector('.vault-item-preset-field');
  const select = wrap && wrap.querySelector('select');
  if (!wrap || !select) return;
  const label = wrap.querySelector('label');
  const note = wrap.querySelector('.vault-item-preset-note');

  if (!WALLET_CATEGORIES.has(categoryInput.value)) {
    delete select.dataset.walletPresetSignature;

    // Web3 Account and Website Account have their own dedicated preset helper.
    // Do not overwrite its options, labels, visibility, or explanatory copy.
    if (ACCOUNT_CATEGORIES.has(categoryInput.value)) return;

    if (label && label.textContent !== 'Known platform (optional)') label.textContent = 'Known platform (optional)';
    if (note) {
      const generic = 'SafeLedger can recognize known platforms and local icons, but it does not auto-fill login URLs. Enter a URL only after verifying it yourself.';
      if (note.textContent !== generic) note.textContent = generic;
    }
    return;
  }

  const templates = templatesForCategory(categoryInput.value);
  const signature = `${categoryInput.value}|${templates.map((template) => template.name).join('|')}`;
  if (select.dataset.walletPresetSignature !== signature) {
    const currentName = String(form.querySelector('#inputName') && form.querySelector('#inputName').value || '').trim().toLowerCase();
    select.dataset.walletPresetSignature = signature;
    select.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Choose a wallet…';
    select.appendChild(blank);
    for (const template of templates) {
      const option = document.createElement('option');
      option.value = template.name;
      option.textContent = displayWalletName(template.name);
      if (currentName && [template.name, displayWalletName(template.name)].some((value) => String(value).toLowerCase() === currentName)) option.selected = true;
      select.appendChild(option);
    }
  }
  wrap.style.display = templates.length ? '' : 'none';
  if (label && label.textContent !== 'Known wallet (optional)') label.textContent = 'Known wallet (optional)';
  if (note) {
    const walletNote = 'Only wallets with real local SafeLedger artwork are listed. Choosing a reviewed wallet also preloads supported assets and networks that have local icons.';
    if (note.textContent !== walletNote) note.textContent = walletNote;
  }
}

function patch() {
  const area = document.getElementById('detailArea');
  const categoryInput = area && area.querySelector('#inputCategory');
  const form = categoryInput && categoryInput.closest('form');
  if (!form) return;
  if (categoryInput.dataset.logoWalletPresetListener !== 'true') {
    categoryInput.dataset.logoWalletPresetListener = 'true';
    categoryInput.addEventListener('change', () => setTimeout(() => patchWalletPreset(form, categoryInput), 0));
  }
  patchWalletPreset(form, categoryInput);
}

function start() {
  patch();
  const area = document.getElementById('detailArea');
  if (!area) return;
  const observer = new MutationObserver(() => setTimeout(patch, 0));
  observer.observe(area, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.WALLET_CATEGORIES = WALLET_CATEGORIES;
exports.ACCOUNT_CATEGORIES = ACCOUNT_CATEGORIES;
exports._test = { displayWalletName, templatesForCategory, patchWalletPreset };