'use strict';

const securityUi = require('./security-ui');

const EDIT_SENSITIVE_FIELDS = [
  { id: 'inputPrivateAddress', label: 'private key' },
  { id: 'inputManualBalance', label: 'balance' },
  { id: 'inputPassword', label: 'password' },
  { id: 'inputPin', label: 'PIN code' },
  { id: 'inputRecoveryLink', label: 'recovery link' },
  { id: 'inputSeedPhrase', label: 'seed phrase' }
];

const VIEW_COPY_ONLY_LABELS = new Set(['Balance', 'Password', 'PIN code', 'Recovery link', 'Seed phrase']);

const originalPrintRecoverySheet = securityUi.printRecoverySheet;
securityUi.printRecoverySheet = (title, fields, includesSensitive) => {
  const hasPrivateBalance = Array.isArray(fields) && fields.some((field) =>
    field && field.label === 'Balance' && String(field.value || '').trim()
  );
  return originalPrintRecoverySheet(title, fields, includesSensitive || !!hasPrivateBalance);
};

function makeRevealButton(input, label) {
  const actions = document.createElement('div');
  actions.className = 'field-inline-actions edit-sensitive-actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-default btn-sm field-inline-action edit-sensitive-toggle';
  button.title = `Show ${label}`;
  button.setAttribute('aria-label', `Show ${label}`);
  button.innerHTML = '<i class="fa fa-eye" aria-hidden="true"></i>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    const nextTitle = `${hidden ? 'Hide' : 'Show'} ${label}`;
    button.title = nextTitle;
    button.setAttribute('aria-label', nextTitle);
    button.innerHTML = `<i class="fa ${hidden ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
  });
  actions.appendChild(button);
  return actions;
}

function ensureShell(input) {
  let shell = input.closest('.secure-input-shell');
  if (shell) return shell;
  shell = document.createElement('div');
  shell.className = 'secure-input-shell';
  input.parentNode.insertBefore(shell, input);
  shell.appendChild(input);
  return shell;
}

function configureEditForm(form) {
  if (!form || form.dataset.editSecurityConfigured === '1') return;

  form.querySelectorAll('.compact-qr-area, .sensitive-controls').forEach((node) => node.remove());
  form.querySelectorAll('.secure-input-shell .field-inline-actions').forEach((node) => node.remove());

  const publicAddress = form.querySelector('#inputPublicAddress');
  if (publicAddress) {
    const publicShell = publicAddress.closest('.secure-input-shell');
    if (publicShell) publicShell.classList.add('edit-public-shell');
  }

  EDIT_SENSITIVE_FIELDS.forEach(({ id, label }) => {
    const input = form.querySelector(`#${id}`);
    if (!input) return;
    input.type = 'password';
    input.setAttribute('autocomplete', 'off');
    const shell = ensureShell(input);
    shell.classList.remove('edit-public-shell');
    shell.classList.add('edit-sensitive-shell');
    shell.querySelectorAll('.field-inline-actions').forEach((node) => node.remove());
    shell.appendChild(makeRevealButton(input, label));
  });

  form.dataset.editSecurityConfigured = '1';
}

function protectCoinBalanceView(area) {
  if (!area || !area.querySelector('.coin-detail-header')) return;
  const balanceRow = Array.from(area.querySelectorAll(':scope > p')).find((row) => {
    const label = row.querySelector('b');
    return label && String(label.textContent || '').trim() === 'Balance:';
  });
  if (!balanceRow) return;
  const valueNode = balanceRow.querySelector('span');
  const value = String(valueNode ? valueNode.textContent : '').trim();
  if (!value) {
    balanceRow.remove();
    return;
  }
  const sensitive = securityUi.appendSensitiveField(area, 'Balance', value);
  area.insertBefore(sensitive, balanceRow);
  balanceRow.remove();
}

function restrictViewQr(area) {
  if (!area) return;
  area.querySelectorAll('.sensitive-field').forEach((wrapper) => {
    const labelNode = wrapper.querySelector('.secure-field-summary-text');
    const label = String(labelNode ? labelNode.textContent : '').trim();
    if (!VIEW_COPY_ONLY_LABELS.has(label)) return;
    wrapper.querySelectorAll('.qr-inline-button, .compact-qr-area').forEach((node) => node.remove());
    const actions = wrapper.querySelector('.field-inline-actions');
    if (actions && actions.children.length === 0) actions.remove();
  });
}

function applyEditSecurity() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  const title = header ? String(header.textContent || '').trim() : '';
  if (title === 'Modify Coin' || title === 'Add Coin' || title === 'Modify Wallet' || title === 'Add Wallet') {
    configureEditForm(area.querySelector('form'));
    return;
  }
  protectCoinBalanceView(area);
  restrictViewQr(area);
}

function install() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const update = () => queueMicrotask(applyEditSecurity);
  new MutationObserver(update).observe(area, { childList: true, subtree: true });
  applyEditSecurity();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { EDIT_SENSITIVE_FIELDS, VIEW_COPY_ONLY_LABELS, configureEditForm, protectCoinBalanceView, restrictViewQr, applyEditSecurity };
