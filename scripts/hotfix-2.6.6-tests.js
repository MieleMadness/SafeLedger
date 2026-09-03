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

// Verify the Web3/Website grouped-option renderer is idempotent. Re-running the
// patch over its own already-correct DOM must create no new children/mutations.
let mutationCount = 0;
class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.label = '';
  }
  appendChild(child) {
    this.children.push(child);
    mutationCount += 1;
    return child;
  }
  set innerHTML(_value) {
    this.children = [];
    mutationCount += 1;
  }
  get innerHTML() { return ''; }
  get options() {
    const result = [];
    const walk = (node) => {
      for (const child of node.children || []) {
        if (child.tagName === 'OPTION') result.push(child);
        walk(child);
      }
    };
    walk(this);
    return result;
  }
}
global.document = { createElement: (tagName) => new FakeNode(tagName) };
const typeSplit = require(path.join(root, 'src/main/vault-item-type-split-ui.js'));
const groups = typeSplit._test.groupedPresetNames('Web3 Account');
const select = new FakeNode('select');
assert.strictEqual(typeSplit._test.renderGroupedOptions(select, groups, 'Choose a Web3 service…'), true,
  'First Web3 preset render must build the grouped dropdown.');
const mutationsAfterFirstRender = mutationCount;
assert(mutationsAfterFirstRender > 0);
assert.strictEqual(typeSplit._test.renderGroupedOptions(select, groups, 'Choose a Web3 service…'), false,
  'Second identical Web3 preset render must be a no-op.');
assert.strictEqual(mutationCount, mutationsAfterFirstRender,
  'Repeated Web3 patching must not mutate its own dropdown and retrigger the observer.');

const legacyUi = require(path.join(root, 'src/main/vault-item-ui.js'))._test;
const hostileForm = {
  querySelector() { throw new Error('legacy helper touched split account form'); }
};
assert.doesNotThrow(() => legacyUi.updateAccountLayout(hostileForm, { value: 'Web3 Account' }),
  'Legacy combined-account UI must not touch Web3 Account forms.');
assert.doesNotThrow(() => legacyUi.updateAccountLayout(hostileForm, { value: 'Website Account' }),
  'Legacy combined-account UI must not touch Website Account forms.');

const splitSource = read('src/main/vault-item-type-split-ui.js');
assert(splitSource.includes('observer.disconnect()'),
  'Web3/Website MutationObserver must disconnect while applying its own DOM patch.');
assert(splitSource.includes('safeLedgerGroupedOptionSignature'),
  'Grouped account dropdowns must cache their rendered signature.');
const legacySource = read('src/main/vault-item-ui.js');
assert(legacySource.includes('SPLIT_ACCOUNT_CATEGORIES.has(categoryInput.value)'),
  'Legacy account layout must explicitly leave Web3 Account and Website Account to the split UI.');

if (originalWindow === undefined) delete global.window;
else global.window = originalWindow;
if (originalDocument === undefined) delete global.document;
else global.document = originalDocument;

delete require.cache[require.resolve(bridgePath)];
delete require.cache[require.resolve(selectionPath)];

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.6 shared renderer state and Web3/Website DOM loop protections.`);
