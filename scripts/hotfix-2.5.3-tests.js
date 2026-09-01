'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dashboardSummary = require('../src/main/dashboard-summary');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testTopShortcutOrder() {
  const html = read('src/main/index.html');
  const home = html.indexOf('id="dashboardButton"');
  const history = html.indexOf('id="activityButton"');
  const settings = html.indexOf('id="settingsButton"');
  const search = html.indexOf('id="globalSearchButton"');
  assert(home >= 0 && history > home && settings > history && search > settings, 'top shortcuts must be Home, History, Settings, Search');
  assert(html.includes('id="settingsButton"'));
  assert(html.includes('fa fa-cog'));
}

function testSelfDestructMovedToSettings() {
  const main = read('src/main/main.js');
  const preload = read('src/main/preload.js');
  const settings = read('src/main/self-destruct-settings-ui.js');
  assert(!main.includes("label: 'Self-Destruct Protection'"), 'self-destruct must not remain in the application menu');
  assert(main.includes("ipc.handle('set-self-destruct-protection'"));
  assert(preload.includes("setSelfDestructProtection: (enabled) => ipcRenderer.invoke('set-self-destruct-protection'"));
  assert(settings.includes("heading.textContent = 'Self-Destruct Protection'"));
  assert(settings.includes('Keep a verified backup on separate storage before enabling it.'));
}

function testRecoveryDrillCanCompleteAfterChecklist() {
  const drill = read('src/main/recovery-drill-ui.js');
  assert(drill.includes('completeButton.disabled = !allConfirmed();'));
  assert(!drill.includes('completeButton.disabled = !eligible || !allConfirmed();'));
  assert(!drill.includes("if (!eligible) return alert('Document a recovery method or recovery-material location before completing Test Recovery.')"));
  assert(drill.includes('Recovery Readiness will remain incomplete'));
}

function testDashboardNavigationTargets() {
  const summary = dashboardSummary.summarize([{
    profileName: 'Primary Profile',
    profileFile: 'zvault-7.json',
    vaultData: { groups: [{ name: 'Test Wallet', records: [] }] }
  }], { now: Date.now() });
  assert.strictEqual(summary.needsAttention.length, 1);
  assert.strictEqual(summary.needsAttention[0].profileFile, 'zvault-7.json');
  assert.strictEqual(summary.needsAttention[0].walletIndex, 0);

  const dashboard = read('src/main/dashboard-ui.js');
  const css = read('src/main/css/ui-dock-refinement.css');
  assert(dashboard.includes("type: 'wallet'"));
  assert(dashboard.includes('profileFile: String(item.profileFile'));
  assert(dashboard.includes('walletIndex: Number(item.walletIndex)'));
  assert(dashboard.includes('dashboard-list-row-action'));
  assert(dashboard.includes("appendWalletList(attention, summary.needsAttention || [], 'Everything documented is currently ready.', false, true)"));
  assert(css.includes('.dashboard-list-row-action'));
}

function testVersionChecksAreNotHardCoded() {
  const olderHotfix = read('scripts/hotfix-2.5.1-tests.js');
  const newerHotfix = read('scripts/hotfix-2.5.2-tests.js');
  const continuity = read('scripts/version-bump-check.js');
  assert(!olderHotfix.includes('pkg.version'));
  assert(!newerHotfix.includes('pkg.version'));
  assert(continuity.includes('currentPatch === parentPatch + 1'));
  assert(continuity.includes('increase the patch version by exactly one'));
}

testTopShortcutOrder();
testSelfDestructMovedToSettings();
testRecoveryDrillCanCompleteAfterChecklist();
testDashboardNavigationTargets();
testVersionChecksAreNotHardCoded();
console.log('PASS SafeLedger navigation, Settings self-destruct, recovery drill completion, dashboard routing, and patch-version continuity checks.');
