'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const settingsSchema = require('../src/main/settings-schema');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
const appAppearance = require('../src/main/app-appearance');

(async () => {
  assert.deepStrictEqual(settingsSchema.APPEARANCE_VALUES, ['system', 'light', 'dark']);
  assert.strictEqual(settingsSchema.normalizeAppearance('LIGHT'), 'light');
  assert.strictEqual(settingsSchema.normalizeAppearance('dark'), 'dark');
  assert.strictEqual(settingsSchema.normalizeAppearance('unexpected'), 'system');
  assert.strictEqual(appAppearance.resolveTheme('system', false), 'light');
  assert.strictEqual(appAppearance.resolveTheme('system', true), 'dark');
  assert.strictEqual(appAppearance.resolveTheme('light', true), 'light');
  assert.strictEqual(appAppearance.resolveTheme('dark', false), 'dark');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-appearance-'));
  try {
    const first = await settingsManager.loadSettings(temp);
    assert.strictEqual(first.settings.appearance, 'system');
    const dark = await settingsManager.saveSettings(temp, Object.assign({}, first.settings, { appearance: 'dark' }));
    assert.strictEqual(dark.settings.appearance, 'dark');
    const invalid = await settingsManager.saveSettings(temp, Object.assign({}, dark.settings, { appearance: 'purple' }));
    assert.strictEqual(invalid.settings.appearance, 'system');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  const root = path.join(__dirname, '..');
  const index = fs.readFileSync(path.join(root, 'src/main/index.html'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'src/main/css/app-theme.css'), 'utf8');
  const settingsUi = fs.readFileSync(path.join(root, 'src/main/settings-ui.js'), 'utf8');
  const profile = fs.readFileSync(path.join(root, 'src/main/profile.js'), 'utf8');
  assert(index.includes('./css/app-theme.css'));
  assert(theme.includes('html[data-theme="dark"]'));
  assert(theme.includes('--sl-surface'));
  assert(theme.includes('.workspace-empty-card'));
  assert(theme.includes('.appearance-options'));
  assert(settingsUi.includes("makeSection('Appearance')"));
  assert(settingsUi.includes("addAppearanceOption(appearanceOptions, 'system'"));
  assert(settingsUi.includes("addAppearanceOption(appearanceOptions, 'light'"));
  assert(settingsUi.includes("addAppearanceOption(appearanceOptions, 'dark'"));
  assert(profile.includes("title: 'No profiles yet'"));
  assert(!profile.includes("area.textContent = 'No items'"));
  console.log('PASS Light/Dark/System appearance persists safely and the modern visual system uses direct empty states without new dependencies.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
