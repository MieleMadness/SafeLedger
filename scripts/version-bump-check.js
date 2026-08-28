'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

function parse(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version || ''));
  if (!match) throw new Error(`Invalid SafeLedger version: ${version}`);
  return match.slice(1).map(Number);
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

let parent;
try {
  parent = JSON.parse(execFileSync('git', ['show', 'HEAD^:package.json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })).version;
} catch (err) {
  console.log(`SKIP version continuity check: parent package.json is unavailable (${err.message}).`);
  process.exit(0);
}

const result = compare(parse(current), parse(parent));
if (result < 0) {
  throw new Error(`SafeLedger version may not move backward. Parent=${parent}, current=${current}`);
}
if (result === 0) {
  console.log(`PASS SafeLedger version unchanged for a non-release change: ${current}`);
} else {
  console.log(`PASS SafeLedger version increased: ${parent} -> ${current}`);
}
