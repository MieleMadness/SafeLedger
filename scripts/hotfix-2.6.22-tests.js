'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.22', 'This workflow candidate must report SafeLedger 2.6.22.');
assert(read('package.json').includes('node scripts/hotfix-2.6.22-tests.js'),
  '2.6.22 status accessibility coverage must stay in the locked suite.');

const gate2615 = read('scripts/hotfix-2.6.15-tests.js');
const statusSource = read('src/main/status.js');
const main = read('src/main/main.js');

assert(!gate2615.includes("alert.setAttribute('aria-live', kind === 'danger' ? 'assertive' : 'polite')"),
  'Historical message-readability gate must not require the pre-deletion one-size-fits-all live-region implementation.');
assert(gate2615.includes("options.ariaLive || (kind === 'danger' ? 'assertive' : 'polite')"),
  'Historical gate must protect assertive default errors plus explicit polite overrides.');
assert(gate2615.includes("createMessage('danger', 'Item Deleted', { role: 'status', ariaLive: 'polite' })"),
  'Historical gate must verify a successful red deletion message remains a polite status.');

assert(statusSource.includes("case 'DELETED': return 'danger';"));
assert(statusSource.includes("state === 'DELETED' ? { role: 'status', ariaLive: 'polite' } : {}"));
assert(main.includes("status: 'DELETED', statusMsg: 'Item Deleted'"));

const windowSizing = require('../src/main/window-sizing-main.js');
assert.strictEqual(windowSizing.PREFERRED_WIDTH, 1283);
assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 750);
assert(read('src/main/css/foundation.css').includes('grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 5fr)'));

console.log('PASS SafeLedger 2.6.22 keeps true errors assertive, successful red deletion notices polite, and the requested equal-column layout unchanged.');
