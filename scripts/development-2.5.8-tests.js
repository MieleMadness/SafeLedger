'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const profileSetup = require(path.join(root, 'src', 'main', 'profile-setup.js'));
const web3Icons = require(path.join(root, 'src', 'main', 'web3-icons.js'));

function testIconBackedWalletPickerAndStandardSetup() {
  const templates = profileSetup.availableTemplates();
  const byName = new Map(templates.map((template) => [template.name, template]));
  const standard = profileSetup.standardNames();

  assert(templates.length >= web3Icons.entries('wallets').length,
    'Profile picker should expose the full local wallet-icon catalog plus established SafeLedger templates.');

  for (const icon of web3Icons.entries('wallets')) {
    assert(templates.some((template) => template.iconCategory === 'wallets' && template.iconKey === icon.key),
      `Local wallet icon ${icon.name} should be represented in the profile checkbox picker.`);
  }

  for (const name of standard) {
    const template = byName.get(name);
    assert(template, `${name} must exist in the wallet picker.`);
    assert.strictEqual(template.hasIcon, true, `${name} cannot be standard without a real local icon.`);
    assert(profileSetup.iconMatch(name), `${name} standard artwork must resolve locally.`);
  }

  for (const name of ['Kraken Wallet', 'Phantom', 'Backpack']) {
    assert(standard.includes(name), `${name} should be in the Standard setup.`);
    assert(byName.get(name) && byName.get(name).hasIcon, `${name} must have local artwork before becoming standard.`);
  }

  for (const name of ['Electrum', 'OneKey', 'SafePal', 'Tangem']) {
    assert(byName.has(name), `${name} should remain an optional template.`);
    assert(!standard.includes(name), `${name} should remain outside Standard setup.`);
  }

  const built = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', standard);
  assert.deepStrictEqual(built.map((group) => group.name), standard,
    'New SafeLedger and new Profile defaults should use the same ordered Standard setup.');
  assert(built.find((group) => group.name === 'Kraken Wallet').records.length > 0,
    'Kraken Wallet should preload its reviewed supported networks.');
  assert(built.find((group) => group.name === 'Backpack').records.length > 0,
    'Backpack should preload its reviewed supported networks.');
}

function testLoginAndSensitiveUiContract() {
  const password = read('src/main/password-controls.js');
  const security = read('src/main/security-ui.js');
  const sensitive = read('src/main/sensitive-control-icons-ui.js');
  const css = read('src/main/css/ui-2.5.8.css');
  const index = read('src/main/index.html');

  assert(password.includes("show.innerHTML = eyeIcon.markup(false);"),
    'Password reveal should remain icon-only without Show Text copy.');
  assert(!password.includes('Show Text'), 'Visible Show Text controls should be retired.');
  assert(password.includes("input.id === 'masterCryptoInput' ? moveLoginButtonAfterPassword(shell) : null"),
    'Login should move into the former password-control row.');
  assert(password.includes('show.innerHTML = eyeIcon.markup(hidden);'),
    'Password visibility should keep a dedicated reveal/hide icon state.');

  assert(/\.login-password-shell,\s*\.login-password-strength,\s*#loginSecurityControls/.test(css),
    'Login password, meter, and action row should share the compact width contract.');
  assert(css.includes('width: 50% !important;'), 'Login password and meter should use half the detail width.');
  assert(css.includes('.form-control:focus,'));
  assert(css.includes('box-shadow: none !important;'));
  assert(css.includes('outline: 2px solid var(--sl-primary) !important;'),
    'Field focus should match the two-pixel Emergency Lock highlight.');

  assert(security.includes('control.innerHTML = eyeIcon.markup(hidden);'),
    'Editable sensitive fields should use the shared eye icon.');
  assert(security.includes("stateIcon.className = details.open ? 'fa fa-minus' : 'fa fa-plus';"),
    'View-mode sensitive rows should use plus/minus disclosure icons.');
  assert(sensitive.includes("icon.className = 'sl-qr-icon'"),
    'QR actions should use the simplified SafeLedger QR glyph.');
  assert(css.includes('.sl-qr-icon-part-4'), 'The simplified QR glyph should have dedicated low-noise styling.');
  assert(index.includes('./css/ui-2.5.8.css'), '2.5.8 final UI refinements must load in the app.');
}

function testSettingsWorkflowOrder() {
  const source = read('src/main/settings-layout-ui.js');
  const titles = [
    'Appearance',
    'Backup & Recovery',
    'Device & Storage Security',
    'Import SafeLedger 1.x Data',
    'Brute Force Protection',
    'Self-Destruct Protection',
    'Password'
  ];
  let previous = -1;
  for (const title of titles) {
    const index = source.indexOf(`'${title}'`);
    assert(index > previous, `${title} should appear in the requested Settings order.`);
    previous = index;
  }
  assert(source.includes("const ORDER = Object.freeze(["), 'Settings layout should keep one explicit workflow order.');
  assert(source.includes("const password = byTitle.get('Password');"), 'Password section should remain the final insertion anchor.');
}

function testResponsiveWalletGrid() {
  const css = read('src/main/css/ui-2.5.8.css');
  const pickerUi = read('src/main/profile-wallet-picker-ui.js');
  assert(pickerUi.includes("walletIcons.createIconElement({ name }, 'profile-wallet-template-icon')"),
    'Each wallet checkbox row should render its local wallet artwork.');
  assert(css.includes('@container (min-width: 360px)'));
  assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'));
  assert(css.includes('@container (min-width: 680px)'));
  assert(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'));
  assert(css.includes('@container (min-width: 920px)'));
  assert(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'));
  assert(!css.includes('repeat(5,'), 'Wallet picker must never exceed four columns.');
}

testIconBackedWalletPickerAndStandardSetup();
testLoginAndSensitiveUiContract();
testSettingsWorkflowOrder();
testResponsiveWalletGrid();
console.log('PASS SafeLedger development login/sensitive controls, Settings order, and icon-backed responsive wallet setup.');
