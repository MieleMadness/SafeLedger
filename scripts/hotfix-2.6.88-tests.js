'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);
const serviceCatalog = require('../src/main/service-catalog');
const tokenIcons = require('../src/main/token-icons');

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 88, 'The square theme-aware Chain Games icon must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.88-tests.js'),
  'The 2.6.88 Chain Games regression must remain in the main regression chain.');

const lightPath = serviceCatalog.chainGamesAssetUrl('light');
const colorfulPath = serviceCatalog.chainGamesAssetUrl('colorful');
const darkPath = serviceCatalog.chainGamesAssetUrl('dark');
assert.strictEqual(lightPath, './assets/chain-games-light-colorful.svg');
assert.strictEqual(colorfulPath, lightPath, 'Light and Colorful must intentionally share one Chain Games tile.');
assert.strictEqual(darkPath, './assets/chain-games-dark.svg');

const lightSvg = read('src/main/assets/chain-games-light-colorful.svg');
const darkSvg = read('src/main/assets/chain-games-dark.svg');
const leftOnlyMark = 'M156,247.7l-92.9-76.9l92.2-115.4';
const retiredOuterCircle = 'M164,4.5C73.4,4.5,0,77.9,0,168.5';
for (const svg of [lightSvg, darkSvg]) {
  assert(svg.includes('viewBox="0 0 337 337"'), 'Chain Games variants must remain square SVG artwork.');
  assert(svg.includes('rx="72"'), 'Chain Games variants must retain rounded-square corners.');
  assert(svg.includes(leftOnlyMark), 'Chain Games variants must use the supplied left-only symbol geometry.');
  assert(!svg.includes(retiredOuterCircle), 'The old circular outer mark must stay removed.');
  assert(!svg.includes('<text'), 'The CHAIN GAMES wordmark and initials must stay out of the icon tile.');
  assert(!/<script\b/i.test(svg) && !/<foreignObject\b/i.test(svg) && !/<image\b/i.test(svg),
    'Chain Games artwork must remain self-contained and non-executable.');
  assert(!/\bhref\s*=\s*["']https?:/i.test(svg), 'Chain Games artwork must not load remote resources.');
}
assert(lightSvg.includes('<rect width="337" height="337" rx="72" fill="#000000"/>') && lightSvg.includes('fill="#FFFFFF"'),
  'Light/Colorful must render a black square with a white logo.');
assert(darkSvg.includes('<rect width="337" height="337" rx="72" fill="#FFFFFF"/>') && darkSvg.includes('fill="#000000"'),
  'Dark must render a white square with a black logo.');

const css = read('src/main/css/token-icons.css');
assert(css.includes('.chain-games-brand-image'), 'Chain Games must have an explicit square artwork class.');
assert(css.includes('background-image: url("../assets/chain-games-light-colorful.svg")'),
  'Light/Colorful must use the black-square artwork by default.');
assert(css.includes('html[data-theme="dark"] .chain-games-brand-image') && css.includes('background-image: url("../assets/chain-games-dark.svg")'),
  'Dark mode must switch to the white-square artwork through the resolved SafeLedger theme.');
assert(css.includes('border-radius: 7px !important;'),
  'Chain Games must match the 7px corner rounding used by the other list icons.');

const serviceSource = read('src/main/service-catalog.js');
assert(serviceSource.includes("document.createElement('span')") && serviceSource.includes('chain-games-brand-image'),
  'Vault Item Chain Games artwork must be a theme-responsive local tile rather than a fixed-color image.');
const tokenSource = read('src/main/token-icons.js');
assert(tokenSource.includes("if (isChainGames(record)) return serviceCatalog.createIcon('Chain Games', className);"),
  'CHAIN Assets must use the same theme-responsive Chain Games tile as the Vault Item.');
const chainToken = tokenIcons.getIconMatch({ name: 'Chain Games — Ethereum', symbol: 'CHAIN' });
assert(chainToken && chainToken.key === 'CHAIN-GAMES' && chainToken.src === lightPath,
  'CHAIN recognition must continue resolving to the canonical Chain Games artwork family.');
assert(pkg.build.files.includes('src/**/*'), 'Packaged builds must continue including both local Chain Games SVG variants.');

const release = read('RELEASE-2.6.88.md').toLowerCase();
for (const phrase of ['chain games', 'light', 'colorful', 'dark', 'black background', 'white background', 'left icon', 'rounded', 'local/offline']) {
  assert(release.includes(phrase), `2.6.88 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.4-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.76-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.87-tests.js')], { stdio: 'pipe' });
for (const relative of ['src/main/service-catalog.js', 'src/main/token-icons.js', 'scripts/hotfix-2.6.88-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log(`PASS SafeLedger ${pkg.version} uses the requested square left-only Chain Games icon with Light/Colorful and Dark variants.`);
