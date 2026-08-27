'use strict';

const COIN_LAYOUT = [
  { id: 'inputName', label: 'Coin' },
  { id: 'inputSymbol', label: 'Symbol' },
  { id: 'inputPublicAddress', label: 'Public address' },
  { id: 'inputPrivateAddress', label: 'Private key', sensitive: true },
  { id: 'inputTags', label: 'Tags (comma separated)' },
  { id: 'inputManualBalance', label: 'Balance' },
  { id: 'inputNotes', label: 'Notes', full: true }
];

const WALLET_LAYOUT = [
  { id: 'inputName', label: 'Name' },
  { id: 'inputCategory', label: 'Wallet category' },
  { id: 'inputTags', label: 'Tags (comma separated)' },
  { id: 'inputPassword', label: 'Password', sensitive: true },
  { id: 'inputPin', label: 'PIN code', sensitive: true },
  { id: 'inputRecoveryLink', label: 'Recovery link', sensitive: true },
  { id: 'inputSeedPhrase', label: 'Seed phrase', sensitive: true },
  { id: 'inputNotes', label: 'Notes', full: true }
];

const TITLE_LAYOUTS = new Map([
  ['Modify Coin', COIN_LAYOUT],
  ['Add Coin', COIN_LAYOUT],
  ['Modify Wallet', WALLET_LAYOUT],
  ['Add Wallet', WALLET_LAYOUT]
]);

function directChildWithClass(parent, className) {
  return Array.from(parent.children).find((child) => child.classList && child.classList.contains(className)) || null;
}

function findLabel(owner, labelText) {
  return Array.from(owner.children).find((child) =>
    child.tagName === 'LABEL' && String(child.textContent || '').trim() === labelText
  ) || null;
}

function moveField(form, grid, config) {
  const input = form.querySelector(`#${config.id}`);
  if (!input) return false;
  const owner = input.closest('.form-group');
  if (!owner) return false;

  const field = document.createElement('div');
  field.className = `form-group edit-info-grid-field${config.full ? ' edit-info-grid-full' : ''}`;
  const label = findLabel(owner, config.label);
  if (label) field.appendChild(label);

  const shell = input.closest('.secure-input-shell');
  if (shell) {
    const qrArea = shell.nextElementSibling && shell.nextElementSibling.classList.contains('compact-qr-area')
      ? shell.nextElementSibling
      : null;
    const controls = config.sensitive ? directChildWithClass(owner, 'sensitive-controls') : null;
    field.appendChild(shell);
    if (qrArea) field.appendChild(qrArea);
    if (controls) field.appendChild(controls);
  } else {
    field.appendChild(input);
  }

  grid.appendChild(field);
  return true;
}

function removeEmptyGroups(form) {
  Array.from(form.children).forEach((child) => {
    if (child.classList && child.classList.contains('form-group') && child.children.length === 0) child.remove();
  });
}

function applyEditGrid() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  const title = header ? String(header.textContent || '').trim() : '';
  const layout = TITLE_LAYOUTS.get(title);
  if (!layout) return;

  const form = area.querySelector('form');
  if (!form || form.dataset.editInfoGrid === '1') return;
  const ready = layout.every((config) => form.querySelector(`#${config.id}`));
  if (!ready) return;

  const grid = document.createElement('div');
  grid.className = 'edit-info-grid';
  layout.forEach((config) => moveField(form, grid, config));
  removeEmptyGroups(form);
  form.insertBefore(grid, form.firstChild);
  form.dataset.editInfoGrid = '1';
}

function install() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const update = () => queueMicrotask(applyEditGrid);
  new MutationObserver(update).observe(area, { childList: true, subtree: true });
  applyEditGrid();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { COIN_LAYOUT, WALLET_LAYOUT, TITLE_LAYOUTS, applyEditGrid };
