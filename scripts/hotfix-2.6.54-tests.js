'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const dataWrite = require('../src/main/data-write-service.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 54,
  'SafeLedger 2.6.54 requested UI/custom-field regressions must remain active on 2.6.54 and later 2.6.x candidates.');

const cryptoUi = read('src/main/crypto-ui-bridge.js');
const securityUi = read('src/main/security-ui.js');
const windowSizingSource = read('src/main/window-sizing-main.js');
const dashboard = read('src/main/dashboard-ui.js');
const productCss = read('src/main/css/product-features.css');
const profile = read('src/main/profile.js');
const record = read('src/main/record.js');
const customFieldsUi = read('src/main/custom-fields-ui.js');
const dataWriteSource = read('src/main/data-write-service.js');

assert(cryptoUi.includes("if (newPassword && !oldPassword) return failButton(button, 'Old Password Must Be Specified');"),
  'Change Password must clearly require the old password when a new password is supplied.');
assert(securityUi.includes("const QRCode = require('qrcode');"));
assert(securityUi.includes("QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 240 })"));
assert(securityUi.includes("button.innerHTML = qrIconMarkup();"));
assert(securityUi.includes('exports.appendPublicAddressField = (parent, address, symbol) =>'));
assert(securityUi.includes('const allowQr = options.allowQr !== false;'));
assert(securityUi.includes("actions.style.display = privacyMode ? 'none' : '';"));
assert(securityUi.includes("if (privacyMode) actions.style.display = details.open ? '' : 'none';"));

const windowSizing = require('../src/main/window-sizing-main.js');
assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 850);
assert.strictEqual(windowSizing.PREFERRED_WIDTH, 1283);
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1600, height: 1200 }), { width: 1283, height: 850 });
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1200, height: 800 }), { width: 1200, height: 800 });
assert(windowSizingSource.includes('const PREFERRED_HEIGHT = 850;'));

assert(dashboard.includes("makeSection('Vault Inventory', 'vault-inventory-section', vaultContentsLabel(counts))"));
assert(dashboard.includes("makeSection('Maintenance Snapshot', 'vault-maintenance-section'"));
assert(dashboard.includes('Review stale recovery information, documentation coverage, and the latest local backup activity.'));
assert(dashboard.includes("makeSection('Recovery Health', 'vault-recovery-section'"));
assert(dashboard.includes('See how many Vault Items are recovery-ready'));
assert(dashboard.includes("makeSection('Device & Backup Health', 'device-health-section'"));
assert(dashboard.includes('Check SafeLedgerData storage availability and encrypted-backup freshness.'));
assert(dashboard.includes("list.className = 'dashboard-maintenance-list';"));
assert(dashboard.includes("details.className = 'dashboard-maintenance-details';"));
assert(dashboard.includes("appendMaintenanceItem(list, 'Last Backup'"));
assert(!dashboard.includes("datesTitle.textContent = 'Last maintenance';"));
assert(productCss.includes('.dashboard-maintenance-list') && productCss.includes('.dashboard-maintenance-details'));

assert(profile.includes("const customFieldsUi = require('./custom-fields-ui');"));
assert(profile.includes("title: 'Profile Custom Fields'"));
assert(profile.includes('nextProfile.customFields = customFieldEditor.getFields();'));
assert(profile.includes('customFieldsUi.appendDetail(area, profile.customFields'));
assert(dataWriteSource.includes("if (Object.prototype.hasOwnProperty.call(input, 'customFields')) patch.customFields = customFields.normalize(input.customFields);"));
const normalizedProfile = dataWrite.normalizeProfilePatch({
  name: 'Primary',
  customFields: [
    { label: 'Advisor', type: 'text', value: 'Alice' },
    { label: 'Recovery note', type: 'sensitive', value: 'secret' }
  ],
  injected: 'not-allowed'
});
assert.strictEqual(normalizedProfile.customFields.length, 2);
assert.strictEqual(normalizedProfile.injected, undefined);

assert(record.includes('customFieldsUi.createEditor(grid, params.record && params.record.customFields'));
assert(record.includes('customFieldEditor.lockFixedField(identityField)'));
assert(!record.includes('fixedFields: ASSET_IDENTITY_FIELDS'));
assert(customFieldsUi.includes('function lockFixedField(field = {})'));
assert(customFieldsUi.includes("add.innerHTML = '<i class=\"fa fa-plus\" aria-hidden=\"true\"></i> Add custom field';"));
assert(!customFieldsUi.includes('MutationObserver') && !customFieldsUi.includes('.click()'));

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.53-tests.js')], { stdio: 'pipe' });
for (const workflow of ['windows-portable.yml', 'linux-appimage.yml', 'macos-arm64.yml']) {
  const source = read(`.github/workflows/${workflow}`);
  assert(source.includes('actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6'));
  assert(source.includes('subject-path:') && source.includes('sbom-path:'));
}

for (const relative of [
  'src/main/crypto-ui-bridge.js',
  'src/main/dashboard-ui.js',
  'src/main/profile.js',
  'src/main/record.js',
  'src/main/custom-fields-ui.js',
  'src/main/data-write-service.js',
  'src/main/window-sizing-main.js',
  'scripts/hotfix-2.6.54-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps QR available, clarifies Change Password, opens taller, improves Vault Overview, and supports authoritative Profile/Asset custom fields.`);
