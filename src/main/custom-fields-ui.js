'use strict';

const securityUi = require('./security-ui');
const customFields = require('./custom-fields');

const TYPE_OPTIONS = [
  ['text', 'Text'],
  ['sensitive', 'Sensitive text'],
  ['multiline', 'Multiline'],
  ['date', 'Date'],
  ['number', 'Number'],
  ['url', 'URL'],
  ['checkbox', 'Checkbox']
];

const DEFAULT_TITLE = 'Custom Fields';
const DEFAULT_NOTE = 'Add optional information that does not fit the standard wallet or coin fields. Sensitive values stay encrypted and are excluded from search.';
const normalizeLabel = (value) => String(value || '').trim().toLowerCase();

function makeValueControl(host, type, value, label) {
  host.innerHTML = '';
  if (type === 'checkbox') {
    const shell = document.createElement('label');
    shell.className = 'custom-field-checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value === true || String(value).toLowerCase() === 'true';
    shell.appendChild(input);
    shell.appendChild(document.createTextNode(' Yes'));
    host.appendChild(shell);
    return input;
  }

  if (type === 'multiline') {
    const input = document.createElement('textarea');
    input.className = 'form-control';
    input.rows = 3;
    input.maxLength = customFields.MAX_VALUE_LENGTH;
    input.value = value || '';
    host.appendChild(input);
    return input;
  }

  const input = document.createElement('input');
  input.className = 'form-control';
  input.type = type === 'sensitive' ? 'password' : type === 'date' ? 'date' : type === 'number' ? 'number' : 'text';
  input.maxLength = customFields.MAX_VALUE_LENGTH;
  input.value = value == null ? '' : value;
  if (type === 'sensitive') securityUi.addEditSensitiveInputControl(input, host, label || 'custom field');
  else host.appendChild(input);
  return input;
}

/*
 * Assets historically stored Network and Contract address inside customFields
 * so older 2.x vaults remain compatible. When a caller supplies fixedFields,
 * render only those fixed identity values as ordinary form fields. Any older
 * user-created Asset custom fields stay preserved in the encrypted record but
 * are intentionally not exposed by the simplified Asset editor.
 */
function createFixedFieldsEditor(grid, initialFields, fixedFields) {
  const existing = customFields.normalize(initialFields);
  const definitions = customFields.normalize(fixedFields).map((field) => ({
    label: field.label,
    type: field.type
  }));
  const definitionByKey = new Map(definitions.map((field) => [normalizeLabel(field.label), field]));
  const controls = new Map();

  for (const definition of definitions) {
    const key = normalizeLabel(definition.label);
    const prior = existing.find((field) => normalizeLabel(field.label) === key);
    const field = document.createElement('div');
    field.className = 'form-group edit-info-grid-field asset-identity-field';
    field.dataset.assetIdentityField = definition.label;

    const label = document.createElement('label');
    label.textContent = definition.label;
    field.appendChild(label);

    const valueHost = document.createElement('div');
    const input = makeValueControl(valueHost, definition.type, prior && prior.value, definition.label);
    field.appendChild(valueHost);
    grid.appendChild(field);

    controls.set(key, {
      input,
      getValue: () => input.type === 'checkbox' ? input.checked : input.value
    });
  }

  function getFields() {
    const result = [];
    const writtenFixed = new Set();

    for (const field of existing) {
      const key = normalizeLabel(field.label);
      const definition = definitionByKey.get(key);
      const control = controls.get(key);
      if (!definition || !control || writtenFixed.has(key)) {
        result.push(field);
        continue;
      }
      result.push({ label: definition.label, type: definition.type, value: control.getValue() });
      writtenFixed.add(key);
    }

    for (const definition of definitions) {
      const key = normalizeLabel(definition.label);
      if (writtenFixed.has(key) || result.length >= customFields.MAX_FIELDS) continue;
      const control = controls.get(key);
      result.push({ label: definition.label, type: definition.type, value: control ? control.getValue() : '' });
      writtenFixed.add(key);
    }

    return customFields.normalize(result);
  }

  return {
    ensureField(field = {}) {
      const normalized = customFields.normalize([field])[0];
      return normalized ? controls.get(normalizeLabel(normalized.label)) || null : null;
    },
    getFields
  };
}

