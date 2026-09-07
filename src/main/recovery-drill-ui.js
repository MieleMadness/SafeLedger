'use strict';

const detailActions = require('./detail-actions');
const recoveryDrill = require('./recovery-drill');
const bip39 = require('./bip39-validator');
const motion = require('./motion-ui');

function appendText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function bip39Message(result) {
  if (!result || result.supported !== true) return 'Unable to validate the mnemonic locally.';
  if (result.valid) return `Valid BIP39 English mnemonic structure and checksum (${result.wordCount} words).`;
  if (result.reason === 'word-count') return 'Not a supported BIP39 word count. Use 12, 15, 18, 21, or 24 words.';
  if (result.reason === 'unknown-word') return 'One or more words are not in the official BIP39 English word list.';
  if (result.reason === 'checksum') return 'All words are recognized, but the BIP39 checksum does not match.';
  return 'The mnemonic could not be validated as BIP39.';
}

function appendOptionalBip39Check(area) {
  const section = document.createElement('section');
  section.className = 'recovery-drill-validation';
  appendText(section, 'h3', 'product-section-title', 'Optional BIP39 Check');
  appendText(section, 'p', 'recovery-drill-intro', 'Enter the mnemonic words in their original order, separated by spaces — for example: word1 word2 word3. Do not use commas or join the words together. SafeLedger validates the word list and checksum locally and does not save, log, copy, or transmit what you enter here.');
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'form-control';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 4096;
  input.placeholder = 'Enter 12–24 BIP39 words separated by spaces';
  input.setAttribute('aria-label', 'Temporary BIP39 mnemonic, words separated by spaces');
  section.appendChild(input);
  const actions = document.createElement('div');
  actions.className = 'settings-section-actions recovery-drill-validation-actions';
  const validate = document.createElement('button');
  validate.type = 'button';
  validate.className = 'btn btn-default';
  validate.textContent = 'Validate Locally';
  actions.appendChild(validate);
  section.appendChild(actions);
  const resultText = document.createElement('p');
  resultText.className = 'recovery-drill-validation-result';
  resultText.setAttribute('aria-live', 'polite');
  section.appendChild(resultText);
  validate.addEventListener('click', () => {
    const temporaryMnemonic = input.value;
    if (!temporaryMnemonic.trim()) {
      resultText.textContent = 'Enter a mnemonic with each word separated by a space.';
      return;
    }
    const result = bip39.validateMnemonic(temporaryMnemonic);
    input.value = '';
    resultText.textContent = bip39Message(result);
    resultText.className = `recovery-drill-validation-result ${result.valid ? 'is-ready' : 'is-review'}`;
    motion.reveal(resultText);
  });
  area.appendChild(section);
}

function documentationReminder(group = {}) {
  if (recoveryDrill.canComplete(group)) return '';
  if (group.lastRecoveryDrill || group.lastVerified) return 'Documentation reminder: this Recovery Validation may be current, but SafeLedger still does not have a recovery method, recovery location, or recovery instructions documented for this vault item. Completing or verifying a validation records that you tested the process; it does not create the missing recovery documentation. Recovery Readiness will remain incomplete until at least one part of the recovery plan is documented from Edit Vault Item.';
  return 'Documentation reminder: SafeLedger does not have a recovery method, recovery location, or recovery instructions documented for this vault item yet. You can still complete this Recovery Validation checklist, but Recovery Readiness will remain incomplete until at least one part of the recovery plan is documented from Edit Vault Item.';
}

