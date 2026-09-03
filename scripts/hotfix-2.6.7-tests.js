'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 7,
  'SafeLedger 2.6.7 regressions must remain active on 2.6.7 and later 2.6.x patches.');

const recordSource = read('src/main/record.js');
const customFieldsUiSource = read('src/main/custom-fields-ui.js');
assert(recordSource.includes("Object.freeze({ label: 'Network', type: 'text' })") &&
  recordSource.includes("Object.freeze({ label: 'Contract address', type: 'text' })"),
  'Asset forms must keep Network and Contract address as standard identity fields.');
assert(recordSource.includes("title: ASSET_CUSTOM_FIELDS_TITLE") &&
  recordSource.includes('fixedFields: ASSET_IDENTITY_FIELDS'),
  'The real Asset renderer must request its standard identity fields directly.');
assert(customFieldsUiSource.includes('function lockFixedField(field = {})') &&
  customFieldsUiSource.includes("rowState.row.dataset.assetIdentityField = normalized.label;"),
  'The custom-field editor must support direct fixed fields without post-render DOM patching.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/asset-multichain-ui.js')), false,
  'The retired Asset multichain MutationObserver helper must stay removed.');

const indexSource = read('src/main/index.html');
const scaleCss = read('src/main/css/ui-current.css');
const themeCss = scaleCss;
const windowSizingSource = read('src/main/window-sizing-main.js');
const bootstrapSource = read('src/main/bootstrap.js');
const groupSource = read('src/main/group.js');
const rendererEntry = read('src/main/renderer-entry.js');
const rendererSource = read('src/main/renderer.js');
const appMenuUi = read('src/main/app-menu-ui.js');
const appMenuMain = read('src/main/app-menu-main.js');
const mainSource = read('src/main/main.js');
const preloadSource = read('src/main/preload.js');
const visualUi = require(path.join(root, 'src/main/window-sizing-main.js'));

assert(indexSource.includes('<link href="./css/ui-current.css" rel="stylesheet">'));
for (const retiredRuntimeLayer of [
  './css/ui-2.5.8.css',
  './css/ui-2.5.9.css',
  './css/ui-2.5.11.css',
  './css/ui-2.5.12.css',
  './css/ui-2.5.13.css',
  './css/ui-2.5.14.css',
  './css/ui-2.5.15.css',
  './css/ui-2.5.16.css',
  './css/ui-2.6.7-scale.css',
  './css/ui-2.6.7-theme-refinement.css'
]) {
  assert(!indexSource.includes(retiredRuntimeLayer), `${retiredRuntimeLayer} should no longer be loaded separately at runtime.`);
}
assert(indexSource.includes('<span class="fa fa-plus"></span> Add Vault</button>') && !indexSource.includes('Add Vault Item</button>'));
assert(!rendererEntry.includes("require('./ui-scale-2.6.7.js');"));
assert(bootstrapSource.includes("const windowSizing = require('./window-sizing-main');") &&
  bootstrapSource.includes('installPreferredWindowSizing();') &&
  bootstrapSource.indexOf('installPreferredWindowSizing();') < bootstrapSource.indexOf("require('./main');"),
  'Preferred startup sizing must be installed inside the trusted Electron bootstrap before main.js creates the window.');
assert(rendererEntry.includes("require('./app-menu-ui.js');"));
assert(!rendererEntry.includes("require('./asset-multichain-ui.js');"));

assert(/html,\s*\nbody\s*\{[\s\S]*?font-size:\s*15px\s*!important/.test(scaleCss));
assert(scaleCss.includes('width: 32px !important;') && scaleCss.includes('flex: 0 0 32px !important;'));
assert(scaleCss.includes('width: 28px !important;') && scaleCss.includes('flex: 0 0 28px !important;'));
assert(scaleCss.includes('width: 60px !important;') && scaleCss.includes('flex: 0 0 60px !important;'));
assert(scaleCss.includes('width: 52px !important;') && scaleCss.includes('flex: 0 0 52px !important;'));
assert(scaleCss.includes('background-color: transparent !important;') && scaleCss.includes('border-color: #fff !important;'));
assert(!scaleCss.includes('--sl-action-size:') && !scaleCss.includes('--sl-top-action-size:'));
assert(!/\.panic-lock-inline\s*\{[^}]*\bwidth\s*:/s.test(scaleCss));

assert(Number.isInteger(visualUi.PREFERRED_WIDTH) && visualUi.PREFERRED_WIDTH >= 1200,
  'Preferred desktop width must remain explicit and large enough for the four-column interface.');
assert.strictEqual(visualUi.PREFERRED_HEIGHT, 750);
let resized = null;
const normalWindow = {
  getBounds: () => ({ width: 1200, height: 750 }),
  setSize(width, height, animate) { resized = { width, height, animate }; }
};
assert.strictEqual(visualUi.applyPreferredWindowSize(normalWindow, { width: 1920, height: 1080 }), true);
assert.deepStrictEqual(resized, { width: visualUi.PREFERRED_WIDTH, height: 750, animate: false });
resized = null;
const alreadyLarge = {
  getBounds: () => ({ width: 1600, height: 900 }),
  setSize(width, height, animate) { resized = { width, height, animate }; }
};
assert.strictEqual(visualUi.applyPreferredWindowSize(alreadyLarge, { width: 1920, height: 1080 }), false);
assert.strictEqual(resized, null);
assert(groupSource.includes("header.className = 'wallet-detail-header'") &&
  groupSource.includes("icon.classList.add('wallet-detail-brand-image')") &&
  groupSource.includes('appendVaultItemHeader(area, params.group, category);'),
  'Vault Item detail artwork must be created directly by the canonical group renderer.');
assert(!windowSizingSource.includes('MutationObserver') && !windowSizingSource.includes('resizeTo('),
  'Main-process window sizing must not observe renderer DOM or call renderer window.resizeTo.');

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-selection-ui.js')), false,
  'The old Add Asset capture-phase selection guard must remain deleted.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-selection.js')), false,
  'SafeLedger must not silently auto-select a Vault Item for Add Asset.');
assert(rendererSource.includes('function selectedVaultItem()'));
assert(rendererSource.includes("statusMsg: 'Select a Vault Item first, then choose Add Asset.'"));
assert(!rendererSource.includes('ensureAddAssetSelection'));
assert(!rendererEntry.includes("require('./vault-item-selection-ui.js')"));

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

console.log(`PASS SafeLedger ${pkg.version} keeps 2.6.7 interface behavior with trusted-bootstrap main-process window sizing.`);
