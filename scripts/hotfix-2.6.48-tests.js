'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const renderer = read('src/main/renderer.js');
const entry = read('src/main/renderer-entry.js');
const topActions = read('src/main/top-action-lock-ui.js');
const status = read('src/main/status.js');
const localIcons = read('src/main/css/local-icons.css');
const loginLayout = read('src/main/login-layout-ui.js');
const gate2642 = read('scripts/hotfix-2.6.42-tests.js');
const gate2647 = read('scripts/hotfix-2.6.47-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 48);
assert(read('package.json').includes('node scripts/hotfix-2.6.48-tests.js'));
assert(renderer.includes("status.showStatus({ status: 'ERROR', statusMsg: 'Please login.' });"));
assert(topActions.includes("const status = require('./status');"));
assert(topActions.includes("const LOCKED_MESSAGE = 'Please login.';"));
assert(topActions.includes("guardButton('dashboardButton', openLogin);"));
for (const id of ['activityButton', 'settingsButton', 'globalSearchButton']) assert(topActions.includes(`guardButton('${id}', showLockedMessage);`));
assert(topActions.includes("status.showStatus({ status: 'ERROR', statusMsg: LOCKED_MESSAGE });"));
assert(!topActions.includes("area.innerHTML = ''") && !topActions.includes('warning.textContent = LOCKED_MESSAGE;'));
assert(status.includes('const LOGIN_REQUIRED = /^Please login\\.?$/i;'));
assert(status.includes("iconClass: 'fa fa-user'"));
assert(localIcons.includes('.fa-user,') && localIcons.includes('#loginBtn .fa-unlock'));

assert(!entry.includes("require('./login-layout-ui.js');"),
  'Login layout no longer needs a separate event-driven entry module.');
assert(renderer.includes("const loginLayout = require('./login-layout-ui');") && renderer.includes('loginLayout.syncLoginControlWidths();'),
  'The canonical Login renderer must own width alignment directly.');
assert(loginLayout.includes("const LOGIN_TITLE = 'Welcome to SafeLedger';"));
assert(loginLayout.includes("'.login-password-shell'") && loginLayout.includes("'.login-password-strength'") && loginLayout.includes("'#loginSecurityControls'"));
assert(loginLayout.includes('document.createRange()') && loginLayout.includes('range.selectNodeContents(header)'));
assert(loginLayout.includes("element.style.setProperty('width', `${width}px`, 'important');") && loginLayout.includes("element.style.setProperty('max-width', '100%', 'important');"));
assert(!loginLayout.includes('setTimeout(') && !loginLayout.includes('scheduleSync'),
  'Login sizing must not depend on render-retry timers.');
assert(renderer.includes("window.addEventListener('resize', () => loginLayout.syncLoginControlWidths());"),
  'Window resize must call the same direct width alignment function.');

assert(gate2642.includes("const utilityLockedMessage = 'Please login.';") && gate2642.includes('must not replace the detail panel with an error page'));
assert(gate2647.includes('parts[2] >= 47'));

console.log(`PASS SafeLedger ${pkg.version} keeps locked-action behavior and direct synchronous login-title width alignment.`);
