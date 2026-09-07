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
    'Profile picker should expose the full local wallet-icon catalog plus reviewed SafeLedger starter templates.');

  for (const icon of web3Icons.entries('wallets')) {
    assert(templates.some((template) => template.iconCategory === 'wallets' && template.iconKey === icon.key),
      `Local wallet icon ${icon.name} should be represented in the profile checkbox picker.`);
  }

  const walletTemplates = templates.filter((template) => template.service !== true);
  const serviceTemplates = templates.filter((template) => template.service === true);
  assert(walletTemplates.every((template) => template.hasIcon === true),
    'Every conventional New Profile wallet template must have real local Web3Icons artwork.');
  assert(serviceTemplates.every((template) => template.standard === true && template.category === 'Web3 Account'),
    'Service starters must be deliberate reviewed Web3 Account templates.');

  for (const name of standard) {
    const template = byName.get(name);
    assert(template, `${name} must exist in the starter picker.`);
    if (template.service === true) {
      assert.strictEqual(name, 'Chain Games', 'Only the reviewed Chain Games service is currently approved as a standard service starter.');
      assert.strictEqual(template.standard, true);
    } else {
      assert.strictEqual(template.hasIcon, true, `${name} conventional wallet cannot be standard without a real local icon.`);
      assert(profileSetup.iconMatch(name), `${name} standard wallet artwork must resolve locally.`);
    }
  }

  for (const name of ['Kraken Wallet', 'Phantom', 'Backpack']) {
    assert(standard.includes(name), `${name} should be in the Standard setup.`);
    assert(byName.get(name) && byName.get(name).hasIcon, `${name} must have local Web3Icons artwork before becoming standard.`);
  }
  assert(standard.includes('Chain Games'), 'Chain Games should be in Standard setup through the reviewed service-starter path.');
  assert(byName.get('Chain Games') && byName.get('Chain Games').service === true,
    'Chain Games must not be misclassified as a conventional wallet template.');

  /* These remained optional in 2.5.8. Starting with 2.5.16, optional entries
   * are visible only when they also resolve to local brand artwork. */
  for (const name of ['Electrum', 'OneKey', 'SafePal', 'Tangem']) {
    const hasArtwork = Boolean(profileSetup.iconMatch(name));
    assert.strictEqual(byName.has(name), hasArtwork,
      `${name} optional-template visibility should follow local artwork availability.`);
    assert(!standard.includes(name), `${name} should remain outside Standard setup.`);
  }
  assert(!byName.has('Electrum'), 'Electrum currently has no local artwork and should not be shown in New Profile templates.');

  const built = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', standard);
  assert.deepStrictEqual(built.map((group) => group.name), standard,
    'New SafeLedger and new Profile defaults should use the same ordered Standard setup.');
  assert(built.find((group) => group.name === 'Kraken Wallet').records.length > 0,
    'Kraken Wallet should preload its reviewed supported networks.');
  assert(built.find((group) => group.name === 'Backpack').records.length > 0,
    'Backpack should preload its reviewed supported networks.');
  const chainGames = built.find((group) => group.name === 'Chain Games');
  assert(chainGames && chainGames.category === 'Web3 Account' && chainGames.records.length === 3,
    'Chain Games should preload its three reviewed CHAIN network entries as a Web3 Account.');
}

function testLoginAndSensitiveUiContract() {
  const password = read('src/main/password-controls.js');
  const security = read('src/main/security-ui.js');
  const css = read('src/main/css/ui-current.css');
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
  assert(css.includes('width: 50% !important;'), 'Login password and meter should keep the historical fallback width before title-width sync is applied.');
  assert(css.includes('.form-control:focus,'));
  assert(css.includes('box-shadow: none !important;'));
  assert(css.includes('outline: 2px solid var(--sl-primary) !important;'),
    'Field focus should match the two-pixel Emergency Lock highlight.');

  assert(security.includes('control.innerHTML = eyeIcon.markup(hidden);'),
    'Editable sensitive fields should use the shared eye icon.');
  assert(security.includes("stateIcon.className = open ? 'fa fa-minus' : 'fa fa-plus';"),
    'View-mode sensitive rows should update plus/minus disclosure icons directly in their owner.');
  assert(security.includes("details.addEventListener('toggle', () =>"),
    'Sensitive disclosure state should update from the real details toggle event.');
  assert(security.includes('button.innerHTML = qrIconMarkup();'),
    'QR actions should render the SafeLedger QR glyph directly in the canonical security control owner.');
  assert(security.includes('class="sl-qr-svg"'), 'The canonical QR action should use the current simplified local SVG.');
  assert.strictEqual(fs.existsSync(path.join(root, 'src/main/sensitive-control-icons-ui.js')), false,
    'The old MutationObserver icon repair module must stay retired.');
  assert(!security.includes('MutationObserver'),
    'Sensitive-control correctness must not depend on post-render DOM observation.');
  assert(index.includes('./css/ui-current.css'), 'The consolidated current UI stylesheet must load in the app.');
}

function testSettingsWorkflowOrder() {
  const source = read('src/main/settings-ui.js');
  const calls = [
    'renderAppearanceSection(area, params);',
    'renderBackupSection(area);',
    'renderDeviceSection(area, params);',
    'renderLegacyImportSection(area);',
    'renderBruteForceSection(area, params);',
    'renderSelfDestructSection(area, params);',
    'renderAssetDisplaySection(area, params);',
    'renderPrivacySection(area, params);',
    'renderPasswordSection(area);'
  ];
  let previous = -1;
  for (const call of calls) {
    const index = source.indexOf(call);
    assert(index > previous, `${call} should remain in the canonical one-pass Settings order.`);
    previous = index;
  }
  assert.strictEqual(fs.existsSync(path.join(root, 'src/main/settings-layout-ui.js')), false,
    'The old post-render Settings reorder module must stay retired.');
  assert(!source.includes('MutationObserver'), 'Settings order must be correct on first render.');
}

function testResponsiveWalletGrid() {
  const css = read('src/main/css/ui-current.css');
  const profile = read('src/main/profile.js');
  assert(profile.includes("walletIcons.createIconElement({ name: template.name }, 'profile-wallet-template-icon')"),
    'Each starter checkbox row should render its local artwork directly in the Profile renderer.');
  assert(!profile.includes('MutationObserver'),
    'Profile starter artwork must not depend on post-render DOM observation.');
  assert(css.includes('@container (min-width: 360px)'));
  assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'));
  assert(css.includes('@container (min-width: 680px)'));
  assert(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'));
  assert(css.includes('@container (min-width: 920px)'));
  assert(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'));
  assert(!css.includes('repeat(5,'), 'Starter picker must never exceed four columns.');
}

testIconBackedWalletPickerAndStandardSetup();
testLoginAndSensitiveUiContract();
testSettingsWorkflowOrder();
testResponsiveWalletGrid();
console.log('PASS SafeLedger development login/sensitive controls, canonical Settings order, local-artwork starter setup, and reviewed Chain Games service starter.');
