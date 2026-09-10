'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 65, 'The 2.6.65 Settings navigation and SafeLedger 1.x file-selection contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.65-tests.js'));

const settings = read('src/main/settings-ui.js');
const securityMain = read('src/main/security-main.js');
const legacyImportSource = read('src/main/legacy-import.js');
const priorGate = read('scripts/hotfix-2.6.64-tests.js');
const release = read('RELEASE-2.6.65.md');
const legacyImport = require('../src/main/legacy-import.js');

assert(settings.includes('function resetDetailScroll(area)'));
assert(settings.includes("area.closest('.content-middle')"), 'Settings must reset the actual scroll-owning detail column.');
assert(settings.includes('if (scrollHost) scrollHost.scrollTop = 0;'));
assert(settings.indexOf('resetDetailScroll(area);') > settings.indexOf('renderPasswordSection(area);'),
  'Settings must reset scroll after its full page is rendered.');
assert(settings.includes('Choose 1.x Data File'));
assert(settings.includes('vaultlist.json or any zvault-#.json'));
assert(settings.includes('No SafeLedger 1.x data file selected.'));

assert(securityMain.includes("title: 'Select SafeLedger 1.x Data File'"));
assert(securityMain.includes("properties: ['openFile']"));
assert(securityMain.includes("filters: [{ name: 'SafeLedger 1.x Data', extensions: ['json'] }]"));
assert(securityMain.includes('legacyImport.resolveLegacySourceSelection(selection.filePaths[0])'));
assert(!securityMain.includes("title: 'Choose SafeLedger 1.x Data Folder'"),
  'The legacy import UI must not return to a directory-only chooser that hides files.');
assert(legacyImportSource.includes('function resolveLegacySourceSelection(selectedPath)'));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-265-legacy-'));
try {
  const parent = path.join(temp, 'old-install');
  const legacyDir = path.join(parent, 'safeledgerdata');
  fs.mkdirSync(legacyDir, { recursive: true });
  const listFile = path.join(legacyDir, 'vaultlist.json');
  const vaultFile = path.join(legacyDir, 'zvault-0.json');
  const unrelatedFile = path.join(legacyDir, 'notes.json');
  fs.writeFileSync(listFile, 'fixture');
  fs.writeFileSync(vaultFile, 'fixture');
  fs.writeFileSync(unrelatedFile, 'fixture');

  assert.strictEqual(legacyImport.resolveLegacySourceSelection(legacyDir), legacyDir);
  assert.strictEqual(legacyImport.resolveLegacySourceSelection(parent), legacyDir,
    'Folder selection remains accepted internally for compatibility.');
  assert.strictEqual(legacyImport.resolveLegacySourceSelection(listFile), legacyDir,
    'Selecting vaultlist.json should resolve the complete legacy folder.');
  assert.strictEqual(legacyImport.resolveLegacySourceSelection(vaultFile), legacyDir,
    'Selecting any legacy zvault file should resolve the complete legacy folder.');
  assert.throws(() => legacyImport.resolveLegacySourceSelection(unrelatedFile), /vaultlist\.json|zvault-#\.json/);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

assert(priorGate.includes('parts[2] >= 64') || priorGate.includes('versionParts[2] >= 64'),
  'The 2.6.64 cross-platform icon-registry gate must remain future-compatible.');
assert(release.includes('scroll'));
assert(release.includes('vaultlist.json'));
assert(release.includes('original 1.x files remain unchanged'));

for (const relative of [
  'src/main/settings-ui.js',
  'src/main/security-main.js',
  'src/main/legacy-import.js',
  'scripts/hotfix-2.6.65-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} opens Settings at the top and lets users visibly select SafeLedger 1.x JSON data files without weakening legacy import validation.`);
