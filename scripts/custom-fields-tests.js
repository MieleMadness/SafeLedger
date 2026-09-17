'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const customFields = require('../src/main/custom-fields');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const fields = customFields.normalize([
  { label: 'Account name', type: 'text', value: 'Cold storage' },
  { label: 'Recovery code', type: 'sensitive', value: 'SECRET-NOT-SEARCHABLE' },
  { label: 'Instructions', type: 'multiline', value: 'Check the metal backup.' }
]);

assert.deepStrictEqual(customFields.TYPES, ['text', 'sensitive', 'multiline', 'date', 'number', 'url']);
assert.strictEqual(fields.length, 3);
assert(customFields.hasSensitive(fields));
const searchable = customFields.searchableValues(fields).join(' | ');
assert(searchable.includes('Recovery code'));
assert(searchable.includes('Cold storage'));
assert(searchable.includes('Check the metal backup.'));
assert(!searchable.includes('SECRET-NOT-SEARCHABLE'));
assert.strictEqual(customFields.normalize([{ label: 'x', type: 'unknown', value: 'y' }])[0].type, 'text');
assert.strictEqual(customFields.normalize([{ label: 'Former checkbox', type: 'checkbox', value: true }])[0].type, 'text');
assert.strictEqual(customFields.normalize([{ label: 'Former checkbox', type: 'checkbox', value: true }])[0].value, 'true');
assert.strictEqual(customFields.normalize(Array.from({ length: 75 }, (_, i) => ({ label: `Field ${i}`, value: i })) ).length, customFields.MAX_FIELDS);
assert(customFields.printFields(fields).some((field) => field.label === 'Custom · Recovery code'));

const uiSource = read('src/main/custom-fields-ui.js');
assert(!uiSource.includes("['checkbox', 'Checkbox']"), 'Checkbox must not return to the Custom Field type picker.');
assert(!uiSource.includes("type === 'checkbox'"), 'Custom Field editor must not keep retired checkbox-specific behavior.');
const cssSource = read('src/main/css/product-features.css');
assert(!cssSource.includes('.custom-field-checkbox'), 'Retired Custom Field checkbox styling must stay removed.');
assert(cssSource.includes('.custom-field-remove { display:inline-flex;'), 'Custom Field remove action must own flex centering in CSS.');
assert(cssSource.includes('align-items:center; justify-content:center;'), 'Custom Field remove X must remain centered in its button.');

console.log('PASS custom fields expose six current field types, checkbox behavior is removed, the remove action stays centered, field count is capped, and sensitive values stay out of search.');
