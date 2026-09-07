'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const gate2652 = read('scripts/hotfix-2.6.52-tests.js');
const lifecycle = read('scripts/behavioral-lifecycle-tests.js');
const trust = read('scripts/generate-release-trust.js');
const windows = read('.github/workflows/windows-portable.yml');
const linux = read('.github/workflows/linux-appimage.yml');
const mac = read('.github/workflows/macos-arm64.yml');

assert.strictEqual(pkg.version, '2.6.53', 'Phase 5 Behavioral Testing & Release Trust must report SafeLedger 2.6.53.');
assert(gate2652.includes('parts[2] >= 52'), 'Phase 4 UI Consolidation must remain active on the Phase 5 candidate.');
assert(pkg.scripts['test:behavioral-lifecycle'] === 'node scripts/behavioral-lifecycle-tests.js');
assert(pkg.scripts['test:release-trust'] === 'node scripts/release-trust-tests.js');
assert(pkg.scripts['release:trust'] === 'node scripts/generate-release-trust.js');

for (const contract of ['mutateGroup({', 'mutateRecord({', 'readVault(', 'readVaultList(', "rawList.startsWith('SLG2:')", 'THIS MUST NOT SAVE']) {
  assert(lifecycle.includes(contract), `Behavioral lifecycle coverage must retain: ${contract}`);
}
assert(trust.includes("bomFormat: 'CycloneDX'") && trust.includes("specVersion: '1.5'"));
assert(trust.includes("algorithm: 'SHA-256'") && trust.includes('sourceCommit: commit || null'));
assert(trust.includes('package-lock.json'), 'SBOM must derive from the committed lockfile.');

for (const [name, workflow] of [['Windows', windows], ['Linux', linux], ['macOS', mac]]) {
  assert(workflow.includes('node scripts/behavioral-lifecycle-tests.js'), `${name} must run the encrypted lifecycle test.`);
  assert(workflow.includes('node scripts/release-trust-tests.js'), `${name} must test release metadata generation.`);
  assert(workflow.includes('node scripts/generate-release-trust.js'), `${name} must generate checksum/SBOM/manifest for the packaged artifact.`);
  assert(workflow.includes('github.event.pull_request.head.sha || github.sha'), `${name} release metadata must bind to the source commit.`);
}

for (const relative of [
  'scripts/behavioral-lifecycle-tests.js',
  'scripts/generate-release-trust.js',
  'scripts/release-trust-tests.js',
  'scripts/hotfix-2.6.53-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.53 Phase 5 locks encrypted reopen lifecycle behavior and source-bound checksum/SBOM release trust metadata.');
