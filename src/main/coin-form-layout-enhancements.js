'use strict';

const FIELD_LAYOUT = [
  { id: 'inputName', label: 'Coin', full: false },
  { id: 'inputSymbol', label: 'Symbol', full: false },
  { id: 'inputPublicAddress', label: 'Public address', full: true },
  { id: 'inputPrivateAddress', label: 'Private key', full: true },
  { id: 'inputTags', label: 'Tags (comma separated)', full: false },
  { id: 'inputManualBalance', label: 'Last known balance (manual)', full: false },
  { id: 'inputNotes', label: 'Notes', full: true }
];

function findLabel(group, labelText) {
  return Array.from(group.children).find((child) =>
    child.tagName === 'LABEL' && String(child.textContent || '').trim() === labelText
  ) || null;
}

function moveField(group, grid, config) {
  const input = group.querySelector(`#${config.id}`);
  if (!input) return false;

  const field = document.createElement('div');
  field.className = `form-group coin-layout-field${config.full ? ' coin-layout-full' : ''}`;

  const label = findLabel(group, config.label);
  if (label) field.appendChild(label);

  const shell = input.closest('.secure-input-shell');
  if (shell && shell.parentNode === group) {
    const qrArea = shell.nextElementSibling && shell.nextElementSibling.classList.contains('compact-qr-area')
      ? shell.nextElementSibling
      : null;
    const controls = config.id === 'inputPrivateAddress'
      ? group.querySelector('.sensitive-controls')
      : null;

    field.appendChild(shell);
    if (qrArea) field.appendChild(qrArea);
    if (controls) field.appendChild(controls);
  } else {
    field.appendChild(input);
  }

  grid.appendChild(field);
  return true;
}

function applyCoinLayout() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  const title = header ? String(header.textContent || '').trim() : '';
  if (title !== 'Modify Coin' && title !== 'Add Coin') return;

  const form = area.querySelector('form');
  if (!form || form.dataset.coinLayout === '1') return;
  const group = form.querySelector(':scope > .form-group');
  if (!group) return;

  const ready = FIELD_LAYOUT.every((config) => group.querySelector(`#${config.id}`));
  if (!ready) return;

  const grid = document.createElement('div');
  grid.className = 'coin-edit-layout-grid';
  FIELD_LAYOUT.forEach((config) => moveField(group, grid, config));

  group.replaceWith(grid);
  form.dataset.coinLayout = '1';
}

function install() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const update = () => queueMicrotask(applyCoinLayout);
  new MutationObserver(update).observe(area, { childList: true, subtree: true });
  applyCoinLayout();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { FIELD_LAYOUT, applyCoinLayout };
