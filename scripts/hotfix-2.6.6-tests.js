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
const bridgePath = path.join(root, 'src/main/renderer-bridge.js');
delete require.cache[require.resolve(bridgePath)];

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
let secondListenerPayload = null;
bridge.ipcRenderer.on('result', (_event, payload) => {
  rendererPayload = payload;
  payload.rendererTouched = true;
});
bridge.ipcRenderer.on('result', (_event, payload) => {
  secondListenerPayload = payload;
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
assert.strictEqual(rendererPayload, secondListenerPayload,
  'Renderer listeners must receive the same renderer-world result object, not separate structured clones.');
assert.strictEqual(secondListenerPayload.rendererTouched, true,
  'A state change made by the first renderer listener must be visible to later renderer listeners.');

const selection = require(path.join(root, 'src/main/vault-item-selection.js'));
const repaired = selection.ensureAddAssetSelection(rendererPayload.vaultData);
assert.strictEqual(repaired.ok, true);
assert.strictEqual(repaired.changed, true,
  'Missing Add Asset selection must be repaired directly on the authoritative renderer vaultData object.');
assert.strictEqual(rendererPayload.vaultData.groupSelected, 0);
assert.strictEqual(rendererPayload.vaultData.recordSelected, null);
assert.strictEqual(selection.ensureAddAssetSelection(rendererPayload.vaultData).changed, false,
  'A valid selection must not be rewritten on later Add Asset requests.');

const selectionSource = read('src/main/vault-item-selection.js');
assert(!selectionSource.includes('renderer-bridge') && !selectionSource.includes('ipcRenderer'),
  'Selection state must not keep a duplicate IPC subscription.');
assert(!selectionSource.includes('document.') && !selectionSource.includes('.click()'),
  'Selection state must not depend on DOM lookup or synthetic clicks.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-selection-ui.js')), false,
  'The old UI selection guard must remain deleted.');
const rendererSource = read('src/main/renderer.js');
assert(rendererSource.includes('vaultItemSelection.ensureAddAssetSelection(vaultData)'));
assert(rendererSource.includes('group.listGroups({ vaultData, saving });'));
assert(rendererSource.includes('record.listRecords({ vaultData, saving });'));
assert(rendererSource.includes('record.createRecord({ vaultData, saving });'));

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
  'vault-language-ui.js',
  'vault-item-selection-ui.js'
]) {
  assert(!rendererEntry.includes(`require('./${retired}')`), `${retired} must remain retired from the renderer bundle.`);
}

if (originalWindow === undefined) delete global.window;
else global.window = originalWindow;
delete require.cache[require.resolve(bridgePath)];

console.log(`PASS SafeLedger ${pkg.version} preserves shared renderer state while Add Asset selection is direct and observer/click free.`);