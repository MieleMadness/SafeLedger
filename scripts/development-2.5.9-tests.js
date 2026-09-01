'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const eye = read('src/main/eye-icon.js');
const password = read('src/main/password-controls.js');
const security = read('src/main/security-ui.js');
const profile = read('src/main/profile.js');
const binder = read('src/main/recovery-binder.js');
const binderUi = read('src/main/recovery-binder-ui.js');
const binderCss = read('src/main/css/recovery-binder.css');
const uiCss = read('src/main/css/ui-2.5.9.css');
const index = read('src/main/index.html');

function testOutlineEyeArtwork() {
  assert(eye.includes('class="sl-eye-outline"'), 'Eye helper should contain a simple outline shape.');
  assert(eye.includes('class="sl-eye-pupil"'), 'Eye helper should contain the round pupil from the supplied reference.');
  assert(eye.includes('class="sl-eye-slash"'), 'Revealed passwords should gain a conventional hide slash.');
  assert(password.includes("const eyeIcon = require('./eye-icon');"));
  assert(password.includes('show.innerHTML = eyeIcon.markup(false);'));
  assert(password.includes('show.innerHTML = eyeIcon.markup(hidden);'));
  assert(security.includes("const eyeIcon = require('./eye-icon');"));
  assert(security.includes('button.innerHTML = eyeIcon.markup(false);'));
  assert(security.includes('control.innerHTML = eyeIcon.markup(hidden);'));
  assert(uiCss.includes('.sl-eye-svg'));
  assert(uiCss.includes('.sl-eye-pupil'));
  assert(uiCss.includes('.password-visibility-toggle'));
  assert(uiCss.includes('background: transparent !important;'), 'Password eye should sit cleanly inside the field without a heavy button box.');
  assert(index.indexOf('./css/ui-2.5.9.css') > index.indexOf('./css/ui-2.5.8.css'), '2.5.9 refinements should load after 2.5.8.');
}

function testProfileNotes() {
  assert(profile.includes("id: 'inputProfileNotes'"), 'Profile edit should include a Notes textarea.');
  assert(profile.includes('nextProfile.notes = inputNotes.value;'), 'Profile Notes must persist with the encrypted profile-list entry.');
  assert(profile.includes('function appendProfileNotes(area, profile)'));
  assert(profile.includes("value.className = 'outData detail-notes-value profile-notes-value';"));
  assert(profile.includes("{ label: 'Notes', value: profile.notes }"), 'Profile print sheet should include recorded notes.');
  assert(binder.includes("if (normalizedOptions.includeNotes) pushField(profileFields, 'Notes', profile.notes);"), 'Recovery Binder Notes opt-in should include Profile Notes too.');
}

function testRecoveryBinderDarkModeAndQrPrinting() {
  assert(binderCss.includes('color: var(--sl-muted'), 'Binder secondary text should inherit theme-aware muted text.');
  assert(binderCss.includes('background: var(--sl-surface'), 'Binder cards should inherit light/dark theme surfaces.');
  assert(binderCss.includes('color: var(--sl-text-strong'), 'Binder titles should inherit theme-aware strong text.');
  assert(binderCss.includes('background: var(--sl-surface-soft'), 'Binder hover/risk surfaces should follow dark mode.');

  assert(binderUi.includes("['includeQrCodes', 'Print available QR codes'"), 'Recovery Binder should offer a QR printing checkbox.');
  assert(binderUi.includes("const QRCode = require('qrcode');"));
  assert(binderUi.includes('QRCode.toDataURL(String(field.value)'), 'Binder should generate QR images locally from the already-selected value.');
  assert(binderUi.includes('if (!field || field.qr !== true'), 'Only explicitly QR-capable fields should generate QR images.');
  assert(binderUi.includes('await printBinder(binder);'), 'Printing must wait for local QR generation to finish.');

  assert(binder.includes('includeQrCodes: false'));
  assert(binder.includes("pushField(fields, 'Public address', record.publicAddress, { qr: options.includeQrCodes });"));
  assert(binder.includes("pushField(fields, 'Private key', record.privateAddress, { qr: options.includeQrCodes });"));
  assert(!binder.includes("pushField(fields, 'Password', group.password, { qr:"), 'Wallet passwords do not currently expose QR in the app and must not gain one only in print.');
}

testOutlineEyeArtwork();
testProfileNotes();
testRecoveryBinderDarkModeAndQrPrinting();
console.log('PASS SafeLedger outline-eye edit controls, Profile Notes, dark Recovery Binder, and opt-in QR printing.');
