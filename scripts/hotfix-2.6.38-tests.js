'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const index = read('src/main/index.html');
const foundation = read('src/main/css/foundation.css');
const localIcons = read('src/main/css/local-icons.css');
const drill = read('src/main/recovery-drill-ui.js');
const activityHistory = require('../src/main/activity-history.js');
const gate2637 = read('scripts/hotfix-2.6.37-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 38,
  'SafeLedger 2.6.38 display cleanup and lock-icon behavior must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.38-tests.js'),
  '2.6.38 display cleanup and lock-icon coverage must stay in the locked regression suite.');

for (const placeholder of ['Search profiles', 'Search vaults', 'Search assets']) {
  assert(index.includes(`placeholder="${placeholder}"`), `Missing punctuation-free search placeholder: ${placeholder}`);
  assert(!index.includes(`placeholder="${placeholder}..."`), `Search placeholder must not restore ellipsis: ${placeholder}`);
}

assert(foundation.includes('#detailArea h1,') && foundation.includes('#detailArea h6,'),
  'No-underline display policy must cover H1 through H6.');
assert(foundation.includes('#detailArea .page-header,') && foundation.includes('#detailArea .product-section-title'),
  'No-underline display policy must include legacy page headers and product section headings.');
assert(foundation.includes('border-bottom: 0 !important;') && foundation.includes('text-decoration: none !important;'),
  'Display headings must explicitly suppress underline styling.');
assert(!foundation.includes('border-bottom: 1px solid var(--sl-border, #d7dee8);'),
  'The retired text-width heading underline must not return.');
assert(foundation.includes('#detailArea .wallet-detail-header + hr,') && foundation.includes('#detailArea .coin-detail-header + hr'),
  'Legacy full-width dividers after icon/title headers must stay hidden.');

const deviceLock = activityHistory.describe('session-locked-idle-state');
assert.strictEqual(deviceLock.label, 'SafeLedger locked by device security state');
assert.strictEqual(deviceLock.icon, 'fa-lock');
assert(localIcons.includes('.fa-lock::before') && localIcons.includes('.fa-lock::after'),
  'Closed-lock status cues must use locally drawn CSS artwork.');
assert(!localIcons.includes('.fa-lock::before { content: "■"; }'),
  'The square placeholder for fa-lock must stay retired.');
assert(/\.fa-lock::before\s*\{[\s\S]*?content:\s*"";[\s\S]*?border:\s*\.11em solid currentColor;/.test(localIcons),
  'Closed-lock shackle must be drawn from themeable local CSS.');
assert(/\.fa-lock::after\s*\{[\s\S]*?content:\s*"";[\s\S]*?border:\s*\.11em solid currentColor;/.test(localIcons),
  'Closed-lock body must be drawn from themeable local CSS.');

assert(drill.includes("appendText(header, 'h1', '', 'Recovery Validation')"),
  'The guided recovery page must be named Recovery Validation.');
assert(!drill.includes('Test Recovery'),
  'Retired Test Recovery wording must not remain in the user-facing recovery UI source.');
assert(drill.includes("privacyIcon.className = 'fa fa-lock';"),
  'The guided-test privacy callout must use the corrected local closed-lock icon.');
assert(drill.includes("title: 'Cancel Recovery Validation'"));
assert(drill.includes("title: 'Complete Recovery Validation'"));

assert(gate2637.includes('parts[2] >= 37'),
  'The corrected 2.6.37 historical Vault-search gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.38 no-underline/search/closed-lock/Recovery Validation behavior active.`);
