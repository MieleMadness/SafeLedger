'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 17,
  'SafeLedger 2.6.17 message/window regressions must remain active on 2.6.17 and later 2.6.x candidates.');
assert.strictEqual(pkg.main, 'src/main/bootstrap.js',
  'The trusted portable-storage bootstrap must remain the Electron package entry.');
assert(read('package.json').includes('node scripts/hotfix-2.6.17-tests.js'),
  '2.6.17 message/window cleanup coverage must stay in the locked suite.');

const statusSource = read('src/main/status.js');
const statusCss = read('src/main/css/status-messages.css');
const bootstrapSource = read('src/main/bootstrap.js');
const windowSizingSource = read('src/main/window-sizing-main.js');
const rendererEntry = read('src/main/renderer-entry.js');

assert(statusSource.includes('const ROUTINE_SUCCESS = /^load(?:ed)? successful(?:ly)?\\.?$/i;'),
  'Routine successful reads must be recognizable centrally.');
assert(statusSource.includes("state === 'ERROR'"),
  'Errors must always remain visible.');
assert(statusSource.includes('exports.loadStatus = () => false;'),
  'Routine reads must not show a temporary Processing banner.');
assert(statusCss.includes('width: fit-content;') && statusCss.includes('max-width: 100%;'),
  'Status boxes should size to their content instead of stretching across the utility area.');
assert(statusCss.includes('padding: 6px 12px !important;'),
  'Status messages should use the same compact field-style padding as surrounding controls.');

const previousDocument = global.document;
const previousWindow = global.window;
global.document = {
  getElementById: () => ({ innerHTML: '', appendChild() {} }),
  createElement: () => ({
    className: '', attributes: {}, children: [], textContent: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    appendChild(child) { this.children.push(child); return child; }
  })
};
global.window = { setTimeout: () => 1, clearTimeout() {} };
try {
  const statusPath = require.resolve('../src/main/status.js');
  delete require.cache[statusPath];
  const status = require(statusPath);
  assert.strictEqual(status._test.shouldDisplayStatus({ status: 'SUCCESS', statusMsg: 'Load successful.' }), false);
  assert.strictEqual(status._test.shouldDisplayStatus({ status: 'SUCCESS', statusMsg: 'Loaded Successfully' }), false);
  assert.strictEqual(status._test.shouldDisplayStatus({ status: 'SUCCESS', statusMsg: 'Save successful' }), true);
  assert.strictEqual(status._test.shouldDisplayStatus({ status: 'ERROR', statusMsg: 'Invalid Password' }), true);
  assert.strictEqual(status.loadStatus(), false);
} finally {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
}

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/ui-scale-2.6.7.js')), false,
  'The renderer-owned startup resize helper must stay removed.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/startup.js')), false,
  'The temporary startup wrapper must not bypass the established bootstrap boundary.');
assert(!rendererEntry.includes("require('./ui-scale-2.6.7.js');"),
  'Renderer entry must not perform startup window sizing.');
assert(bootstrapSource.includes("const windowSizing = require('./window-sizing-main');"));
assert(bootstrapSource.includes('function installPreferredWindowSizing()'));
assert(bootstrapSource.includes("app.on('browser-window-created'"));
assert(bootstrapSource.includes('windowSizing.applyPreferredWindowSize(win, workArea);'));
assert(bootstrapSource.indexOf('installPreferredWindowSizing();') < bootstrapSource.indexOf("require('./main');"),
  'Preferred sizing must be installed inside the trusted bootstrap before main.js creates the primary window.');
assert(!windowSizingSource.includes('window.resizeTo') && !windowSizingSource.includes('DOMContentLoaded'),
  'Preferred sizing must remain independent of the renderer DOM.');

const windowSizing = require('../src/main/window-sizing-main.js');
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1920, height: 1080 }), {
  width: windowSizing.PREFERRED_WIDTH,
  height: 750
});
assert(windowSizing.PREFERRED_WIDTH >= 1200,
  'Preferred width should remain large enough for the four-column desktop layout.');
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1100, height: 700 }), { width: 1100, height: 700 });
let setSize = null;
assert.strictEqual(windowSizing.applyPreferredWindowSize({
  getBounds: () => ({ width: 1200, height: 750 }),
  setSize(width, height, animate) { setSize = { width, height, animate }; }
}, { width: 1920, height: 1080 }), true);
assert.deepStrictEqual(setSize, { width: windowSizing.PREFERRED_WIDTH, height: 750, animate: false });

console.log(`PASS SafeLedger ${pkg.version} keeps compact change/error notices and trusted-bootstrap main-process window sizing.`);
