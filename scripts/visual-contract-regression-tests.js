'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const baseline = JSON.parse(read('scripts/ui-visual-baseline.json'));
const uiCurrent = read('src/main/css/ui-current.css');
const statusCss = read('src/main/css/status-messages.css');
const index = read('src/main/index.html');

function gitBlobSha(content) {
  const body = Buffer.from(content, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function block(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert(match, `Missing CSS block: ${selector}`);
  return match[1];
}

function variable(sourceBlock, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = sourceBlock.match(new RegExp(`${escaped}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  assert(match, `Missing CSS variable: ${name}`);
  return match[1];
}

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4));
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

assert.strictEqual(gitBlobSha(uiCurrent), baseline.uiCurrentGitBlobSha,
  'Canonical ui-current.css changed from the approved visual baseline. Review the visual change and update the baseline intentionally.');
assert(index.includes('<link href="./css/ui-current.css" rel="stylesheet">'));
assert(index.includes('<link href="./css/status-messages.css" rel="stylesheet">'));
assert(index.indexOf('./css/status-messages.css') > index.indexOf('./css/ui-current.css'),
  'Canonical status message styling must load after the consolidated historical cascade.');

assert(statusCss.includes('font-size: 15px !important;'),
  'Desktop status messages must use the reviewed readable 15px size.');
assert(statusCss.includes('font-weight: 600;'),
  'Status messages must keep semibold emphasis for fast scanning.');
assert(statusCss.includes('white-space: normal;') && statusCss.includes('overflow-wrap: anywhere;'),
  'Long messages must wrap instead of clipping or becoming difficult to read.');

const light = block(statusCss, ':root');
const dark = block(statusCss, 'html[data-theme="dark"]');
for (const mode of [{ name: 'light', vars: light }, { name: 'dark', vars: dark }]) {
  for (const kind of ['info', 'success', 'danger', 'processing']) {
    const foreground = variable(mode.vars, `--sl-status-${kind}-text`);
    const background = variable(mode.vars, `--sl-status-${kind}-bg`);
    assert(contrast(foreground, background) >= 4.5,
      `${mode.name} ${kind} status text must retain at least 4.5:1 contrast.`);
  }
}

console.log('PASS SafeLedger visual contract keeps the approved consolidated UI baseline and readable Light/Dark status-message contrast.');
