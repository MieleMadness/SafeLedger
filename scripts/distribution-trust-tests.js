'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const releasePolicy = require('./release-policy');
const releaseArtifacts = require('./release-artifacts');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

function testTagPolicy() {
  assert.deepStrictEqual(releasePolicy.parseTag('v2.5.0'), { tag: 'v2.5.0', version: '2.5.0' });
  for (const bad of ['2.5.0', 'v2.5', 'v2.5.0-beta', 'v02.5.0', 'v2.5.0x']) {
    assert.throws(() => releasePolicy.parseTag(bad));
  }
  assert.throws(() => releasePolicy.assertTagMatchesPackage('v2.5.0', { version: '2.4.0' }), /mismatch/);
  assert.doesNotThrow(() => releasePolicy.assertTagMatchesPackage('v2.4.0', { version: '2.4.0' }));
}

function writeDummy(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function populateExpected(input, version = '2.5.0') {
  writeDummy(path.join(input, 'windows', `SafeLedger-${version}-Portable.exe`), 'windows');
  writeDummy(path.join(input, 'windows', 'README.pdf'), 'pdf');
  writeDummy(path.join(input, 'windows', 'WINDOWS-SIGNING.txt'), 'unsigned\n');
  writeDummy(path.join(input, 'linux', `SafeLedger-${version}-x86_64.AppImage`), 'linux');
  writeDummy(path.join(input, 'sbom', `safeledger-${version}.cdx.json`), '{"bomFormat":"CycloneDX"}\n');
  writeDummy(path.join(input, 'legal', 'LICENSE'), 'license');
  writeDummy(path.join(input, 'legal', 'NOTICE'), 'notice');
  writeDummy(path.join(input, 'legal', 'THIRD-PARTY-NOTICES.md'), 'third party');
  writeDummy(path.join(input, 'legal', 'RELEASE-VERIFICATION.md'), 'verify');
}

function testArtifactCollectionAndVerification() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-release-test-'));
  const input = path.join(temp, 'input');
  const output = path.join(temp, 'final');
  const pkg = { version: '2.5.0' };
  try {
    populateExpected(input);
    const manifest = releaseArtifacts.collectArtifacts(input, output, {
      pkg,
      sourceCommit: '0123456789abcdef',
      tag: 'v2.5.0'
    });
    assert.strictEqual(manifest.version, '2.5.0');
    assert.strictEqual(manifest.windowsSigning, 'unsigned');
    assert.strictEqual(manifest.artifacts.length, 8);
    assert(fs.existsSync(path.join(output, 'SHA256SUMS.txt')));
    assert(fs.existsSync(path.join(output, 'release-manifest.json')));
    assert(fs.existsSync(path.join(output, 'RELEASE-VERIFICATION.md')));
    assert.strictEqual(releaseArtifacts.verifyChecksums(output), true);

    fs.appendFileSync(path.join(output, 'SafeLedger-2.5.0-Portable.exe'), 'tamper');
    assert.throws(() => releaseArtifacts.verifyChecksums(output), /mismatch/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function testDuplicateAndMissingArtifactsFailClosed() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-release-duplicates-'));
  const input = path.join(temp, 'input');
  try {
    populateExpected(input);
    writeDummy(path.join(input, 'duplicate', 'SafeLedger-2.5.0-Portable.exe'), 'two');
    assert.throws(
      () => releaseArtifacts.collectArtifacts(input, path.join(temp, 'out'), { pkg: { version: '2.5.0' } }),
      /exactly once/
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function testLegalAndPackagingSurface() {
  for (const file of releasePolicy.REQUIRED_FILES) {
    assert(fs.existsSync(path.join(root, file)), `Missing required trust file: ${file}`);
  }
  const license = read('LICENSE');
  assert(license.includes('Apache License'));
  assert(license.includes('Version 2.0, January 2004'));
  assert(license.includes('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION'));
  const notice = read('NOTICE');
  assert(notice.includes('SafeLedger'));
  assert(notice.includes('Cborgtech'));
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.build.files.includes('LICENSE'));
  assert(pkg.build.files.includes('NOTICE'));
  assert(pkg.build.files.includes('THIRD-PARTY-NOTICES.md'));
}

function testReleaseWorkflowTrustBoundary() {
  const workflow = read('.github/workflows/release.yml');
  assert(workflow.includes("tags:\n      - 'v*.*.*'"));
  assert(!workflow.includes('pull_request_target'));
  assert(!workflow.includes('pull_request:'));
  assert(workflow.includes('permissions:\n  contents: read'));
  assert.strictEqual((workflow.match(/contents: write/g) || []).length, 1, 'only publish job may have contents: write');
  assert(workflow.includes('id-token: write'));
  assert(workflow.includes('attestations: write'));
  assert(!/uses:\s+[^\n]+@v\d/.test(workflow), 'release-critical Actions must be pinned to full SHAs');
  assert(workflow.includes('branches/master/protection'));
  assert(workflow.includes('Official SafeLedger publishing requires branch protection on master.'));
  assert(workflow.includes('SAFELEDGER_WINDOWS_PFX_BASE64'));
  assert(workflow.includes('SAFELEDGER_WINDOWS_PFX_PASSWORD'));
  const signingMarker = '- name: Apply optional Authenticode signing';
  const buildStart = workflow.indexOf('  build-windows:');
  const signingStart = workflow.indexOf(signingMarker);
  assert(buildStart >= 0 && signingStart > buildStart);
  assert(!workflow.slice(buildStart, signingStart).includes('SAFELEDGER_WINDOWS_PFX_'), 'signing secrets must not be job-scoped or exposed to build/test steps');
  assert(workflow.includes('needs: attest-artifacts'));
  assert(workflow.includes('gh release create'));
  assert(workflow.includes('node scripts/release-artifacts.js verify release/final'));
  assert(workflow.includes('THIRD-PARTY-NOTICES.md'));
  assert(workflow.includes('RELEASE-VERIFICATION.md'));
}

function testNormalCiPins() {
  for (const file of ['.github/workflows/windows-portable.yml', '.github/workflows/linux-appimage.yml']) {
    const workflow = read(file);
    assert(!/uses:\s+[^\n]+@v\d/.test(workflow), `${file} contains a movable Action tag`);
    assert(workflow.includes('permissions:\n  contents: read'));
  }
}

function testNoProductSecurityScopeChange() {
  const releasePlan = read('RELEASE-2.5.md');
  assert(releasePlan.includes('must not change'));
  assert(releasePlan.includes('AES-256-GCM'));
  assert(releasePlan.includes('Argon2id'));
  assert(releasePlan.includes('SafeLedgerData'));
  assert(releasePlan.includes('Privacy Mode'));
}

testTagPolicy();
testArtifactCollectionAndVerification();
testDuplicateAndMissingArtifactsFailClosed();
testLegalAndPackagingSurface();
testReleaseWorkflowTrustBoundary();
testNormalCiPins();
testNoProductSecurityScopeChange();

console.log('PASS SafeLedger 2.5 distribution trust, release-policy, checksum, legal, and publishing-boundary tests.');
