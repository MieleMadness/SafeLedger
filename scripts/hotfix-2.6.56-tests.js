'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.56', 'This feature candidate must package as SafeLedger 2.6.56.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.55-tests.js'), '2.6.55 user-reported Asset targeting protection must remain in regression.');
assert(pkg.scripts['test:regression'].includes('node scripts/recovery-command-center-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/duplicate-asset-authoritative-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.56-tests.js'));

const dashboard = read('src/main/dashboard-ui.js');
const summary = read('src/main/dashboard-summary.js');
const commandCenter = read('src/main/recovery-command-center.js');
const simulator = read('src/main/recovery-simulator.js');
const drill = read('src/main/recovery-drill-ui.js');
const emergency = read('src/main/emergency-package-ui.js');
const profile = read('src/main/profile.js');
const binderUi = read('src/main/recovery-binder-ui.js');
const duplicate = read('src/main/duplicate-asset.js');
const record = read('src/main/record.js');
const writer = read('src/main/data-write-service.js');
const motion = read('src/main/motion-ui.js');
const actions = read('src/main/detail-actions.js');
const columns = read('src/main/column-collapse-ui.js');
const security = read('src/main/security-ui.js');
const css = read('src/main/css/product-features.css');

// Recovery Command Center: readiness ring, scorecards, timeline, and scenario simulator.
assert(dashboard.includes("require('./recovery-simulator')"));
assert(dashboard.includes("require('./motion-ui')"));
assert(dashboard.includes("className = 'dashboard-readiness-ring'"));
assert(dashboard.includes("makeSection('Vault Item Security Scorecards'"));
assert(dashboard.includes("makeSection('Security Timeline'"));
assert(dashboard.includes("makeSection('What Happens If…'"));
assert(dashboard.includes('motion.animateReadiness(ring.progress, summary.readinessPercent)'));
assert(dashboard.includes('motion.dashboardEntrance(area)'));
assert(summary.includes('readinessPercent: counts.vaultItems ? Math.round(scoreTotal / counts.vaultItems) : 0'));
assert(summary.includes('securityTimeline: commandCenter.buildSecurityTimeline'));
assert(summary.includes('simulationFacts: commandCenter.buildSimulationFacts'));
assert(commandCenter.includes('buildSecurityTimeline'));
assert(commandCenter.includes('buildSimulationFacts'));
assert(simulator.includes("id: 'device-lost'"));
assert(simulator.includes("id: 'safeledger-device-lost'"));
assert(simulator.includes("id: 'location-unavailable'"));
assert(simulator.includes("id: 'family-access'"));
assert(simulator.includes("id: 'exchange-lockout'"));

// Recovery Validation Wizard remains local-only and stores only completion/verification timestamps through its existing completion path.
assert(drill.includes("wizard.className = 'recovery-drill-wizard';"));
assert(drill.includes("track.className = 'recovery-drill-progress-track';"));
assert(drill.includes("row.hidden = index !== activeIndex"));
assert(drill.includes('checkboxes.every((checkbox) => checkbox.checked)'));
assert(drill.includes('Individual checklist answers are not stored.'));
assert(drill.includes("input.value = '';"), 'Temporary BIP39 input must still be cleared immediately after local validation.');
assert(!drill.includes('localStorage') && !drill.includes('sessionStorage'));

// Emergency Package reuses Recovery Binder generation and defaults to excluding high-risk information.
assert(profile.includes("const emergencyPackageUi = require('./emergency-package-ui');"));
assert(profile.includes("title: 'Emergency recovery package'"));
assert(profile.includes('emergencyPackageUi.show({'));
assert(emergency.includes('recoveryBinder.normalizeOptions(selected)'));
assert(emergency.includes('Safe defaults include recovery planning'));
assert(emergency.includes('recoveryBinderUi.printBinder'));
assert(binderUi.includes('exports.printBinder = printBinder;'));
assert(binderUi.includes("options.printButtonText || 'Print Recovery Binder'"));

// Duplicate protection is warning-based in the renderer and independently enforced against encrypted authoritative data.
assert(duplicate.includes('function sameIdentity'));
assert(duplicate.includes('function warning'));
assert(record.includes("const duplicateAsset = require('./duplicate-asset');"));
assert(record.includes('const identityChanged = !originalRecord || !duplicateAsset.sameIdentity(originalRecord, rec);'));
assert(record.includes('duplicateConfirmed'));
assert(writer.includes("const duplicateAsset = require('./duplicate-asset');"));
assert(writer.includes('function assertDuplicateApproved(records, candidate, excludeIndex, request)'));
assert(writer.includes('request.duplicateConfirmed !== true'));
assert(writer.includes('if (!duplicateAsset.sameIdentity(existing, updated)) assertDuplicateApproved'));

// Motion is centralized, presentation-only, and honors OS reduced-motion preferences.
assert(motion.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches"));
assert(motion.includes('function signalSaveSuccess()'));
assert(motion.includes('function dashboardEntrance(area)'));
assert(motion.includes('function animateReadiness(circle, targetPercent)'));
assert(actions.includes("const motion = require('./motion-ui');"));
assert(actions.includes("if (action && action.className === 'detail-action-save') motion.rememberSave(button);"));
assert(columns.includes('function animateCollapsedState(state, collapsed)'));
assert(columns.includes('duration: motion.DURATIONS.nav'));
assert(security.includes('if (details.open) motion.reveal(content);'));
assert(css.includes('@media (prefers-reduced-motion: reduce)'));

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.55-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/recovery-command-center-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/duplicate-asset-authoritative-tests.js')], { stdio: 'pipe' });

for (const relative of [
  'src/main/dashboard-ui.js', 'src/main/dashboard-summary.js', 'src/main/recovery-command-center.js',
  'src/main/recovery-simulator.js', 'src/main/recovery-drill-ui.js', 'src/main/emergency-package-ui.js',
  'src/main/recovery-binder-ui.js', 'src/main/duplicate-asset.js', 'src/main/record.js',
  'src/main/data-write-service.js', 'src/main/motion-ui.js', 'src/main/detail-actions.js',
  'src/main/column-collapse-ui.js', 'src/main/security-ui.js', 'scripts/recovery-command-center-tests.js',
  'scripts/duplicate-asset-authoritative-tests.js', 'scripts/hotfix-2.6.56-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.56 locks the Recovery Command Center, guided Recovery Validation, Emergency Package, authoritative duplicate protection, and reduced-motion-aware UI motion.');