function render(params = {}) {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const group = params.group || {};
  area.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'recovery-drill-header';
  appendText(header, 'h1', '', 'Recovery Validation');
  appendText(header, 'p', 'recovery-drill-wallet', `Vault Item: ${params.walletName || 'Vault Item'}`);
  area.appendChild(header);

  const privacy = document.createElement('div');
  privacy.className = 'recovery-drill-privacy';
  const privacyIcon = document.createElement('i');
  privacyIcon.className = 'fa fa-lock';
  privacyIcon.setAttribute('aria-hidden', 'true');
  privacy.appendChild(privacyIcon);
  appendText(privacy, 'div', '', 'This guided test does not require you to reveal recovery phrases, private keys, passwords, PINs, or sensitive custom-field values. Confirm each item using your real-world recovery plan.');
  area.appendChild(privacy);

  const reminder = documentationReminder(group);
  if (reminder) appendText(area, 'div', 'recovery-drill-warning', reminder);

  const steps = recoveryDrill.buildSteps(group);
  const checklist = document.createElement('section');
  checklist.className = 'recovery-drill-wizard recovery-drill-checklist';
  const progressHead = document.createElement('div');
  progressHead.className = 'recovery-drill-progress-head';
  appendText(progressHead, 'strong', 'recovery-drill-progress-label', 'Recovery checklist');
  const progressPercent = appendText(progressHead, 'span', 'recovery-drill-progress-percent', '0% confirmed');
  checklist.appendChild(progressHead);
  const track = document.createElement('div');
  track.className = 'recovery-drill-progress-track';
  const fill = document.createElement('span');
  fill.className = 'recovery-drill-progress-fill';
  track.appendChild(fill);
  checklist.appendChild(track);
  appendText(checklist, 'p', 'recovery-drill-intro', 'Review each recovery check below. Mark an item only after you have physically or operationally verified it.');

  const list = document.createElement('div');
  list.className = 'recovery-drill-list recovery-drill-checklist-list';
  const checkboxes = [];
  steps.forEach((step, index) => {
    const row = document.createElement('label');
    row.className = 'recovery-drill-step recovery-drill-checklist-step';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', step.title);
    checkboxes.push(checkbox);
    row.appendChild(checkbox);
    const body = document.createElement('span');
    body.className = 'recovery-drill-step-body';
    appendText(body, 'span', 'recovery-drill-step-number', `Check ${index + 1} of ${steps.length}`);
    appendText(body, 'strong', 'recovery-drill-step-title', step.title);
    appendText(body, 'span', 'recovery-drill-step-text', step.text);
    row.appendChild(body);
    list.appendChild(row);
  });
  checklist.appendChild(list);
  area.appendChild(checklist);

  const allConfirmed = () => checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
  const syncChecklist = () => {
    const confirmed = checkboxes.filter((checkbox) => checkbox.checked).length;
    const percent = steps.length ? Math.round((confirmed / steps.length) * 100) : 0;
    progressPercent.textContent = `${percent}% confirmed`;
    fill.style.width = `${percent}%`;
    const dock = document.getElementById('detailActionArea');
    const completeButton = dock && dock.querySelector('[aria-label="Complete Recovery Validation"]');
    if (completeButton) completeButton.disabled = !allConfirmed();
  };
  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', syncChecklist));

  const storageNote = document.createElement('div');
  storageNote.className = 'recovery-drill-storage-note';
  appendText(storageNote, 'strong', '', 'What SafeLedger records: ');
  storageNote.appendChild(document.createTextNode('only the successful Recovery Validation completion time and refreshed Last Verified time. Individual checklist answers are not stored.'));
  area.appendChild(storageNote);

  appendOptionalBip39Check(area);

  const complete = (_event, button) => {
    if (!allConfirmed()) return alert('Confirm every Recovery Validation check before marking the validation complete.');
    if (button) button.disabled = true;
    if (typeof params.onComplete === 'function') params.onComplete(recoveryDrill.completionPatch(), button);
  };
  detailActions.set([
    { icon: 'fa-times', title: 'Cancel Recovery Validation', className: 'detail-action-cancel', onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); } },
    { icon: 'fa-check-circle', title: 'Complete Recovery Validation', className: 'recovery-drill-complete-action', onClick: complete }
  ]);
  detailActions.setDetailMode('view');
  syncChecklist();
}

exports.render = render;
exports._test = { appendText, bip39Message, appendOptionalBip39Check, documentationReminder };
