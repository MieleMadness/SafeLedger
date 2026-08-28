'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const securityMain = read('src/main/security-main.js');
const preload = read('src/main/preload.js');
const entry = read('src/main/renderer-entry.js');
const dashboardUi = read('src/main/dashboard-ui.js');
const index = read('src/main/index.html');
const group = read('src/main/group.js');
const record = read('src/main/record.js');
const customFields = read('src/main/custom-fields.js');
const customFieldsUi = read('src/main/custom-fields-ui.js');
const css = read('src/main/css/product-features.css');

assert.strictEqual(pkg.version, '2.0.62');
assert(securityMain.includes("ipc.handle('dashboard-summary'"));
assert(securityMain.includes('dashboardSummary.summarize(entries)'));
assert(preload.includes("getDashboardSummary: () => ipcRenderer.invoke('dashboard-summary')"));
assert(entry.includes("require('./dashboard-ui.js')"));
assert(entry.includes("dataset.safeLedgerRendererReady = 'true'"));
assert(index.includes('id="dashboardButton"'));
assert(dashboardUi.includes("heading.textContent = 'Recovery Dashboard'"));
assert(dashboardUi.includes("attentionTitle.textContent = 'Needs Attention'"));
assert(group.includes("const customFields = require('./custom-fields')"));
assert(group.includes("const customFieldsUi = require('./custom-fields-ui')"));
assert(group.includes('g.customFields = customFieldEditor.getFields()'));
assert(group.includes('customFields.searchableValues(current.customFields)'));
assert(record.includes('rec.customFields = customFieldEditor.getFields()'));
assert(record.includes('customFields.searchableValues(coin.customFields)'));
assert(!record.includes('coin.tags, coin.manualBalance'));
assert(customFields.includes("field.type !== 'sensitive'"));
assert(customFieldsUi.includes("heading.textContent = 'Custom Fields'"));
assert(customFieldsUi.includes("securityUi.appendSensitiveField(parent, field.label, field.value, { allowQr: false })"));
assert(css.includes('.custom-field-edit-row'));
for (const relative of [
  'src/main/dashboard-summary.js',
  'src/main/dashboard-ui.js',
  'src/main/security-main.js',
  'src/main/preload.js',
  'src/main/renderer-entry.js',
  'src/main/custom-fields.js',
  'src/main/custom-fields-ui.js',
  'src/main/group.js',
  'src/main/record.js',
  'scripts/dashboard-summary-tests.js',
  'scripts/custom-fields-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
console.log('PASS roadmap 2.0.62 preserves the Recovery Dashboard and adds typed Wallet/Coin custom fields with sensitive values excluded from search.');
