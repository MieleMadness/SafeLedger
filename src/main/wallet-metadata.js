'use strict';

const DEFINITIONS = [
  { key: 'manufacturer', id: 'inputManufacturer', label: 'Manufacturer', kind: 'text', maxLength: 80 },
  { key: 'model', id: 'inputModel', label: 'Device / wallet model', kind: 'text', maxLength: 80 },
  { key: 'purchaseDate', id: 'inputPurchaseDate', label: 'Purchase / setup date', kind: 'text', maxLength: 40 },
  { key: 'recoveryFormat', id: 'inputRecoveryFormat', label: 'Recovery format', kind: 'select', options: ['', 'BIP39', 'SLIP39', 'Other'] },
  { key: 'recoveryStorageMode', id: 'inputRecoveryStorageMode', label: 'Recovery material storage', kind: 'select', options: ['', 'Stored encrypted in SafeLedger', 'Stored externally', 'Both'] },
  { key: 'recoveryLocation', id: 'inputRecoveryLocation', label: 'Recovery material location', kind: 'text', maxLength: 180 },
  { key: 'deviceLocation', id: 'inputDeviceLocation', label: 'Device location', kind: 'text', maxLength: 180 },
  { key: 'backupLocation', id: 'inputBackupLocation', label: 'Backup location', kind: 'text', maxLength: 180 },
  { key: 'passphraseUsed', id: 'inputPassphraseUsed', label: 'Additional passphrase used?', kind: 'select', options: ['', 'No', 'Yes'] },
  { key: 'beneficiary', id: 'inputBeneficiary', label: 'Beneficiary / recovery contact', kind: 'text', maxLength: 180 }
];

function addEditFields(editFormUi, grid, group = {}) {
  const controls = {};
  for (const definition of DEFINITIONS) {
    controls[definition.key] = definition.kind === 'select'
      ? editFormUi.addSelect(grid, { id: definition.id, label: definition.label, value: group[definition.key], options: definition.options })
      : editFormUi.addTextInput(grid, { id: definition.id, label: definition.label, value: group[definition.key], maxLength: definition.maxLength });
  }
  controls.recoveryInstructions = editFormUi.addTextarea(grid, {
    id: 'inputRecoveryInstructions', label: 'Recovery instructions', value: group.recoveryInstructions,
    rows: 5, maxLength: 2000, full: true, resize: 'vertical'
  });
  return controls;
}

function applyEditFields(group, controls) {
  for (const definition of DEFINITIONS) group[definition.key] = controls[definition.key].value;
  group.recoveryInstructions = controls.recoveryInstructions.value;
}

function appendSectionTitle(area, text) {
  const heading = document.createElement('h2');
  heading.className = 'product-section-title';
  heading.textContent = text;
  area.appendChild(heading);
}

function appendDetail(area, group, appendDetailLine, options = {}) {
  appendSectionTitle(area, options.informationTitle || 'Wallet information');
  appendDetailLine(area, 'Manufacturer', group.manufacturer);
  appendDetailLine(area, 'Model', group.model);
  appendDetailLine(area, 'Purchase / setup date', group.purchaseDate);
  appendSectionTitle(area, 'Recovery plan');
  appendDetailLine(area, 'Recovery format', group.recoveryFormat);
  appendDetailLine(area, 'Recovery material storage', group.recoveryStorageMode);
  appendDetailLine(area, 'Recovery material location', group.recoveryLocation);
  appendDetailLine(area, 'Device location', group.deviceLocation);
  appendDetailLine(area, 'Backup location', group.backupLocation);
  appendDetailLine(area, 'Additional passphrase used', group.passphraseUsed);
  appendDetailLine(area, 'Beneficiary / recovery contact', group.beneficiary);
  if (String(group.recoveryInstructions || '').trim()) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-notes-section';
    const label = document.createElement('b');
    label.textContent = 'Recovery instructions:';
    wrap.appendChild(label);
    const value = document.createElement('div');
    value.className = 'outData detail-notes-value';
    value.textContent = group.recoveryInstructions;
    wrap.appendChild(value);
    area.appendChild(wrap);
  }
}

function printFields(group) {
  return [
    { label: 'Manufacturer', value: group.manufacturer },
    { label: 'Model', value: group.model },
    { label: 'Purchase / setup date', value: group.purchaseDate },
    { label: 'Recovery format', value: group.recoveryFormat },
    { label: 'Recovery material storage', value: group.recoveryStorageMode },
    { label: 'Recovery material location', value: group.recoveryLocation },
    { label: 'Device location', value: group.deviceLocation },
    { label: 'Backup location', value: group.backupLocation },
    { label: 'Additional passphrase used', value: group.passphraseUsed },
    { label: 'Beneficiary / recovery contact', value: group.beneficiary },
    { label: 'Recovery instructions', value: group.recoveryInstructions }
  ];
}

function searchableValues(group = {}) {
  return DEFINITIONS.map((definition) => group[definition.key]).concat(group.recoveryInstructions || '');
}

exports.addEditFields = addEditFields;
exports.applyEditFields = applyEditFields;
exports.appendDetail = appendDetail;
exports.printFields = printFields;
exports.searchableValues = searchableValues;
exports._test = { DEFINITIONS, appendSectionTitle };
