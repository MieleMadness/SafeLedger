'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 10,
  'SafeLedger 2.6.10 regressions must remain active on 2.6.10 and later 2.6.x patches.');
assert(read('package.json').includes('node scripts/hotfix-2.6.10-tests.js'),
  '2.6.10 regression coverage must stay in the locked suite.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/asset-multichain-ui.js')), false,
  'The post-render Asset multichain helper must stay removed.');

const recordSource = read('src/main/record.js');
const entrySource = read('src/main/renderer-entry.js');
const editorSource = read('src/main/custom-fields-ui.js');
assert(recordSource.includes("Object.freeze({ label: 'Network', type: 'text' })"));
assert(recordSource.includes("Object.freeze({ label: 'Contract address', type: 'text' })"));
assert(recordSource.includes('fixedFields: ASSET_IDENTITY_FIELDS'));
assert(recordSource.includes("title: ASSET_CUSTOM_FIELDS_TITLE"));
assert(recordSource.includes("note: ASSET_CUSTOM_FIELDS_NOTE"));
assert(!entrySource.includes("require('./asset-multichain-ui.js')"));
assert(!editorSource.includes('MutationObserver'));
assert(!editorSource.includes(".click()"),
  'Fixed Asset fields must be created directly rather than by synthetic Add custom field clicks.');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.checked = false;
    this.type = '';
    this.readOnly = false;
    this.tabIndex = 0;
    this.attributes = {};
    this.listeners = {};
    this._innerHTML = '';
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) {
    this._innerHTML = String(value || '');
    if (!this._innerHTML) this.children = [];
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }

  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  querySelector(selector) {
    if (selector !== 'input, textarea') return null;
    const queue = [...this.children];
    while (queue.length) {
      const node = queue.shift();
      if (node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) return node;
      if (node && Array.isArray(node.children)) queue.push(...node.children);
    }
    return null;
  }
}

function findAll(node, predicate, output = []) {
  if (!node) return output;
  if (predicate(node)) output.push(node);
  for (const child of node.children || []) findAll(child, predicate, output);
  return output;
}

const previousDocument = global.document;
global.document = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => {
    const node = new FakeElement('#text');
    node.textContent = String(text || '');
    return node;
  }
};

try {
  const modulePath = require.resolve('../src/main/custom-fields-ui.js');
  delete require.cache[modulePath];
  const customFieldsUi = require(modulePath);

  const grid = new FakeElement('div');
  const editor = customFieldsUi.createEditor(grid, [
    { label: 'Network', type: 'text', value: 'Ethereum' },
    { label: 'Memo', type: 'text', value: 'Cold storage' }
  ], {
    title: 'Network & Additional Fields',
    note: 'Network and Contract address are standard SafeLedger asset identity fields. Add other optional fields below as needed.',
    fixedFields: [
      { label: 'Network', type: 'text' },
      { label: 'Contract address', type: 'text' }
    ]
  });

  const fields = editor.getFields();
  assert.deepStrictEqual(fields.map((field) => field.label), ['Network', 'Memo', 'Contract address']);
  assert.strictEqual(fields.find((field) => field.label === 'Network').value, 'Ethereum',
    'Editing an existing Asset must preserve its Network value.');
  assert.strictEqual(fields.find((field) => field.label === 'Memo').value, 'Cold storage',
    'Ordinary custom fields must remain unchanged.');
  assert.strictEqual(fields.find((field) => field.label === 'Contract address').value, '');

  const fixedRows = findAll(grid, (node) => !!node.dataset.assetIdentityField);
  assert.strictEqual(fixedRows.length, 2, 'Asset editor must render exactly two fixed identity rows.');
  for (const row of fixedRows) {
    assert(row.classList.contains('asset-identity-field'));
    assert.strictEqual(row.children[0].style.display, 'none', 'Fixed field label controls must stay hidden.');
    assert.strictEqual(row.children[1].style.display, 'none', 'Fixed field type controls must stay hidden.');
    assert.strictEqual(row.children[3].style.display, 'none', 'Fixed fields must not expose a remove button.');
  }

  const fullGrid = new FakeElement('div');
  const maxFields = Array.from({ length: 50 }, (_, index) => ({
    label: `Field ${index}`,
    type: 'text',
    value: `Value ${index}`
  }));
  const fullEditor = customFieldsUi.createEditor(fullGrid, maxFields, {
    fixedFields: [
      { label: 'Network', type: 'text' },
      { label: 'Contract address', type: 'text' }
    ]
  });
  const fullResult = fullEditor.getFields();
  assert.strictEqual(fullResult.length, 50);
  assert.strictEqual(fullResult[49].label, 'Field 49',
    'A full custom-field list must never have its final user field repurposed as an Asset identity field.');
  assert(!fullResult.some((field) => field.label === 'Network' || field.label === 'Contract address'),
    'When the legacy field limit is already full, direct rendering must fail safely without corrupting user fields.');
} finally {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
}

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.10 direct Asset Network/Contract rendering and full-field safety behavior active.`);
