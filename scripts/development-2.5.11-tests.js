'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const security = read('src/main/security-ui.js');
const uiCss = read('src/main/css/ui-current.css');
const dashboardUi = read('src/main/dashboard-ui.js');
const dashboardSummary = read('src/main/dashboard-summary.js');
const index = read('src/main/index.html');
const extensions = read('src/main/wallet-catalog-extensions.js');
const profileSetup = require(path.join(root, 'src', 'main', 'profile-setup.js'));
const tokenIcons = require(path.join(root, 'src', 'main', 'token-icons.js'));

function testSensitiveControlLanguage() {
  assert(security.includes("const eyeIcon = require('./eye-icon');"),
    'Editable sensitive controls should use the shared SafeLedger eye artwork.');
  assert(security.includes('button.innerHTML = eyeIcon.markup(false);'),
    'Editable sensitive fields should start with an eye icon.');
  assert(security.includes('control.innerHTML = eyeIcon.markup(hidden);'),
    'Editable sensitive fields should switch eye state when revealed.');
  assert(security.includes("stateIcon.className = open ? 'fa fa-minus' : 'fa fa-plus';"),
    'View-mode sensitive rows should directly toggle plus/minus rather than eye artwork.');
  assert(security.includes('syncSensitiveSummary(details, summary, stateIcon);'));
  assert(security.includes("details.addEventListener('toggle', () =>"),
    'Disclosure state must be updated by the canonical sensitive-field owner.');
  assert(!security.includes('MutationObserver'),
    'Sensitive controls must not return to observer-driven repair.');
  assert.strictEqual(fs.existsSync(path.join(root, 'src/main/sensitive-control-icons-ui.js')), false,
    'The retired display-only disclosure patch must stay removed.');
  assert(uiCss.includes('.edit-sensitive-actions'));
  assert(uiCss.includes('position: absolute;'));
  assert(uiCss.includes('.edit-sensitive-toggle .sl-eye-svg'),
    'Wallet, Asset, and custom sensitive edit fields should render the eye inside the input.');
}

function testCopyControlFoundation() {
  assert(security.includes('function copyIconMarkup()'));
  assert(security.includes('class="sl-copy-svg"'));
  assert(security.includes("'copy-inline-button'"));
  assert(!security.includes("makeIconButton('fa-copy'"),
    'Copy actions should keep local SafeLedger artwork instead of returning to the legacy icon-font copy button.');
}

function testVaultOverview() {
  assert(dashboardUi.includes("heading.textContent = 'Vault Overview';"));
  for (const [title, className] of [
    ['Vault Inventory', 'vault-inventory-section'],
    ['Recovery Health', 'vault-recovery-section'],
    ['Device & Backup Health', 'device-health-section']
  ]) {
    assert(dashboardUi.includes(`'${title}'`), `Vault Overview should retain the ${title} section.`);
    assert(dashboardUi.includes(`'${className}'`), `${title} should retain its canonical section class.`);
  }
  assert(dashboardUi.includes("makeSection('Recovery Needs Attention')"));
  assert(dashboardUi.includes("makeSection('Recently Verified')"));
  assert(dashboardSummary.includes('hardwareWallets: 0'));
  assert(dashboardSummary.includes('softwareWallets: 0'));
  assert(dashboardSummary.includes('otherWallets: 0'));
  assert(index.includes('title="Vault Overview"'));
  assert(index.includes('aria-label="Open Vault Overview"'));
  assert(index.includes('./css/ui-current.css'));
}

function testFioCatalogSupport() {
  assert(extensions.includes("addReviewedRecord('Ledger'"));
  assert(extensions.includes("addReviewedRecord('MetaMask'"));
  assert(extensions.includes("'FIO Protocol'"));
  assert(extensions.includes("'FIO'"));

  const groups = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', ['Ledger', 'MetaMask']);
  for (const name of ['Ledger', 'MetaMask']) {
    const wallet = groups.find((group) => group.name === name);
    assert(wallet, `${name} should build from the reviewed wallet catalog.`);
    assert(wallet.records.some((record) => record.name === 'FIO Protocol' && record.symbol === 'FIO'),
      `${name} should preload the reviewed FIO Protocol record.`);
  }

  const match = tokenIcons.getIconMatch({ name: 'FIO Protocol', symbol: 'FIO' });
  assert(match && match.src, 'FIO Protocol should resolve to local Web3Icons artwork.');
}

testSensitiveControlLanguage();
testCopyControlFoundation();
testVaultOverview();
testFioCatalogSupport();
console.log('PASS SafeLedger 2.5.11 editable eye controls, directly owned plus/minus disclosures, local copy control, Vault Overview, and reviewed FIO support.');
