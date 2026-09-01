'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const source = read('src/main/sensitive-control-icons-ui.js');

assert(source.includes("icon.className = details.open ? 'fa fa-minus' : 'fa fa-plus';"),
  'View-mode sensitive rows should update one existing plus/minus icon rather than replacing SVG children.');
assert(!source.includes('icon.innerHTML = eyeIcon.markup(details.open);'),
  'Wallet selection must not trigger repeated sensitive-eye SVG rewrites.');
assert(!source.includes('dataset.eyeState'),
  'The old observer-managed eye state is no longer needed for view-mode disclosure rows.');
assert(source.includes('childList: true'));
assert(source.includes('subtree: true'));
assert(!source.includes('attributes: true'),
  'The detail observer should only discover newly-rendered controls and must not loop on attribute changes.');
assert(!source.includes("attributeFilter: ['class', 'open']"));

console.log('PASS SafeLedger wallet selection remains free of the sensitive-control observer render loop.');
