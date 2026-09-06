'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const index = read('src/main/index.html');
const runtimeGate = read('scripts/runtime-modernization-tests.js');
const gate2639 = read('scripts/hotfix-2.6.39-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 40,
  'SafeLedger 2.6.40 punctuation-free Asset-search correction must remain active on 2.6.40 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.40-tests.js'),
  '2.6.40 punctuation-free Asset-search correction must stay in the locked regression suite.');

assert(runtimeGate.includes("index.includes('id=\"recordSearch\"')"),
  'Runtime modernization must still protect the existence of the Asset search control.');
assert(runtimeGate.includes("placeholder=\"Search assets\""),
  'Runtime modernization must accept the current punctuation-free Asset search wording.');
assert(!runtimeGate.includes("assert(index.includes('Search assets...'))"),
  'The runtime-modernization gate must not freeze the retired Asset search ellipsis.');
assert(index.includes('placeholder="Search assets"'));
assert(!index.includes('placeholder="Search assets..."'));
assert(gate2639.includes('parts[2] >= 39'),
  'The 2.6.39 Recovery Validation roadmap correction must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} carries the 2.6.40 punctuation-free Asset-search behavior on later patch candidates.`);
