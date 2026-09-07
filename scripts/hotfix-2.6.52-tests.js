'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const entry = read('src/main/renderer-entry.js');
const renderer = read('src/main/renderer.js');
const gate2651 = read('scripts/hotfix-2.6.51-tests.js');

assert.strictEqual(pkg.version, '2.6.52', 'Phase 4 UI Consolidation must report SafeLedger 2.6.52.');
assert(read('package.json').includes('node scripts/ui-consolidation-tests.js'), 'UI Consolidation tests must run in the full regression suite.');
assert(read('package.json').includes('node scripts/hotfix-2.6.52-tests.js'), '2.6.52 release coverage must stay in the full regression suite.');
assert(entry.includes("require('./renderer.js');") && entry.includes("require('./dashboard-ui.js');"), 'Canonical renderer and dashboard owners must stay active.');
assert(!entry.includes('login-workspace-ui') && !entry.includes('settings-layout-ui') && !entry.includes('dashboard-row-ui') && !entry.includes('vault-item-asset-seeding-ui'),
  'Retired UI patch layers must not return to the runtime entry point.');
assert(renderer.includes('firstDisplayProfileIndex') && renderer.includes('columnCollapseUi.revealAfterLogin()'),
  'Post-login selection/reveal must remain state-driven.');
assert(renderer.includes('dashboardUi.configure({ onOpenWallet: navigateGlobalResult })'), 'Dashboard navigation must remain callback-driven.');
assert(gate2651.includes('parts[2] >= 51'), 'Phase 3 Data Ownership must remain active on the Phase 4 candidate.');
assert(fs.existsSync(path.join(root, 'PHASE-4-UI-CONSOLIDATION.md')), 'Phase 4 engineering notes must document retired bandaids and replacements.');
assert(fs.existsSync(path.join(root, 'RELEASE-2.6.52.md')), 'SafeLedger 2.6.52 release notes must exist.');

for (const relative of ['src/main/renderer-entry.js', 'src/main/renderer.js', 'scripts/ui-consolidation-tests.js', 'scripts/hotfix-2.6.52-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log('PASS SafeLedger 2.6.52 Phase 4 UI Consolidation keeps canonical screen ownership and the Phase 3 persistence boundary active.');
