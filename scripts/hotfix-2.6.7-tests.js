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

// Readability/navigation scale requested after the Add Asset fix was confirmed.
const indexSource = read('src/main/index.html');
const scaleCss = read('src/main/css/ui-2.6.7-scale.css');
const scaleSource = read('src/main/ui-scale-2.6.7.js');
const rendererEntry = read('src/main/renderer-entry.js');
const visualUi = require(path.join(root, 'src/main/ui-scale-2.6.7.js'));

assert(indexSource.includes('<link href="./css/ui-2.6.7-scale.css" rel="stylesheet">'),
  'SafeLedger must load the 2.6.7 readability scale stylesheet.');
assert(indexSource.indexOf('./css/ui-2.6.7-scale.css') > indexSource.indexOf('./css/ui-2.5.16.css'),
  'The readability scale must load last so its requested sizes win.');
assert(rendererEntry.includes("require('./ui-scale-2.6.7.js');"),
  'The Vault Item detail artwork and preferred-window helper must be included in the renderer bundle.');

assert(/html,\s*\nbody\s*\{[\s\S]*?font-size:\s*15px\s*!important/.test(scaleCss),
  'Base SafeLedger text must scale from 14px to 15px.');
assert(scaleCss.includes('.wallet-list-category,') && scaleCss.includes('font-size: 13px !important;'),
  '12px helper text must scale to 13px.');
assert(scaleCss.includes('.wallet-detail-category,') && scaleCss.includes('font-size: 14px !important;'),
  '13px supporting text must scale to 14px.');
assert(scaleCss.includes('width: 32px !important;') && scaleCss.includes('flex: 0 0 32px !important;'),
  'Vault Item and Asset list artwork must scale from 28px to 32px.');
assert(scaleCss.includes('width: 28px !important;') && scaleCss.includes('flex: 0 0 28px !important;'),
  'Compact Vault Item and Asset artwork must scale from 24px to 28px.');
assert(scaleCss.includes('width: 60px !important;') && scaleCss.includes('flex: 0 0 60px !important;'),
  'Vault Item and Asset detail artwork must use the requested 60px size.');
assert(scaleCss.includes('width: 52px !important;') && scaleCss.includes('flex: 0 0 52px !important;'),
  'Compact detail artwork must scale from 46px to 52px.');
assert(scaleCss.includes('background-color: transparent !important;') && scaleCss.includes('border-color: #fff !important;'),
  'Selected Vault Item and Asset rows must use a white border without a filled selection background.');
assert(!scaleCss.includes('--sl-action-size:') && !scaleCss.includes('--sl-top-action-size:'),
  'The visual scale must not change detail-action or top-utility button dimensions.');
assert(!/\.panic-lock-inline\s*\{[^}]*\bwidth\s*:/s.test(scaleCss),
  'The visual scale must not change Emergency Lock dimensions.');

assert.strictEqual(visualUi.DETAIL_WIDTH, 1400, 'Default SafeLedger width must grow from 1200px to 1400px.');
assert.strictEqual(visualUi.DETAIL_HEIGHT, 750, 'Default SafeLedger height must remain 750px.');
let resized = null;
const normalScreen = {
  screen: { availWidth: 1920, availHeight: 1080 },
  outerWidth: 1200,
  outerHeight: 750,
  resizeTo(width, height) { resized = { width, height }; }
};
assert.strictEqual(visualUi._test.applyPreferredWindowSize(normalScreen), true,
  'A current 1200px default window should grow to the requested preferred width.');
assert.deepStrictEqual(resized, { width: 1400, height: 750 });

resized = null;
const alreadyLarge = {
  screen: { availWidth: 1920, availHeight: 1080 },
  outerWidth: 1600,
  outerHeight: 900,
  resizeTo(width, height) { resized = { width, height }; }
};
assert.strictEqual(visualUi._test.applyPreferredWindowSize(alreadyLarge), false,
  'The preferred-size helper must not shrink an already larger user/OS window.');
assert.strictEqual(resized, null);

assert(scaleSource.includes("clone.classList.add('wallet-detail-brand-image')") &&
  scaleSource.includes("header.className = 'wallet-detail-header'"),
  'Vault Item details must clone the selected local/offline navigation artwork into a dedicated detail header.');
assert(scaleSource.includes('observer.disconnect();') && scaleSource.includes('patchVaultDetail(document);'),
  'The Vault Item detail observer must disconnect while applying its own DOM patch.');

console.log('PASS SafeLedger 2.6.7 keeps Add Asset reliable and applies the requested 15px readability scale, border-only selection, larger Vault/Asset artwork, Vault detail icon, and wider default window without resizing action controls.');