function createEditor(grid, initialFields, options = {}) {
  const fixedFields = customFields.normalize(options.fixedFields);
  if (fixedFields.length) return createFixedFieldsEditor(grid, initialFields, fixedFields);

  const section = document.createElement('section');
  section.className = 'edit-info-grid-full custom-fields-editor';
  const heading = document.createElement('h3');
  heading.className = 'product-section-title';
  heading.textContent = options.title || DEFAULT_TITLE;
  section.appendChild(heading);
  const note = document.createElement('p');
  note.className = 'custom-fields-note';
  note.textContent = options.note || DEFAULT_NOTE;
  section.appendChild(note);

  const rowsHost = document.createElement('div');
  rowsHost.className = 'custom-fields-rows';
  section.appendChild(rowsHost);
  grid.appendChild(section);

  const rows = [];

  function addRow(field = {}) {
    if (rows.length >= customFields.MAX_FIELDS) return null;
    const normalized = customFields.normalize([field])[0] || { label: '', type: 'text', value: '' };
    const row = document.createElement('div');
    row.className = 'custom-field-edit-row';

    const labelWrap = document.createElement('div');
    labelWrap.className = 'custom-field-label-control';
    const labelCaption = document.createElement('label');
    labelCaption.textContent = 'Label';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'form-control';
    labelInput.maxLength = customFields.MAX_LABEL_LENGTH;
    labelInput.value = normalized.label;
    labelWrap.appendChild(labelCaption);
    labelWrap.appendChild(labelInput);

    const typeWrap = document.createElement('div');
    typeWrap.className = 'custom-field-type-control';
    const typeCaption = document.createElement('label');
    typeCaption.textContent = 'Type';
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-control';
    for (const [value, text] of TYPE_OPTIONS) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      typeSelect.appendChild(option);
    }
    typeSelect.value = normalized.type;
    typeWrap.appendChild(typeCaption);
    typeWrap.appendChild(typeSelect);

    const valueWrap = document.createElement('div');
    valueWrap.className = 'custom-field-value-control';
    const valueCaption = document.createElement('label');
    valueCaption.textContent = 'Value';
    const valueHost = document.createElement('div');
    valueWrap.appendChild(valueCaption);
    valueWrap.appendChild(valueHost);
    let valueControl = makeValueControl(valueHost, normalized.type, normalized.value, normalized.label || 'custom field');

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-default custom-field-remove';
    remove.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
    remove.title = 'Remove custom field';
    remove.setAttribute('aria-label', 'Remove custom field');

    row.appendChild(labelWrap);
    row.appendChild(typeWrap);
    row.appendChild(valueWrap);
    row.appendChild(remove);
    rowsHost.appendChild(row);

    const rowState = {
      row,
      labelWrap,
      labelInput,
      typeWrap,
      typeSelect,
      valueCaption,
      valueHost,
      remove,
      getValue: () => valueControl.type === 'checkbox' ? valueControl.checked : valueControl.value,
      rebuildValueControl(type) {
        const prior = rowState.getValue();
        valueControl = makeValueControl(valueHost, type, prior, labelInput.value || 'custom field');
        rowState.getValue = () => valueControl.type === 'checkbox' ? valueControl.checked : valueControl.value;
      }
    };
    rows.push(rowState);

    typeSelect.addEventListener('change', () => rowState.rebuildValueControl(typeSelect.value));
    remove.addEventListener('click', () => {
      const index = rows.indexOf(rowState);
      if (index >= 0) rows.splice(index, 1);
      row.remove();
    });
    return rowState;
  }

  function ensureField(field = {}) {
    const normalized = customFields.normalize([field])[0];
    if (!normalized || !normalized.label) return null;
    const key = normalized.label.trim().toLowerCase();
    const existing = rows.find((row) => String(row.labelInput.value || '').trim().toLowerCase() === key);
    return existing || addRow(normalized);
  }

  // Retained for compatibility with older tests/modules that may still call
  // the helper directly. Current Asset rendering takes the fixed-fields path
  // above and no longer uses the generic custom-field row UI for identity.
  function lockFixedField(field = {}) {
    const normalized = customFields.normalize([field])[0];
    if (!normalized || !normalized.label) return null;
    const rowState = ensureField(normalized);
    if (!rowState) return null;

    const prior = rowState.getValue();
    rowState.labelInput.value = normalized.label;
    rowState.labelInput.readOnly = true;
    if (rowState.typeSelect.value !== normalized.type) {
      rowState.typeSelect.value = normalized.type;
      rowState.rebuildValueControl(normalized.type);
      const current = rowState.valueHost.querySelector('input, textarea');
      if (current && current.type !== 'checkbox') current.value = prior == null ? '' : prior;
      else if (current && current.type === 'checkbox') current.checked = prior === true || String(prior).toLowerCase() === 'true';
    }
    rowState.typeSelect.tabIndex = -1;
    rowState.valueCaption.textContent = normalized.label;
    rowState.remove.style.display = 'none';
    rowState.labelWrap.style.display = 'none';
    rowState.typeWrap.style.display = 'none';
    rowState.row.dataset.assetIdentityField = normalized.label;
    rowState.row.classList.add('asset-identity-field');
    return rowState;
  }

  for (const field of customFields.normalize(initialFields)) addRow(field);

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn btn-default custom-field-add';
  add.innerHTML = '<i class="fa fa-plus" aria-hidden="true"></i> Add custom field';
  add.addEventListener('click', () => addRow());
  section.appendChild(add);

  return {
    ensureField,
    getFields: () => customFields.normalize(rows.map((row) => ({
      label: row.labelInput.value,
      type: row.typeSelect.value,
      value: row.getValue()
    })))
  };
}

function appendDetail(parent, fields, addLine) {
  const normalized = customFields.normalize(fields);
  if (!normalized.length) return;
  const heading = document.createElement('h3');
  heading.className = 'product-section-title';
  heading.textContent = 'Custom Fields';
  parent.appendChild(heading);

  for (const field of normalized) {
    if (field.type === 'sensitive') {
      securityUi.appendSensitiveField(parent, field.label, field.value, { allowQr: false });
      continue;
    }
    if (field.type === 'multiline') {
      const wrap = document.createElement('div');
      wrap.className = 'detail-notes-section custom-field-multiline';
      const label = document.createElement('b');
      label.textContent = `${field.label}:`;
      const value = document.createElement('div');
      value.className = 'outData detail-notes-value';
      value.textContent = customFields.displayValue(field);
      wrap.appendChild(label);
      wrap.appendChild(value);
      parent.appendChild(wrap);
      continue;
    }
    addLine(field.label, customFields.displayValue(field));
  }
}

module.exports = { createEditor, appendDetail, _test: { createFixedFieldsEditor } };
