'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const collapse = read('src/main/column-collapse-ui.js');
const motion = read('src/main/motion-ui.js');
const entry = read('src/main/renderer-entry.js');
const renderer = read('src/main/renderer.js');
const foundation = read('src/main/css/foundation.css');
const gate2640 = read('scripts/hotfix-2.6.40-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 41,
  'SafeLedger 2.6.41 startup/login workspace behavior must remain active on later candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.41-tests.js'));

assert(collapse.includes('const OPEN_DURATION_MS = 420;'));
assert(collapse.includes("icon.className = 'fa fa-chevron-right';"));
assert(collapse.includes('collapsed: true'));
assert(collapse.includes('setCollapsed(state, true);'));
assert(collapse.includes('function collapseForLogin()'));
assert(collapse.includes('grid.animate('),
  'The original post-login workspace reveal must remain an explicit grid animation.');
assert(collapse.includes('gridTemplateColumns: starts[index]') && collapse.includes('gridTemplateColumns: target'));
assert(collapse.includes('const unit = width / 11;') && collapse.includes('`${unit * 2}px ${unit * 2}px ${unit * 2}px ${unit * 5}px`'));
assert(collapse.includes("const motion = require('./motion-ui');"),
  'Navigation rails must use the shared 2.6.56 motion owner rather than duplicating motion policy.');
assert(collapse.includes('return motion.prefersReducedMotion();'),
  'Column-collapse reduced-motion decisions must delegate to the shared motion owner.');
assert(motion.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches"),
  'The shared motion owner must honor the operating-system reduced-motion preference.');
assert(!collapse.includes("fill: 'forwards'"));
assert(collapse.includes("grid.style.removeProperty('grid-template-columns')"));
assert(foundation.includes('--sl-compact-nav-column: 98px;'));

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/login-workspace-ui.js')), false,
  'The synthetic-click login workspace coordinator must stay retired.');
assert(!entry.includes('login-workspace-ui.js'));
assert(renderer.includes('function firstDisplayProfileIndex(list = vaultList)'),
  'The canonical renderer must choose the first displayed Profile directly from state.');
assert(renderer.includes('const firstIndex = firstDisplayProfileIndex(vaultList);'));
assert(renderer.includes("ipc.send('read', { type: 'vault-read', file: firstProfile.file });"),
  'The canonical renderer must perform the initial trusted Profile read directly.');
assert(renderer.includes("if (params.type === 'vault-read' && revealWorkspaceAfterRead)"));
assert(renderer.includes('columnCollapseUi.revealAfterLogin();'),
  'The columns must open after the selected Profile read completes.');
assert(renderer.includes('columnCollapseUi.collapseForLogin();'),
  'Login/session-lock paths must return the navigation to compact state.');
assert(!renderer.includes('.click()'), 'Startup state transitions must not depend on synthetic DOM clicks.');

assert(renderer.includes("['vault-create', 'vault-read', 'group-delete'].includes(params.type)"));
assert(renderer.includes('vaultData.groupSelected = null;') && renderer.includes('vaultData.recordSelected = null;'));
assert(renderer.includes('group.listGroups({ vaultData, saving });'));
assert(gate2640.includes('parts[2] >= 40'));

console.log(`PASS SafeLedger ${pkg.version} keeps compact startup, first-Profile selection, unselected Vault Items, and reduced-motion-aware workspace animation through the shared motion owner.`);
