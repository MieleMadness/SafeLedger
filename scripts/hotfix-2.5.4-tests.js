'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testTopStatusAlignment() {
  const css = read('src/main/css/ui-dock-refinement.css');
  assert(css.includes('.top-utility-cell #statusArea'));
  assert(css.includes('margin-left: auto !important;'));
  assert(css.includes('justify-content: flex-end !important;'));
  assert(css.includes('text-align: right !important;'));
  assert(css.includes('.top-utility-cell #statusArea .alert'));
}

function testWalletIconDoesNotDependOnGlyphFont() {
  const icons = read('src/main/css/local-icons.css');
  assert(icons.includes('.glyphicon-piggy-bank {'));
  assert(icons.includes('.glyphicon-piggy-bank::before {'));
  assert(icons.includes('.glyphicon-piggy-bank::after {'));
  assert(!icons.includes('.glyphicon-piggy-bank::before { content: "◇"; }'));
  assert(icons.includes('border: .11em solid currentColor;'));
}

function testBackupReminderContractRemainsLocal() {
  const health = read('src/main/backup-health.js');
  const settings = read('src/main/settings-ui.js');
  const dashboard = read('src/main/dashboard-ui.js');
  assert(health.includes('const DEFAULT_REMINDER_DAYS = 30;'));
  assert(health.includes('[0, 30, 60, 90]'));
  assert(settings.includes("label.textContent = 'Backup reminder';"));
  assert(dashboard.includes("'Encrypted backup'"));
  assert(dashboard.includes("backupDue || verifyDue ? 'Review' : 'Current'"));
}

testTopStatusAlignment();
testWalletIconDoesNotDependOnGlyphFont();
testBackupReminderContractRemainsLocal();
console.log('PASS SafeLedger 2.5.4 right-aligned utility messages, glyph-free wallet icon, and local backup reminder contract.');
