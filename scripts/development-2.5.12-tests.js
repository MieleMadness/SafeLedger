'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const dashboard = read('src/main/dashboard-ui.js');
const summarySource = read('src/main/dashboard-summary.js');
const rowUi = read('src/main/dashboard-row-ui.js');
const renderer = read('src/main/renderer.js');
const security = read('src/main/security-ui.js');
const drill = read('src/main/recovery-drill-ui.js');
const vaultItemPresentationSource = read('src/main/vault-item-presentation.js');
const groupSource = read('src/main/group.js');
const entry = read('src/main/renderer-entry.js');
const css = read('src/main/css/ui-current.css');
const index = read('src/main/index.html');
const web3Icons = require(path.join(root, 'src', 'main', 'web3-icons.js'));
const dashboardSummary = require(path.join(root, 'src', 'main', 'dashboard-summary.js'));
const vaultItemPresentation = require(path.join(root, 'src', 'main', 'vault-item-presentation.js'));

function testDashboardNavigationAndInsights() {
  assert(dashboard.includes("source: 'dashboard'"));
  assert(dashboard.includes('profileIndex: Number(item.profileIndex)'));
  assert(renderer.includes('let profileIndex = Number(target.profileIndex);'));
  assert(renderer.includes("target.source === 'dashboard'"));
  assert(rowUi.includes("row.setAttribute('role', 'button')"));
  assert(dashboard.includes("const badge = document.createElement('span');"));
  assert(!dashboard.includes('dashboard-status-action'));
  assert(dashboard.includes('Click a vault item below to open it and resolve the recovery gaps.'));
  assert(dashboard.includes('Click a recently verified vault item below to open it.'));
  assert(dashboard.includes("appendWalletList(recent, summary.recentlyVerified || [], 'No vault-item recovery plans have been verified yet.', true, true)"),
    'Recently Verified rows should use the same direct row navigation as Recovery Needs Attention.');

  assert(dashboard.includes("makeSection('Maintenance Snapshot'"));
  assert(dashboard.includes("'Stale information'"));
  assert(dashboard.includes("'Recovery coverage'"));
  assert(dashboard.includes("'Last maintenance'"));
  assert(dashboard.includes('window.safeLedgerApi.getActivityHistory(1)'));
  assert(summarySource.includes('STALE_VERIFICATION_DAYS = 180'));
  assert(summarySource.includes('recoveryCoverage'));
  assert(summarySource.includes('profileIndex,'));

  const now = Date.parse('2026-09-01T00:00:00.000Z');
  const old = new Date(now - 200 * 86400000).toISOString();
  const result = dashboardSummary.summarize([
    { profileName: 'Main', vaultData: { groups: [
      { name: 'Ledger', category: 'Hardware Wallet', recoveryFormat: 'BIP39', recoveryLocation: 'Safe', recoveryInstructions: 'Use backup', lastVerified: old, records: [] },
      { name: 'Kraken', category: 'Exchange Account', recoveryLink: 'documented', recoveryLocation: 'Password manager', recoveryInstructions: 'Use exchange recovery', lastRecoveryDrill: new Date(now).toISOString(), records: [] },
      { name: 'FIO App', category: 'Web3 / Website Account', records: [] }
    ] } }
  ], { now });
  assert.strictEqual(result.counts.wallets, 1);
  assert.strictEqual(result.counts.exchanges, 1);
  assert.strictEqual(result.counts.services, 1);
  assert.strictEqual(result.counts.vaultItems, 3);
  assert.strictEqual(result.stale.count, 3);
  assert.strictEqual(result.stale.neverVerified, 2);
  assert.strictEqual(result.recoveryCoverage.method, 2);
  assert.strictEqual(result.recoveryCoverage.location, 2);
  assert.strictEqual(result.needsAttention[0].profileIndex, 0);
}

