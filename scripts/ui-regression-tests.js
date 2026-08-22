'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function syntaxCheck(relative) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

function check(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}

check('main window opens at 1200 x 750', () => {
  const source = read('src/main/main.js');
  assert(source.includes('width: 1200'));
  assert(source.includes('height: 750'));
  assert(!source.includes('height: 850'));
});

check('new installations name the first profile SafeLedger', () => {
  const source = read('src/main/robust-vault.js');
  assert(source.includes("name: 'SafeLedger'"));
  assert(!source.includes("name: 'Initial Profile'"));
});

check('shared bottom detail-action dock is present', () => {
  const index = read('src/main/index.html');
  assert(index.includes('id="detailActionArea"'));
  assert(index.includes('./css/2.0.30.css'));
  assert(index.includes("require('./detail-action-enhancements.js')"));
  const css = read('src/main/css/2.0.30.css');
  assert(css.includes('.detail-action-area'));
  assert(css.includes('.emergency-lock-cell .panic-lock-inline'));
});

check('coin empty public address shows the requested light placeholder', () => {
  const record = read('src/main/record.js');
  const css = read('src/main/css/2.0.30.css');
  assert(record.includes('Use edit button to update asset.'));
  assert(record.includes("classList.add('public-address-placeholder')"));
  assert(css.includes('.public-address-placeholder'));
});

check('coin private-key display is omitted when no value exists', () => {
  const record = read('src/main/record.js');
  assert(record.includes("if(String(params.record.privateAddress||'').trim())securityUi.appendSensitiveField"));
});

check('coin and wallet dock actions are normalized to Edit Print Delete', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  assert(enhancements.includes("const ACTION_ORDER = ['edit', 'print', 'delete'];"));
  assert(enhancements.includes("value.startsWith('edit ')"));
  assert(enhancements.includes("value.startsWith('print ')"));
  assert(enhancements.includes("value.includes('delete')"));
});

check('save action is green and profiles use the bottom icon dock', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  const css = read('src/main/css/2.0.30.css');
  assert(css.includes('.detail-action-save'));
  assert(css.includes('#2e7d32'));
  assert(enhancements.includes("title: 'Save profile'"));
  assert(enhancements.includes("title: 'Edit profile'"));
  assert(enhancements.includes("title: 'Print profile'"));
  assert(enhancements.includes("title: 'Delete profile'"));
  assert(enhancements.indexOf("title: 'Edit profile'") < enhancements.indexOf("title: 'Print profile'"));
  assert(enhancements.indexOf("title: 'Print profile'") < enhancements.indexOf("title: 'Delete profile'"));
});

check('wallet and coin actions still use icon-only bottom dock', () => {
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  assert(record.includes("icon:'fa-print'"));
  assert(record.includes("icon:'fa-pencil'"));
  assert(record.includes("icon:'fa-trash'"));
  assert(record.includes("icon:'fa-save'"));
  assert(group.includes("icon:'fa-print'"));
  assert(group.includes("icon:'fa-pencil'"));
  assert(group.includes("icon:'fa-trash'"));
  assert(group.includes("icon:'fa-save'"));
  assert(!record.includes('Print coin sheet</'));
});

check('updated UI JavaScript parses cleanly', () => {
  syntaxCheck('src/main/detail-actions.js');
  syntaxCheck('src/main/detail-action-enhancements.js');
  syntaxCheck('src/main/record.js');
  syntaxCheck('src/main/group.js');
  syntaxCheck('src/main/main.js');
  syntaxCheck('src/main/robust-vault.js');
});

console.log('\n9 SafeLedger 2.0.31 UI regression checks passed.');
