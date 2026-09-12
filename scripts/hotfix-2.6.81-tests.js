'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 81, 'The display-column login wallpaper contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.81-tests.js'),
  'The 2.6.81 display-column wallpaper regression must remain in the main regression chain.');

const palette = read('src/main/css/appearance-palettes.css');
const theme = read('src/main/css/app-theme.css');
const dividers = read('src/main/css/workspace-dividers.css');
const index = read('src/main/index.html');
const collapse = read('src/main/column-collapse-ui.js');

assert(index.includes('app-cell dark4bg content-middle detail-column'),
  'The main workspace must retain its dedicated Detail/display column.');
assert(palette.includes('.app-shell[data-login-mode="true"] .detail-column'),
  'Login wallpaper must be scoped to the Detail/display column.');
assert(!/\.app-shell\[data-login-mode="true"\]\s*\{/.test(palette),
  'Login wallpaper must not be applied to the entire app shell.');
assert(!/\.app-shell\[data-login-mode="true"\]\s+\.app-cell/.test(palette),
  'Login mode must not make every workspace cell transparent.');
assert(!palette.includes('border-color: transparent !important;'),
  'Login wallpaper must not erase existing column divider borders.');

assert(theme.includes('.dark4bg { background: var(--sl-bg) !important;'),
  'The base theme intentionally owns the normal Detail-column background with an important shorthand.');
assert(palette.includes('background-color: var(--sl-bg) !important;') &&
  palette.includes('background-image: var(--sl-login-backdrop) !important;') &&
  palette.includes('background-position: 72% center !important;') &&
  palette.includes('background-size: cover !important;') &&
  palette.includes('background-repeat: no-repeat !important;'),
  'The login-state Detail-column wallpaper must explicitly win the important base background cascade.');

assert(palette.includes('html[data-theme="light"],\nhtml[data-theme="colorful"] {\n  --sl-login-backdrop: url("../assets/login-background-light.svg");\n}'),
  'Light and Colorful must share the same local frosted wallpaper.');
assert(palette.includes('html[data-theme="dark"] {\n  --sl-login-backdrop: url("../assets/login-background-dark.svg");\n}'),
  'Dark must use the matching local navy/neon wallpaper.');
assert(!palette.includes('url("http://') && !palette.includes('url("https://'),
  'Login wallpaper must stay fully local/offline.');

assert(dividers.includes('.app-search-row > .app-cell:nth-child(-n+3)') &&
  dividers.includes('.app-main-row > .app-cell:nth-child(-n+3)') &&
  dividers.includes('.app-button-row > .app-cell:nth-child(-n+3)') &&
  dividers.includes('border-right: 1px solid color-mix(in srgb, currentColor 14%, transparent) !important;'),
  'The existing workspace column separator contract must remain intact.');
assert(collapse.includes("shell.setAttribute('data-login-mode', 'true');") &&
  collapse.includes("shell.removeAttribute('data-login-mode');"),
  'The wallpaper must remain tied to explicit login state only.');

for (const relative of [
  'src/main/assets/login-background-light.svg',
  'src/main/assets/login-background-dark.svg'
]) {
  const svg = read(relative);
  assert(svg.includes('width="1280"') && svg.includes('height="720"') && svg.includes('viewBox="0 0 1280 720"'),
    `${relative} must preserve the intended 1280x720 16:9 wallpaper composition.`);
  assert(svg.includes('id="softGlow"') && svg.includes('id="tinyGlow"'),
    `${relative} must retain the soft-glow visual treatment from the supplied references.`);
  assert(svg.includes('₿') && svg.includes('Ethereum crystal') && svg.includes('Solana mark') && svg.includes('USDC-style coin'),
    `${relative} must retain recognizable crypto imagery.`);
  assert(svg.includes('<!-- wallet -->') && svg.includes('<!-- lock -->'),
    `${relative} must retain the wallet/security imagery from the reference direction.`);
  assert(!/<script\b/i.test(svg), `${relative} must not contain executable script.`);
  assert(!/<foreignObject\b/i.test(svg), `${relative} must not embed HTML.`);
  assert(!/<image\b/i.test(svg), `${relative} must remain self-contained without nested image dependencies.`);
  assert(!/\bhref\s*=\s*["']https?:/i.test(svg), `${relative} must not reference remote resources.`);
}

const release = read('RELEASE-2.6.81.md').toLowerCase();
for (const phrase of [
  'display column',
  'column dividers',
  'crypto icons',
  'soft glow',
  'light and colorful',
  'dark',
  'local/offline',
  'no authentication'
]) {
  assert(release.includes(phrase), `2.6.81 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.78-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.80-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.78-tests.js',
  'scripts/hotfix-2.6.81-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} scopes the reference-style login wallpaper to the display column, wins the base theme cascade, and preserves workspace dividers.`);
