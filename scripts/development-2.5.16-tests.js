'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2516 = version[0] > 2 ||
  (version[0] === 2 && version[1] > 5) ||
  (version[0] === 2 && version[1] === 5 && version[2] >= 16);
assert(atLeast2516, 'build must be SafeLedger 2.5.16 or later');

const css = read('src/main/css/ui-2.5.16.css');
assert(css.includes('.password-visibility-shell > .password-visibility-toggle'), 'password visibility action must have a direct-shell alignment rule');
assert(css.includes('top: 0 !important;') && css.includes('bottom: 0 !important;'), 'password visibility action must use the shell bounds for vertical centering');
assert(css.includes('margin: auto 0 !important;'), 'password visibility action must center itself with automatic vertical margins');
assert(css.includes('transform: none !important;'), 'password visibility alignment must not depend on transforms that interaction rules can reset');
assert(css.includes('display: inline-flex !important;') && css.includes('align-items: center !important;') && css.includes('justify-content: center !important;'),
  'password visibility action must explicitly center its contents inside the hover target');
assert(css.includes('.password-visibility-toggle .sl-eye-svg') && css.includes('margin: auto !important;'),
  'password visibility eye artwork must be centered inside its button independently of generic field-action styles');

const index = read('src/main/index.html');
assert(index.includes('./css/ui-2.5.16.css'), '2.5.16 UI correction layer must be loaded after prior UI layers');

const profileSetup = require(path.join(root, 'src/main/profile-setup.js'));
const templates = profileSetup.availableTemplates();
assert(templates.length > 0, 'New Profile setup should still offer logo-backed wallet templates');
assert(templates.every((template) => template.hasIcon === true), 'New Profile picker must omit wallets that do not have a local logo');
assert(templates.every((template) => profileSetup.iconMatch(template.name)), 'every New Profile wallet template must resolve to local brand artwork');

const rendererEntry = read('src/main/renderer-entry.js');
const rendererSource = read('src/main/renderer.js');
const profileSource = read('src/main/profile.js');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/profile-create-cancel-ui.js')), false,
  'The post-render New Profile cancel injector must stay removed.');
assert(!rendererEntry.includes("require('./profile-create-cancel-ui.js')"),
  'Renderer entry must not restore the retired New Profile cancel observer.');
assert(profileSource.includes("title: 'Cancel new profile'"),
  'New Profile form must render its Cancel action directly.');
assert(profileSource.includes("!profile && typeof params.onCancel === 'function'"),
  'New Profile cancellation must be driven by the form owner, not DOM observation.');
assert(rendererSource.includes('profile.createProfile(profileParams({ onCancel: cancelAddProfile }))'),
  'The real Add Profile action must provide the direct cancel navigation callback.');
assert(rendererSource.includes("document.getElementById('dashboardButton')"),
  'Cancel new profile should continue through the existing Vault Overview navigation action.');

console.log('PASS SafeLedger 2.5.16+ centers password visibility controls, filters logo-less wallet templates, and renders New Profile cancellation directly.');
