'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexSource = read('src/main/index.html');
const sharedInteractionCss = read('src/main/css/ui-2.5.15.css');
const historicalEyeCss = read('src/main/css/ui-2.5.16.css');
const eyeFixCss = read('src/main/css/ui-2.6.7-login-eye-fix.css');
const passwordControls = read('src/main/password-controls.js');

assert(passwordControls.includes("show.className = 'btn btn-default btn-sm field-inline-action password-visibility-toggle';"),
  'Password visibility control must remain identifiable as the inline login eye button.');

assert(sharedInteractionCss.includes('.btn:not(:disabled):hover') &&
  sharedInteractionCss.includes('.field-inline-action:not(:disabled):hover') &&
  sharedInteractionCss.includes('transform: none !important;'),
  'Regression must continue to account for the shared 2.5.15 button transform reset.');

assert(historicalEyeCss.includes('.password-visibility-shell > .password-visibility-toggle') &&
  historicalEyeCss.includes('transform: translateY(-50%) !important;'),
  'Historical resting-state password eye centering must remain present.');

assert(indexSource.includes('<link href="./css/ui-2.6.7-login-eye-fix.css" rel="stylesheet">'),
  '2.6.7 login eye correction stylesheet must be loaded.');
assert(indexSource.indexOf('./css/ui-2.6.7-login-eye-fix.css') > indexSource.indexOf('./css/ui-2.6.7-theme-refinement.css'),
  'Login eye correction must load after shared/theme interaction styles.');

assert(eyeFixCss.includes('.password-visibility-shell > .password-visibility-toggle:not(:disabled):hover') &&
  eyeFixCss.includes('.password-visibility-shell > .password-visibility-toggle:not(:disabled):focus') &&
  eyeFixCss.includes('.password-visibility-shell > .password-visibility-toggle:not(:disabled):focus-visible'),
  'Hover and focus states must explicitly preserve password-eye positioning.');
assert(eyeFixCss.includes('top: 50% !important;') &&
  eyeFixCss.includes('transform: translateY(-50%) !important;'),
  'Password eye must stay vertically centered inside the field in every interaction state.');

console.log('PASS login password eye remains vertically centered at rest, hover, focus, and keyboard focus.');
