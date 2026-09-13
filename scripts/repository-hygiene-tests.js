'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CANONICAL_SUITES } = require('./regression-suite');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const exists = (relative) => fs.existsSync(path.join(root, relative));

assert.strictEqual(exists('src/main/logger.js'), false,
  'The orphaned legacy file logger must stay removed; current SafeLedger auditing is owned by the sanitized security audit path.');

const recoveryBinderUi = read('src/main/recovery-binder-ui.js');
assert(exists('src/main/css/recovery-binder.css'),
  'Recovery Binder styles are dynamically loaded by the renderer and must not be mistaken for dead CSS.');
assert(recoveryBinderUi.includes("link.href = 'css/recovery-binder.css';"),
  'Recovery Binder must retain its explicit runtime stylesheet reference while it owns that dynamic style layer.');

const legacySettingsPath = ['installManager', 'installManager', 'settingsManager'].join('/');
const legacySettingsFile = `src/main/${legacySettingsPath}.js`;
assert(exists('src/main/settings-manager.js'), 'Canonical settings manager must live at src/main/settings-manager.js.');
assert.strictEqual(exists(legacySettingsFile), false,
  'The retired double-nested settings manager path must not return as a shim or duplicate implementation.');

function walkJs(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJs(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const activeSources = new Set([
  ...walkJs(path.join(root, 'src', 'main')).map((file) => path.relative(root, file).split(path.sep).join('/')),
  ...CANONICAL_SUITES.map((suite) => suite.file)
]);
for (const relative of activeSources) {
  const source = read(relative);
  assert(!source.includes(legacySettingsPath), `${relative} still references the retired nested settings manager path.`);
}

const main = read('src/main/main.js');
assert(main.includes("const settingsManager = require('./settings-manager');"),
  'Trusted main-process settings ownership must use the canonical settings-manager module directly.');

const auditRaw = execFileSync(process.execPath, [path.join(root, 'scripts/dead-code-audit.js'), '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
});
const audit = JSON.parse(auditRaw);
assert(!audit.unreachableJavascript.includes('src/main/logger.js'),
  'Removed legacy logger must not remain in the runtime dead-code candidate list.');
assert(!audit.unreachableJavascript.includes('src/main/settings-manager.js'),
  'Canonical settings manager must remain reachable from the trusted main-process runtime graph.');
assert(!audit.unlinkedCss.includes('src/main/css/recovery-binder.css'),
  'Dead-code audit must recognize CSS loaded dynamically by reachable renderer code.');

for (const relative of [
  'src/main/settings-manager.js',
  'scripts/dead-code-audit.js',
  'scripts/repository-hygiene-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS repository hygiene removes verified orphaned paths, preserves dynamic Recovery Binder CSS, and keeps settings ownership on the canonical top-level module.');