function testCopyAndQrArtwork() {
  assert(security.includes('class="sl-copy-sheet sl-copy-sheet-back"'));
  assert(security.includes('class="sl-copy-sheet sl-copy-sheet-front"'));
  assert(security.includes('function qrIconMarkup()'));
  assert(security.includes('class="sl-qr-svg"'));
  assert(security.includes('button.innerHTML = qrIconMarkup();'));
  assert(!security.includes("makeIconButton('fa-qrcode'"), 'QR button should use centered local SVG artwork instead of an icon-font glyph.');
  assert(!security.includes('sl-copy-arrow'), 'Copy button should no longer look like circular arrows.');
  assert(!security.includes('sl-copy-plus'), 'Copy button should no longer contain the accidentally supplied plus sign.');
  assert(css.includes('.sl-copy-sheet'));
  assert(css.includes('.qr-inline-button'));
  assert(css.includes('.sl-qr-svg'));
  assert(css.includes('.public-address-field .address-qr'));
  assert(css.includes('margin: 0 auto !important;'));
  assert(css.includes('.compact-qr-area .qr-caption'));
  assert(css.includes('color: var(--sl-text-strong) !important;'), 'QR caption should use high-contrast theme text.');
}

function testRecoveryDrillReminderAndContrast() {
  assert(drill.includes('Documentation reminder:'));
  assert(drill.includes('Completing or verifying a drill records that you tested the process; it does not create the missing recovery documentation.'));
  assert(drill.includes('documentationReminder'));
  assert(drill.includes('Edit Vault Item'));
  assert(css.includes('.recovery-drill-step-title'));
  assert(css.includes('color: var(--sl-text-strong) !important;'));
  assert(css.includes('.recovery-drill-step-text'));
  assert(css.includes('color: var(--sl-muted) !important;'));
}

function testExchangeAndWebsiteVaultItems() {
  assert(groupSource.includes("require('./vault-item-presentation')"),
    'The canonical group renderer must own Vault Item presentation behavior.');
  assert(!entry.includes("require('./vault-item-ui.js')"),
    'The legacy Vault Item observer must not return to the renderer bundle.');
  assert(vaultItemPresentationSource.includes("const EXCHANGE_CATEGORY = 'Exchange Account';"));
  assert(vaultItemPresentationSource.includes("const LEGACY_SERVICE_CATEGORY = 'Web3 / Website Account';"));
  assert(vaultItemPresentationSource.includes("['2FA recovery / backup codes', 'sensitive']"));
  assert(vaultItemPresentationSource.includes('never auto-fills a login URL'));
  assert(index.includes('id="groupSearch"'), 'The Vault search control must remain present.');
  assert(index.includes('placeholder="Search vaults..."'), 'The Vault search field should use the current concise wording.');
  assert(!index.includes('placeholder="Search vault items..."'), 'The retired verbose Vault search wording must stay removed.');
  assert(index.includes('id="addGroup"'), 'The Vault add action must remain present even if its user-facing label evolves.');
  assert(index.includes('./css/ui-current.css'));

  const exchanges = vaultItemPresentation.presetNames(vaultItemPresentation.EXCHANGE_CATEGORY);
  assert.strictEqual(exchanges.length, web3Icons.entries('exchanges').length,
    'Exchange presets should automatically cover the complete pinned local Web3Icons exchange catalog.');
  assert(exchanges.length >= 20, 'SafeLedger should offer a useful exchange preset catalog.');
  assert(vaultItemPresentation.presetNames(vaultItemPresentation.WEB3_CATEGORY).includes('FIO App'));
  assert(vaultItemPresentation.presetNames(vaultItemPresentation.WEB3_CATEGORY).includes('OpenSea'));
  assert.strictEqual(
    vaultItemPresentation.normalizeCategory('FIO App', vaultItemPresentation.LEGACY_SERVICE_CATEGORY),
    vaultItemPresentation.WEB3_CATEGORY,
    'Legacy combined service records must still resolve to the appropriate modern account type.'
  );
  assert.strictEqual(
    vaultItemPresentation.normalizeCategory('Facebook', vaultItemPresentation.LEGACY_SERVICE_CATEGORY),
    vaultItemPresentation.WEBSITE_CATEGORY,
    'Legacy website records must remain compatible without a data migration.'
  );
}

testDashboardNavigationAndInsights();
testCopyAndQrArtwork();
testRecoveryDrillReminderAndContrast();
testExchangeAndWebsiteVaultItems();
console.log('PASS SafeLedger 2.5.12 Vault Overview navigation, maintenance insight, revised copy/QR artwork, recovery drill clarity, and directly rendered exchange/service Vault Items.');
