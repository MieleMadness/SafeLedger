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
assert(parts[2] >= 74, 'The 2.6.74 Maintenance Snapshot and Settings order contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.74-tests.js'));

const settings = read('src/main/settings-ui.js');
const layout = read('src/main/css/dashboard-layout.css');
const dashboard = read('src/main/dashboard-ui.js');
const orderRegression = read('scripts/brute-force-regression-tests.js');
const historicalOrderRegression = read('scripts/development-2.5.8-tests.js');

const settingsOrder = [
  'renderAppearanceSection(area, params);',
  'renderAssetDisplaySection(area, params);',
  'renderPrivacySection(area, params);',
  'renderBackupSection(area);'
];
let prior = -1;
for (const call of settingsOrder) {
  const index = settings.indexOf(call);
  assert(index > prior, `${call} must follow the preceding Settings section.`);
  prior = index;
}
for (const source of [orderRegression, historicalOrderRegression]) {
  assert(source.indexOf("'renderAssetDisplaySection(area, params);'") > source.indexOf("'renderAppearanceSection(area, params);'"));
  assert(source.indexOf("'renderPrivacySection(area, params);'") > source.indexOf("'renderAssetDisplaySection(area, params);'"));
  assert(source.indexOf("'renderBackupSection(area);'") > source.indexOf("'renderPrivacySection(area, params);'"));
}

assert(layout.includes('.dashboard-maintenance-cards {'));
assert(layout.includes('gap: 0;'), 'Maintenance Snapshot should read as one divided list rather than separated cards.');
assert(layout.includes('overflow: hidden;'));
assert(layout.includes('border: 1px solid var(--sl-border);'));
assert(layout.includes('border-radius: 8px;'));
assert(layout.includes('.dashboard-maintenance-card:last-child {'));
assert(layout.includes('border-bottom: 0;'));
assert(layout.includes('border-radius: 0;'));
assert(layout.includes('background: transparent;'));
assert(dashboard.includes("icon: 'fa-clock-o'"));
assert(dashboard.includes("icon: 'fa-life-ring'"));
assert(dashboard.includes("icon: 'fa-archive'"));
assert(dashboard.includes("label: 'Resolve'"));
assert(dashboard.includes("label: 'Create Backup'"));
assert(dashboard.includes("label: 'Verify Backup'"));

for (const relative of [
  'scripts/brute-force-regression-tests.js',
  'scripts/development-2.5.8-tests.js',
  'scripts/hotfix-2.5.2-tests.js',
  'scripts/hotfix-2.6.70-tests.js',
  'scripts/hotfix-2.6.72-tests.js'
]) execFileSync(process.execPath, [path.join(root, relative)], { stdio: 'pipe' });

for (const relative of [
  'src/main/settings-ui.js',
  'scripts/brute-force-regression-tests.js',
  'scripts/development-2.5.8-tests.js',
  'scripts/hotfix-2.6.74-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} gives Maintenance Snapshot a Recovery Needs Attention-style divided list and places Asset Display / Privacy Mode directly under Appearance.`);
