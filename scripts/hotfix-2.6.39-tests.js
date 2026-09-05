'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const roadmap = read('scripts/roadmap-regression-tests.js');
const drill = read('src/main/recovery-drill-ui.js');
const gate2638 = read('scripts/hotfix-2.6.38-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 39,
  'SafeLedger 2.6.39 Recovery Validation roadmap correction must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.39-tests.js'),
  '2.6.39 Recovery Validation roadmap correction must stay in the locked regression suite.');

assert(roadmap.includes("recoveryDrillUi.includes(\"title: 'Complete Recovery Validation'\")"),
  'The roadmap regression must follow the current Recovery Validation action name.');
assert(!roadmap.includes("recoveryDrillUi.includes(\"title: 'Complete recovery drill'\")"),
  'The roadmap gate must not freeze the retired completion tooltip.');
assert(drill.includes("title: 'Complete Recovery Validation'"));
assert(drill.includes("title: 'Cancel Recovery Validation'"));
assert(drill.includes("appendText(header, 'h1', '', 'Recovery Validation')"));
assert(gate2638.includes('parts[2] >= 38'),
  'The full 2.6.38 UI behavior gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.39 Recovery Validation roadmap correction active.`);
