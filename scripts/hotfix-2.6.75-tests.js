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
assert(parts[2] >= 75, 'The 2.6.75 simplified Maintenance Snapshot row contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.75-tests.js'));

const layout = read('src/main/css/dashboard-layout.css');
const dashboard = read('src/main/dashboard-ui.js');
const priorGate = read('scripts/hotfix-2.6.74-tests.js');

assert(layout.includes('.dashboard-maintenance-icon {\n  display: none;\n}'),
  'Maintenance Snapshot icons and their surrounding circle must not be visible.');
assert(layout.includes('display: flex;') && layout.includes('justify-content: space-between;'),
  'Maintenance Snapshot rows should use the same left-copy/right-action layout as Recovery Needs Attention.');
assert(layout.includes('padding: 10px 12px;'),
  'Maintenance Snapshot rows should keep compact Recovery Needs Attention-style spacing.');
assert(layout.includes('text-align: left;'),
  'Maintenance Snapshot copy must remain left aligned.');
assert(layout.includes('flex: 1 1 auto;'),
  'Maintenance Snapshot copy should consume the available left side without reserving an icon column.');
assert(!layout.includes('grid-template-columns: 38px minmax(0, 1fr) auto;'),
  'Maintenance Snapshot must not reserve the retired desktop icon column.');
assert(!layout.includes('grid-template-columns: 34px minmax(0, 1fr);'),
  'Maintenance Snapshot must not reserve the retired mobile icon column.');
assert(layout.includes('box-shadow: none;'),
  'Maintenance rows should read as divided list rows rather than separate floating cards.');

assert(dashboard.includes("cards.className = 'dashboard-maintenance-cards';"));
assert(dashboard.includes("title: 'Recovery verification'"));
assert(dashboard.includes("title: 'Recovery coverage'"));
assert(dashboard.includes("title: 'Backup activity'"));
assert(dashboard.includes("label: 'Resolve'"));
assert(dashboard.includes("label: 'Create Backup'"));
assert(dashboard.includes("label: 'Verify Backup'"));
assert(priorGate.includes("renderAssetDisplaySection(area, params);"));
assert(priorGate.includes("renderPrivacySection(area, params);"));

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.74-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'src/main/dashboard-ui.js',
  'scripts/hotfix-2.6.74-tests.js',
  'scripts/hotfix-2.6.75-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} removes visible Maintenance Snapshot icon circles and aligns copy to the left while preserving direct maintenance actions.`);
