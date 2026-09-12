'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 15,
  'SafeLedger 2.6.15 message-readability regressions must remain active on 2.6.15 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.15-tests.js'),
  '2.6.15 message-readability coverage must stay in the locked suite.');
assert(read('package.json').includes('node scripts/visual-contract-regression-tests.js'),
  'Reusable visual contract regression must stay in the locked suite.');

const statusSource = read('src/main/status.js');
const statusCss = read('src/main/css/status-messages.css');
const index = read('src/main/index.html');

assert(statusSource.includes('const STATUS_TIMEOUT_MS = 5000;'),
  'Status messages should remain visible long enough to read.');
assert(statusSource.includes("text.textContent = String(message || '');"),
  'Status text must render as text rather than HTML.');
assert(!statusSource.includes('alert.innerHTML = params.statusMsg'),
  'Status messages must not return to HTML injection.');
assert(statusSource.includes("info: 'fa fa-info-circle'") &&
  statusSource.includes("success: 'fa fa-check-circle'") &&
  statusSource.includes("danger: 'fa fa-exclamation-circle'"),
  'Info, success, and error messages should keep clear semantic icons.');
assert(statusSource.includes("options.ariaLive || (kind === 'danger' ? 'assertive' : 'polite')"),
  'Status messages must keep meaningful default live-region behavior while allowing successful red deletion notices to remain polite.');
assert(!statusSource.includes('&nbsp'), 'Status clearing should not leave placeholder text behind.');
assert(!index.includes('<div id="statusArea">&nbsp;</div>'),
  'Initial status area should be genuinely empty.');
assert(index.includes('<link href="./css/status-messages.css" rel="stylesheet">'));
assert(index.indexOf('./css/status-messages.css') > index.indexOf('./css/ui-current.css'));
assert(statusCss.includes('font-size: 15px !important;'));
assert(statusCss.includes('font-weight: 600;'));
assert(statusCss.includes('max-height: none !important;'),
  'Long status messages must be allowed to grow instead of clipping inside the old fixed-height area.');

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.className = '';
    this.children = [];
    this.attributes = {};
    this.textContent = '';
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
global.document = { createElement: (tag) => new FakeElement(tag) };
try {
  const statusPath = require.resolve('../src/main/status.js');
  delete require.cache[statusPath];
  const status = require(statusPath);
  assert.strictEqual(status._test.STATUS_TIMEOUT_MS, 5000);
  assert.strictEqual(status._test.statusKind('SUCCESS'), 'success');
  assert.strictEqual(status._test.statusKind('ERROR'), 'danger');
  assert.strictEqual(status._test.statusKind('INFO'), 'info');

  const success = status._test.createMessage('success', 'Saved successfully.');
  assert(success.className.includes('safeledger-status-success'));
  assert.strictEqual(success.attributes.role, 'status');
  assert.strictEqual(success.attributes['aria-live'], 'polite');
  assert.strictEqual(success.children[0].className, 'fa fa-check-circle');
  assert.strictEqual(success.children[1].textContent, 'Saved successfully.');

  const danger = status._test.createMessage('danger', '<b>Invalid Password</b>');
  assert.strictEqual(danger.attributes.role, 'alert');
  assert.strictEqual(danger.attributes['aria-live'], 'assertive');
  assert.strictEqual(danger.children[1].textContent, '<b>Invalid Password</b>',
    'Message-like text must stay literal rather than becoming HTML markup.');

  const politeDanger = status._test.createMessage('danger', 'Item Deleted', { role: 'status', ariaLive: 'polite' });
  assert.strictEqual(politeDanger.attributes.role, 'status');
  assert.strictEqual(politeDanger.attributes['aria-live'], 'polite');
  assert(politeDanger.className.includes('safeledger-status-danger'));
} finally {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
}

console.log(`PASS SafeLedger ${pkg.version} keeps readable, accessible, theme-aware status messages and the reusable visual baseline gate.`);
