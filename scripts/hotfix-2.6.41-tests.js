'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const collapse = read('src/main/column-collapse-ui.js');
const workspace = read('src/main/login-workspace-ui.js');
const entry = read('src/main/renderer-entry.js');
const renderer = read('src/main/renderer.js');
const foundation = read('src/main/css/foundation.css');
const gate2640 = read('scripts/hotfix-2.6.40-tests.js');

assert.strictEqual(pkg.version, '2.6.41', 'This workflow candidate must report SafeLedger 2.6.41.');
assert(read('package.json').includes('node scripts/hotfix-2.6.41-tests.js'),
  '2.6.41 startup/login workspace coverage must stay in the locked regression suite.');

assert(collapse.includes('const OPEN_DURATION_MS = 420;'),
  'Post-login navigation reveal must keep the requested short, visible animation.');
assert(collapse.includes("icon.className = 'fa fa-chevron-right';"),
  'Navigation collapse controls must initially point toward expansion.');
assert(collapse.includes('collapsed: true'),
  'Profile, Vault Item, and Asset columns must initialize collapsed.');
assert(collapse.includes('setCollapsed(state, true);'),
  'Each navigation column must be placed into compact mode at startup.');
assert(collapse.includes('function collapseForLogin()'),
  'The compact startup state must remain reusable for later lock/login transitions.');

assert(collapse.includes("grid.animate("),
  'Post-login navigation must animate rather than jump directly open when motion is allowed.');
assert(collapse.includes('gridTemplateColumns: starts[index]') && collapse.includes('gridTemplateColumns: target'),
  'The reveal animation must interpolate the complete grid so all three navigation boundaries slide open together.');
assert(collapse.includes('const unit = width / 11;') && collapse.includes('`${unit * 2}px ${unit * 2}px ${unit * 2}px ${unit * 5}px`'),
  'The expanded animation target must match the canonical 2/2/2/5 workspace proportions.');
assert(collapse.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"),
  'The reveal must respect reduced-motion accessibility preferences.');
assert(!collapse.includes("fill: 'forwards'"),
  'Finished Web Animations must not keep ownership of grid sizing and break later manual collapse actions.');
assert(collapse.includes("grid.style.removeProperty('grid-template-columns')"),
  'Temporary animation sizing must be released back to the canonical CSS layout after the reveal.');
assert(foundation.includes('--sl-compact-nav-column: 98px;'),
  'Startup compact rails must retain the approved balanced 98px width.');

assert(entry.indexOf("require('./renderer.js');") < entry.indexOf("require('./column-collapse-ui.js');"),
  'The canonical renderer result handler must register before the workspace coordinator.');
assert(entry.indexOf("require('./column-collapse-ui.js');") < entry.indexOf("require('./login-workspace-ui.js');"),
  'The workspace coordinator must load after the canonical column controller.');
assert(workspace.includes("area.querySelector('.nav > li > a')"),
  'Automatic selection must use the first visibly rendered Profile, preserving pinned/alphabetical display order.');
assert(workspace.includes('firstProfile.click();'),
  'Automatic Profile selection must reuse the existing Profile click/read path rather than duplicating vault-read logic.');
assert(workspace.includes("params.type === 'vaultlist-init' && params.vaultList"),
  'Automatic Profile selection must begin only after successful vault-list login initialization.');
assert(workspace.includes("params.type === 'vault-read' && awaitingInitialVaultRead"),
  'The columns must wait for the selected Profile Vault Items to load before opening.');
assert(workspace.includes('columnCollapseUi.revealAfterLogin();'),
  'The loaded workspace must trigger the canonical reveal animation.');
assert(workspace.includes("params.type === 'session-locked'" ) && workspace.includes('columnCollapseUi.collapseForLogin();'),
  'A session lock must return navigation to the compact login state.');
assert(!workspace.includes('ipc.send('),
  'The workspace coordinator must not create a second vault-read or security IPC path.');
assert(!workspace.includes("require('./crypto") && !workspace.includes("require('./security"),
  'The UI coordinator must not enter crypto/security internals.');

assert(renderer.includes("['vault-create', 'vault-read', 'group-delete'].includes(params.type)"),
  'Canonical vault-read handling must continue resetting lower-level selection.');
assert(renderer.includes('vaultData.groupSelected = null;') && renderer.includes('vaultData.recordSelected = null;'),
  'The initially loaded Profile must expose Vault Items without selecting a Vault Item or Asset.');
assert(renderer.includes('group.listGroups({ vaultData, saving });'),
  'Vault Items for the automatically selected Profile must still render through the canonical group renderer.');

assert(gate2640.includes('parts[2] >= 40'),
  'The 2.6.40 UI/search gate must remain active on later candidates.');

console.log('PASS SafeLedger 2.6.41 starts with compact navigation, selects the first visible Profile after login, loads unselected Vault Items, and slides the workspace open safely.');
