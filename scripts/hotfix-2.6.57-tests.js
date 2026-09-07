'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.57');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.57-tests.js'));

const drill = read('src/main/recovery-drill-ui.js');
assert(drill.includes('separated by spaces'));
assert(drill.includes('Do not use commas or join the words together.'));
assert(drill.includes('Enter 12–24 BIP39 words separated by spaces'));
assert(drill.includes("input.value = '';"), 'Temporary BIP39 text must still be cleared after the local check.');
assert(!drill.includes('Previous') && !drill.includes('Next <i'), 'Recovery Validation must not restore Previous/Next navigation.');
assert(!drill.includes('row.hidden = index !== activeIndex'), 'All Recovery Validation checks should remain visible together.');
assert(drill.includes('checkboxes.every((checkbox) => checkbox.checked)'));
assert(drill.includes('Individual checklist answers are not stored.'));

const motion = read('src/main/motion-ui.js');
const detailActions = read('src/main/detail-actions.js');
const status = read('src/main/status.js');
assert(!motion.includes('signalSaveSuccess') && !motion.includes('rememberSave') && !motion.includes('save-success-pop'));
assert(!detailActions.includes('rememberSave') && !detailActions.includes("require('./motion-ui')"));
assert(!status.includes('signalSaveSuccess') && !status.includes("require('./motion-ui')"));
assert(motion.includes('function dashboardEntrance(area)') && motion.includes('function animateReadiness(circle, targetPercent)'));

const dashboard = read('src/main/dashboard-ui.js');
const summary = read('src/main/dashboard-summary.js');
assert(!dashboard.includes('Vault Item Security Scorecards'));
assert(!dashboard.includes('renderScorecards'));
assert(!dashboard.includes("makeSection('Security Timeline'"));
assert(!dashboard.includes('renderSecurityTimeline'));
assert(!summary.includes('securityTimeline:'));
assert(!summary.includes('scorecards:'));
assert(dashboard.includes("className = 'dashboard-attention-gaps'"));
assert(dashboard.includes('item.actions.slice(0, 3)') || dashboard.includes('item.actions) ? item.actions.slice(0, 3)'));
assert(dashboard.includes("const attention = makeSection('Recovery Needs Attention'"));

assert(dashboard.includes("details.className = 'recovery-simulator-accordion'"));
assert(dashboard.includes("summaryRow.className = 'recovery-simulator-accordion-summary'"));
assert(dashboard.includes("answer.className = 'recovery-simulator-accordion-answer'"));
assert(dashboard.includes("details.addEventListener('toggle'"));
assert(!dashboard.includes("resultHost.className = 'recovery-simulator-result'"));
assert(!dashboard.includes('setTimeout(() => run(scenario'));

const simulator = require('../src/main/recovery-simulator.js');
const expectedIcons = {
  'device-lost': 'fa-mobile',
  'safeledger-device-lost': 'fa-database',
  'location-unavailable': 'fa-map-marker',
  'family-access': 'fa-users',
  'exchange-lockout': 'fa-unlock-alt'
};
for (const scenario of simulator.SCENARIOS) assert.strictEqual(scenario.icon, expectedIcons[scenario.id]);

const activity = read('src/main/activity-history-ui.js');
const activityCss = read('src/main/css/activity-history.css');
const activityDefinitions = require('../src/main/activity-history.js').EVENT_DEFINITIONS;
assert(activity.includes('description.icon'), 'Activity History must use the existing per-event icon catalog.');
for (const definition of Object.values(activityDefinitions)) assert(definition.icon && definition.icon.startsWith('fa-'));
assert(activityCss.includes('.activity-list::before'), 'Activity History should render the canonical vertical timeline rail.');
assert(activityCss.includes('var(--sl-surface)') && activityCss.includes('var(--sl-text-strong)'));
assert(activityCss.includes('html[data-theme="dark"]'));

const refinementCss = read('src/main/css/recovery-refinement.css');
const index = read('src/main/index.html');
assert(index.includes('./css/recovery-refinement.css'));
assert(refinementCss.includes('.recovery-simulator-accordion'));
assert(refinementCss.includes('html[data-theme="dark"] .recovery-simulator-accordion'));
assert(refinementCss.includes('@media (prefers-reduced-motion: reduce)'));

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.56-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'src/main/recovery-drill-ui.js', 'src/main/motion-ui.js', 'src/main/detail-actions.js',
  'src/main/status.js', 'src/main/dashboard-ui.js', 'src/main/dashboard-summary.js',
  'src/main/recovery-command-center.js', 'src/main/recovery-simulator.js',
  'src/main/activity-history-ui.js', 'scripts/hotfix-2.6.57-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.57 uses space-separated BIP39 guidance, simplified Recovery Validation, consolidated recovery gaps, Activity History timeline styling, accordion scenarios, and no Save checkmark animation.');
