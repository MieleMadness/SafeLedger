'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 11,
  'SafeLedger 2.6.11 regressions must remain active on 2.6.11 and later 2.6.x patches.');
assert(read('package.json').includes('node scripts/hotfix-2.6.11-tests.js'),
  '2.6.11 regression coverage must stay in the locked suite.');

const groupSource = read('src/main/group.js');
const scaleSource = read('src/main/ui-scale-2.6.7.js');
assert(groupSource.includes('function appendVaultItemHeader(area, group, category = getWalletCategory(group))'));
assert(groupSource.includes("const icon = vaultItemPresentation.createIconElement(group);"));
assert(groupSource.includes("icon.classList.add('wallet-detail-brand-image');"));
assert(groupSource.includes("header.className = 'wallet-detail-header';"));
assert(groupSource.includes("titleWrap.className = 'wallet-detail-title-wrap';"));
assert(groupSource.includes('appendVaultItemHeader(area, params.group, category);'));
assert(!scaleSource.includes('MutationObserver'),
  'Window sizing must not observe Vault Item list/detail DOM changes.');
assert(!scaleSource.includes('patchVaultDetail'));
assert(!scaleSource.includes('selectedVaultIcon'));
assert(!scaleSource.includes('cloneDetailIcon'));
assert(!scaleSource.includes('cloneNode('));

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.classList = new FakeClassList();
    this.dataset = {};
    this.attributes = {};
    this.textContent = '';
    this.src = '';
    this.alt = '';
    this.draggable = true;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
}

const previousDocument = global.document;
global.document = {
  createElement: (tag) => new FakeElement(tag)
};

try {
  const groupPath = require.resolve('../src/main/group.js');
  delete require.cache[groupPath];
  const group = require(groupPath);
  const area = new FakeElement('div');
  const header = group._test.appendVaultItemHeader(area, {
    name: 'GitHub',
    category: 'Website Account'
  }, 'Website Account');

  assert.strictEqual(area.children.length, 1, 'Direct renderer must append one complete Vault Item header.');
  assert.strictEqual(header, area.children[0]);
  assert.strictEqual(header.className, 'wallet-detail-header');
  assert.strictEqual(header.children.length, 2, 'Header must contain artwork and the title/category wrapper.');

  const icon = header.children[0];
  assert.strictEqual(icon.tagName, 'IMG');
  assert(icon.src.startsWith('data:image/svg+xml'), 'Known service detail artwork must remain fully local/offline.');
  assert.strictEqual(icon.dataset.serviceCatalog, 'GitHub');
  assert(icon.classList.contains('wallet-detail-brand-image'),
    'Detail artwork must receive the existing large-detail artwork class during rendering.');

  const titleWrap = header.children[1];
  assert.strictEqual(titleWrap.className, 'wallet-detail-title-wrap');
  assert.strictEqual(titleWrap.children[0].tagName, 'H1');
  assert.strictEqual(titleWrap.children[0].className, 'wallet-detail-title');
  assert.strictEqual(titleWrap.children[0].textContent, 'GitHub');
  assert.strictEqual(titleWrap.children[1].className, 'wallet-detail-category');
  assert.strictEqual(titleWrap.children[1].textContent, 'Website Account');

  const fallbackArea = new FakeElement('div');
  const fallbackHeader = group._test.appendVaultItemHeader(fallbackArea, {
    name: 'Unknown Service',
    category: 'Website Account'
  }, 'Website Account');
  const fallbackIcon = fallbackHeader.children[0];
  assert.strictEqual(fallbackIcon.tagName, 'I');
  assert(fallbackIcon.className.includes('fa-globe'));
  assert(fallbackIcon.classList.contains('wallet-detail-brand-image'),
    'Fallback account artwork must use the same direct detail treatment.');
} finally {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
}

const visualUi = require('../src/main/ui-scale-2.6.7.js');
let resized = null;
assert.strictEqual(visualUi._test.applyPreferredWindowSize({
  screen: { availWidth: 1920, availHeight: 1080 },
  outerWidth: 1200,
  outerHeight: 700,
  resizeTo(width, height) { resized = { width, height }; }
}), true);
assert.deepStrictEqual(resized, { width: 1400, height: 750 },
  'Retiring the Vault detail patch must not remove the preferred-window sizing behavior.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.11 direct Vault Item detail artwork and window-sizing behavior active.`);
