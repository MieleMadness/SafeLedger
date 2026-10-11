'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const trust = require('./generate-release-trust');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

const sbom = trust.buildSbom(pkg, lock);
assert.strictEqual(sbom.bomFormat, 'CycloneDX');
assert.strictEqual(sbom.specVersion, '1.5');
assert(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sbom.serialNumber),
  'CycloneDX SBOM must include the serialNumber required by GitHub SBOM attestations.');
assert.strictEqual(sbom.serialNumber, trust.buildSbom(pkg, lock).serialNumber,
  'CycloneDX serialNumber must be deterministic for the same locked dependency graph.');
assert.strictEqual(sbom.metadata.component.name, 'SafeLedger');
assert(Array.isArray(sbom.components) && sbom.components.length > 10,
  'SBOM must enumerate the locked dependency graph rather than only top-level packages.');
assert(sbom.components.some((component) => component.name === 'electron'));
assert(sbom.components.some((component) => component.name === 'hash-wasm'));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-release-trust-'));
try {
  const artifact = path.join(temp, 'SafeLedger-test.bin');
  const outputDir = path.join(temp, 'release');
  fs.writeFileSync(artifact, Buffer.from('SafeLedger Phase 5 release trust fixture', 'utf8'));
  const expected = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
  const result = trust.generate({
    artifact,
    outputDir,
    platform: 'test-os',
    architecture: 'test-arch',
    sourceCommit: '0123456789abcdef0123456789abcdef01234567',
    rootDir: root
  });
  assert.strictEqual(result.digest, expected);
  assert.strictEqual(fs.readFileSync(result.checksumFile, 'utf8'), `${expected}  SafeLedger-test.bin\n`);

  const manifest = JSON.parse(fs.readFileSync(result.manifestFile, 'utf8'));
  assert.strictEqual(manifest.version, pkg.version);
  assert.strictEqual(manifest.sha256, expected);
  assert.strictEqual(manifest.sourceCommit, '0123456789abcdef0123456789abcdef01234567');
  assert.strictEqual(manifest.verification.algorithm, 'SHA-256');

  const writtenSbom = JSON.parse(fs.readFileSync(result.sbomFile, 'utf8'));
  assert.strictEqual(writtenSbom.bomFormat, 'CycloneDX');
  assert.strictEqual(writtenSbom.specVersion, '1.5');
  assert.strictEqual(writtenSbom.serialNumber, sbom.serialNumber);
  assert.strictEqual(writtenSbom.metadata.component.version, pkg.version);
  assert(writtenSbom.components.length === sbom.components.length);

  console.log('PASS SafeLedger Phase 5 release trust: artifact SHA-256, source-bound manifest, GitHub-attestable CycloneDX SBOM, and locked dependencies are deterministic.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
