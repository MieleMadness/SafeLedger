'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('src/main/index.html');
const theme = read('src/main/css/app-theme.css');
const group = read('src/main/group.js');
const record = read('src/main/record.js');
const foundation = read('src/main/css/foundation.css');

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

assert(/^2\.\d+\.\d+$/.test(pkg.version));
assert(index.indexOf('./css/app-theme.css') > index.indexOf('./css/local-icons.css'), 'theme stylesheet must load after the legacy icon/foundation layers');
assert(index.indexOf('./css/ui-current.css') > index.indexOf('./css/app-theme.css'), 'current UI refinements must load after the base theme');
assert(foundation.includes('grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 3fr) minmax(0, 5fr)'));

const mainArea = index.indexOf('id="mainArea"');
const buttonArea = index.indexOf('id="buttonArea"');
const dashboardButton = index.indexOf('id="dashboardButton"');
const activityButton = index.indexOf('id="activityButton"');
const settingsButton = index.indexOf('id="settingsButton"');
const globalSearchButton = index.indexOf('id="globalSearchButton"');
const panicButton = index.indexOf('id="panicLockButton"');
assert(index.includes('class="app-cell dark4bg top-utility-cell"'));
assert(index.includes('class="top-utility-actions"'));
assert(dashboardButton > 0 && dashboardButton < mainArea, 'Home belongs in the top utility row');
assert(activityButton > dashboardButton && activityButton < mainArea, 'History belongs after Home in the top utility row');
assert(settingsButton > activityButton && settingsButton < mainArea, 'Settings belongs after History in the top utility row');
assert(globalSearchButton > settingsButton && globalSearchButton < mainArea, 'Global Search belongs after Settings in the top utility row');
assert(panicButton > buttonArea, 'Emergency Lock must remain in the bottom action row');
assert(index.indexOf('id="detailActionArea"') > buttonArea && index.indexOf('id="detailActionArea"') < panicButton);

assert(theme.includes('--sl-action-size: 42px'));
assert(theme.includes('--sl-top-action-size: 34px'));
assert(theme.includes('.top-utility-cell {'));
assert(theme.includes('.top-utility-actions {'));
assert(theme.includes('width: var(--sl-top-action-size) !important'));
assert(theme.includes('.detail-action-button,\n.panic-lock-inline') || /\.detail-action-button,\s*\.panic-lock-inline/.test(theme));
assert(theme.includes('width: var(--sl-action-size) !important'));
assert(theme.includes('height: var(--sl-action-size) !important'));
assert(theme.includes('.panic-lock-inline {'));
assert(theme.includes('margin-left: auto !important'));
assert(theme.includes('.detail-action-area {'));
assert(theme.includes('flex: 1 1 0'));
assert(theme.includes('overflow-x: auto'));

assert(group.includes("title: 'Cancel edit vault item'"));
assert(group.includes("onClick: () => renderGroupDetail(params)"));
assert(record.includes("title: 'Cancel edit asset'"));
assert(record.includes("onClick: () => renderRecordDetail(params)"));

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

console.log(`PASS UI polish ${pkg.version} keeps Home/History/Settings/Search in the top utility bar, Emergency Lock fixed bottom-right, native 2/2/3/5 layout, edit cancellation, responsive custom fields, and readable dark-mode contrast.`);