'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 87, 'The solid-column rollback must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.87-tests.js'),
  'The 2.6.87 rollback regression must remain in the main regression chain.');

const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const theme = read('src/main/css/app-theme.css');
const palettes = read('src/main/css/appearance-palettes.css');
const dividers = read('src/main/css/workspace-dividers.css');

assert(!index.includes('column-focus-artwork.css'), 'Focused-column CSS must not be loaded.');
assert(!entry.includes('column-focus-artwork.js'), 'Focused-column runtime state must not be bundled.');

for (const relative of [
  'src/main/column-focus-artwork.js',
  'src/main/css/column-focus-artwork.css',
  'src/main/assets/profile-column-focus.svg',
  'src/main/assets/vault-column-focus.svg',
  'src/main/assets/asset-column-focus.svg'
]) {
  assert(!exists(relative), `${relative} must stay removed.`);
}

assert(theme.includes('.dark1bg { background: var(--sl-sidebar-1) !important;'), 'Profiles must use the normal solid sidebar color.');
assert(theme.includes('.dark2bg { background: var(--sl-sidebar-2) !important;'), 'Vaults must use the normal solid sidebar color.');
assert(theme.includes('.dark3bg { background: var(--sl-sidebar-3) !important;'), 'Assets must use the normal solid sidebar color.');
assert(!index.includes('data-column-focus') && !entry.includes('data-column-focus'), 'No focused-column renderer state should remain.');

for (const relative of [
  'src/main/assets/login-background-light.svg',
  'src/main/assets/login-background-dark.svg'
]) {
  assert(exists(relative), `${relative} must remain for the sign-in display wallpaper.`);
}
assert(palettes.includes('--sl-login-backdrop: url("../assets/login-background-light.svg")'), 'Light and Colorful must keep the sign-in wallpaper.');
assert(palettes.includes('--sl-login-backdrop: url("../assets/login-background-dark.svg")'), 'Dark must keep the sign-in wallpaper.');
assert(palettes.includes('.app-shell[data-login-mode="true"] .detail-column'), 'The sign-in wallpaper must remain display-column scoped.');
assert(dividers.includes('border-right: 1px solid color-mix(in srgb, currentColor 14%, transparent) !important;'),
  'Workspace divider lines must remain unchanged.');

const release = read('RELEASE-2.6.87.md').toLowerCase();
for (const phrase of ['solid theme colors', 'sign-in wallpaper', 'divider lines', 'removed completely', 'testing cleanup']) {
  assert(release.includes(phrase), `2.6.87 release notes must mention: ${phrase}`);
}

for (const historical of ['hotfix-2.6.84-tests.js', 'hotfix-2.6.85-tests.js', 'hotfix-2.6.86-tests.js']) {
  execFileSync(process.execPath, [path.join(root, 'scripts', historical)], { stdio: 'pipe' });
}
for (const relative of ['scripts/hotfix-2.6.84-tests.js', 'scripts/hotfix-2.6.85-tests.js', 'scripts/hotfix-2.6.86-tests.js', 'scripts/hotfix-2.6.87-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log(`PASS SafeLedger ${pkg.version} restores solid Profile/Vault/Asset columns while preserving the sign-in wallpaper and workspace dividers.`);
