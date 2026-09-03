'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.12', 'This workflow candidate must report SafeLedger 2.6.12.');
assert(read('package.json').includes('node scripts/hotfix-2.6.12-tests.js'),
  '2.6.12 regression coverage must stay in the locked suite.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/profile-wallet-picker-ui.js')), false,
  'The retired Profile wallet-picker MutationObserver helper must stay removed.');

const profileSource = read('src/main/profile.js');
const entrySource = read('src/main/renderer-entry.js');
assert(profileSource.includes("const walletIcons = require('./wallet-icons');"),
  'Profile setup must own wallet-template artwork directly.');
assert(profileSource.includes('function createWalletTemplateIcon(template)'));
assert(profileSource.includes("walletIcons.createIconElement({ name: template.name }, 'profile-wallet-template-icon')"));
assert(profileSource.includes('const icon = createWalletTemplateIcon(template);'));
assert(profileSource.includes('if (icon) label.appendChild(icon);'));
assert(!profileSource.includes('MutationObserver'),
  'Profile creation must not watch the DOM to add wallet-template artwork.');
assert(!entrySource.includes("require('./profile-wallet-picker-ui.js')"),
  'The renderer entry must not reload the retired Profile wallet-picker helper.');

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.className = '';
    this.src = '';
    this.alt = '';
    this.draggable = true;
    this.textContent = '';
    this.attributes = {};
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

const previousDocument = global.document;
global.document = {
  createElement: (tag) => new FakeElement(tag)
};

try {
  const profilePath = require.resolve('../src/main/profile.js');
  delete require.cache[profilePath];
  const profile = require(profilePath);
  const icon = profile._test.createWalletTemplateIcon({ name: 'Ledger' });

  assert(icon, 'A reviewed Ledger template must receive local artwork during Profile form rendering.');
  assert.strictEqual(icon.tagName, 'IMG');
  assert.strictEqual(icon.className, 'profile-wallet-template-icon');
  assert(icon.src.startsWith('data:'), 'Profile wallet-template artwork must remain local/offline.');
  assert(/Ledger icon/i.test(icon.alt), 'Directly rendered template artwork must retain accessible alt text.');
  assert.strictEqual(icon.draggable, false);
  assert.strictEqual(profile._test.createWalletTemplateIcon(null), null,
    'Missing template data must fail safely without creating placeholder DOM.');
} finally {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
}

console.log('PASS SafeLedger 2.6.12 renders Add Profile wallet-template artwork directly with no observer helper.');
