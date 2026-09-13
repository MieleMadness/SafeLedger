'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 84, 'Focused column artwork must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.84-tests.js'),
  'The 2.6.84 focused-column regression must remain in the main regression chain.');

const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const focus = read('src/main/column-focus-artwork.js');
const css = read('src/main/css/column-focus-artwork.css');
const dividers = read('src/main/css/workspace-dividers.css');

assert(index.includes('./css/column-focus-artwork.css'), 'The focused-column stylesheet must be loaded by the renderer.');
assert(entry.includes("require('./column-focus-artwork.js');"), 'The focused-column state module must be bundled into the sandboxed renderer.');

for (const pair of [
  ["['vaultArea', 'profile']", 'Profile'],
  ["['groupArea', 'vault']", 'Vault'],
  ["['recordArea', 'asset']", 'Asset']
]) {
  assert(focus.includes(pair[0]), `${pair[1]} list clicks must own their matching focused-column state.`);
}
assert(/area\.addEventListener\('click',[\s\S]*?\}, true\);/.test(focus),
  'Column focus click handling must run in capture phase before list-item handlers replace their DOM nodes.');
for (const utility of ['dashboardButton', 'activityButton', 'settingsButton']) {
  assert(focus.includes(utility), `${utility} must clear decorative column focus for neutral utility views.`);
}
assert(focus.includes("shell.setAttribute('data-column-focus', kind)") && focus.includes("shell.removeAttribute('data-column-focus')"),
  'Column focus must be explicit transient renderer state, not persisted vault data.');

const artwork = [
  ['profile', 1, 'profile-column-focus.svg'],
  ['vault', 2, 'vault-column-focus.svg'],
  ['asset', 3, 'asset-column-focus.svg']
];
for (const [kind, column, file] of artwork) {
  assert(css.includes(`--sl-${kind}-column-art: url(\"../assets/${file}\")`), `${kind} must use its own local artwork asset.`);
  const selector = `.app-shell[data-column-focus=\"${kind}\"] .app-main-row > .app-cell:nth-child(${column})`;
  assert(css.includes(selector), `${kind} artwork must target only its matching main workspace column.`);
}
assert(!css.includes('.app-search-row') && !css.includes('.app-button-row'),
  'Focused artwork must not spill into the search row or bottom action row.');
assert(!/border(?:-color)?\s*:/.test(css), 'Focused artwork must not override workspace divider borders.');
assert(dividers.includes('border-right: 1px solid color-mix(in srgb, currentColor 14%, transparent) !important;'),
  'The existing workspace divider contract must remain intact.');

const profileSvg = read('src/main/assets/profile-column-focus.svg');
const vaultSvg = read('src/main/assets/vault-column-focus.svg');
const assetSvg = read('src/main/assets/asset-column-focus.svg');

for (const [name, svg] of [['profile', profileSvg], ['vault', vaultSvg], ['asset', assetSvg]]) {
  assert(svg.startsWith('<svg ') && svg.includes('viewBox="0 0 540 960"'), `${name} artwork must remain a scalable local SVG.`);
  assert(svg.includes('filter id="glow"'), `${name} artwork must retain the soft-glow treatment.`);
  assert(!/<script\b/i.test(svg) && !/<foreignObject\b/i.test(svg) && !/<image\b/i.test(svg),
    `${name} artwork must remain self-contained and non-executable.`);
  assert(!/\bhref\s*=\s*["']https?:/i.test(svg), `${name} artwork must not reference remote resources.`);
}
assert(profileSvg.includes('₿') && profileSvg.includes('Profile focus artwork with vault and crypto imagery'),
  'Profile artwork must intentionally blend crypto and vault/security imagery.');
assert(!vaultSvg.includes('₿') && !vaultSvg.includes('Ethereum') && !vaultSvg.includes('Solana') && !vaultSvg.includes('USDC'),
  'Vault artwork must stay strictly focused on vault/storage/security imagery rather than token logos.');
assert(assetSvg.includes('₿') && assetSvg.includes('Asset focus artwork with cryptocurrency token imagery'),
  'Asset artwork must remain cryptocurrency-token focused.');
assert(pkg.build.files.includes('src/**/*'), 'Packaged builds must continue including all local artwork assets.');

const release = read('RELEASE-2.6.84.md').toLowerCase();
for (const phrase of ['profile', 'vault', 'asset', 'main focus', 'home', 'settings', 'solid', 'column dividers', 'local/offline']) {
  assert(release.includes(phrase), `2.6.84 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.83-tests.js')], { stdio: 'pipe' });
for (const relative of ['src/main/column-focus-artwork.js', 'scripts/hotfix-2.6.84-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log(`PASS SafeLedger ${pkg.version} shows one local focus image only in the active Profile/Vault/Asset main column and clears it for neutral utility views.`);
