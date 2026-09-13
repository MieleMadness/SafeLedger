'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 85, 'The focused-column click-order repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.85-tests.js'),
  'The 2.6.85 focused-column click-order regression must remain in the main regression chain.');

const focus = read('src/main/column-focus-artwork.js');
const listener = focus.match(/area\.addEventListener\('click',\s*\(event\)\s*=>\s*\{[\s\S]*?\},\s*true\);/);
assert(listener, 'Focused-column clicks must be captured before list-item click handlers rerender their columns.');
assert(listener[0].includes("setFocus(kind)"), 'The capture-phase listener must set the matching Profile/Vault/Asset focus state.');
assert(focus.includes("['vaultArea', 'profile']") && focus.includes("['groupArea', 'vault']") && focus.includes("['recordArea', 'asset']"),
  'The click-order repair must preserve the requested three-column focus mapping.');
assert(focus.includes("['dashboardButton', 'activityButton', 'settingsButton']"),
  'Home, Activity History, and Settings must continue clearing decorative focus state.');

const release = read('RELEASE-2.6.85.md').toLowerCase();
for (const phrase of ['root cause', 'capture phase', 'rerender', 'profile', 'vault', 'asset', 'no artwork changes']) {
  assert(release.includes(phrase), `2.6.85 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.84-tests.js')], { stdio: 'pipe' });
for (const relative of ['src/main/column-focus-artwork.js', 'scripts/hotfix-2.6.85-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log(`PASS SafeLedger ${pkg.version} captures Profile/Vault/Asset focus before list rerenders can replace the clicked DOM node.`);
