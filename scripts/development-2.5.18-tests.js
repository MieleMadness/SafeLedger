'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2518 = version[0] > 2 ||
  (version[0] === 2 && version[1] > 5) ||
  (version[0] === 2 && version[1] === 5 && version[2] >= 18);
assert(atLeast2518, 'build must be SafeLedger 2.5.18 or later');

const seedSource = read('src/main/vault-item-asset-seeding-ui.js');
assert(seedSource.includes("result.type !== 'group-create'"),
  'post-save asset refresh must run only after a newly created Vault Item is returned.');
assert(seedSource.includes("document.querySelector('#groupArea .nav > li > a.item-selected')"),
  'post-save asset refresh must target the newly selected Vault Item.');
assert(seedSource.includes('selected.click();'),
  'post-save asset refresh must reuse the normal Vault Item selection renderer.');
assert(seedSource.includes('queueMicrotask(() => refreshCreatedWallet())'),
  'post-save asset refresh must wait until the save result has rebuilt the Vault Item list.');
assert(seedSource.includes('createSeededSend(originalSend, seedCreateRequest'),
  '2.5.18+ must preserve reviewed asset seeding before a new Vault Item is saved.');

const forwarderSource = read('src/main/vault-item-save-forwarder.js');
assert(forwarderSource.includes('seedFn(args[0])'),
  'the shared save forwarder must invoke reviewed preset seeding for Vault Item saves.');
assert(forwarderSource.includes('return originalSend(channel, ...args);'),
  'the save forwarder must continue to the encrypted save IPC after optional preset seeding.');

const rendererEntry = read('src/main/renderer-entry.js');
assert(rendererEntry.includes("require('./vault-item-asset-seeding-ui.js')"),
  'the asset seeding and post-save refresh module must load in the renderer.');

console.log('PASS SafeLedger 2.5.18+ newly created wallets immediately render their seeded asset icons after save.');
