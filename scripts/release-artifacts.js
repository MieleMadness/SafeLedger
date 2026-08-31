'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function walkFiles(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function expectedNames(version) {
  return [
    `SafeLedger-${version}-Portable.exe`,
    `SafeLedger-${version}-x86_64.AppImage`,
    'README.pdf',
    `safeledger-${version}.cdx.json`
  ];
}

function collectArtifacts(inputDir, outputDir, options = {}) {
  const pkg = options.pkg || JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const version = pkg.version;
  const files = walkFiles(inputDir);
  const byName = new Map();
  for (const file of files) {
    const name = path.basename(file);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(file);
  }

  const expected = expectedNames(version);
  for (const name of expected) {
    const matches = byName.get(name) || [];
    if (matches.length !== 1) {
      throw new Error(`${name} must appear exactly once; found ${matches.length}.`);
    }
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  for (const name of expected) fs.copyFileSync(byName.get(name)[0], path.join(outputDir, name));

  const signingFiles = byName.get('WINDOWS-SIGNING.txt') || [];
  let windowsSigning = 'unsigned';
  if (signingFiles.length > 1) throw new Error('WINDOWS-SIGNING.txt must not appear more than once.');
  if (signingFiles.length === 1) {
    windowsSigning = fs.readFileSync(signingFiles[0], 'utf8').trim() || 'unsigned';
    fs.copyFileSync(signingFiles[0], path.join(outputDir, 'WINDOWS-SIGNING.txt'));
  }

  const sourceCommit = options.sourceCommit || process.env.GITHUB_SHA || 'unknown';
  const tag = options.tag || process.env.GITHUB_REF_NAME || `v${version}`;
  const manifest = {
    schemaVersion: 1,
    product: 'SafeLedger',
    version,
    tag,
    sourceCommit,
    windowsSigning,
    artifacts: expected.map((name) => ({
      name,
      sha256: sha256File(path.join(outputDir, name)),
      bytes: fs.statSync(path.join(outputDir, name)).size
    }))
  };
  fs.writeFileSync(path.join(outputDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const checksumNames = expected.concat('release-manifest.json');
  const sums = checksumNames
    .map((name) => `${sha256File(path.join(outputDir, name))}  ${name}`)
    .join('\n');
  fs.writeFileSync(path.join(outputDir, 'SHA256SUMS.txt'), `${sums}\n`);
  verifyChecksums(outputDir);
  return manifest;
}

function verifyChecksums(dir) {
  const file = path.join(dir, 'SHA256SUMS.txt');
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const seen = new Set();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!match) throw new Error(`Malformed checksum line: ${line}`);
    const [, expected, name] = match;
    if (seen.has(name)) throw new Error(`Duplicate checksum entry: ${name}`);
    seen.add(name);
    const target = path.join(dir, name);
    if (!fs.existsSync(target)) throw new Error(`Checksum target is missing: ${name}`);
    const actual = sha256File(target);
    if (actual !== expected) throw new Error(`Checksum mismatch for ${name}.`);
  }
  return true;
}

if (require.main === module) {
  const [command, input, output] = process.argv.slice(2);
  if (command === 'collect') {
    if (!input || !output) throw new Error('Usage: node scripts/release-artifacts.js collect <download-dir> <output-dir>');
    const manifest = collectArtifacts(path.resolve(input), path.resolve(output));
    console.log(`PASS collected ${manifest.artifacts.length} release artifacts for SafeLedger ${manifest.version}.`);
  } else if (command === 'verify') {
    if (!input) throw new Error('Usage: node scripts/release-artifacts.js verify <release-dir>');
    verifyChecksums(path.resolve(input));
    console.log('PASS release checksums verified.');
  } else {
    throw new Error(`Unknown release-artifacts command: ${command || '(missing)'}`);
  }
}

module.exports = { sha256File, expectedNames, collectArtifacts, verifyChecksums };
