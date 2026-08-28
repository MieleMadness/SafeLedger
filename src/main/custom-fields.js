'use strict';

const TYPES = Object.freeze([
  'text',
  'sensitive',
  'multiline',
  'date',
  'number',
  'url',
  'checkbox'
]);
const MAX_FIELDS = 50;
const MAX_LABEL_LENGTH = 80;
const MAX_VALUE_LENGTH = 2000;

function normalizeType(value) {
  const type = String(value || '').trim().toLowerCase();
  return TYPES.includes(type) ? type : 'text';
}

function normalizeValue(type, value) {
  if (type === 'checkbox') return value === true || String(value).toLowerCase() === 'true';
  return String(value == null ? '' : value).slice(0, MAX_VALUE_LENGTH);
}

function normalize(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.slice(0, MAX_FIELDS).map((field) => {
    const type = normalizeType(field && field.type);
    return {
      label: String(field && field.label || '').trim().slice(0, MAX_LABEL_LENGTH),
      type,
      value: normalizeValue(type, field && field.value)
    };
  }).filter((field) => field.label);
}

function displayValue(field) {
  const normalized = normalize([field])[0];
  if (!normalized) return '';
  if (normalized.type === 'checkbox') return normalized.value ? 'Yes' : 'No';
  return String(normalized.value || '');
}

function searchableValues(fields) {
  const values = [];
  for (const field of normalize(fields)) {
    values.push(field.label);
    if (field.type !== 'sensitive') values.push(displayValue(field));
  }
  return values;
}

function hasSensitive(fields) {
  return normalize(fields).some((field) => field.type === 'sensitive' && String(field.value || '').trim());
}

function printFields(fields) {
  return normalize(fields).map((field) => ({
    label: `Custom · ${field.label}`,
    value: displayValue(field)
  }));
}

module.exports = {
  TYPES,
  MAX_FIELDS,
  MAX_LABEL_LENGTH,
  MAX_VALUE_LENGTH,
  normalize,
  searchableValues,
  displayValue,
  hasSensitive,
  printFields
};
