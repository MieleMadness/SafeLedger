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
  querySelectorAll(selector) { return selector === '.custom-field-edit-row' ? rows : []; },
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
const doc = { getElementById(id) { return id === 'detailArea' ? area : null; } };

assert.strictEqual(assetTests.patchAssetEditor(doc), true);
assert.strictEqual(title.textContent, 'Network & Additional Fields');
assert(note.textContent.includes('Network and Contract address are standard SafeLedger asset identity fields.'));
assert.strictEqual(title.writes, 1);
assert.strictEqual(note.writes, 1);
assert.strictEqual(assetTests.patchAssetEditor(doc), false,
  'A second identical Add Asset enhancement pass must be a complete no-op.');
assert.strictEqual(title.writes, 1);
assert.strictEqual(note.writes, 1);

const source = read('src/main/asset-multichain-ui.js');
assert(source.includes('if (!node || node.textContent === text) return false;'));
assert(source.includes('observer.disconnect();') && source.includes("observer.observe(doc.body, { childList: true, subtree: true });"));
assert(!source.includes("const observer = new MutationObserver(() => queueMicrotask(patchAssetEditor));"));

const recordSource = read('src/main/record.js');
assert(recordSource.includes("header.textContent = params.record ? 'Modify Asset' : 'Add Asset';") &&
  recordSource.includes('exports.createRecord = (params) => createEditRecord(params);'));

const indexSource = read('src/main/index.html');
const scaleCss = read('src/main/css/ui-2.6.7-scale.css');
const themeCss = read('src/main/css/ui-2.6.7-theme-refinement.css');
const scaleSource = read('src/main/ui-scale-2.6.7.js');
const rendererEntry = read('src/main/renderer-entry.js');
const selectionSource = read('src/main/vault-item-selection-ui.js');
const appMenuUi = read('src/main/app-menu-ui.js');
const appMenuMain = read('src/main/app-menu-main.js');
const mainSource = read('src/main/main.js');
const preloadSource = read('src/main/preload.js');
const visualUi = require(path.join(root, 'src/main/ui-scale-2.6.7.js'));

assert(indexSource.includes('<link href="./css/ui-2.6.7-scale.css" rel="stylesheet">'));
assert(indexSource.includes('<link href="./css/ui-2.6.7-theme-refinement.css" rel="stylesheet">'));
assert(indexSource.indexOf('./css/ui-2.6.7-theme-refinement.css') > indexSource.indexOf('./css/ui-2.6.7-scale.css'));
assert(indexSource.includes('<span class="fa fa-plus"></span> Add Vault</button>') && !indexSource.includes('Add Vault Item</button>'));
assert(rendererEntry.includes("require('./ui-scale-2.6.7.js');"));
assert(rendererEntry.includes("require('./app-menu-ui.js');"));

assert(/html,\s*\nbody\s*\{[\s\S]*?font-size:\s*15px\s*!important/.test(scaleCss));
assert(scaleCss.includes('width: 32px !important;') && scaleCss.includes('flex: 0 0 32px !important;'));
assert(scaleCss.includes('width: 28px !important;') && scaleCss.includes('flex: 0 0 28px !important;'));
assert(scaleCss.includes('width: 60px !important;') && scaleCss.includes('flex: 0 0 60px !important;'));
assert(scaleCss.includes('width: 52px !important;') && scaleCss.includes('flex: 0 0 52px !important;'));
assert(scaleCss.includes('background-color: transparent !important;') && scaleCss.includes('border-color: #fff !important;'));
assert(!scaleCss.includes('--sl-action-size:') && !scaleCss.includes('--sl-top-action-size:'));
assert(!/\.panic-lock-inline\s*\{[^}]*\bwidth\s*:/s.test(scaleCss));

assert.strictEqual(visualUi.DETAIL_WIDTH, 1400);
assert.strictEqual(visualUi.DETAIL_HEIGHT, 750);
let resized = null;
const normalScreen = {
  screen: { availWidth: 1920, availHeight: 1080 },
  outerWidth: 1200,
  outerHeight: 750,
  resizeTo(width, height) { resized = { width, height }; }
};
assert.strictEqual(visualUi._test.applyPreferredWindowSize(normalScreen), true);
assert.deepStrictEqual(resized, { width: 1400, height: 750 });
resized = null;
const alreadyLarge = {
  screen: { availWidth: 1920, availHeight: 1080 },
  outerWidth: 1600,
  outerHeight: 900,
  resizeTo(width, height) { resized = { width, height }; }
};
assert.strictEqual(visualUi._test.applyPreferredWindowSize(alreadyLarge), false);
assert.strictEqual(resized, null);
assert(scaleSource.includes("clone.classList.add('wallet-detail-brand-image')") && scaleSource.includes("header.className = 'wallet-detail-header'"));
assert(scaleSource.includes('observer.disconnect();') && scaleSource.includes('patchVaultDetail(document);'));

assert(!selectionSource.includes('queueMicrotask(() => ensureVaultItemSelected'),
  'Profile loading must not auto-click the first Vault Item and replace Profile detail.');
assert(selectionSource.includes('Selection repair happens only when Add Asset is actually requested.'));

assert(themeCss.includes('.app-menu-bar') && themeCss.includes('background: var(--sl-bg);') && themeCss.includes('color: var(--sl-text);'));
assert(themeCss.includes('#addVault,') && themeCss.includes('#addGroup,') && themeCss.includes('#addRecord,') && themeCss.includes('.detail-action-button'));
assert(themeCss.includes('--sl-scroll-track: #e3e8ef;') && themeCss.includes('--sl-scroll-thumb: #a8b4c3;') &&
  themeCss.includes('html[data-theme="dark"]') && themeCss.includes('--sl-scroll-thumb: #465a73;'));
assert(themeCss.includes('--sl-nav-scroll-thumb') && themeCss.includes('.dark1bg.content-middle::-webkit-scrollbar-thumb'));

assert(appMenuUi.includes("makeGroup(doc, 'SafeLedger'") && appMenuUi.includes("makeGroup(doc, 'Edit'"));
assert(appMenuMain.includes("const EDIT_COMMANDS = new Set(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']);"));
assert(appMenuMain.includes("ipcMain.handle('app-menu-prepare'") && appMenuMain.includes("ipcMain.on('app-menu-command'"));
assert(mainSource.includes("if (process.platform !== 'darwin') {") && mainSource.includes('Menu.setApplicationMenu(null);'),
  'Windows/Linux must suppress the unthemeable native menu before showing the SafeLedger-owned menu.');
assert(preloadSource.includes("prepareAppMenu: () => ipcRenderer.invoke('app-menu-prepare')") &&
  preloadSource.includes("appMenuCommand: (command) => ipcRenderer.send('app-menu-command'"));

console.log('PASS SafeLedger 2.6.7 keeps Add Asset reliable, preserves Profile detail navigation, shortens Add Vault, and applies the requested readability, icon, themed menu, button, scrollbar, selection, and wider-window refinements.');
