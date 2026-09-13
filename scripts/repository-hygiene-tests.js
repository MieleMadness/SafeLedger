'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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

const auditRaw = execFileSync(process.execPath, [path.join(root, 'scripts/dead-code-audit.js'), '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
});
const audit = JSON.parse(auditRaw);
assert(!audit.unreachableJavascript.includes('src/main/logger.js'),
  'Removed legacy logger must not remain in the runtime dead-code candidate list.');
assert(!audit.unlinkedCss.includes('src/main/css/recovery-binder.css'),
  'Dead-code audit must recognize CSS loaded dynamically by reachable renderer code.');

execFileSync(process.execPath, ['--check', path.join(root, 'scripts/dead-code-audit.js')], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', path.join(root, 'scripts/repository-hygiene-tests.js')], { stdio: 'pipe' });

console.log('PASS repository hygiene removes verified orphaned runtime code while preserving dynamically referenced Recovery Binder CSS.');
