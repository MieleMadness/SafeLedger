'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const roadmap = read('scripts/roadmap-regression-tests.js');
const preload = read('src/main/preload.js');
const gate2642 = read('scripts/hotfix-2.6.42-tests.js');

assert.strictEqual(pkg.version, '2.6.43', 'This workflow correction candidate must report SafeLedger 2.6.43.');
assert(read('package.json').includes('node scripts/hotfix-2.6.43-tests.js'),
  '2.6.43 preload-boundary correction coverage must stay in the locked regression suite.');

for (const contract of [
  "getDashboardSummary: () => invoke('dashboard-summary')",
  "getActivityHistory: (limit) => invoke('activity-history', limit)",
  "globalSearch: (query) => invoke('global-search', query)"
]) {
  assert(preload.includes(contract), `Normalized preload bridge must retain protected channel contract: ${contract}`);
  assert(roadmap.includes(contract), `Roadmap gate must validate the current normalized preload contract: ${contract}`);
}
assert(preload.includes("function invoke(channel, ...args)"),
  'The normalized preload invoke wrapper must remain the single renderer-facing promise boundary.');
assert(preload.includes("if (message.includes(LOCKED_MESSAGE)) throw new Error(LOCKED_MESSAGE);"),
  'Locked Electron invoke errors must continue surfacing only the clean SafeLedger message.');
assert(!roadmap.includes("getDashboardSummary: () => ipcRenderer.invoke('dashboard-summary')"),
  'Roadmap regression must not require the retired direct dashboard invoke source shape.');
assert(!roadmap.includes("getActivityHistory: (limit) => ipcRenderer.invoke('activity-history', limit)"),
  'Roadmap regression must not require the retired direct activity invoke source shape.');
assert(!roadmap.includes("globalSearch: (query) => ipcRenderer.invoke('global-search', query)"),
  'Roadmap regression must not require the retired direct search invoke source shape.');
assert(gate2642.includes('parts[2] >= 42'),
  'The 2.6.42 feature gate must remain active on this correction candidate.');

console.log('PASS SafeLedger 2.6.43 modernizes the roadmap preload assertions without changing the 2.6.42 runtime feature set.');
