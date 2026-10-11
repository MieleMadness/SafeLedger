'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const lifecycle = read('scripts/behavioral-lifecycle-tests.js');
const trust = read('scripts/generate-release-trust.js');
const distributionTrust = read('scripts/distribution-trust-tests.js');
const windows = read('.github/workflows/windows-portable.yml');
const linux = read('.github/workflows/linux-appimage.yml');
const mac = read('.github/workflows/macos-arm64.yml');
const ATTEST_ACTION = 'actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6';

assert(/^2\.6\.\d+$/.test(String(pkg.version || '')), 'Release trust contract expects a SafeLedger 2.6.x candidate.');
assert(pkg.scripts['test:behavioral-lifecycle'] === 'node scripts/behavioral-lifecycle-tests.js');
assert(pkg.scripts['test:release-trust'] === 'node scripts/release-trust-tests.js');
assert(pkg.scripts['release:trust'] === 'node scripts/generate-release-trust.js');

for (const contract of ['mutateGroup({', 'mutateRecord({', 'readVault(', 'readVaultList(', "rawList.startsWith('SLG2:')", 'THIS MUST NOT SAVE']) {
  assert(lifecycle.includes(contract), `Behavioral lifecycle coverage must retain: ${contract}`);
}
assert(trust.includes("bomFormat: 'CycloneDX'") && trust.includes("specVersion: '1.5'"));
assert(trust.includes("algorithm: 'SHA-256'") && trust.includes('sourceCommit: commit || null'));
assert(trust.includes('package-lock.json'), 'SBOM must derive from the committed lockfile.');
assert(distributionTrust.includes('clean user downloads') && distributionTrust.includes('GitHub attestations'),
  'Distribution trust regression must protect clean-download and GitHub-attestation layout.');

for (const [name, workflow, appPath, verificationName, verificationPath] of [
  ['Windows', windows, 'release/windows/app/*', 'SafeLedger-Windows-Verification', 'release/windows/verification/*'],
  ['Linux', linux, 'release/linux/app/*', 'SafeLedger-Linux-Verification', 'release/linux/verification/*'],
  ['macOS', mac, 'release/macos/app/*', 'SafeLedger-macOS-arm64-Verification', 'release/macos/verification/*']
]) {
  assert(workflow.includes('node scripts/release-trust-contract-tests.js'), `${name} must run the canonical release-trust contract gate.`);
  assert(!workflow.includes('node scripts/hotfix-2.6.53-tests.js'), `${name} must not use the retired patch-numbered Phase 5 gate.`);
  assert(workflow.includes('node scripts/behavioral-lifecycle-tests.js'), `${name} must run the encrypted lifecycle test.`);
  assert(workflow.includes('node scripts/release-trust-tests.js'), `${name} must test release metadata generation.`);
  assert(workflow.includes('node scripts/generate-release-trust.js'), `${name} must generate checksum/SBOM/manifest for the packaged artifact.`);
  assert(workflow.includes('"${{ github.sha }}"') || workflow.includes("'${{ github.sha }}'"),
    `${name} release metadata must bind to the exact checked-out build commit.`);
  assert(!workflow.includes('github.event.pull_request.head.sha || github.sha'),
    `${name} must not mislabel the PR head as the exact build commit.`);
  assert(workflow.includes('id-token: write') && workflow.includes('attestations: write'),
    `${name} must grant GitHub attestation permissions without repository write access.`);
  assert(workflow.includes(ATTEST_ACTION), `${name} must use the pinned GitHub attestation action.`);
  assert(workflow.includes('subject-path:') && workflow.includes('sbom-path:'),
    `${name} must publish both provenance and SBOM attestations.`);
  assert(workflow.includes(appPath), `${name} normal download must contain only user-facing app files.`);
  assert(workflow.includes(`name: ${verificationName}`) && workflow.includes(`path: ${verificationPath}`),
    `${name} checksum/SBOM/manifest files must remain available as a separate verification artifact.`);
}

for (const relative of [
  'scripts/behavioral-lifecycle-tests.js',
  'scripts/generate-release-trust.js',
  'scripts/release-trust-tests.js',
  'scripts/distribution-trust-tests.js',
  'scripts/release-trust-contract-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS canonical release-trust contract keeps encrypted reopen behavior, clean downloads, verification files, and GitHub-native provenance/SBOM attestations.');
