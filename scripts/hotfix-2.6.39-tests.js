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
const drillTests = read('scripts/recovery-drill-tests.js');
const gate2638 = read('scripts/hotfix-2.6.38-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 39,
  'SafeLedger 2.6.39 Recovery Validation naming behavior must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.39-tests.js'),
  '2.6.39 Recovery Validation coverage must stay in the locked regression suite.');

assert(roadmap.includes("'scripts/recovery-drill-tests.js'"),
  'The broad roadmap smoke gate must continue requiring dedicated Recovery Validation coverage.');
assert(drillTests.includes('recovery') || drillTests.includes('Recovery'),
  'Recovery Validation must retain a dedicated regression suite instead of depending on roadmap source-string mirrors.');
assert(drill.includes("title: 'Complete Recovery Validation'"));
assert(drill.includes("title: 'Cancel Recovery Validation'"));
assert(drill.includes("appendText(header, 'h1', '', 'Recovery Validation')"));
assert(!drill.includes("title: 'Complete recovery drill'"),
  'The retired recovery-drill completion tooltip must not return.');
assert(gate2638.includes('parts[2] >= 38'),
  'The full 2.6.38 UI behavior gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.39 Recovery Validation naming behavior active through dedicated coverage.`);
