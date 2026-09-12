'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexSource = read('src/main/index.html');
const currentUi = read('src/main/css/ui-current.css');
const passwordControls = read('src/main/password-controls.js');

assert(passwordControls.includes("show.className = 'btn btn-default btn-sm field-inline-action password-visibility-toggle';"),
  'Password visibility control must remain identifiable as the inline login eye button.');

assert(currentUi.includes('.btn:not(:disabled):hover') &&
  currentUi.includes('.field-inline-action:not(:disabled):hover') &&
  currentUi.includes('transform: none !important;'),
  'Current UI cascade must preserve the shared button transform reset.');

assert(currentUi.includes('width: 34px !important;') &&
  currentUi.includes('height: 28px !important;'),
  'Password visibility control must keep its fixed inline footprint.');

assert(currentUi.includes('.password-visibility-shell > .password-visibility-toggle') &&
  currentUi.includes('top: 0 !important;') &&
  currentUi.includes('bottom: 0 !important;') &&
  currentUi.includes('margin: auto 0 !important;') &&
  currentUi.includes('transform: none !important;'),
  'Password eye button must be centered by its absolute-positioning box, not by a transform.');

assert(currentUi.includes('display: inline-flex !important;') &&
  currentUi.includes('align-items: center !important;') &&
  currentUi.includes('justify-content: center !important;'),
  'Password eye button must own its internal centering instead of relying on generic button classes.');
assert(currentUi.includes('.password-visibility-toggle .sl-eye-svg') &&
  currentUi.includes('margin: auto !important;') &&
  currentUi.includes('flex: 0 0 auto;'),
  'Password eye SVG must stay centered inside the 34x28 hover target.');
assert(currentUi.includes('.edit-sensitive-toggle .sl-eye-svg') && currentUi.includes('margin: auto;'),
  'Current UI cascade must preserve the proven explicit SVG-centering pattern for sensitive fields.');

const shellRuleStart = currentUi.indexOf('.password-visibility-shell > .password-visibility-toggle');
const shellRuleEnd = currentUi.indexOf('}', shellRuleStart);
assert(shellRuleStart >= 0 && !currentUi.slice(shellRuleStart, shellRuleEnd).includes('translateY(-50%)'),
  'Final password eye centering rule must not depend on a transform that shared hover/focus rules can reset.');
assert(!indexSource.includes('ui-2.6.7-login-eye-fix.css'),
  'Temporary last-loaded login-eye override must not return.');

console.log('PASS login password eye button and SVG are independently centered from the canonical current UI cascade.');
