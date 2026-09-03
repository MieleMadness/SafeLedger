'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 9,
  'SafeLedger 2.6.9 regressions must remain active on 2.6.9 and later 2.6.x patches.');
assert(read('package.json').includes('node scripts/hotfix-2.6.9-tests.js'),
  '2.6.9 regression coverage must stay in the locked suite.');

const entry = read('src/main/renderer-entry.js');
const renderer = read('src/main/renderer.js');
const cleanup = read('src/main/dashboard-action-state-ui.js');

const cleanupIndex = entry.indexOf("require('./dashboard-action-state-ui.js')");
const dashboardIndex = entry.indexOf("require('./dashboard-ui.js')");
assert(cleanupIndex >= 0, 'The renderer entry must load Vault Overview action-state cleanup.');
assert(dashboardIndex >= 0 && cleanupIndex < dashboardIndex,
  'Vault Overview action-state cleanup must register before dashboard rendering/navigation.');

assert(cleanup.includes("const detailActions = require('./detail-actions')"));
assert(cleanup.includes("document.getElementById('dashboardButton')"));
assert(cleanup.includes("button.addEventListener('click', clearDashboardActions)"));
assert(cleanup.includes('detailActions.clear();'),
  'Vault Overview navigation must clear the prior detail action dock and detail mode.');
assert(!cleanup.includes('MutationObserver') && !cleanup.includes('setTimeout('),
  'Dashboard action cleanup must remain direct and synchronous.');

assert(renderer.includes('function cancelAddProfile()'));
assert(renderer.includes("document.getElementById('dashboardButton')"));
assert(renderer.includes('dashboardButton.click();'),
  'Cancel Add Profile must continue through the same canonical Vault Overview navigation path as Home.');

let domReadyHandler = null;
let dashboardClickHandler = null;
const dock = { innerHTML: '<button>Save</button><button>Cancel</button>' };
const classes = new Set(['wallet-coin-detail', 'wallet-coin-edit']);
const detailArea = {
  classList: {
    remove: (...names) => names.forEach((name) => classes.delete(name))
  }
};
const dashboardButton = {
  addEventListener: (type, handler) => {
    if (type === 'click') dashboardClickHandler = handler;
  }
};

const previousWindow = global.window;
const previousDocument = global.document;

global.window = {
  addEventListener: (type, handler) => {
    if (type === 'DOMContentLoaded') domReadyHandler = handler;
  }
};
global.document = {
  getElementById: (id) => {
    if (id === 'dashboardButton') return dashboardButton;
    if (id === 'detailActionArea') return dock;
    if (id === 'detailArea') return detailArea;
    return null;
  }
};

try {
  const modulePath = require.resolve('../src/main/dashboard-action-state-ui.js');
  delete require.cache[modulePath];
  require(modulePath);

  assert.strictEqual(typeof domReadyHandler, 'function',
    'Dashboard cleanup must register when the renderer DOM is ready.');
  domReadyHandler();
  assert.strictEqual(typeof dashboardClickHandler, 'function',
    'Dashboard cleanup must attach directly to the Vault Overview/Home button.');

  dashboardClickHandler();
  assert.strictEqual(dock.innerHTML, '',
    'Opening Vault Overview must remove stale Save/Cancel actions from the action dock.');
  assert.strictEqual(classes.has('wallet-coin-detail'), false,
    'Opening Vault Overview must leave detail-view mode.');
  assert.strictEqual(classes.has('wallet-coin-edit'), false,
    'Opening Vault Overview must leave edit mode.');
} finally {
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
}

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.9 Vault Overview stale-action fix active.`);
