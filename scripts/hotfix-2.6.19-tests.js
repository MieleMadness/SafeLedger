'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.19', 'This workflow candidate must report SafeLedger 2.6.19.');
assert(read('package.json').includes('node scripts/hotfix-2.6.19-tests.js'),
  '2.6.19 layout/delete-status coverage must stay in the locked suite.');

const foundation = read('src/main/css/foundation.css');
const main = read('src/main/main.js');
const statusSource = read('src/main/status.js');
const windowSizingSource = read('src/main/window-sizing-main.js');

const equalColumns = 'grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 5fr)';
assert(foundation.includes(equalColumns),
  'Profile, Vault Item, and Asset navigation columns must use equal 2fr widths.');
assert(!foundation.includes('minmax(0, 2fr) minmax(0, 2fr) minmax(0, 3fr) minmax(0, 5fr)'),
  'The old wider 3fr Asset column must not return.');

const windowSizing = require('../src/main/window-sizing-main.js');
assert.strictEqual(windowSizing.PREFERRED_WIDTH, 1283,
  'Preferred opening width should remove one former 1400/12 grid unit after the Asset column changes from 3fr to 2fr.');
assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 750);
assert.strictEqual(Math.round(1400 * 11 / 12), 1283,
  'The new native width should preserve approximately the old per-grid-unit width.');
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1920, height: 1080 }), { width: 1283, height: 750 });
assert(windowSizingSource.includes('const PREFERRED_WIDTH = 1283;'));

assert(main.includes("sendResult({ type: 'vault-delete', status: 'DELETED', statusMsg: 'Item Deleted' });"),
  'Profile deletion should emit the shared red Item Deleted state.');
assert(main.includes("const deleted = params.type === 'group-delete';"),
  'Vault Item deletion should select the shared deletion status.');
assert(main.includes("const deleted = params.action === 'delete';"),
  'Asset deletion should select the shared deletion status.');
assert((main.match(/statusMsg: deleted \? 'Item Deleted' : 'Save successful'/g) || []).length >= 2,
  'Vault Item and Asset deletion should both say Item Deleted.');

assert(statusSource.includes("case 'DELETED': return 'danger';"),
  'Deleted confirmations should use the red danger visual palette.');
assert(statusSource.includes("state === 'ERROR' || state === 'DELETED'"),
  'Deleted confirmations must remain visible even though routine reads are silent.');
assert(statusSource.includes("state === 'DELETED' ? { role: 'status', ariaLive: 'polite' } : {}"),
  'A successful deletion may look red but must not be announced as an application error.');

const previousDocument = global.document;
const previousWindow = global.window;
let appended = null;
global.document = {
  getElementById: () => ({
    innerHTML: '',
    appendChild(node) { appended = node; return node; }
  }),
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
  assert.strictEqual(status._test.statusKind('DELETED'), 'danger');
  assert.strictEqual(status._test.shouldDisplayStatus({ status: 'DELETED', statusMsg: 'Item Deleted' }), true);
  assert.strictEqual(status.showStatus({ status: 'DELETED', statusMsg: 'Item Deleted' }), true);
  assert(appended && appended.className.includes('safeledger-status-danger'));
  assert.strictEqual(appended.attributes.role, 'status');
  assert.strictEqual(appended.attributes['aria-live'], 'polite');
  assert.strictEqual(appended.children[1].textContent, 'Item Deleted');
} finally {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
}

console.log('PASS SafeLedger 2.6.19 keeps equal navigation columns, proportional native opening width, and red Item Deleted confirmations.');
