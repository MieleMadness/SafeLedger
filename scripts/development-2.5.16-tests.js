'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
assert(version[0] === 2 && version[1] === 5 && version[2] >= 16, 'development build must be SafeLedger 2.5.16 or later');

const css = read('src/main/css/ui-2.5.16.css');
assert(css.includes('.password-visibility-shell > .password-visibility-toggle'), 'password visibility action must have a direct-shell alignment rule');
assert(css.includes('top: 50% !important;'), 'password visibility action must be vertically centered');
assert(css.includes('transform: translateY(-50%) !important;'), 'password visibility action must center itself against the input height');

const index = read('src/main/index.html');
assert(index.includes('./css/ui-2.5.16.css'), '2.5.16 UI correction layer must be loaded after prior UI layers');

const profileSetup = require(path.join(root, 'src/main/profile-setup.js'));
const templates = profileSetup.availableTemplates();
assert(templates.length > 0, 'New Profile setup should still offer logo-backed wallet templates');
assert(templates.every((template) => template.hasIcon === true), 'New Profile picker must omit wallets that do not have a local logo');
assert(templates.every((template) => profileSetup.iconMatch(template.name)), 'every New Profile wallet template must resolve to local brand artwork');

const rendererEntry = read('src/main/renderer-entry.js');
assert(rendererEntry.includes("require('./profile-create-cancel-ui.js')"), 'renderer must load the New Profile cancel action');
const cancelSource = read('src/main/profile-create-cancel-ui.js');
assert(cancelSource.includes("title = 'Cancel new profile'"), 'New Profile form must expose an explicit Cancel action');
assert(cancelSource.includes("document.getElementById('dashboardButton')"), 'Cancel new profile should return through the existing Vault Overview navigation');
assert(cancelSource.includes('data-profile-create-cancel') || cancelSource.includes('profileCreateCancel'), 'New Profile cancel action must be idempotent');

console.log('PASS SafeLedger 2.5.16 centers password visibility controls, filters logo-less wallet templates, and adds New Profile cancellation.');
