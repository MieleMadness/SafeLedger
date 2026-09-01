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

const [currentMajor, currentMinor, currentPatch] = parse(current);
const [parentMajor, parentMinor, parentPatch] = parse(parent);
const isNextPatch = currentMajor === parentMajor && currentMinor === parentMinor && currentPatch === parentPatch + 1;

if (!isNextPatch) {
  throw new Error(`SafeLedger releases must increase the patch version by exactly one. Parent=${parent}, current=${current}`);
}

console.log(`PASS SafeLedger patch version increased by exactly one: ${parent} -> ${current}`);
