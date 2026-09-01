'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const source = read('src/main/sensitive-control-icons-ui.js');

assert(source.includes("const eyeState = details.open ? 'open' : 'closed';"),
  'Sensitive eye rendering must track the details open/closed state.');
assert(source.includes('if (icon.dataset.eyeState !== eyeState) {'),
  'Sensitive eye rendering must be idempotent so MutationObserver cannot continuously redraw the same icon.');
assert(source.includes('icon.dataset.eyeState = eyeState;'));
assert(source.includes('icon.innerHTML = eyeIcon.markup(details.open);'));
assert(source.indexOf('icon.dataset.eyeState = eyeState;') < source.indexOf('icon.innerHTML = eyeIcon.markup(details.open);'),
  'The eye state must be recorded before changing icon children so the observer sees an already-current state.');
assert(source.includes("attributeFilter: ['open']"),
  'The sensitive-control observer should react to details state, not unrelated class mutations.');
assert(!source.includes("attributeFilter: ['class', 'open']"),
  'Class changes should not retrigger the sensitive-field patch loop.');

console.log('PASS SafeLedger 2.5.10 sensitive eye rendering is idempotent and cannot loop when a wallet is selected.');
