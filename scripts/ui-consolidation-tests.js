'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const entry = read('src/main/renderer-entry.js');
const renderer = read('src/main/renderer.js');
const rendererState = read('src/main/renderer-state.js');
const services = read('src/main/renderer-services.js');
const settings = read('src/main/settings-ui.js');
const dashboard = read('src/main/dashboard-ui.js');
const intelligence = read('src/main/recovery-intelligence-dashboard-ui.js');
const columns = read('src/main/column-collapse-ui.js');
const loginLayout = read('src/main/login-layout-ui.js');
const securityEnhancements = read('src/main/security-enhancements.js');
const securityUi = read('src/main/security-ui.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const record = read('src/main/record.js');
const dataWrites = read('src/main/data-write-service.js');

const retired = [
  'login-workspace-ui.js',
  'privacy-mode-ui.js',
  'dashboard-action-state-ui.js',
  'dashboard-row-ui.js',
  'recovery-intelligence-vault-overview-ui.js',
  'self-destruct-settings-ui.js',
  'settings-layout-ui.js',
  'settings-shortcut-ui.js',
  'renderer-bridge.js',
  'search-enhancements.js',
  'sensitive-control-icons-ui.js',
  'vault-item-asset-seeding-ui.js',
  'vault-item-save-forwarder.js',
  'shitcoin-mode-ui.js',
  'settings-icon-fix-ui.js'
];
for (const file of retired) {
  assert(!fs.existsSync(path.join(root, 'src/main', file)), `${file} should be retired instead of remaining as a dormant patch.`);
  assert(!entry.includes(file), `${file} must not be loaded by the renderer entry point.`);
}

assert(renderer.includes("dashboardUi.configure({ onOpenWallet: navigateGlobalResult })"),
  'Dashboard navigation must use an explicit renderer callback.');
assert(renderer.includes('const firstIndex = firstDisplayProfileIndex(state.vaultList);') && renderer.includes('services.readProfile(firstProfile.file)'),
  'Post-login Profile selection must be state-driven and use the semantic service facade.');
assert(!renderer.includes('.click()'), 'Renderer state transitions must not depend on synthetic DOM clicks.');
assert(renderer.includes('record.listRecords(workspaceParams());'),
  'Authoritative Vault Item save results must render their Assets directly through canonical workspace state.');
assert(renderer.includes('passwordControls.configure(input, { autocomplete: \'off\', strength: true });') && renderer.includes('loginLayout.syncLoginControlWidths();'),
  'Login controls and width alignment must be created synchronously by the screen owner.');
assert(renderer.includes("setupSearchClear('profileSearch', 'profileSearchClear', 'profile')"),
  'Search clear behavior must be owned by the renderer instead of a fake-keyboard helper.');
assert(renderer.includes("settingsButton.addEventListener('click'"),
  'Settings navigation must be local renderer navigation rather than an IPC round trip.');
assert(rendererState.includes('const state = {') && rendererState.includes('sessionUnlocked: false') && rendererState.includes('const saving = { state: false };'),
  'Transient renderer session/workspace state must have one explicit owner.');
assert(services.includes('function required(name)') && services.includes('window.safeLedgerApi'),
  'Renderer commands must cross one semantic service facade.');

assert(settings.includes("makeSection('Appearance')") && settings.includes("makeSection('Self-Destruct Protection')") && settings.includes("makeSection('Asset Display')") && settings.includes("makeSection('Privacy Mode')") && settings.includes("makeSection('Password')"),
  'One Settings renderer must create every settings section directly.');
assert(!settings.includes('setTimeout(') && !settings.includes('MutationObserver'),
  'Settings correctness must not depend on delayed or observer-driven repairs.');
assert(settings.includes('saveUserSetting(params, { privacyMode: checkbox.checked === true }, save)') && settings.includes('saveUserSetting(params, { shitCoinMode: input.checked === true }, save)'),
  'Settings should send narrow user mutations rather than renderer-owned full settings objects.');
assert(settings.includes('services.saveSettings(patch)'),
  'Settings mutations must use the semantic service facade.');
assert(settings.includes('sl-change-password-icon'), 'The final Change Password icon must be rendered directly.');

assert(dashboard.includes("row.addEventListener('click', () => openWallet(item));") && dashboard.includes("event.key !== 'Enter' && event.key !== ' '"),
  'Dashboard rows must be directly mouse/keyboard actionable.');
assert(!dashboard.includes('.click()') && !dashboard.includes('MutationObserver'),
  'Dashboard behavior must not use synthetic clicks or post-render observers.');
assert(dashboard.includes('window.safeLedgerApi.getRecoveryIntelligence().catch(() => null)'),
  'Vault Overview must load Recovery Intelligence as part of its direct data flow.');
assert(!intelligence.includes('MutationObserver') && !intelligence.includes('setTimeout(') && !intelligence.includes('DOMContentLoaded'),
  'Recovery Intelligence must be a pure renderer, not a page watcher.');
assert(intelligence.includes('function renderIntelligence(area, intelligence)'),
  'Recovery Intelligence must expose a direct render function.');

assert(columns.includes('if (onSearchClear) onSearchClear(config.key);'),
  'Collapsed search state must use a direct callback.');
assert(!columns.includes('dispatchEvent('), 'Column collapse must not fabricate search events.');
assert(!loginLayout.includes('setTimeout(') && !loginLayout.includes("ipc.on("),
  'Login layout alignment must be a synchronous helper.');
assert(!securityEnhancements.includes('enhanceLoginPassword') && !securityEnhancements.includes('setTimeout(enhanceLoginPassword'),
  'Security listeners must not repair login controls after rendering.');
assert(securityEnhancements.includes("const services = require('./renderer-services');"),
  'Security operations must use the same semantic renderer service facade.');
assert(!cryptoUi.includes("document.addEventListener('click'") && !cryptoUi.includes('stopImmediatePropagation'),
  'Login/password-change correctness must not depend on document-wide capture interception.');
assert(securityUi.includes('function syncSensitiveSummary(details, summary, stateIcon)') && securityUi.includes("summary.setAttribute('aria-label', action);"),
  'Sensitive disclosure icon/accessibility state must be rendered directly.');

assert(record.includes("const displayPreferences = require('./display-preferences');") && record.includes('displayPreferences.genericAssetFallback(symbol, maxLength)'),
  'Generic Asset/Shit Coin fallback state must be chosen while rendering the Asset.');
assert(record.includes("const services = require('./renderer-services');") && record.includes('services.saveAsset('),
  'Asset writes must use semantic renderer services.');
assert(dataWrites.includes("const assetPresets = require('./vault-item-asset-presets');") && dataWrites.includes('records: buildTrustedStarterRecords(patch, created)'),
  'Reviewed starter Asset seeding must be main-owned instead of an IPC renderer monkeypatch.');

const displayPreferences = require(path.join(root, 'src/main/display-preferences.js'));
displayPreferences.setSettings({ shitCoinMode: false });
assert.strictEqual(displayPreferences.genericAssetFallback('xyz', 2).text, 'XY');
displayPreferences.setSettings({ shitCoinMode: true });
assert.strictEqual(displayPreferences.genericAssetFallback('xyz', 2).text, '💩');

const dataWriteService = require(path.join(root, 'src/main/data-write-service.js'));
const seeded = dataWriteService.buildTrustedStarterRecords({ name: 'Coinbase Wallet', category: 'Software Wallet' }, '2026-09-06T00:00:00.000Z');
assert(Array.isArray(seeded) && seeded.length > 0, 'A recognized Vault Item should receive trusted reviewed starter Assets in the main write service.');

for (const relative of [
  'src/main/renderer-entry.js', 'src/main/renderer.js', 'src/main/renderer-services.js', 'src/main/renderer-state.js',
  'src/main/settings-ui.js', 'src/main/dashboard-ui.js',
  'src/main/recovery-intelligence-dashboard-ui.js', 'src/main/column-collapse-ui.js', 'src/main/login-layout-ui.js',
  'src/main/security-enhancements.js', 'src/main/security-ui.js', 'src/main/crypto-ui-bridge.js',
  'src/main/record.js', 'src/main/display-preferences.js',
  'src/main/data-write-service.js', 'scripts/ui-consolidation-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger UI Consolidation uses direct state-driven rendering, semantic renderer services, and main-owned preset seeding without observer/timer/synthetic-event repairs.');
