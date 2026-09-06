'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const renderer = read('src/main/renderer.js');
const entry = read('src/main/renderer-entry.js');
const topActions = read('src/main/top-action-lock-ui.js');
const status = read('src/main/status.js');
const localIcons = read('src/main/css/local-icons.css');
const loginLayout = read('src/main/login-layout-ui.js');
const gate2642 = read('scripts/hotfix-2.6.42-tests.js');
const gate2647 = read('scripts/hotfix-2.6.47-tests.js');

assert.strictEqual(pkg.version, '2.6.48', 'This requested product update must report SafeLedger 2.6.48.');
assert(read('package.json').includes('node scripts/hotfix-2.6.48-tests.js'),
  '2.6.48 coverage must stay in the locked regression suite.');

assert(renderer.includes("status.showStatus({ status: 'ERROR', statusMsg: 'Please login.' });"),
  'Add Profile and other requireUnlocked actions must keep using the concise Please login status notice.');
assert(topActions.includes("const status = require('./status');"),
  'Locked top actions must use the shared top-right status renderer.');
assert(topActions.includes("const LOCKED_MESSAGE = 'Please login.';"),
  'Locked non-Home top actions must use the concise Please login message.');
assert(topActions.includes("guardButton('dashboardButton', openLogin);"),
  'Home must continue restoring the Login screen while SafeLedger is locked.');
for (const id of ['activityButton', 'settingsButton', 'globalSearchButton']) {
  assert(topActions.includes(`guardButton('${id}', showLockedMessage);`),
    `${id} must remain on the current screen and show the login-required notice while locked.`);
}
assert(topActions.includes("status.showStatus({ status: 'ERROR', statusMsg: LOCKED_MESSAGE });"),
  'Locked non-Home actions must render through the top-right status area.');
assert(!topActions.includes("area.innerHTML = ''") && !topActions.includes('warning.textContent = LOCKED_MESSAGE;'),
  'Locked non-Home actions must not replace the detail panel with an error page.');

assert(status.includes('const LOGIN_REQUIRED = /^Please login\\.?$/i;'),
  'Status rendering must recognize the login-required notice explicitly.');
assert(status.includes("iconClass: 'fa fa-user'"),
  'The Please login notice must use the local user/login icon instead of a missing danger glyph.');
assert(localIcons.includes('.fa-user,') && localIcons.includes('#loginBtn .fa-unlock'),
  'The status user icon and Login button must share the same locally drawn person artwork.');

assert(entry.includes("require('./login-layout-ui.js');"),
  'The login-width alignment helper must be included in the renderer bundle.');
assert(loginLayout.includes("const LOGIN_TITLE = 'Welcome to SafeLedger';"),
  'Login width alignment must be anchored to the visible Welcome to SafeLedger title.');
assert(loginLayout.includes("'.login-password-shell'") &&
  loginLayout.includes("'.login-password-strength'") &&
  loginLayout.includes("'#loginSecurityControls'"),
  'Password field, strength meter, and login controls must share the measured login-title width.');
assert(loginLayout.includes('document.createRange()') && loginLayout.includes('range.selectNodeContents(header)'),
  'Login sizing must measure the rendered title text instead of using a fixed percentage.');
assert(loginLayout.includes("element.style.setProperty('width', `${width}px`, 'important');") &&
  loginLayout.includes("element.style.setProperty('max-width', '100%', 'important');"),
  'Measured login widths must override the older 50% rule while remaining capped to the available space.');
assert(loginLayout.includes("window.addEventListener('resize', scheduleSync);"),
  'Login alignment must stay correct when the SafeLedger window is resized.');

assert(gate2642.includes("const utilityLockedMessage = 'Please login.';") &&
  gate2642.includes('must not replace the detail panel with an error page'),
  'The historical 2.6.42 locked-state gate must protect the updated non-navigation behavior.');
assert(gate2647.includes('parts[2] >= 47'),
  'The 2.6.47 password-guidance gate must remain active on 2.6.48 and later patches.');

console.log('PASS SafeLedger 2.6.48 keeps Login as Home, uses top-right Please login notices with the user icon, and aligns password controls to the login-title width.');
