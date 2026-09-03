'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexSource = read('src/main/index.html');
const sharedInteractionCss = read('src/main/css/ui-2.5.15.css');
const eyeCss = read('src/main/css/ui-2.5.16.css');
const eyeVisualCss = read('src/main/css/ui-2.5.9.css');
const sensitiveCss = read('src/main/css/ui-2.5.11.css');
const passwordControls = read('src/main/password-controls.js');

assert(passwordControls.includes("show.className = 'btn btn-default btn-sm field-inline-action password-visibility-toggle';"),
  'Password visibility control must remain identifiable as the inline login eye button.');

assert(sharedInteractionCss.includes('.btn:not(:disabled):hover') &&
  sharedInteractionCss.includes('.field-inline-action:not(:disabled):hover') &&
  sharedInteractionCss.includes('transform: none !important;'),
  'Regression must continue to account for the shared button transform reset.');

assert(eyeVisualCss.includes('width: 34px !important;') &&
  eyeVisualCss.includes('height: 28px !important;'),
  'Password visibility control must keep its fixed inline footprint.');

assert(eyeCss.includes('.password-visibility-shell > .password-visibility-toggle') &&
  eyeCss.includes('top: 0 !important;') &&
  eyeCss.includes('bottom: 0 !important;') &&
  eyeCss.includes('margin: auto 0 !important;') &&
  eyeCss.includes('transform: none !important;'),
  'Password eye button must be centered by its absolute-positioning box, not by a transform.');

assert(eyeCss.includes('display: inline-flex !important;') &&
  eyeCss.includes('align-items: center !important;') &&
  eyeCss.includes('justify-content: center !important;'),
  'Password eye button must own its internal centering instead of relying on generic button classes.');
assert(eyeCss.includes('.password-visibility-toggle .sl-eye-svg') &&
  eyeCss.includes('margin: auto !important;') &&
  eyeCss.includes('flex: 0 0 auto;'),
  'Password eye SVG must stay centered inside the 34x28 hover target.');
assert(sensitiveCss.includes('.edit-sensitive-toggle .sl-eye-svg') && sensitiveCss.includes('margin: auto;'),
  'Regression keeps the proven 2.5.11 explicit SVG-centering pattern as the reference behavior.');

assert(!eyeCss.includes('translateY(-50%)'),
  'Password eye centering must not depend on a transform that shared hover/focus rules can reset.');
assert(!indexSource.includes('ui-2.6.7-login-eye-fix.css'),
  'Temporary last-loaded login-eye override must not return.');

console.log('PASS login password eye button and SVG are independently centered and remain stable across hover/focus.');
