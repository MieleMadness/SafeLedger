'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function deterministicUuid(value) {
  const bytes = Buffer.from(crypto.createHash('sha256').update(String(value)).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function packageNameFromPath(packagePath) {
  const normalized = String(packagePath || '').replace(/\\/g, '/');
  const marker = '/node_modules/';
  const idx = normalized.lastIndexOf(marker);
  let name = idx >= 0 ? normalized.slice(idx + marker.length) : normalized.replace(/^node_modules\//, '');
  if (!name) return '';
  const parts = name.split('/');
  return parts[0] && parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function buildSbom(pkg, lock) {
  const components = [];
  const seen = new Set();
  for (const [packagePath, meta] of Object.entries((lock && lock.packages) || {})) {
    if (!packagePath || !meta || !meta.version) continue;
    const name = packageNameFromPath(packagePath);
    if (!name) continue;
    const key = `${name}@${meta.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    components.push({
      type: 'library',
      name,
      version: String(meta.version),
      scope: meta.dev === true ? 'optional' : 'required',
      purl: `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(String(meta.version))}`
    });
  }
  components.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
  const identity = JSON.stringify({
    name: pkg.name || pkg.productName || 'SafeLedger',
    version: String(pkg.version || ''),
    lockfileVersion: lock && lock.lockfileVersion,
    packages: (lock && lock.packages) || {}
  });
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${deterministicUuid(identity)}`,
    version: 1,
    metadata: {
      component: {
        type: 'application',
        name: pkg.productName || pkg.name || 'SafeLedger',
        version: String(pkg.version || '')
      }
    },
    components
  };
}

function generate({ artifact, outputDir, platform, architecture, sourceCommit, rootDir = path.join(__dirname, '..') }) {
  if (!artifact || !fs.existsSync(artifact) || !fs.statSync(artifact).isFile()) throw new Error('Release artifact does not exist.');
  if (!outputDir || !platform || !architecture) throw new Error('Release trust metadata requires output directory, platform, and architecture.');
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf8'));
  fs.mkdirSync(outputDir, { recursive: true });

  const artifactName = path.basename(artifact);
  const digest = sha256File(artifact);
  const stem = `SafeLedger-${pkg.version}-${platform}-${architecture}`;
  const checksumFile = path.join(outputDir, `${artifactName}.sha256`);
  const sbomFile = path.join(outputDir, `${stem}-SBOM.cdx.json`);
  const manifestFile = path.join(outputDir, `${stem}-release-manifest.json`);
  const commit = String(sourceCommit || process.env.SAFELEDGER_SOURCE_SHA || process.env.GITHUB_SHA || '').trim();

  fs.writeFileSync(checksumFile, `${digest}  ${artifactName}\n`, 'utf8');
  fs.writeFileSync(sbomFile, `${JSON.stringify(buildSbom(pkg, lock), null, 2)}\n`, 'utf8');
  fs.writeFileSync(manifestFile, `${JSON.stringify({
    schemaVersion: 1,
    product: pkg.productName || 'SafeLedger',
    version: pkg.version,
    platform,
    architecture,
    artifact: artifactName,
    sha256: digest,
    sourceCommit: commit || null,
    verification: {
      checksumFile: path.basename(checksumFile),
      sbomFile: path.basename(sbomFile),
      algorithm: 'SHA-256'
    }
  }, null, 2)}\n`, 'utf8');

  return { digest, checksumFile, sbomFile, manifestFile };
}

if (require.main === module) {
  const [artifact, outputDir, platform, architecture, sourceCommit] = process.argv.slice(2);
  try {
    const result = generate({ artifact, outputDir, platform, architecture, sourceCommit });
    console.log(`PASS release trust metadata: ${path.basename(artifact)} sha256=${result.digest}`);
  } catch (err) {
    console.error(`FAIL release trust metadata: ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
}

module.exports = { sha256File, deterministicUuid, packageNameFromPath, buildSbom, generate };
