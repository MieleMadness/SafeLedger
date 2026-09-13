'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CANONICAL_SUITES, isHistoricalTestFile } = require('./regression-suite');

const root = path.join(__dirname, '..');

function validateManifest() {
  const seen = new Set();
  for (const suite of CANONICAL_SUITES) {
    if (!suite || !suite.name || !suite.file) throw new Error('Regression manifest contains an invalid suite entry.');
    const base = path.basename(suite.file);
    if (isHistoricalTestFile(base)) throw new Error(`Historical patch gate cannot be canonical: ${suite.file}`);
    if (seen.has(suite.file)) throw new Error(`Duplicate canonical regression suite: ${suite.file}`);
    seen.add(suite.file);
    if (!fs.existsSync(path.join(root, suite.file))) throw new Error(`Canonical regression suite is missing: ${suite.file}`);
  }
  return seen;
}

function run() {
  validateManifest();
  if (process.argv.includes('--list')) {
    for (const suite of CANONICAL_SUITES) console.log(`${suite.name}: ${suite.file}`);
    return;
  }

  const started = Date.now();
  console.log(`Running ${CANONICAL_SUITES.length} canonical SafeLedger regression suites...`);
  CANONICAL_SUITES.forEach((suite, index) => {
    const label = `[${String(index + 1).padStart(2, '0')}/${CANONICAL_SUITES.length}] ${suite.name}`;
    console.log(`\n${label}`);
    execFileSync(process.execPath, [path.join(root, suite.file)], {
      cwd: root,
      stdio: 'inherit',
      env: process.env
    });
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nPASS ${CANONICAL_SUITES.length} canonical SafeLedger regression suites in ${seconds}s.`);
}

try {
  run();
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}

module.exports = { validateManifest };
