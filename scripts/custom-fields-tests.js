'use strict';
const assert = require('assert');
const customFields = require('../src/main/custom-fields');

const fields = customFields.normalize([
  { label: 'Account name', type: 'text', value: 'Cold storage' },
  { label: 'Recovery code', type: 'sensitive', value: 'SECRET-NOT-SEARCHABLE' },
  { label: 'Confirmed', type: 'checkbox', value: true },
  { label: 'Instructions', type: 'multiline', value: 'Check the metal backup.' }
]);

assert.strictEqual(fields.length, 4);
assert.strictEqual(customFields.displayValue(fields[2]), 'Yes');
assert(customFields.hasSensitive(fields));
const searchable = customFields.searchableValues(fields).join(' | ');
assert(searchable.includes('Recovery code'));
assert(searchable.includes('Cold storage'));
assert(searchable.includes('Check the metal backup.'));
assert(!searchable.includes('SECRET-NOT-SEARCHABLE'));
assert.strictEqual(customFields.normalize([{ label: 'x', type: 'unknown', value: 'y' }])[0].type, 'text');
assert.strictEqual(customFields.normalize(Array.from({ length: 75 }, (_, i) => ({ label: `Field ${i}`, value: i })) ).length, customFields.MAX_FIELDS);
assert(customFields.printFields(fields).some((field) => field.label === 'Custom · Recovery code'));
console.log('PASS custom fields normalize safely, cap field count, support typed display, and exclude sensitive values from search.');
