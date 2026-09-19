'use strict';

const detailActions = require('./detail-actions');
const recoveryBinder = require('./recovery-binder');
const recoveryBinderUi = require('./recovery-binder-ui');

const OPTIONS = Object.freeze([
  ['includePublicAddresses', 'Include public addresses', 'Helps identify accounts and assets without exposing private keys.'],
  ['includeNotes', 'Include notes', 'Include only if your notes are written for a trusted recovery person.'],
  ['includePasswordsPins', 'Include passwords, PINs, and recovery links', 'High risk. Anyone holding the printed package may gain access to protected services.'],
  ['includeSeedPrivateKeys', 'Include seed phrases and private keys', 'Highest risk. Anyone holding the package may be able to control funds.'],
  ['includeSensitiveCustomFields', 'Include sensitive custom fields', 'Includes fields explicitly marked Sensitive.'],
  ['includeQrCodes', 'Include available QR codes', 'QR codes mirror only values that you already chose to include.']
]);

function appendText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function buildOptions(checkboxes) {
  const selected = {};
  for (const checkbox of checkboxes) selected[checkbox.dataset.option] = checkbox.checked === true;
  return recoveryBinder.normalizeOptions(selected);
}

function makeOption(key, title, description) {
  const label = document.createElement('label');
  label.className = 'emergency-package-option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.option = key;
  const copy = document.createElement('span');
  appendText(copy, 'strong', '', title);
  appendText(copy, 'span', '', description);
  label.appendChild(input);
  label.appendChild(copy);
  return { label, input };
}

async function fetchPackage(profile, options) {
  if (!window.safeLedgerApi || typeof window.safeLedgerApi.getRecoveryBinder !== 'function') throw new Error('Emergency Package bridge is unavailable.');
  const result = await window.safeLedgerApi.getRecoveryBinder(profile.file, options, true);
  if (!result || result.ok !== true || !result.binder) throw new Error(result && result.message ? result.message : 'Unable to prepare Emergency Package.');
  const binder = result.binder;
  binder.title = `${profile.name || 'SafeLedger'} Emergency Recovery Package`;
  binder.profileFields = [
    { label: 'Purpose', value: 'Emergency / inheritance recovery reference' },
    { label: 'Start here', value: 'Identify the correct Vault Item, locate its documented recovery material, and follow the written recovery instructions. Never type a seed phrase into an unfamiliar website or device.' },
    { label: 'Safety', value: 'Verify device and software authenticity before entering any seed phrase, private key, password, or PIN.' },
    ...binder.profileFields
  ];
  return binder;
}

async function show(params = {}) {
  const area = document.getElementById('detailArea');
  if (!area || !params.profile || !params.profile.file) return;
  area.innerHTML = '';

  appendText(area, 'h1', '', 'Emergency Recovery Package');
  appendText(area, 'p', 'emergency-package-intro', `Prepare a printable, offline package for a trusted person who may need to recover ${params.profile.name || 'this Profile'} when you cannot help them directly.`);

  const safe = document.createElement('div');
  safe.className = 'emergency-package-safe';
  safe.innerHTML = '<i class="fa fa-shield" aria-hidden="true"></i>';
  appendText(safe, 'div', '', 'Safe defaults include recovery planning, locations, beneficiary/contact information, instructions, and Asset names—but exclude seeds, private keys, passwords, PINs, balances, public addresses, notes, and sensitive custom fields.');
  area.appendChild(safe);

  appendText(area, 'h2', 'product-section-title', 'Optional contents');
  appendText(area, 'p', 'emergency-package-help', 'Only enable information the intended recipient truly needs. More complete is not always more secure.');

  const host = document.createElement('div');
  host.className = 'emergency-package-options';
  const checkboxes = [];
  for (const definition of OPTIONS) {
    const option = makeOption(...definition);
    host.appendChild(option.label);
    checkboxes.push(option.input);
  }
  area.appendChild(host);

  const privacyNote = document.createElement('div');
  privacyNote.className = 'emergency-package-warning';
  privacyNote.textContent = 'Printing secrets creates a second physical copy of those secrets. SafeLedger will ask for confirmation before generating a package containing high-risk information.';
  area.appendChild(privacyNote);

  const generate = async (_event, button) => {
    const options = buildOptions(checkboxes);
    const sensitive = recoveryBinder.selectedPrivacyLabels(options);
    if (sensitive.length) {
      const approved = confirm(`This Emergency Package will include: ${sensitive.join(', ')}. Anyone with the printout may learn private information or gain access to funds. Continue?`);
      if (!approved) return;
    }
    if (button) button.disabled = true;
    try {
      const binder = await fetchPackage(params.profile, options);
      await recoveryBinderUi.printBinder(binder, { printButtonText: 'Print Emergency Package' });
    } catch (err) {
      alert(err && err.message ? err.message : 'Unable to prepare Emergency Package.');
    } finally {
      if (button) button.disabled = false;
    }
  };

  detailActions.set([
    { icon: 'fa-times', title: 'Cancel Emergency Package', className: 'detail-action-cancel', onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); } },
    { icon: 'fa-life-ring', title: 'Generate Emergency Package', className: 'detail-action-print', onClick: generate }
  ]);
  detailActions.setDetailMode('view');
}

module.exports = { show, _test: { OPTIONS, buildOptions, makeOption, fetchPackage } };