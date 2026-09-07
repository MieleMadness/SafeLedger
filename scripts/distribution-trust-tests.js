'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const releasePolicy = require('./release-policy');
const releaseArtifacts = require('./release-artifacts');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const ATTEST_ACTION = 'actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6';

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

function testBuildWorkflowTrustBoundary() {
  const workflowDir = path.join(root, '.github', 'workflows');
  const active = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
  assert.deepStrictEqual(
    active,
    ['linux-appimage.yml', 'macos-arm64.yml', 'windows-portable.yml'],
    'Only the Windows Portable, Linux AppImage, and macOS Apple Silicon validation workflows should be active.'
  );

  for (const file of active) {
    const workflow = read(path.join('.github', 'workflows', file));
    assert(workflow.includes('workflow_dispatch:'), `${file} must support manual runs`);
    assert(workflow.includes('pull_request:\n    branches:\n      - master'), `${file} must validate pull requests targeting master`);
    assert(!workflow.includes('pull_request_target'), `${file} must not use pull_request_target`);
    assert(workflow.includes('permissions:\n  contents: read'), `${file} must keep repository contents read-only`);
    assert(workflow.includes('id-token: write') && workflow.includes('attestations: write'),
      `${file} must grant only the additional GitHub permissions required to publish attestations.`);
    assert(!workflow.includes('contents: write'), `${file} must not publish or mutate repository contents`);
    assert(!workflow.includes('version-bump-check.js'), `${file} must not dictate SafeLedger product versioning`);
    assert(!/uses:\s+[^\n]+@v\d/.test(workflow), `${file} contains a movable Action tag`);
    assert(workflow.includes(ATTEST_ACTION), `${file} must pin the GitHub attestation action by immutable commit SHA`);
    assert(workflow.includes('subject-path:'), `${file} must attest the packaged application artifact`);
    assert(workflow.includes('sbom-path:'), `${file} must attach the generated SBOM as a GitHub attestation`);
    assert(workflow.includes("github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository"),
      `${file} must skip write attestations for untrusted fork pull requests.`);
    assert(workflow.includes('npm run test:regression'), `${file} must run regression tests`);
    assert(workflow.includes('npm run test:electron-crypto'), `${file} must run crypto smoke tests`);
    assert(workflow.includes('npm run test:gui-smoke'), `${file} must run GUI smoke tests`);
    assert(workflow.includes('"${{ github.sha }}"') || workflow.includes("'${{ github.sha }}'"),
      `${file} release manifest must bind to the exact checked-out build commit.`);
    assert(!workflow.includes('github.event.pull_request.head.sha || github.sha'),
      `${file} must not label a PR head SHA as the build commit when Actions checked out a merge commit.`);
  }

  const windows = read('.github/workflows/windows-portable.yml');
  const linux = read('.github/workflows/linux-appimage.yml');
  const mac = read('.github/workflows/macos-arm64.yml');

  assert(windows.includes('push:\n    branches:\n      - master'));
  assert(windows.includes('npm run dist:win'));
  assert(windows.includes('name: SafeLedger-Windows-Portable'));
  assert(windows.includes('path: release/windows/app/*'));
  assert(windows.includes('name: SafeLedger-Windows-Verification'));
  assert(windows.includes('path: release/windows/verification/*'));

  assert(linux.includes('push:\n    branches:\n      - master'));
  assert(linux.includes('npm run dist:linux'));
  assert(linux.includes('name: SafeLedger-Linux-AppImage'));
  assert(linux.includes('path: release/linux/app/*'));
  assert(linux.includes('name: SafeLedger-Linux-Verification'));
  assert(linux.includes('path: release/linux/verification/*'));

  assert(mac.includes('runs-on: macos-15'), 'macOS validation must run natively on a GitHub-hosted Apple Silicon runner.');
  assert(mac.includes('safeledger-2.6.1-development'), '2.6.1 development pushes must exercise the macOS workflow.');
  assert(mac.includes('uname -m'), 'macOS workflow must verify runner architecture.');
  assert(mac.includes('process.arch'), 'macOS workflow must verify Node is running as arm64.');
  assert(mac.includes('CSC_IDENTITY_AUTO_DISCOVERY: "false"'), '2.6.1 CI must not require Apple signing credentials.');
  assert(mac.includes('npm run dist:mac:arm64'), 'macOS workflow must build the native arm64 ZIP.');
  assert(mac.includes('lipo -archs'), 'macOS workflow must verify the packaged executable architecture.');
  assert(mac.includes('name: SafeLedger-macOS-arm64'));
  assert(mac.includes('path: release/macos/app/*'));
  assert(mac.includes('name: SafeLedger-macOS-arm64-Verification'));
  assert(mac.includes('path: release/macos/verification/*'));
}

function testSbomGeneration() {
  const npmCli = process.env.npm_execpath;
  assert(npmCli && fs.existsSync(npmCli), 'npm_execpath must point to the active npm CLI');
  const output = execFileSync(process.execPath, [npmCli, 'sbom', '--sbom-format=cyclonedx'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const sbom = JSON.parse(output);
  assert.strictEqual(sbom.bomFormat, 'CycloneDX');
  assert(sbom.metadata && sbom.metadata.component, 'SBOM must describe the SafeLedger root component');
}

function testNoProductSecurityScopeChange() {
  const releasePlan = read('RELEASE-2.6.md');
  assert(releasePlan.includes('does not intentionally change'));
  assert(releasePlan.includes('AES-256-GCM'));
  assert(releasePlan.includes('Argon2id'));
  assert(releasePlan.includes('SafeLedgerData'));
  assert(releasePlan.includes('Privacy Mode'));
}

testTagPolicy();
testArtifactCollectionAndVerification();
testDuplicateAndMissingArtifactsFailClosed();
testLegalAndPackagingSurface();
testBuildWorkflowTrustBoundary();
testSbomGeneration();
testNoProductSecurityScopeChange();

console.log('PASS SafeLedger distribution trust, clean user downloads, separate verification artifacts, GitHub attestations, SBOM, checksum, legal, and three-platform validation workflow tests.');
