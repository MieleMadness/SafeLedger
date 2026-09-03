'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 6,
  'SafeLedger 2.6.6 interaction reliability regressions must remain active on 2.6.6 and later 2.6.x patches.');

const originalWindow = global.window;
const originalDocument = global.document;
const bridgePath = path.join(root, 'src/main/renderer-bridge.js');
const selectionPath = path.join(root, 'src/main/vault-item-selection-ui.js');

delete require.cache[require.resolve(bridgePath)];
delete require.cache[require.resolve(selectionPath)];

let resultSubscription = null;
let resultSubscriptionCount = 0;
global.window = {
  addEventListener() {},
  safeLedgerApi: {
    onResult(callback) {
      resultSubscriptionCount += 1;
      resultSubscription = callback;
    }
  }
};

const bridge = require(bridgePath);
let rendererPayload = null;
let helperPayload = null;
bridge.ipcRenderer.on('result', (_event, payload) => {
  rendererPayload = payload;
  payload.rendererTouched = true;
});
bridge.ipcRenderer.on('result', (_event, payload) => {
  helperPayload = payload;
});

assert.strictEqual(resultSubscriptionCount, 1,
  'Renderer bridge must register exactly one preload subscription per result channel.');
assert.strictEqual(typeof resultSubscription, 'function');

const sharedResult = {
  type: 'vault-read',
  vaultData: {
    groups: [{ name: 'Alpha' }, { name: 'Beta' }],
    groupSelected: null,
    recordSelected: null
  }
};
resultSubscription(sharedResult);
assert.strictEqual(rendererPayload, helperPayload,
  'Core renderer and UI helpers must receive the same renderer-world result object, not separate structured clones.');
assert.strictEqual(helperPayload.rendererTouched, true,
  'A state change made by the first renderer listener must be visible to later UI listeners.');

const selectionTests = require(selectionPath)._test;
selectionTests.setActiveVaultData(sharedResult.vaultData);
let selectedAnchor = null;
let firstClicks = 0;
const firstAnchor = {
  click() {
    firstClicks += 1;
    sharedResult.vaultData.groupSelected = 1;
    sharedResult.vaultData.recordSelected = null;
    selectedAnchor = firstAnchor;
  }
};
const fakeDoc = {
  querySelector(selector) {
    if (selector === '#groupArea .nav > li > a.item-selected') return selectedAnchor;
    if (selector === '#groupArea .nav > li > a') return firstAnchor;
    return null;
  }
};

assert.strictEqual(selectionTests.repairAddAssetClick({}, fakeDoc, sharedResult.vaultData), true,
  'Add Asset capture must synchronously repair a missing Vault Item selection.');
assert.strictEqual(firstClicks, 1, 'Selection repair must use the normal Vault Item click path exactly once.');
assert.strictEqual(sharedResult.vaultData.groupSelected, 1,
  'The repaired selection must be visible on the exact vaultData object used by the core renderer.');
let realAddAssetOpened = false;
if (rendererPayload.vaultData && rendererPayload.vaultData.groupSelected != null) realAddAssetOpened = true;
assert.strictEqual(realAddAssetOpened, true,
  'The original renderer Add Asset handler must see a valid selection on the same click.');

const selectionSource = read('src/main/vault-item-selection-ui.js');
assert(!selectionSource.includes('stopImmediatePropagation'),
  '2.6.6+ must not cancel the real Add Asset click while repairing selection.');
assert(!selectionSource.includes('addAsset.click()'),
  '2.6.6+ must not rely on a second synthetic Add Asset click.');
assert(!selectionSource.includes('queueMicrotask(() => ensureVaultItemSelected'),
  'Loading a Profile must not auto-click the first Vault Item and replace the Profile detail screen.');
assert(selectionSource.includes('Selection repair happens only when Add Asset is actually requested.'),
  'Vault Item auto-selection must remain scoped to the Add Asset request path.');

// The old 2.6.5/2.6.6 fix prevented multiple DOM observers from mutating each
// other's Web3/Website dropdowns. The stronger invariant is now that those
// observers no longer exist in the runtime path: the real group renderer calls
// one passive presentation helper directly.
const presentation = require(path.join(root, 'src/main/vault-item-presentation.js'));
const firstGroups = presentation.groupedPresetNames('Web3 Account');
const secondGroups = presentation.groupedPresetNames('Web3 Account');
assert.deepStrictEqual(secondGroups, firstGroups,
  'Repeated direct Web3 preset reads must remain deterministic without DOM mutation.');
assert(presentation.accountFields('Web3 Account').some(([label, type]) => label === 'Connected wallet(s)' && type === 'text'));
assert(presentation.accountFields('Website Account').some(([label, type]) => label === '2FA recovery / backup codes' && type === 'sensitive'));

const presentationSource = read('src/main/vault-item-presentation.js');
assert(!presentationSource.includes('MutationObserver'),
  'Canonical Vault Item rendering must not reintroduce a MutationObserver feedback loop.');
assert(!presentationSource.includes('queueMicrotask') && !presentationSource.includes('setTimeout('),
  'Canonical Vault Item rendering must not depend on scheduling after the form has rendered.');
assert(!presentationSource.includes('.click()'),
  'Standard Vault Item fields and presets must not be created through synthetic button clicks.');
const customFieldsSource = read('src/main/custom-fields-ui.js');
assert(customFieldsSource.includes('function ensureField(field = {})') && customFieldsSource.includes('return existing || addRow(normalized);'),
  'Custom field editor must expose a direct idempotent field API for canonical Vault Item rendering.');
const rendererEntry = read('src/main/renderer-entry.js');
for (const retired of [
  'vault-item-ui.js',
  'service-catalog-ui.js',
  'vault-item-type-split-ui.js',
  'vault-item-wallet-presets-ui.js',
  'vault-language-ui.js'
]) {
  assert(!rendererEntry.includes(`require('./${retired}')`), `${retired} must remain retired from the renderer bundle.`);
}

if (originalWindow === undefined) delete global.window;
else global.window = originalWindow;
if (originalDocument === undefined) delete global.document;
else global.document = originalDocument;

delete require.cache[require.resolve(bridgePath)];
delete require.cache[require.resolve(selectionPath)];

console.log(`PASS SafeLedger ${pkg.version} preserves shared Add Asset state and replaces competing Vault Item DOM observers with deterministic direct rendering.`);