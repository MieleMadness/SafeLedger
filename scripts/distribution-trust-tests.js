'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const releasePolicy = require('./release-policy');
const releaseArtifacts = require('./release-artifacts');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

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

function testArtifactCollectionAndVerification() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-release-test-'));
  const input = path.join(temp, 'input');
  const output = path.join(temp, 'final');
  const pkg = { version: '2.5.0' };
  try {
    writeDummy(path.join(input, 'windows', 'SafeLedger-2.5.0-Portable.exe'), 'windows');
    writeDummy(path.join(input, 'windows', 'README.pdf'), 'pdf');
    writeDummy(path.join(input, 'windows', 'WINDOWS-SIGNING.txt'), 'unsigned\n');
    writeDummy(path.join(input, 'linux', 'SafeLedger-2.5.0-x86_64.AppImage'), 'linux');
    writeDummy(path.join(input, 'sbom', 'safeledger-2.5.0.cdx.json'), '{"bomFormat":"CycloneDX"}\n');
    const manifest = releaseArtifacts.collectArtifacts(input, output, {
      pkg,
      sourceCommit: '0123456789abcdef',
      tag: 'v2.5.0'
    });
    assert.strictEqual(manifest.version, '2.5.0');
    assert.strictEqual(manifest.windowsSigning, 'unsigned');
    assert.strictEqual(manifest.artifacts.length, 4);
    assert(fs.existsSync(path.join(output, 'SHA256SUMS.txt')));
    assert(fs.existsSync(path.join(output, 'release-manifest.json')));
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
    writeDummy(path.join(input, 'a', 'SafeLedger-2.5.0-Portable.exe'), 'one');
    writeDummy(path.join(input, 'b', 'SafeLedger-2.5.0-Portable.exe'), 'two');
    writeDummy(path.join(input, 'a', 'README.pdf'), 'pdf');
    writeDummy(path.join(input, 'a', 'SafeLedger-2.5.0-x86_64.AppImage'), 'linux');
    writeDummy(path.join(input, 'a', 'safeledger-2.5.0.cdx.json'), '{}');
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
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.build.files.includes('LICENSE'));
  assert(pkg.build.files.includes('NOTICE'));
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
  assert(workflow.includes('SAFELEDGER_WINDOWS_PFX_BASE64'));
  assert(workflow.includes('SAFELEDGER_WINDOWS_PFX_PASSWORD'));
  assert(workflow.includes('needs: attest-artifacts'));
  assert(workflow.includes('gh release create'));
  assert(workflow.includes('node scripts/release-artifacts.js verify release/final'));
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
testNoProductSecurityScopeChange();

console.log('PASS SafeLedger 2.5 distribution trust, release-policy, checksum, legal, and publishing-boundary tests.');
