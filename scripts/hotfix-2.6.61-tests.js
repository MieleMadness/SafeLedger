'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(versionParts[0], 2);
assert.strictEqual(versionParts[1], 6);
assert(versionParts[2] >= 61, 'The 2.6.61 Emergency Recovery icon contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.61-tests.js'));

const icons = read('src/main/css/local-icons.css');
const profile = read('src/main/profile.js');
const emergency = read('src/main/emergency-package-ui.js');
const detailActions = read('src/main/detail-actions.js');
const priorGate = read('scripts/hotfix-2.6.60-tests.js');
const release = read('RELEASE-2.6.61.md');

assert(profile.includes("icon: 'fa-life-ring', title: 'Emergency recovery package'"));
assert(emergency.includes("icon: 'fa-life-ring', title: 'Generate Emergency Package'"));
assert(detailActions.includes('button.innerHTML = `<i class="fa ${action.icon}" aria-hidden="true"></i>`;'));
assert(icons.includes('.fa::before,\n.glyphicon::before { content: "•"; }'), 'Unknown local icons should keep the generic diagnostic fallback.');
assert(icons.includes('.fa-life-ring {'));
assert(icons.includes('.fa-life-ring::before {'));
assert(icons.includes('border: .12em solid currentColor;'));
assert(icons.includes('linear-gradient(currentColor, currentColor) top center'));
assert(icons.includes('inset: .22em;'));
assert(!icons.includes('.fa-life-ring::before { content: "•"; }'), 'Emergency Recovery must never regress to the generic dot.');
assert(priorGate.includes('versionParts[2] >= 60'));
assert(release.includes('generic dot'));
assert(release.includes('lifebuoy'));

console.log(`PASS SafeLedger ${pkg.version} gives Emergency Recovery a real local lifebuoy icon instead of the generic dot fallback.`);
