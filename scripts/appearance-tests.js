'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const settingsSchema = require('../src/main/settings-schema');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
const appAppearance = require('../src/main/app-appearance');

(async () => {
  assert.deepStrictEqual(settingsSchema.APPEARANCE_VALUES, ['system', 'light', 'colorful', 'dark']);
  assert.strictEqual(settingsSchema.normalizeAppearance('LIGHT'), 'light');
  assert.strictEqual(settingsSchema.normalizeAppearance('COLORFUL'), 'colorful');
  assert.strictEqual(settingsSchema.normalizeAppearance('dark'), 'dark');
  assert.strictEqual(settingsSchema.normalizeAppearance('unexpected'), 'system');
  assert.strictEqual(appAppearance.resolveTheme('system', false), 'light');
  assert.strictEqual(appAppearance.resolveTheme('system', true), 'dark');
  assert.strictEqual(appAppearance.resolveTheme('light', true), 'light');
  assert.strictEqual(appAppearance.resolveTheme('colorful', true), 'colorful');
  assert.strictEqual(appAppearance.resolveTheme('dark', false), 'dark');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-appearance-'));
  try {
    const first = await settingsManager.loadSettings(temp);
    assert.strictEqual(first.settings.appearance, 'system');
    assert.strictEqual(first.settings.appearanceSchemaVersion, 2);
    const dark = await settingsManager.saveSettings(temp, Object.assign({}, first.settings, { appearance: 'dark' }));
    assert.strictEqual(dark.settings.appearance, 'dark');
    const invalid = await settingsManager.saveSettings(temp, Object.assign({}, dark.settings, { appearance: 'purple' }));
    assert.strictEqual(invalid.settings.appearance, 'system');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  const legacyTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-appearance-legacy-'));
  try {
    fs.writeFileSync(path.join(legacyTemp, 'settings.json'), JSON.stringify({
      formatVersion: 2,
      appearance: 'light',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }, null, 2));
    const migrated = await settingsManager.loadSettings(legacyTemp);
    assert.strictEqual(migrated.settings.appearance, 'colorful', 'Pre-2.6.59 Light preference must preserve the former blue-rail look as Colorful.');
    assert.strictEqual(migrated.settings.appearanceSchemaVersion, 2);
    const newLight = await settingsManager.saveUserSettings(legacyTemp, { appearance: 'light' });
    assert.strictEqual(newLight.settings.appearance, 'light', 'After migration, users must be able to select the new Light theme normally.');
  } finally {
    fs.rmSync(legacyTemp, { recursive: true, force: true });
  }

  const root = path.join(__dirname, '..');
  const index = fs.readFileSync(path.join(root, 'src/main/index.html'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'src/main/css/app-theme.css'), 'utf8');
  const palettes = fs.readFileSync(path.join(root, 'src/main/css/appearance-palettes.css'), 'utf8');
  const settingsUi = fs.readFileSync(path.join(root, 'src/main/settings-ui.js'), 'utf8');
  const profile = fs.readFileSync(path.join(root, 'src/main/profile.js'), 'utf8');
  assert(index.includes('./css/app-theme.css'));
  assert(index.includes('./css/appearance-palettes.css'));
  assert(index.indexOf('./css/appearance-palettes.css') > index.indexOf('./css/qr-theme.css'), 'Appearance palette must remain the final intentional color layer.');
  assert(index.includes('data-appearance="system" data-theme="light"'));
  assert(theme.includes('html[data-theme="dark"]'));
  assert(theme.includes('--sl-surface'));
  assert(theme.includes('.workspace-empty-card'));
  assert(theme.includes('.appearance-options'));
  assert(palettes.includes('html[data-theme="light"]'));
  assert(palettes.includes('html[data-theme="colorful"]'));
  assert(palettes.includes('--sl-sidebar-1: #fbfdff'));
  assert(palettes.includes('--sl-sidebar-1: #2563eb'));
  assert(palettes.includes('The former Light palette is intentionally preserved as Colorful.'));
  assert(settingsUi.includes("makeSection('Appearance')"));
  assert(settingsUi.includes("addAppearanceOption(options, 'system', 'System'"));
  assert(settingsUi.includes("addAppearanceOption(options, 'light', 'Light'"));
  assert(settingsUi.includes("addAppearanceOption(options, 'colorful', 'Colorful'"));
  assert(settingsUi.includes("addAppearanceOption(options, 'dark', 'Dark'"));
  assert(settingsUi.includes("saveUserSetting(params, { appearance });"),
    'Appearance changes must save through the canonical narrow Settings mutation path.');
  assert(!settingsUi.includes('MutationObserver') && !settingsUi.includes('setTimeout('),
    'Appearance rendering must not depend on post-render repair timing.');
  assert(profile.includes("title: 'No profiles yet'"));
  assert(!profile.includes("area.textContent = 'No items'"));
  console.log('PASS System/Light/Colorful/Dark appearance persists safely, legacy Light migrates to Colorful, and the new Light palette keeps one canonical Settings renderer.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
