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
assert(parts[2] >= 72, 'The 2.6.72 historical Maintenance Snapshot regression repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.72-tests.js'));

const historical = read('scripts/development-2.5.12-tests.js');
const dashboard = read('src/main/dashboard-ui.js');
const layout = read('src/main/css/dashboard-layout.css');
const priorGate = read('scripts/hotfix-2.6.71-tests.js');
const currentDashboardGate = read('scripts/hotfix-2.6.70-tests.js');
const release = read('RELEASE-2.6.72.md');

assert(historical.includes("cards.className = 'dashboard-maintenance-cards';"));
assert(historical.includes("title: 'Recovery verification'"));
assert(historical.includes("title: 'Recovery coverage'"));
assert(historical.includes("title: 'Backup activity'"));
assert(historical.includes('maintenanceTargets'));
assert(historical.includes("read('src/main/css/dashboard-layout.css')"));

// Check for the obsolete positive requirements themselves, not for the raw
// implementation strings. The current historical test intentionally contains
// negative assertions proving the retired renderer stays absent, so a broad
// substring search would incorrectly fail on those protective checks.
assert(!historical.includes("assert(dashboard.includes(\"'Stale information'\"))"),
  'The historical gate must not require the retired Stale information bullet label.');
assert(!historical.includes("assert(dashboard.includes(\"'Last Backup'\"))"),
  'The historical gate must not require the retired Last Backup bullet label.');
assert(!historical.includes("assert(dashboard.includes(\"list.className = 'dashboard-maintenance-list';\"))"),
  'The historical gate must not positively require the retired maintenance bullet-list renderer.');
assert(!historical.includes("assert(dashboard.includes(\"details.className = 'dashboard-maintenance-details';\"))"),
  'The historical gate must not positively require the retired nested maintenance bullets.');
assert(historical.includes("assert(!dashboard.includes(\"list.className = 'dashboard-maintenance-list';\"),"),
  'The historical gate should explicitly prevent the retired maintenance list from returning.');
assert(historical.includes("assert(!dashboard.includes(\"details.className = 'dashboard-maintenance-details';\"),"),
  'The historical gate should explicitly prevent the retired nested details from returning.');

assert(dashboard.includes("cards.className = 'dashboard-maintenance-cards';"));
assert(layout.includes('.dashboard-maintenance-card {'));
assert(currentDashboardGate.includes("cards.className = 'dashboard-maintenance-cards';"));
assert(priorGate.includes('parts[2] >= 71'));
assert(release.includes('development-2.5.12-tests.js'));
assert(release.includes('Maintenance Snapshot'));
assert(release.toLowerCase().includes('root cause'));

execFileSync(process.execPath, [path.join(root, 'scripts/development-2.5.12-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.70-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.71-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/development-2.5.12-tests.js',
  'scripts/hotfix-2.6.70-tests.js',
  'scripts/hotfix-2.6.71-tests.js',
  'scripts/hotfix-2.6.72-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps the actionable Maintenance Snapshot cards while retiring the stale 2.5.12 bullet-list regression.`);
