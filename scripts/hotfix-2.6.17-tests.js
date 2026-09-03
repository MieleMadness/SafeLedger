'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.17', 'This workflow candidate must report SafeLedger 2.6.17.');
assert.strictEqual(pkg.main, 'src/main/startup.js',
  'Electron must enter through the main-process startup owner before bootstrap.');
assert(read('package.json').includes('node scripts/hotfix-2.6.17-tests.js'),
  '2.6.17 message/window cleanup coverage must stay in the locked suite.');

const statusSource = read('src/main/status.js');
const statusCss = read('src/main/css/status-messages.css');
const startupSource = read('src/main/startup.js');
const windowSizingSource = read('src/main/window-sizing-main.js');
const rendererEntry = read('src/main/renderer-entry.js');

assert(statusSource.includes('const ROUTINE_SUCCESS = /^load(?:ed)? successful(?:ly)?\\.?$/i;'),
  'Routine successful reads must be recognizable centrally.');
assert(statusSource.includes('if (state === \'ERROR\') return true;'),
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
assert(!rendererEntry.includes("require('./ui-scale-2.6.7.js');"),
  'Renderer entry must not perform startup window sizing.');
assert(startupSource.includes("const { app, screen } = require('electron');"));
assert(startupSource.includes("app.on('browser-window-created'"));
assert(startupSource.includes("windowSizing.applyPreferredWindowSize(win, workArea);"));
assert(startupSource.indexOf("windowSizing.applyPreferredWindowSize") < startupSource.indexOf("require('./bootstrap')"),
  'Preferred sizing must be installed before the established bootstrap runtime creates the primary window.');
assert(!windowSizingSource.includes('window.resizeTo') && !windowSizingSource.includes('DOMContentLoaded'),
  'Preferred sizing must remain independent of the renderer DOM.');

const windowSizing = require('../src/main/window-sizing-main.js');
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1920, height: 1080 }), { width: 1400, height: 750 });
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1366, height: 700 }), { width: 1366, height: 700 });
let setSize = null;
assert.strictEqual(windowSizing.applyPreferredWindowSize({
  getBounds: () => ({ width: 1200, height: 750 }),
  setSize(width, height, animate) { setSize = { width, height, animate }; }
}, { width: 1920, height: 1080 }), true);
assert.deepStrictEqual(setSize, { width: 1400, height: 750, animate: false });

console.log('PASS SafeLedger 2.6.17 keeps compact change/error notices and main-process startup window sizing.');
