'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.58');
assert(pkg.scripts['test:regression'].includes('node scripts/startup-performance-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.58-tests.js'));

const prepare = read('scripts/prepare-token-assets.js');
const web3 = read('src/main/web3-icons.js');
const profileSetup = read('src/main/profile-setup.js');
const tokenIcons = read('src/main/token-icons.js');
const priorGate = read('scripts/hotfix-2.6.57-tests.js');

assert(prepare.includes("version: 3") && prepare.includes("assetMode: 'local-svg-files'"));
assert(prepare.includes('writeLocalIcon(category, canonical, source)'));
assert(prepare.includes('loads individual local SVG files on'));
assert(!web3.includes('manifest contains only local data URLs'));
assert(web3.includes('lightweight local SVG paths plus lookup aliases'));

assert(!profileSetup.includes("const web3Icons = require('./web3-icons');"),
  'Profile setup must not eagerly load the Web3 icon manifest before BrowserWindow creation.');
assert(profileSetup.includes("function web3Icons() { return web3IconsModule || (web3IconsModule = require('./web3-icons')); }"));
assert(!tokenIcons.includes("const web3Icons = require('./web3-icons');"),
  'Token icon helpers must not eagerly load the Web3 icon manifest in main-process startup dependencies.');
assert(tokenIcons.includes("function web3Icons() { return web3IconsModule || (web3IconsModule = require('./web3-icons')); }"));

assert(priorGate.includes('parts[2] >= 57'),
  'The 2.6.57 user-requested Recovery UX gate must remain active on 2.6.58 and later 2.6.x candidates.');

execFileSync(process.execPath, [path.join(root, 'scripts/startup-performance-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/prepare-token-assets.js',
  'scripts/startup-performance-tests.js',
  'scripts/hotfix-2.6.58-tests.js',
  'src/main/web3-icons.js',
  'src/main/profile-setup.js',
  'src/main/token-icons.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.58 removes bulk Web3 SVG payloads and eager icon-catalog loading from the critical startup path while preserving the full offline catalog.');