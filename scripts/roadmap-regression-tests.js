'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const pkg = JSON.parse(read('package.json'));

const main = read('src/main/main.js');
const securityMain = read('src/main/security-main.js');
const preload = read('src/main/preload.js');
const renderer = read('src/main/renderer.js');
const entry = read('src/main/renderer-entry.js');
const index = read('src/main/index.html');
const globalSearch = read('src/main/global-search.js');
const recoveryBinder = read('src/main/recovery-binder.js');
const activityHistory = read('src/main/activity-history.js');
const settingsManager = read('src/main/installManager/installManager/settingsManager.js');
const dataWriteService = read('src/main/data-write-service.js');

assert(/^2\.\d+\.\d+$/.test(pkg.version), 'Roadmap candidate must use semantic SafeLedger 2.x versioning.');

// This file is deliberately a broad smoke gate. Detailed behavior belongs in
// the dedicated regression suites so architecture can evolve without requiring
// production code to preserve old source-string shapes.
for (const relative of [
  'scripts/dashboard-summary-tests.js',
  'scripts/custom-fields-tests.js',
  'scripts/recovery-drill-tests.js',
  'scripts/recovery-binder-tests.js',
  'scripts/activity-history-tests.js',
  'scripts/appearance-tests.js',
  'scripts/global-search-tests.js',
  'scripts/ui-polish-tests.js',
  'scripts/recovery-confidence-tests.js',
  'scripts/data-ownership-tests.js'
]) assert(exists(relative), `Roadmap regression requires dedicated coverage: ${relative}`);

assert(securityMain.includes("ipc.handle('dashboard-summary'"), 'Recovery dashboard main-process service must remain available.');
assert(preload.includes("getDashboardSummary: () => invoke('dashboard-summary')"), 'Dashboard must remain behind the sandbox preload bridge.');
assert(index.includes('id="dashboardButton"'), 'Vault Overview entry point must remain present.');

assert(securityMain.includes("ipc.handle('recovery-binder-model'"), 'Recovery Binder main-process model must remain available.');
assert(recoveryBinder.includes('includeSeedPrivateKeys: false'), 'Recovery Binder must default seed/private-key inclusion off.');
assert(recoveryBinder.includes('includePasswordsPins: false'), 'Recovery Binder must default password/PIN inclusion off.');
assert(recoveryBinder.includes('includeSensitiveCustomFields: false'), 'Recovery Binder must default sensitive custom fields off.');

assert(securityMain.includes("ipc.handle('activity-history'"), 'Activity History trusted service must remain available.');
assert(activityHistory.includes('MAX_STORED_ENTRIES = 500'), 'Activity History retention must stay bounded.');
assert(activityHistory.includes("'recovery-drill-completed'"), 'Recovery drill activity must remain represented by a generic event type.');

assert(securityMain.includes("ipc.handle('global-search'"), 'Global Search trusted service must remain available.');
assert(preload.includes("globalSearch: (query) => invoke('global-search', query)"), 'Global Search must remain behind the sandbox bridge.');
assert(index.includes('id="globalSearchButton"'), 'Global Search entry point must remain present.');
for (const forbidden of ['wallet.password', 'wallet.seedPhrase', 'wallet.recoveryLocation', 'wallet.recoveryInstructions', 'asset.privateAddress', 'asset.manualBalance']) {
  assert(!globalSearch.includes(forbidden), `Global Search must not index sensitive field ${forbidden}.`);
}

assert(entry.includes("require('./app-appearance.js')"), 'Appearance controller must remain part of renderer startup.');
assert(settingsManager.includes("appearance: 'system'"), 'System-following appearance must remain the default.');
assert(index.includes('./css/app-theme.css'), 'Current application theme stylesheet must remain loaded.');

assert(index.includes('id="panicLockButton"'), 'Emergency Lock must remain present.');
assert(main.includes('cryptoSession.clearSession()'), 'Main process must retain explicit encryption-session clearing.');
assert(main.includes("securityMain.audit(getDataRoot(), 'vault-unlocked')"), 'Successful unlock must remain auditable without secret details.');
assert(main.includes("securityMain.audit(getDataRoot(), 'settings-updated')"), 'Settings changes must remain auditable without secret details.');

assert(main.includes("const dataWriteService = require('./data-write-service');"), 'Phase 3 authoritative data write service must remain wired into main process.');
assert(dataWriteService.includes('readAuthoritativeVault'), 'Vault-item/asset mutations must continue to begin from authoritative encrypted data.');
assert(dataWriteService.includes('stripViewState'), 'Temporary wallet/asset selections must stay separate from persisted recovery data.');
assert(settingsManager.includes('saveUserSettings'), 'Renderer settings must continue through the user-editable settings boundary.');

assert(renderer.includes("const globalSearchUi = require('./global-search-ui')"), 'Global Search renderer integration must remain available.');
assert(entry.includes("dataset.safeLedgerRendererReady = 'true'"), 'Renderer startup smoke marker must remain available.');
assert(index.indexOf('id="dashboardButton"') < index.indexOf('id="mainArea"'), 'Top utilities must remain outside the main workspace columns.');
assert(index.indexOf('id="panicLockButton"') > index.indexOf('id="buttonArea"'), 'Emergency Lock must remain outside the ordinary detail action bar.');

for (const relative of [
  'src/main/main.js',
  'src/main/security-main.js',
  'src/main/preload.js',
  'src/main/renderer-entry.js',
  'src/main/renderer.js',
  'src/main/data-write-service.js',
  'src/main/installManager/installManager/settingsManager.js',
  'src/main/dashboard-summary.js',
  'src/main/dashboard-ui.js',
  'src/main/activity-history.js',
  'src/main/activity-history-ui.js',
  'src/main/global-search.js',
  'src/main/global-search-ui.js',
  'src/main/recovery-binder.js',
  'src/main/recovery-binder-ui.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS roadmap ${pkg.version} keeps the cross-feature recovery/security/search/UI/Data Ownership smoke contract while detailed behavior remains in dedicated regression suites.`);
