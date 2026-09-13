'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const pkg = JSON.parse(read('package.json'));
const serviceCatalog = require('../src/main/service-catalog');
const tokenIcons = require('../src/main/token-icons');

assert(/^2\.6\.\d+$/.test(String(pkg.version || '')), 'Current product contract expects a SafeLedger 2.6.x candidate.');

// Navigation columns intentionally remain solid. The short-lived focused-column
// artwork experiment was removed; login artwork belongs only to the Detail area.
const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const theme = read('src/main/css/app-theme.css');
const palettes = read('src/main/css/appearance-palettes.css');
const dividers = read('src/main/css/workspace-dividers.css');

assert(!index.includes('column-focus-artwork.css'));
assert(!entry.includes('column-focus-artwork.js'));
for (const relative of [
  'src/main/column-focus-artwork.js',
  'src/main/css/column-focus-artwork.css',
  'src/main/assets/profile-column-focus.svg',
  'src/main/assets/vault-column-focus.svg',
  'src/main/assets/asset-column-focus.svg'
]) assert.strictEqual(exists(relative), false, `${relative} is a retired UI experiment and must stay removed.`);
assert(theme.includes('.dark1bg { background: var(--sl-sidebar-1) !important;'));
assert(theme.includes('.dark2bg { background: var(--sl-sidebar-2) !important;'));
assert(theme.includes('.dark3bg { background: var(--sl-sidebar-3) !important;'));
assert(!index.includes('data-column-focus') && !entry.includes('data-column-focus'));

for (const relative of [
  'src/main/assets/login-background-light.svg',
  'src/main/assets/login-background-dark.svg'
]) assert(exists(relative), `${relative} must remain packaged for the sign-in surface.`);
assert(palettes.includes('--sl-login-backdrop: url("../assets/login-background-light.svg")'));
assert(palettes.includes('--sl-login-backdrop: url("../assets/login-background-dark.svg")'));
assert(palettes.includes('.app-shell[data-login-mode="true"] .detail-column'));
assert(!palettes.includes('.app-shell[data-login-mode="true"] .app-cell {'));
assert(dividers.includes('border-right: 1px solid color-mix(in srgb, currentColor 14%, transparent) !important;'));

// Chain Games is a packaged local theme-aware square tile. Protect the current
// behavior itself rather than the historical implementation steps that led here.
const lightPath = serviceCatalog.chainGamesAssetUrl('light');
const colorfulPath = serviceCatalog.chainGamesAssetUrl('colorful');
const darkPath = serviceCatalog.chainGamesAssetUrl('dark');
assert.strictEqual(lightPath, './assets/chain-games-light-colorful.svg');
assert.strictEqual(colorfulPath, lightPath);
assert.strictEqual(darkPath, './assets/chain-games-dark.svg');

const lightSvg = read('src/main/assets/chain-games-light-colorful.svg');
const darkSvg = read('src/main/assets/chain-games-dark.svg');
for (const svg of [lightSvg, darkSvg]) {
  assert(svg.includes('viewBox="0 0 337 337"'));
  assert(svg.includes('rx="72"'));
  assert(svg.includes('M156,247.7l-92.9-76.9l92.2-115.4'), 'Chain Games must retain the approved left-only mark.');
  assert(!svg.includes('M164,4.5C73.4,4.5,0,77.9,0,168.5'), 'Retired circular Chain Games artwork must stay removed.');
  assert(!svg.includes('<text'));
  assert(!/<script\b/i.test(svg));
  assert(!/<foreignObject\b/i.test(svg));
  assert(!/<image\b/i.test(svg));
  assert(!/\bhref\s*=\s*["']https?:/i.test(svg));
}
assert(lightSvg.includes('<rect width="337" height="337" rx="72" fill="#000000"/>'));
assert(lightSvg.includes('fill="#FFFFFF"'));
assert(darkSvg.includes('<rect width="337" height="337" rx="72" fill="#FFFFFF"/>'));
assert(darkSvg.includes('fill="#000000"'));

const tokenCss = read('src/main/css/token-icons.css');
assert(tokenCss.includes('.chain-games-brand-image'));
assert(tokenCss.includes('background-image: url("../assets/chain-games-light-colorful.svg")'));
assert(tokenCss.includes('html[data-theme="dark"] .chain-games-brand-image'));
assert(tokenCss.includes('background-image: url("../assets/chain-games-dark.svg")'));
assert(tokenCss.includes('border-radius: 7px !important;'));

const serviceSource = read('src/main/service-catalog.js');
const tokenSource = read('src/main/token-icons.js');
assert(serviceSource.includes('chain-games-brand-image'));
assert(!/https?:\/\//i.test(lightPath) && !/https?:\/\//i.test(darkPath));
assert(tokenSource.includes("if (isChainGames(record)) return serviceCatalog.createIcon('Chain Games', className);"));
const chainToken = tokenIcons.getIconMatch({ name: 'Chain Games — Ethereum', symbol: 'CHAIN' });
assert(chainToken && chainToken.key === 'CHAIN-GAMES');
assert(chainToken && chainToken.src === lightPath);
assert(pkg.build && Array.isArray(pkg.build.files) && pkg.build.files.includes('src/**/*'));

console.log('PASS current SafeLedger product contract: solid navigation columns, scoped login wallpaper, preserved dividers, and local theme-aware Chain Games artwork.');
