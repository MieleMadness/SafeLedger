'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.59');
assert(pkg.scripts['test:regression'].includes('node scripts/appearance-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.59-tests.js'));

const schema = read('src/main/settings-schema.js');
const manager = read('src/main/installManager/installManager/settingsManager.js');
const appearance = read('src/main/app-appearance.js');
const settingsUi = read('src/main/settings-ui.js');
const index = read('src/main/index.html');
const palettes = read('src/main/css/appearance-palettes.css');
const priorGate = read('scripts/hotfix-2.6.58-tests.js');
const release = read('RELEASE-2.6.59.md');

assert(schema.includes("['system', 'light', 'colorful', 'dark']"));
assert(manager.includes('APPEARANCE_SCHEMA_VERSION = 2'));
assert(manager.includes("migrateLegacyLight ? 'colorful'"));
assert(manager.includes('appearanceSchemaVersion: APPEARANCE_SCHEMA_VERSION'));
assert(appearance.includes("return normalized === 'system' ? (systemDark ? 'dark' : 'light') : normalized;"));

assert(settingsUi.includes("addAppearanceOption(options, 'light', 'Light'"));
assert(settingsUi.includes("addAppearanceOption(options, 'colorful', 'Colorful'"));
assert(settingsUi.includes('Classic SafeLedger look with bold blue navigation.'));
assert(!settingsUi.includes("addAppearanceOption(options, 'light', 'Light', 'Bright workspace with SafeLedger blue navigation.'"));

assert(index.includes('data-appearance="system" data-theme="light"'));
assert(index.includes('./css/appearance-palettes.css'));
assert(index.indexOf('./css/appearance-palettes.css') > index.indexOf('./css/qr-theme.css'));
assert(palettes.includes('html[data-theme="light"]'));
assert(palettes.includes('html[data-theme="colorful"]'));
assert(palettes.includes('--sl-sidebar-1: #fbfdff'));
assert(palettes.includes('--sl-sidebar-2: #f8fbff'));
assert(palettes.includes('--sl-sidebar-3: #f4f9ff'));
assert(palettes.includes('--sl-sidebar-1: #2563eb'));
assert(palettes.includes('background: var(--sl-selected) !important;'));
assert(palettes.includes('color: var(--sl-primary-strong) !important;'));
assert(priorGate.includes('parts[2] >= 58'));
assert(release.includes('Colorful'));
assert(release.includes('legacy Light'));

execFileSync(process.execPath, [path.join(root, 'scripts/appearance-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/appearance-tests.js',
  'scripts/hotfix-2.6.58-tests.js',
  'scripts/hotfix-2.6.59-tests.js',
  'src/main/settings-schema.js',
  'src/main/installManager/installManager/settingsManager.js',
  'src/main/settings-ui.js',
  'src/main/app-appearance.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.59 splits Light and Colorful cleanly, preserves legacy Light as Colorful, and adds the image-inspired airy Light palette.');
