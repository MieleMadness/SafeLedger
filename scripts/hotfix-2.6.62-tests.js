'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(versionParts[0], 2);
assert.strictEqual(versionParts[1], 6);
assert(versionParts[2] >= 62, 'The 2.6.62 complete local icon registry contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/icon-registry-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.62-tests.js'));

const icons = read('src/main/css/local-icons.css');
const activity = require('../src/main/activity-history.js');
const simulator = require('../src/main/recovery-simulator.js');
const globalSearch = read('src/main/global-search-ui.js');
const presentation = read('src/main/vault-item-presentation.js');
const priorGate = read('scripts/hotfix-2.6.61-tests.js');
const release = read('RELEASE-2.6.62.md');

const previouslyUndefined = [
  'fa-clock-o',
  'fa-archive',
  'fa-user-plus',
  'fa-user-times',
  'fa-exclamation-circle',
  'fa-mobile',
  'fa-database',
  'fa-map-marker',
  'fa-users',
  'fa-unlock-alt',
  'fa-folder-o',
  'fa-globe'
];
const iconCssWithoutComments = icons.replace(/\/\*[\s\S]*?\*\//g, '');
for (const token of previouslyUndefined) {
  assert(new RegExp(`\\.${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:\\b|:)`).test(iconCssWithoutComments),
    `${token} must have a real local CSS definition instead of reaching the generic dot fallback.`);
}

for (const eventName of [
  'inactivity-auto-lock',
  'complete-data-backup-exported',
  'profile-created',
  'profile-deleted',
  'self-destruct-triggered'
]) {
  const definition = activity.EVENT_DEFINITIONS[eventName];
  assert(definition && previouslyUndefined.includes(definition.icon), `${eventName} should remain covered by the repaired local icon set.`);
}

const scenarioIcons = simulator.SCENARIOS.map((scenario) => scenario.icon);
for (const token of ['fa-mobile', 'fa-database', 'fa-map-marker', 'fa-users', 'fa-unlock-alt']) {
  assert(scenarioIcons.includes(token), `Recovery simulator should keep its semantic ${token} icon.`);
}
assert(globalSearch.includes("type === 'profile' ? 'fa-folder-o'"));
assert(presentation.includes("fallback.className = 'fa fa-globe vault-service-icon'"));
assert(icons.includes('.fa::before,\n.glyphicon::before { content: "•"; }'), 'Unknown icons should keep a visible diagnostic fallback.');
assert(priorGate.includes('versionParts[2] >= 61'));
assert(release.includes('automatic icon registry gate'));
assert(release.includes('12'));

execFileSync(process.execPath, [path.join(root, 'scripts/icon-registry-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/icon-registry-tests.js',
  'scripts/hotfix-2.6.61-tests.js',
  'scripts/hotfix-2.6.62-tests.js',
  'src/main/activity-history.js',
  'src/main/recovery-simulator.js',
  'src/main/global-search-ui.js',
  'src/main/vault-item-presentation.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} repairs the 12 known unmapped icons and enforces complete local icon coverage for runtime UI code.`);
