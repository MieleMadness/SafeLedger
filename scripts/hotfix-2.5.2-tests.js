'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testVersionMenuLink() {
  const main = read('src/main/main.js');
  assert(main.includes("const SAFELEDGER_SITE_URL = 'https://safeledger.tnypg.com';"));
  assert(main.includes('shell.openExternal(SAFELEDGER_SITE_URL)'));
  assert(!main.includes('{ label: `Version ${app.getVersion()}`, enabled: false }'));
}

function testAppearanceAutosave() {
  const settings = read('src/main/settings-ui.js');
  assert(!settings.includes('Save Appearance'));
  assert(settings.includes('Changes are saved automatically.'));
  assert(settings.includes("input.addEventListener('change', saveAppearanceSelection)"));
  assert(settings.includes("ipc.send('save-settings', { newSettings: Object.assign({}, params.settings, { appearance }) })"));
}

function testPrivacyModeLayout() {
  const privacy = read('src/main/privacy-mode-ui.js');
  assert(privacy.includes("label.className = 'privacy-mode-toggle settings-field-label';"));
  assert(privacy.indexOf('section.appendChild(label);') < privacy.indexOf('section.appendChild(save);'));
}

function testVersion() {
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(pkg.version, '2.5.2');
}

testVersionMenuLink();
testAppearanceAutosave();
testPrivacyModeLayout();
testVersion();
console.log('PASS SafeLedger 2.5.2 version link, automatic appearance saving, and Privacy Mode settings layout.');
