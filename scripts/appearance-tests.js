'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const settingsSchema = require('../src/main/settings-schema');
const settingsManager = require('../src/main/settings-manager');
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
  const manifest = fs.readFileSync(path.join(root, 'src/main/css/app.css'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'src/main/css/app-theme.css'), 'utf8');
  const palettes = fs.readFileSync(path.join(root, 'src/main/css/appearance-palettes.css'), 'utf8');
  const darkArtworkPath = path.join(root, 'src/main/assets/login-background-dark.jpg');
  const lightArtworkPath = path.join(root, 'src/main/assets/login-background-light.jpg');
  const darkLoginArtwork = fs.readFileSync(darkArtworkPath);
  const lightLoginArtwork = fs.readFileSync(lightArtworkPath);
  const settingsUi = fs.readFileSync(path.join(root, 'src/main/settings-ui.js'), 'utf8');
  const profile = fs.readFileSync(path.join(root, 'src/main/profile.js'), 'utf8');

  assert(index.includes('./css/app.css'));
  assert(manifest.includes('@import url("app-theme.css");'));
  assert(manifest.includes('@import url("appearance-palettes.css");'));
  assert(manifest.indexOf('@import url("appearance-palettes.css");') > manifest.indexOf('@import url("qr-theme.css");'), 'Appearance palette must remain the final intentional color layer.');
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
  assert(palettes.includes('--sl-login-backdrop: url("../assets/login-background-light.jpg")'));
  assert(palettes.includes('--sl-login-backdrop: url("../assets/login-background-dark.jpg")'));
  assert(!palettes.includes('login-background-light.svg') && !palettes.includes('login-background-dark.svg'),
    'Sign-in themes must not fall back to the retired SVG wrappers.');

  assert(darkLoginArtwork.length > 100000 && lightLoginArtwork.length > 100000,
    'Approved sign-in artwork must remain packaged as full local image assets.');
  assert.deepStrictEqual([...darkLoginArtwork.subarray(0, 3)], [0xff, 0xd8, 0xff],
    'Dark sign-in artwork must remain a directly packaged JPEG.');
  assert.deepStrictEqual([...lightLoginArtwork.subarray(0, 3)], [0xff, 0xd8, 0xff],
    'Light/Colorful sign-in artwork must remain a directly packaged JPEG.');
  assert.strictEqual(crypto.createHash('sha256').update(darkLoginArtwork).digest('hex'),
    '8299d8839ebd17248c424411981e7df519a61afe96c7656c4edfea7d99521f06',
    'Dark sign-in artwork must remain the approved user-selected composition.');
  assert.strictEqual(crypto.createHash('sha256').update(lightLoginArtwork).digest('hex'),
    'd0ca310c01906c668b9465928381de3d384c770255f5213abcde4d28f82b51a6',
    'Light/Colorful sign-in artwork must remain the approved matching composition.');
  assert(!fs.existsSync(path.join(root, 'src/main/assets/login-background-dark.svg')) &&
    !fs.existsSync(path.join(root, 'src/main/assets/login-background-light.svg')),
    'Retired SVG wrappers must not remain as duplicate sign-in artwork.');

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
  console.log('PASS System/Light/Colorful/Dark appearance persists safely and approved local sign-in artwork remains pinned to the selected images.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
