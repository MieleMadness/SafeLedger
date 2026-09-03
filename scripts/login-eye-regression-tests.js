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
  'Password eye must be centered by its absolute-positioning box, not by a transform.');

assert(!eyeCss.includes('translateY(-50%)'),
  'Password eye centering must not depend on a transform that shared hover/focus rules can reset.');
assert(!indexSource.includes('ui-2.6.7-login-eye-fix.css'),
  'Temporary last-loaded login-eye override must not return.');

console.log('PASS login password eye uses transform-independent vertical centering that remains stable across hover/focus.');
