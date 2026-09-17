'use strict';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function customFieldValue(record = {}, label) {
  const key = lower(label);
  const fields = Array.isArray(record.customFields) ? record.customFields : [];
  const match = fields.find((field) => lower(field && field.label) === key);
  return text(match && match.value);
}

function identity(record = {}) {
  return Object.freeze({
    name: lower(record.name),
    symbol: lower(record.symbol),
    network: lower(customFieldValue(record, 'Network')),
    contract: lower(customFieldValue(record, 'Contract address'))
  });
}

function sameIdentity(a = {}, b = {}) {
  const left = identity(a);
  const right = identity(b);
  if (left.contract || right.contract) {
    return Boolean(left.contract && right.contract && left.contract === right.contract && (!left.network || !right.network || left.network === right.network));
  }
  if (left.symbol && right.symbol) {
    if (left.symbol !== right.symbol) return false;
    if (left.network || right.network) return Boolean(left.network && right.network && left.network === right.network);
    return true;
  }
  return Boolean(left.name && right.name && left.name === right.name && (!left.network || !right.network || left.network === right.network));
}

function findDuplicates(records = [], candidate = {}, excludeIndex = -1) {
  if (!Array.isArray(records)) return [];
  return records.map((record, index) => ({ record, index }))
    .filter(({ record, index }) => index !== Number(excludeIndex) && sameIdentity(record, candidate));
}

function warning(records = [], candidate = {}, excludeIndex = -1) {
  const duplicates = findDuplicates(records, candidate, excludeIndex);
  if (!duplicates.length) return null;
  const id = identity(candidate);
  const label = text(candidate.name) || text(candidate.symbol) || 'this Asset';
  const scope = id.contract ? `contract ${id.contract}` : id.network ? `${text(candidate.symbol) || label} on ${customFieldValue(candidate, 'Network')}` : text(candidate.symbol) || label;
  return Object.freeze({
    duplicates,
    message: `A matching Asset already exists in this Vault Item (${scope}). Add another ${label} anyway?`
  });
}

module.exports = { identity, sameIdentity, findDuplicates, warning, _test: { text, lower, customFieldValue } };