'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 71, 'The 2.6.71 trusted storage action regression repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.71-tests.js'));

const dashboard = read('src/main/dashboard-ui.js');
const polish = read('src/main/css/ui-polish.css');
const historical = read('scripts/hotfix-2.5.1-tests.js');
const priorGate = read('scripts/hotfix-2.6.70-tests.js');
const release = read('RELEASE-2.6.71.md');

assert(dashboard.includes("label: 'Open Storage'"));
assert(dashboard.includes('onActivate: openPortableStorageFolder'));
assert(dashboard.includes('window.safeLedgerApi.openDataFolder()'));
assert(!dashboard.includes('dashboard-title-action'), 'The retired compact storage action must stay out of the dashboard renderer.');
assert(!polish.includes('.dashboard-title-action'), 'Retired compact storage action CSS should be removed, not left as dead styling.');

assert(historical.includes("label: 'Open Storage'"), 'The historical trusted-folder gate should validate the current full button.');
assert(historical.includes('onActivate: openPortableStorageFolder'));
assert(historical.includes("assert(!dashboard.includes('dashboard-title-action')"));
assert(historical.includes("assert(!css.includes('.dashboard-title-action')"));
assert(!historical.includes("assert(dashboard.includes('dashboard-title-action'))"),
  'The stale 2.5.1 assertion that broke 2.6.70 must stay retired.');
assert(!historical.includes("assert(dashboard.includes('fa-external-link'))"),
  'The historical gate must not require the retired small external-link storage icon.');

assert(priorGate.includes("label: 'Open Storage'"));
assert(release.includes('hotfix-2.5.1-tests.js'));
assert(release.includes('Open Storage'));
assert(release.includes('dashboard-title-action'));
assert(release.toLowerCase().includes('root cause'));

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.5.1-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.70-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.5.1-tests.js',
  'scripts/hotfix-2.6.70-tests.js',
  'scripts/hotfix-2.6.71-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps the trusted Open Storage button while retiring the stale compact-icon regression and dead styling.`);
