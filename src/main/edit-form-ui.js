'use strict';

const securityUi = require('./security-ui');

function createForm(area) {
  const form = document.createElement('form');
  form.className = 'safeledger-edit-form';
  const grid = document.createElement('div');
  grid.className = 'edit-info-grid';
  form.appendChild(grid);
  area.appendChild(form);
  return { form, grid };
}

function createField(grid, labelText, options = {}) {
  const field = document.createElement('div');
  field.className = `form-group edit-info-grid-field${options.full ? ' edit-info-grid-full' : ''}`;
  const label = document.createElement('label');
  label.htmlFor = options.id || '';
  label.textContent = labelText;
  field.appendChild(label);
  grid.appendChild(field);
  return field;
}

function addTextInput(grid, options) {
  const field = createField(grid, options.label, options);
  const input = document.createElement('input');
  input.type = options.sensitive ? 'password' : 'text';
  input.className = 'form-control';
  input.id = options.id;
  input.maxLength = options.maxLength || 500;
  input.value = options.value || '';
  if (options.sensitive) securityUi.addEditSensitiveInputControl(input, field, options.revealLabel || options.label.toLowerCase());
  else field.appendChild(input);
  return input;
}

function addSelect(grid, options) {
  const field = createField(grid, options.label, options);
  const select = document.createElement('select');
  select.className = 'form-control';
  select.id = options.id;
  for (const optionConfig of options.options || []) {
    const option = document.createElement('option');
    if (typeof optionConfig === 'string') {
      option.value = optionConfig;
      option.textContent = optionConfig || 'Not specified';
    } else {
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
    }
    select.appendChild(option);
  }
  select.value = options.value || '';
  field.appendChild(select);
  return select;
}

function addTextarea(grid, options) {
  const field = createField(grid, options.label, options);
  const input = document.createElement('textarea');
  input.className = `form-control${options.className ? ` ${options.className}` : ''}`;
  input.id = options.id;
  input.rows = options.rows || 4;
  input.maxLength = options.maxLength || 500;
  input.value = options.value || '';
  input.style.maxWidth = '100%';
  if (options.resize) input.style.resize = options.resize;
  field.appendChild(input);
  return input;
}

exports.createForm = createForm;
exports.addTextInput = addTextInput;
exports.addSelect = addSelect;
exports.addTextarea = addTextarea;
exports._test = { createField };
