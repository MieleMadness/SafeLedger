'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const profileSetup = require(path.join(root, 'src', 'main', 'profile-setup.js'));
const backupHealth = require(path.join(root, 'src', 'main', 'backup-health.js'));

const templates = profileSetup.availableTemplates();
const templateNames = new Set(templates.map((template) => template.name));
const standard = new Set(profileSetup.standardNames());

/* 2.5.7 made these wallets optional rather than Standard. As of 2.5.16 the
 * New Profile picker has an additional presentation rule: an optional wallet
 * is shown only when SafeLedger has real local brand artwork for it. */
for (const wallet of ['Electrum', 'OneKey', 'SafePal', 'Tangem']) {
  const hasArtwork = Boolean(profileSetup.iconMatch(wallet));
  assert.strictEqual(templateNames.has(wallet), hasArtwork,
    `${wallet} should ${hasArtwork ? '' : 'not '}appear in New Profile templates based on local logo availability.`);
  assert(!standard.has(wallet), `${wallet} should not be preselected in Standard setup.`);
}

assert(!templateNames.has('Electrum'), 'Electrum currently has no local logo and should be omitted from New Profile templates.');
assert(templateNames.has('Trust Wallet'), 'Trust Wallet should remain available as a wallet template.');
assert(standard.has('Trust Wallet'), 'Trust Wallet should be preselected in Standard setup.');
const standardGroups = profileSetup.buildGroups(new Date(), profileSetup.standardNames());
assert(standardGroups.some((group) => group && group.name === 'Trust Wallet'),
  'Building the Standard setup should create a Trust Wallet group.');

assert.deepStrictEqual(backupHealth.ALLOWED_REMINDER_DAYS, [0, 90, 180, 365],
  'Backup reminder intervals should be Off, 3 months, 6 months, or 12 months.');
assert.strictEqual(backupHealth.DEFAULT_REMINDER_DAYS, 90, 'The default backup reminder should be 3 months.');
assert.strictEqual(backupHealth.normalizeReminderDays(30), 90, 'Retired 30-day reminders should migrate to 3 months.');
assert.strictEqual(backupHealth.normalizeReminderDays(60), 90, 'Retired 60-day reminders should migrate to 3 months.');

const settingsUi = read('src/main/settings-ui.js');
assert(settingsUi.includes("[0, 'Off'], [90, '3 months'], [180, '6 months'], [365, '12 months']"),
  'Device & Storage Security should show the requested reminder choices.');
assert(!settingsUi.includes("[30, '30 days']"), 'The retired 30-day UI option should be removed.');
assert(!settingsUi.includes("[60, '60 days']"), 'The retired 60-day UI option should be removed.');

console.log('PASS logo-aware Standard wallet selection and Device & Storage Security reminder choices.');
