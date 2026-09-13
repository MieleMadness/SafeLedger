'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CANONICAL_SUITES, isHistoricalTestFile } = require('./regression-suite');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const regressionCommand = String(pkg.scripts && pkg.scripts['test:regression'] || '');

assert(regressionCommand.includes('node scripts/run-regression-suite.js'), 'Main regression command must use the canonical suite runner.');
assert(!/(?:hotfix|development)-\d+\.\d+\.\d+-tests\.js/.test(regressionCommand),
  'Patch-numbered historical tests must not execute directly from test:regression.');
assert(!/release-\d+\.\d+-tests\.js/.test(regressionCommand),
  'Release-numbered historical tests must not execute directly from test:regression.');

for (const [name, command] of Object.entries(pkg.scripts || {})) {
  if (!name.startsWith('test:')) continue;
  assert(!/(?:hotfix|development)-\d+\.\d+\.\d+-tests\.js/.test(String(command)),
    `${name} must not call a patch-numbered historical gate.`);
}

const seen = new Set();
for (const suite of CANONICAL_SUITES) {
  assert(suite && suite.name && suite.file, 'Canonical suite entries require a name and file.');
  assert(!isHistoricalTestFile(path.basename(suite.file)), `Historical test listed as canonical: ${suite.file}`);
  assert(!seen.has(suite.file), `Duplicate canonical test entry: ${suite.file}`);
  seen.add(suite.file);
  assert(fs.existsSync(path.join(root, suite.file)), `Canonical test file is missing: ${suite.file}`);
}
assert(seen.has('scripts/current-product-contract-tests.js'));
assert(seen.has('scripts/release-trust-contract-tests.js'));
assert(seen.has('scripts/distribution-trust-tests.js'));
assert(seen.has('scripts/data-ownership-tests.js'));
assert(seen.has('scripts/recovery-confidence-tests.js'));
assert(seen.has('scripts/ui-consolidation-tests.js'));
assert(seen.has('scripts/repository-hygiene-tests.js'));

const scriptFiles = fs.readdirSync(path.join(root, 'scripts')).filter((name) => name.endsWith('.js'));
const historical = scriptFiles.filter(isHistoricalTestFile);
assert(historical.length > 20, 'Historical regression archive unexpectedly disappeared; Phase 1 archives rather than mass-deletes evidence.');
for (const file of historical) assert(!seen.has(`scripts/${file}`), `Archived historical test leaked into canonical suite: ${file}`);

for (const workflow of ['windows-portable.yml', 'linux-appimage.yml', 'macos-arm64.yml']) {
  const source = read(`.github/workflows/${workflow}`);
  assert(source.includes('node scripts/release-trust-contract-tests.js'), `${workflow} must use the canonical release trust contract.`);
  assert(!source.includes('node scripts/hotfix-2.6.53-tests.js'), `${workflow} still uses the retired patch-numbered Phase 5 gate.`);
}

const auditRaw = execFileSync(process.execPath, [path.join(root, 'scripts/dead-code-audit.js'), '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
});
const audit = JSON.parse(auditRaw);
assert.deepStrictEqual(audit.roots, ['src/main/bootstrap.js', 'src/main/preload.js', 'src/main/renderer-entry.js']);
assert(Array.isArray(audit.unreachableJavascript));
assert(Array.isArray(audit.unlinkedCss));
assert(Array.isArray(audit.unreferencedAssets));
assert(audit.note.includes('not safe to delete'), 'Dead-code audit must remain advisory rather than deleting by static analysis alone.');
for (const canonicalCss of [
  'src/main/css/app.css',
  'src/main/css/site.css',
  'src/main/css/ui-current.css',
  'src/main/css/appearance-palettes.css',
  'src/main/css/recovery-binder.css'
]) {
  assert(!audit.unlinkedCss.includes(canonicalCss), `${canonicalCss} must remain reachable through the current stylesheet ownership graph.`);
}

for (const relative of [
  'scripts/regression-suite.js',
  'scripts/run-regression-suite.js',
  'scripts/current-product-contract-tests.js',
  'scripts/release-trust-contract-tests.js',
  'scripts/repository-hygiene-tests.js',
  'scripts/dead-code-audit.js',
  'scripts/test-architecture-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger test architecture runs ${CANONICAL_SUITES.length} durable behavior suites while preserving ${historical.length} patch/release gates as non-executing historical evidence.`);
