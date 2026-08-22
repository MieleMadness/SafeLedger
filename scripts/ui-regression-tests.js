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

check('wallet and coin actions use bottom icon dock', () => {
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
  syntaxCheck('src/main/record.js');
  syntaxCheck('src/main/group.js');
  syntaxCheck('src/main/main.js');
  syntaxCheck('src/main/robust-vault.js');
});

console.log('\n7 SafeLedger 2.0.30 UI regression checks passed.');
