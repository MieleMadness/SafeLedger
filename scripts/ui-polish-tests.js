'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('src/main/index.html');
const theme = read('src/main/css/app-theme.css');

function cssVar(block, name) {
  const match = block.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  assert(match, `Missing ${name}`);
  return match[1];
}

function luminance(hex) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
  return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]);
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

assert.strictEqual(pkg.version, '2.0.68');
assert(index.indexOf('./css/app-theme.css') > index.indexOf('./css/global-search.css'), 'theme stylesheet must load last');

assert(theme.includes('--sl-action-size: 42px'));
assert(theme.includes('.app-button-row > [class*="col-"]'));
assert(theme.includes('align-items: flex-end'));
assert(theme.includes('.detail-action-button,'));
assert(theme.includes('.global-search-inline,'));
assert(theme.includes('.dashboard-inline,'));
assert(theme.includes('.activity-inline'));
assert(theme.includes('height: var(--sl-action-size) !important'));
assert(theme.includes('margin: 0 !important'));

assert(theme.includes('.custom-fields-editor'));
assert(theme.includes('container-type: inline-size'));
assert(theme.includes('@container (max-width: 560px)'));
assert(theme.includes('@container (max-width: 360px)'));
assert(theme.includes('.custom-field-edit-row > * { min-width: 0; }'));
assert(theme.includes('.custom-field-value-control { grid-column: 1 / -1 !important; grid-row: 2; }'));

const dark = theme.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
assert(dark, 'dark theme variables must exist');
const darkBg = cssVar(dark[1], '--sl-bg');
const darkSurface = cssVar(dark[1], '--sl-surface');
const darkText = cssVar(dark[1], '--sl-text');
const darkMuted = cssVar(dark[1], '--sl-muted');
assert(contrast(darkText, darkBg) >= 7, 'dark body text should exceed enhanced contrast guidance');
assert(contrast(darkMuted, darkSurface) >= 4.5, 'dark muted/small text should meet normal-text contrast guidance');
assert(theme.includes('html[data-theme="dark"] .search-field-wrap .form-control'));
assert(theme.includes('.wallet-list-category { color: rgba(255,255,255,.84) !important;'));
assert(theme.includes('.column-empty-text { max-width: 180px; font-size: 12px;'));

console.log('PASS UI polish keeps bottom actions aligned, custom fields panel-responsive, and dark-mode text at readable contrast levels.');
