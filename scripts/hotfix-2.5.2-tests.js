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
  assert(settings.includes("input.addEventListener('change', (event) =>"));
  assert(settings.includes('saveUserSetting(params, { appearance });'));
}

function testPrivacyModeLayout() {
  const settings = read('src/main/settings-ui.js');
  assert(settings.includes("const section = makeSection('Privacy Mode');"));
  assert(settings.includes("label.className = 'privacy-mode-toggle settings-field-label';"));
  const privacyStart = settings.indexOf("function renderPrivacySection");
  const labelPosition = settings.indexOf('section.appendChild(label);', privacyStart);
  const savePosition = settings.indexOf('section.appendChild(save);', privacyStart);
  assert(privacyStart >= 0 && labelPosition > privacyStart && savePosition > labelPosition,
    'Privacy Mode toggle must remain above its Save action in the canonical Settings renderer.');
  assert.strictEqual(fs.existsSync(path.join(root, 'src/main/privacy-mode-ui.js')), false,
    'The old delayed Privacy Mode injector must stay retired.');
}

testVersionMenuLink();
testAppearanceAutosave();
testPrivacyModeLayout();
console.log('PASS SafeLedger version link, automatic appearance saving, and directly rendered Privacy Mode settings layout.');
