'use strict';

// Canonical SafeLedger regression manifest.
//
// Active CI protects current behavior through stable subsystem suites. Historical
// patch/release-numbered gates were retired from the repository in 2.6.98 after
// their durable behavior contracts had been absorbed here. Git history remains
// the record of those one-off gates; new regressions belong in an existing
// subsystem suite or a new durable suite named for the behavior it protects.

const CANONICAL_SUITES = Object.freeze([
  ['Core data and compatibility', 'scripts/regression-tests.js'],
  ['Crypto v3', 'scripts/crypto-v3-tests.js'],
  ['SafeLedger 2.x crypto compatibility', 'scripts/v2-only-crypto-regression-tests.js'],
  ['UI baseline', 'scripts/ui-regression-tests.js'],
  ['Edit grids', 'scripts/edit-grid-regression-tests.js'],
  ['Repository hygiene', 'scripts/repository-hygiene-tests.js'],
  ['Brute force protection', 'scripts/brute-force-regression-tests.js'],
  ['Lockout behavior', 'scripts/lockout-regression-tests.js'],
  ['Style consolidation', 'scripts/style-consolidation-regression-tests.js'],
  ['Visual contracts', 'scripts/visual-contract-regression-tests.js'],
  ['Runtime hardening', 'scripts/runtime-hardening-regression-tests.js'],
  ['Main process ownership', 'scripts/main-process-ownership-tests.js'],
  ['Renderer architecture', 'scripts/renderer-architecture-tests.js'],
  ['Security cleanup invariants', 'scripts/cleanup-regression-tests.js'],
  ['Renderer sandbox', 'scripts/sandbox-regression-tests.js'],
  ['Atomic persistence', 'scripts/atomic-file-regression-tests.js'],
  ['Dependency policy', 'scripts/dependency-policy-regression.js'],
  ['Continuity hardening', 'scripts/continuity-hardening-tests.js'],
  ['Recovery confidence', 'scripts/recovery-confidence-tests.js'],
  ['Authoritative data ownership', 'scripts/data-ownership-tests.js'],
  ['UI consolidation', 'scripts/ui-consolidation-tests.js'],
  ['Recovery readiness', 'scripts/recovery-readiness-tests.js'],
  ['Cross-feature roadmap smoke', 'scripts/roadmap-regression-tests.js'],
  ['Dashboard summary', 'scripts/dashboard-summary-tests.js'],
  ['Custom fields', 'scripts/custom-fields-tests.js'],
  ['Recovery drill', 'scripts/recovery-drill-tests.js'],
  ['Recovery binder', 'scripts/recovery-binder-tests.js'],
  ['Activity history', 'scripts/activity-history-tests.js'],
  ['Appearance', 'scripts/appearance-tests.js'],
  ['Global search', 'scripts/global-search-tests.js'],
  ['Local icon registry', 'scripts/icon-registry-tests.js'],
  ['UI polish', 'scripts/ui-polish-tests.js'],
  ['Runtime modernization', 'scripts/runtime-modernization-tests.js'],
  ['Device security', 'scripts/device-security-tests.js'],
  ['Device dashboard health', 'scripts/device-dashboard-health-tests.js'],
  ['Recovery intelligence', 'scripts/recovery-intelligence-tests.js'],
  ['Recovery intelligence UI', 'scripts/recovery-intelligence-ui-tests.js'],
  ['Profile setup and dashboard', 'scripts/next-profile-setup-dashboard-tests.js'],
  ['Vault Item rendering', 'scripts/vault-item-rendering-consolidation-tests.js'],
  ['Password visibility control', 'scripts/login-eye-regression-tests.js'],
  ['Recovery command center', 'scripts/recovery-command-center-tests.js'],
  ['Duplicate Asset authority', 'scripts/duplicate-asset-authoritative-tests.js'],
  ['Startup performance', 'scripts/startup-performance-tests.js'],
  ['Current product contract', 'scripts/current-product-contract-tests.js'],
  ['Release trust contract', 'scripts/release-trust-contract-tests.js'],
  ['Distribution trust', 'scripts/distribution-trust-tests.js'],
  ['Test architecture', 'scripts/test-architecture-tests.js']
].map(([name, file]) => Object.freeze({ name, file })));

const RETIRED_TEST_FILE_PATTERNS = Object.freeze([
  /^development-\d+\.\d+\.\d+-tests\.js$/,
  /^hotfix-\d+\.\d+\.\d+-tests\.js$/,
  /^release-\d+\.\d+-tests\.js$/
]);

function isRetiredTestFile(fileName) {
  return RETIRED_TEST_FILE_PATTERNS.some((pattern) => pattern.test(String(fileName || '')));
}

module.exports = {
  CANONICAL_SUITES,
  RETIRED_TEST_FILE_PATTERNS,
  isRetiredTestFile
};
