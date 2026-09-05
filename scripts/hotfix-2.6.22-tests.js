'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 22,
  'SafeLedger 2.6.22 deletion accessibility regressions must remain active on 2.6.22 and later 2.6.x candidates.');
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
assert(statusSource.includes("? { role: 'status', ariaLive: 'polite', iconClass: 'fa fa-trash' }"),
  'Successful deletion notices must stay polite while using their dedicated trash-can icon.');
assert(main.includes("status: 'DELETED', statusMsg: 'Item Deleted'"));

const windowSizing = require('../src/main/window-sizing-main.js');
assert.strictEqual(windowSizing.PREFERRED_WIDTH, 1283);
assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 750);
const foundation = read('src/main/css/foundation.css');
for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`));
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'));

console.log(`PASS SafeLedger ${pkg.version} keeps true errors assertive, successful red deletion notices polite with a trash icon, and the requested equal expanded-column layout unchanged.`);
