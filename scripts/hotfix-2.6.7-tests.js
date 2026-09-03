'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const assetUi = require(path.join(root, 'src/main/asset-multichain-ui.js'));
const assetTests = assetUi._test;

assert.strictEqual(pkg.version, '2.6.7', 'SafeLedger Add Asset observer-loop hotfix must report version 2.6.7.');

function trackedText(initial) {
  let value = initial;
  let writes = 0;
  return {
    get textContent() { return value; },
    set textContent(next) { writes += 1; value = next; },
    get writes() { return writes; }
  };
}

function fixedRow(label) {
  const labelInput = { value: label };
  return {
    dataset: { assetIdentityField: label },
    querySelector(selector) {
      if (selector === '.custom-field-label-control input') return labelInput;
      return null;
    }
  };
}

const title = trackedText('Custom Fields');
const note = trackedText('Old note');
const rows = [fixedRow('Network'), fixedRow('Contract address')];
const editor = {
  querySelectorAll(selector) {
    return selector === '.custom-field-edit-row' ? rows : [];
  },
  querySelector(selector) {
    if (selector === '.product-section-title') return title;
    if (selector === '.custom-fields-note') return note;
    return null;
  }
};
const heading = { textContent: 'Add Asset' };
const area = {
  querySelector(selector) {
    if (selector === 'h1') return heading;
    if (selector === '.custom-fields-editor') return editor;
    return null;
  }
};
const doc = {
  getElementById(id) { return id === 'detailArea' ? area : null; }
};

assert.strictEqual(assetTests.patchAssetEditor(doc), true,
  'The first Add Asset enhancement pass should make the intended presentation changes.');
assert.strictEqual(title.textContent, 'Network & Additional Fields');
assert(note.textContent.includes('Network and Contract address are standard SafeLedger asset identity fields.'));
assert.strictEqual(title.writes, 1);
assert.strictEqual(note.writes, 1);

assert.strictEqual(assetTests.patchAssetEditor(doc), false,
  'A second identical Add Asset enhancement pass must be a complete no-op.');
assert.strictEqual(title.writes, 1,
  'Repeated Add Asset patches must not rewrite the section title and retrigger MutationObserver.');
assert.strictEqual(note.writes, 1,
  'Repeated Add Asset patches must not rewrite the helper note and retrigger MutationObserver.');

const source = read('src/main/asset-multichain-ui.js');
assert(source.includes('if (!node || node.textContent === text) return false;'),
  'Asset-form text updates must be guarded against no-op DOM writes.');
assert(source.includes('observer.disconnect();') && source.includes("observer.observe(doc.body, { childList: true, subtree: true });"),
  'The Asset MutationObserver must disconnect while SafeLedger patches its own form.');
assert(!source.includes("const observer = new MutationObserver(() => queueMicrotask(patchAssetEditor));"),
  'The original self-observing Add Asset mutation loop must not return.');

const recordSource = read('src/main/record.js');
assert(recordSource.includes("header.textContent = params.record ? 'Modify Asset' : 'Add Asset';") &&
  recordSource.includes('exports.createRecord = (params) => createEditRecord(params);'),
  'The original core Add Asset form path must remain intact; this hotfix belongs in the enhancer that regressed it.');

console.log('PASS SafeLedger 2.6.7 preserves the original Add Asset form and prevents the multichain enhancer from observing its own DOM writes.');
