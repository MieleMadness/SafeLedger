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
assert(parts[2] >= 78, 'The login-background contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.78-tests.js'),
  'The 2.6.78 login-background regression must remain in the main regression chain.');

const palette = read('src/main/css/appearance-palettes.css');
const collapse = read('src/main/column-collapse-ui.js');

assert(palette.includes('html[data-theme="light"],\nhtml[data-theme="colorful"] {\n  --sl-login-backdrop: url("../assets/login-background-light.svg");\n}'),
  'Light and Colorful must share the same local login artwork.');
assert(palette.includes('html[data-theme="dark"] {\n  --sl-login-backdrop: url("../assets/login-background-dark.svg");\n}'),
  'Dark must use the matching dark login artwork.');
assert(!palette.includes('login-background-light.jpg') && !palette.includes('login-background-dark.jpg'),
  'Malformed binary login artwork must not remain referenced by the active palette.');
assert(palette.includes('.app-shell[data-login-mode="true"]') &&
  palette.includes('background-size: cover;') &&
  palette.includes('background-repeat: no-repeat;'),
  'Login artwork must fill the login shell without tiling.');
assert(palette.includes('.app-shell[data-login-mode="true"] .app-cell') &&
  palette.includes('background-color: transparent !important;'),
  'Workspace cells must expose the login artwork only while login mode is active.');
assert(!palette.includes('url("http://') && !palette.includes('url("https://'),
  'Login artwork must not introduce remote runtime resources.');

assert(collapse.includes("shell.setAttribute('data-login-mode', 'true');"),
  'collapseForLogin must explicitly activate login artwork state.');
assert(collapse.includes("shell.removeAttribute('data-login-mode');"),
  'revealAfterLogin must remove login artwork state before restoring the workspace.');

for (const relative of [
  'src/main/assets/login-background-light.svg',
  'src/main/assets/login-background-dark.svg'
]) {
  const svg = read(relative);
  assert(svg.startsWith('<svg '), `${relative} must be a directly readable SVG document.`);
  assert(svg.includes('xmlns="http://www.w3.org/2000/svg"'), `${relative} must declare the SVG namespace.`);
  assert(svg.includes('width="1280"') && svg.includes('height="720"'),
    `${relative} must retain the intended 1280x720 source composition.`);
  assert(svg.includes('viewBox="0 0 1280 720"'),
    `${relative} must retain a scalable 16:9 viewBox.`);
  assert(!/<script\b/i.test(svg), `${relative} must not contain scripts.`);
  assert(!/<foreignObject\b/i.test(svg), `${relative} must not embed HTML.`);
  assert(!/<image\b/i.test(svg), `${relative} must remain self-contained without nested image dependencies.`);
  assert(!/\bhref\s*=\s*["']https?:/i.test(svg), `${relative} must not reference remote content.`);
}
assert(pkg.build.files.includes('src/**/*'),
  'Electron packaging must continue including the local login artwork.');

const release = read('RELEASE-2.6.78.md').toLowerCase();
for (const phrase of [
  'light and colorful',
  'dark',
  'login',
  'local',
  'offline',
  '1280x720'
]) {
  assert(release.includes(phrase), `2.6.78 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.77-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'src/main/column-collapse-ui.js',
  'scripts/hotfix-2.6.78-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} uses self-contained theme-aware login artwork only during login.`);
